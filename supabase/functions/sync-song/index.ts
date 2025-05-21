/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Define expected request body structure
interface SyncSongPayload {
  songId: string; // The ID (UUID or Spotify ID) of the song in your 'songs' table
  // Add other options if needed, e.g., force sync
  // force?: boolean;
}

// Define the structure of your Song data (align with DB schema and types)
// Ensure this matches your 'songs' table exactly
interface Song {
  id: string; // Primary Key (UUID or Spotify ID)
  name: string;
  artist_id?: string | null; // Foreign key to artists table (UUID)
  spotify_id?: string | null; // Exists in schema
  // spotify_url?: string | null; // Does not exist in schema
  preview_url?: string | null; // Exists in schema
  duration_ms?: number | null; // Exists in schema
  popularity?: number | null; // Exists in schema
  // album_name?: string | null; // Does not exist in schema
  // album_image?: string | null; // Does not exist in schema
  created_at?: string;
  updated_at?: string;
  // Add any other relevant fields
}

// Helper to get Spotify Access Token (copied from sync-artist)
async function getSpotifyToken(): Promise<string | null> {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('Spotify client ID or secret not configured.');
    return null;
  }

  try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        console.error('Failed to get Spotify token:', response.status, await response.text());
        return null;
      }
      const data = await response.json();
      return data.access_token;
  } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error fetching Spotify token:', errorMsg);
      return null;
  }
}

/**
 * Fetch song data from DB and enrich with Spotify details
 */
async function fetchAndEnrichSongData(supabaseAdmin: any, songId: string): Promise<Song | null> {
  console.log(`Fetching and enriching song ${songId}`);

  // --- Get Existing Song Data ---
  let song: Song | null = null;
  try {
    const { data: existingSong, error: existingError } = await supabaseAdmin
      .from('songs')
      .select('*')
      .eq('id', songId)
      .maybeSingle();

    if (existingError) {
      console.error(`Error fetching song ${songId}:`, existingError.message);
      return null; // Cannot proceed if song doesn't exist
    }
    if (!existingSong) {
       console.log(`Song ${songId} not found in database.`);
       return null;
    }
    song = existingSong as Song;
    console.log(`Found song ${songId}: ${song.name}`);

  } catch (e) {
     const errorMsg = e instanceof Error ? e.message : String(e);
     console.error(`Exception fetching song ${songId}:`, errorMsg);
     return null;
  }

  // --- Enrich with Spotify Data ---
  let needsUpdate = false;
  if (song.artist_id && song.name) {
    // Get artist name for Spotify search
    let artistName: string | null = null;
    try {
       const { data: artistData, error: artistError } = await supabaseAdmin
         .from('artists')
         .select('name')
         .eq('id', song.artist_id)
         .single(); // Use single as artist_id should be valid FK

       if (artistError) {
          console.warn(`Could not fetch artist name for artist_id ${song.artist_id}: ${artistError.message}`);
       } else {
          artistName = artistData.name;
       }
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.warn(`Exception fetching artist ${song.artist_id}:`, errorMsg);
    }

    if (artistName) {
      console.log(`Attempting to enrich song "${song.name}" by artist "${artistName}" (ID: ${song.artist_id})`);
      const spotifyToken = await getSpotifyToken();
      if (spotifyToken) {
        try {
          const searchQuery = `track:${song.name} artist:${artistName}`;
          const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1`;
          console.log(`Searching Spotify: ${searchUrl}`);

          const spotifyResponse = await fetch(searchUrl, {
            headers: { 'Authorization': `Bearer ${spotifyToken}` }
          });

          if (!spotifyResponse.ok) {
            console.warn(`Spotify search error for song ${songId}: ${spotifyResponse.status} ${await spotifyResponse.text()}`);
          } else {
            const spotifyData = await spotifyResponse.json();
            if (spotifyData?.tracks?.items?.length > 0) {
              const track = spotifyData.tracks.items[0];
              console.log(`Found Spotify track ${track.id} for song ${songId}`);

              // Update song object with Spotify details if they differ or are missing
              // Update only fields that exist in the 'songs' table schema
              if (song.spotify_id !== track.id) { song.spotify_id = track.id; needsUpdate = true; }
              // if (song.spotify_url !== track.external_urls?.spotify) { song.spotify_url = track.external_urls?.spotify || null; needsUpdate = true; } // Field doesn't exist
              if (song.preview_url !== track.preview_url) { song.preview_url = track.preview_url || null; needsUpdate = true; }
              if (song.duration_ms !== track.duration_ms) { song.duration_ms = track.duration_ms || null; needsUpdate = true; }
              if (song.popularity !== track.popularity) { song.popularity = track.popularity ?? null; needsUpdate = true; }
              // if (song.album_name !== track.album?.name) { song.album_name = track.album?.name || null; needsUpdate = true; } // Field doesn't exist
              // if (song.album_image !== track.album?.images?.[0]?.url) { song.album_image = track.album?.images?.[0]?.url || null; needsUpdate = true; } // Field doesn't exist

              if (needsUpdate) {
                 song.updated_at = new Date().toISOString();
                 console.log(`Song ${songId} updated with Spotify data.`);
              } else {
                 console.log(`Spotify data for song ${songId} matches existing data. No update needed.`);
              }

            } else {
               console.log(`No Spotify track found for query: ${searchQuery}`);
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`Error during Spotify enrichment for song ${songId}:`, errorMsg);
        }
      } else {
         console.warn(`Skipping Spotify enrichment for song ${songId} due to missing token.`);
      }
    } else {
       console.log(`Skipping Spotify enrichment for song ${songId} because artist name could not be determined.`);
    }
  } else {
     console.log(`Skipping Spotify enrichment for song ${songId} due to missing artist_id or name.`);
  }

  // Return the song only if it needed an update, otherwise null to avoid unnecessary upsert
  return needsUpdate ? song : null;
}


serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: SyncSongPayload = await req.json();
    const { songId } = payload;

    if (!songId) {
      return new Response(JSON.stringify({ error: 'Missing songId in request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log(`Sync request received for song: ${songId}`);

    // Initialize Supabase client with SERVICE_ROLE key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch and enrich data
    const enrichedSongData = await fetchAndEnrichSongData(supabaseAdmin, songId);

    if (!enrichedSongData) {
      // This can mean the song wasn't found, or no enrichment was needed.
      // Return success but indicate no update occurred.
      console.log(`No enrichment needed or song not found for ${songId}.`);
      return new Response(JSON.stringify({ success: true, updated: false, message: 'No update needed or song not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Or 404 if song not found was the reason? Returning 200 for simplicity.
      })
    }

    // Upsert the enriched data back into Supabase
    console.log(`Upserting enriched song ${songId} into database...`);
    const { data: upsertedData, error: upsertError } = await supabaseAdmin
      .from('songs')
      .upsert(enrichedSongData, { onConflict: 'id' }) // Assumes 'id' is the PK (Spotify ID or UUID)
      .select()
      .single();

    if (upsertError) {
      console.error(`Supabase song upsert error for ${songId}:`, upsertError);
      return new Response(JSON.stringify({ error: 'Database error during song upsert', details: upsertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    console.log(`Successfully synced/enriched song ${songId}`);

    return new Response(JSON.stringify({ success: true, updated: true, data: upsertedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Unhandled error:', errorMessage, error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})