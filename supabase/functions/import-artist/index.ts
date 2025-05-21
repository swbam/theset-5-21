import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts'; // Assuming standard CORS headers file
import { supabaseAdmin } from '../_shared/supabaseClient.ts';
import { saveArtistToDatabase, saveShowToDatabase } from '../_shared/databaseUtils.ts';
import { fetchArtistEvents } from '../_shared/ticketmasterUtils.ts';
import { getArtistByName } from '../_shared/spotifyUtils.ts';
import type { Artist, Show, SpotifyArtist } from '../_shared/types.ts';

console.log('Import Artist function initializing...');

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure POST request
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let artistData: Artist;
    try {
      artistData = await req.json();
    } catch (e) {
      console.error('[import-artist] Error parsing request body:', e);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[import-artist] Received request for artist: ${artistData?.name} (ID: ${artistData?.id})`);

    // Validate incoming artist data (using TM ID as 'id')
    if (!artistData || !artistData.id || !artistData.name) {
      console.error('[import-artist] Invalid artist data provided:', artistData);
      return new Response(JSON.stringify({ error: 'Invalid artist data provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Main Import Logic ---

    // 1. Save/Update Artist in DB
    // This now returns the artist record *from the database*
    let dbArtist = await saveArtistToDatabase(artistData);
    if (!dbArtist?.id) { // Check for the DB ID specifically
      // saveArtistToDatabase should throw on failure, but double-check
      console.error(`[import-artist] Failed to save artist: ${artistData.name}`);
      throw new Error(`Failed to save artist ${artistData.name} to database.`);
    }
    console.log(`[import-artist] Artist ${dbArtist.name} saved/found in DB with ID: ${dbArtist.id}`);

    // 2. Enrich with Spotify Data (if needed)
    if (!dbArtist.spotify_id) {
      console.log(`[import-artist] Attempting to find Spotify ID for ${dbArtist.name}`);
      const spotifyArtistResult: SpotifyArtist | null = await getArtistByName(dbArtist.name);
      if (spotifyArtistResult?.id) {
        console.log(`[import-artist] Found Spotify ID: ${spotifyArtistResult.id}. Updating DB.`);
        const { error: spotifyUpdateError } = await supabaseAdmin
          .from('artists')
          .update({
            spotify_id: spotifyArtistResult.id,
            spotify_url: spotifyArtistResult.external_urls?.spotify,
            popularity: spotifyArtistResult.popularity,
            followers: spotifyArtistResult.followers?.total,
            // genres: spotifyArtistResult.genres, // Uncomment if you want to store genres
            updated_at: new Date().toISOString()
          })
          .eq('id', dbArtist.id); // Match using the DB ID

        if (spotifyUpdateError) {
           console.error(`[import-artist] Error updating artist ${dbArtist.name} with Spotify ID:`, spotifyUpdateError);
           // Log error but continue - enrichment isn't critical path
        } else {
           // Update the local object for the response
           dbArtist = { ...dbArtist, spotify_id: spotifyArtistResult.id };
           console.log(`[import-artist] Successfully updated artist ${dbArtist.name} with Spotify ID.`);
        }
      } else {
         console.log(`[import-artist] Spotify ID not found for ${dbArtist.name}.`);
      }
    }

    // 3. Fetch Artist Events from Ticketmaster (using TM ID)
    // fetchArtistEvents expects the Ticketmaster ID, which is the initial 'id' from artistData
    console.log(`[import-artist] Fetching Ticketmaster events for artist TM ID: ${artistData.id}`);
    const shows: Show[] = await fetchArtistEvents(artistData.id);

    if (!shows || shows.length === 0) {
      console.log(`[import-artist] Artist ${dbArtist.name} saved, no upcoming shows found via Ticketmaster.`);
      return new Response(JSON.stringify({
        success: true,
        message: 'Artist saved/updated, no upcoming shows found.',
        artist: dbArtist // Return the DB artist record
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`[import-artist] Found ${shows.length} shows for artist ${dbArtist.name}.`);

    // 4. Process and Save Shows (and their venues, setlists)
    let savedCount = 0;
    let failedCount = 0;
    const showProcessingPromises = shows.map(async (show) => {
      try {
        // Pass the show data fetched from Ticketmaster to saveShowToDatabase
        // It will handle saving the artist/venue (if needed) and the show itself,
        // then trigger setlist creation.
        // Note: saveShowToDatabase now expects DB IDs for artist/venue FKs,
        // but it handles resolving/saving the nested artist/venue objects first.
        const savedShow = await saveShowToDatabase(show); // Pass options if needed, e.g., { triggeredBySync: false }
        if (savedShow) {
          savedCount++;
          console.log(`[import-artist] Successfully processed show ${show.name} (ID: ${show.id})`);
        } else {
          // This case might not happen if saveShowToDatabase throws on failure
          failedCount++;
          console.warn(`[import-artist] saveShowToDatabase returned null/undefined for show ${show.name} (ID: ${show.id})`);
        }
      } catch (err) {
        failedCount++;
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[import-artist] Error processing show ${show.id} (${show.name}):`, errMsg);
      }
    });

    // Wait for all show processing attempts to complete
    await Promise.allSettled(showProcessingPromises);
    console.log(`[import-artist] Finished processing shows. Saved: ${savedCount}, Failed: ${failedCount}`);

    // 5. Return Success Response
    return new Response(JSON.stringify({
      success: true,
      message: `Artist import process finished. Shows processed: ${shows.length}, Saved/Updated: ${savedCount}, Failed: ${failedCount}.`,
      artist: dbArtist, // Return the final DB artist record
      savedShows: savedCount,
      failedShows: failedCount
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[import-artist] Unhandled error in function:', error);
    const errMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper for CORS - create this file if it doesn't exist
// File: supabase/functions/_shared/cors.ts
/*
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or specific origin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
*/