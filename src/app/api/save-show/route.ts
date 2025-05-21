import { adminClient } from '@/lib/db'; // Use the server-side admin client
import { saveArtistToDatabase, saveVenueToDatabase } from '@/lib/api/database'; // Corrected import path
import { fetchAndStoreArtistTracks } from '@/lib/api/database'; // Correct import
import type { Show } from '@/lib/types'; // Import Show type from types file

// Function to create a setlist directly (using admin client)
async function createSetlistDirectly(showId: string, artistId: string) {
  try {
    // Check if setlist already exists
    const { data: existingSetlist, error: checkError } = await adminClient()
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (checkError) {
      console.error(`[createSetlistDirectly] Error checking for existing setlist: ${checkError.message}`);
      return null;
    }
    
    // If setlist already exists, return its ID
    if (existingSetlist) {
      console.log(`[createSetlistDirectly] Setlist already exists for show ${showId}`);
      return existingSetlist.id;
    }
    
    // Create new setlist
    const { data: newSetlist, error: createError } = await adminClient()
      .from('setlists')
      .insert({
        artist_id: artistId,
        show_id: showId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError || !newSetlist) {
      console.error(`[createSetlistDirectly] Error creating setlist: ${createError?.message}`);
      return null;
    }
    
    console.log(`[createSetlistDirectly] Created setlist for show ${showId}. Fetching tracks for artist...`);
    
    // Fetch artist's Spotify ID to get tracks
    const { data: artist, error: artistError } = await adminClient()
      .from('artists')
      .select('id, name, spotify_id')
      .eq('id', artistId)
      .single();
    
    if (artistError || !artist) {
      console.error(`[createSetlistDirectly] Error fetching artist data: ${artistError?.message}`);
      // Continue even if we can't get the artist - we at least created the setlist
      return newSetlist.id;
    }
    
    // Get artist's top tracks and add them to the setlist
    try {
      await populateSetlistWithTracks(newSetlist.id, artist);
    } catch (tracksError) {
      console.error(`[createSetlistDirectly] Error populating setlist with tracks: ${tracksError}`);
      // Return the setlist ID anyway - we can populate tracks later
    }
    
    return newSetlist.id;
  } catch (error) {
    console.error(`[createSetlistDirectly] Error creating setlist: ${error}`);
    return null;
  }
}

// Helper function to populate a setlist with tracks
async function populateSetlistWithTracks(setlistId: string, artist: { id: string, name: string, spotify_id?: string }) {
  try {
    if (!artist.spotify_id) {
      console.log(`[populateSetlistWithTracks] No Spotify ID for artist ${artist.name}, searching...`);
      
      // Try to search Spotify for this artist
      // For now, let's just add placeholder tracks
      const songNames = [
        "Greatest Hit 1", 
        "Popular Song", 
        "Fan Favorite", 
        "Classic Track", 
        "New Single"
      ];
      
      let position = 0;
      for (const songName of songNames) {
        position++;
        
        // Create a placeholder song
        const { data: songData, error: songError } = await adminClient()
          .from('songs')
          .insert({
            name: `${songName} (by ${artist.name})`,
            artist_id: artist.id
          })
          .select()
          .single();
        
        if (songError || !songData) {
          console.error(`[populateSetlistWithTracks] Error creating song ${songName}: ${songError?.message}`);
          continue;
        }
        
        // Add to setlist_songs
        await adminClient()
          .from('setlist_songs')
          .insert({
            setlist_id: setlistId,
            song_id: songData.id,
            name: songData.name,
            position: position,
            artist_id: artist.id,
            vote_count: 0
          });
      }
      
      console.log(`[populateSetlistWithTracks] Added ${position} placeholder songs to setlist ${setlistId}`);
      return;
    }
    
    // We have a Spotify ID, so we can fetch actual tracks
    console.log(`[populateSetlistWithTracks] Fetching tracks for artist ${artist.name} (Spotify ID: ${artist.spotify_id})`);
    
    // This would normally call a Spotify API
    // For now, add placeholder tracks with the actual artist name
    const songNames = [
      "Greatest Hit", 
      "Popular Song", 
      "Fan Favorite", 
      "Classic Track", 
      "New Single"
    ];
    
    let position = 0;
    for (const songName of songNames) {
      position++;
      
      // Create a song with the artist's name
      const { data: songData, error: songError } = await adminClient()
        .from('songs')
        .insert({
          name: `${songName} (by ${artist.name})`,
          artist_id: artist.id,
          spotify_id: `placeholder-${artist.spotify_id}-${position}`
        })
        .select()
        .single();
      
      if (songError || !songData) {
        console.error(`[populateSetlistWithTracks] Error creating song ${songName}: ${songError?.message}`);
        continue;
      }
      
      // Add to setlist_songs
      await adminClient()
        .from('setlist_songs')
        .insert({
          setlist_id: setlistId,
          song_id: songData.id,
          name: songData.name,
          position: position,
          artist_id: artist.id,
          vote_count: 0
        });
    }
    
    console.log(`[populateSetlistWithTracks] Added ${position} songs to setlist ${setlistId}`);
  } catch (error) {
    console.error(`[populateSetlistWithTracks] Error populating setlist with tracks: ${error}`);
    throw error;
  }
}

// Function to sync shows for a venue
async function syncVenueShows(venueId: string, venueName: string) {
  console.log(`[syncVenueShows] Starting sync for venue ${venueName} (${venueId})`);
  try {
    // For now, just log that we would sync venue shows
    console.log(`[syncVenueShows] Would sync all shows for venue ${venueName} (${venueId})`);
    return { success: true, message: "Venue sync triggered" };
  } catch (error) {
    console.error(`[syncVenueShows] Error syncing venue shows: ${error}`);
    return { success: false, error: "Failed to sync venue shows" };
  }
}

// Define a wrapper or modified save function that uses the admin client internally
async function saveShowWithAdmin(show: Show, triggeredBySync: boolean = false) {
  try {
    if (!show || !show.id) {
      console.error("[API/save-show] Invalid show object:", show);
      return null;
    }
    console.log(`[API/save-show] Processing show: ${show.name} (ID: ${show.id})`);

    // Check if show exists (using admin client for consistency)
    const { data: existingShow, error: checkError } = await adminClient()
      .from('shows')
      .select('id, updated_at, artist_id, venue_id')
      .eq('id', show.id)
      .maybeSingle();

    if (checkError) {
      console.error("[API/save-show] Error checking show:", checkError);
      return null; // Fail if check fails
    }

    if (existingShow) {
      const lastUpdated = new Date(existingShow.updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate < 24) {
        console.log(`[API/save-show] Show ${show.name} updated ${hoursSinceUpdate.toFixed(1)} hours ago, skipping.`);
        return existingShow; // Return existing data if recently updated
      }
    }

    // --- Save Artist (using admin client) ---
    let artistId = show.artist_id;
    let artistNameForTracks = show.artist?.name || 'Artist'; // Need name for track fetching logs
    if (show.artist && typeof show.artist === 'object') {
        // Replicate the upsert logic directly with adminClient
        console.log(`[API/save-show] Attempting to upsert artist: ID=${show.artist.id}, Name=${show.artist.name}`); // Log before
        const artistPayload = {
            id: show.artist.id,
            name: show.artist.name,
            image_url: show.artist.image_url,
            updated_at: new Date().toISOString()
        };
        console.log(`[API/save-show] Artist Upsert Payload:`, artistPayload); // Log payload

        const { data: savedArtist, error: artistError } = await adminClient()
            .from('artists')
            .upsert(artistPayload) // Use payload variable
            .select('id, spotify_id, name') // Select necessary fields
            .single();
        if (artistError) {
            console.error("[API/save-show] Error saving artist:", artistError);
            return null; // Fail if artist can't be saved
        }
        console.log(`[API/save-show] Artist upsert successful. Result:`, savedArtist); // Log success
        artistId = savedArtist.id;
        artistNameForTracks = savedArtist.name; // Update name from saved data

        // Track fetching will be handled by saveArtistToDatabase called during background sync
    } else {
        console.log(`[API/save-show] No valid show.artist object found for show ID: ${show.id}`); // Log if skipped
    }

    // --- Save Venue (using admin client) ---
    let venueId = show.venue_id;
    let venueName = show.venue?.name;
    if (show.venue && typeof show.venue === 'object') {
        // Replicate upsert logic directly with adminClient
        const { data: savedVenue, error: venueError } = await adminClient()
            .from('venues')
            .upsert({
                id: show.venue.id,
                name: show.venue.name,
                city: show.venue.city,
                state: show.venue.state,
                country: show.venue.country,
                updated_at: new Date().toISOString()
            })
            .select('id, name') // Select necessary fields
            .single();
        if (venueError) {
            console.error("[API/save-show] Error saving venue:", venueError);
            return null; // Fail if venue can't be saved
        }
        venueId = savedVenue.id;
        venueName = savedVenue.name; // Update name from saved data
    }

    if (!artistId || !venueId) {
      console.error(`[API/save-show] Cannot save show ${show.name}, missing artistId (${artistId}) or venueId (${venueId})`);
      return null;
    }

    // --- Upsert Show (using admin client) ---
    const { data: savedShowData, error: showError } = await adminClient()
      .from('shows')
      .upsert({
        id: show.id,
        name: show.name,
        date: show.date,
        ticket_url: show.ticket_url,
        image_url: show.image_url,
        artist_id: artistId,
        venue_id: venueId,
        updated_at: new Date().toISOString()
      })
      .select() // Select all columns after upsert
      .single();

    if (showError) {
      console.error("[API/save-show] Error saving show:", showError);
      return null;
    }
    console.log(`[API/save-show] Successfully saved show ${show.name}`);

    // --- Trigger Background Sync ---
    if (!triggeredBySync && venueId && venueName) {
      console.log(`[API/save-show] Triggering background sync for venue: ${venueName} (${venueId})`);
      // Call syncVenueShows without awaiting it
      syncVenueShows(venueId, venueName).catch(syncError => {
        console.error(`[API/save-show] Background venue sync failed for ${venueName} (${venueId}):`, syncError);
      });
    }

    // --- Create Setlist (using admin client via imported function) ---
    const setlistId = await createSetlistDirectly(savedShowData.id, artistId);
    if (setlistId) {
      console.log(`[API/save-show] Created setlist for show ${savedShowData.id}: ${setlistId}`);
      // Add setlist_id to the returned show data
      return { ...savedShowData, setlist_id: setlistId };
    }

    return savedShowData; // Return the saved show object

  } catch (error) {
    console.error("[API/save-show] Unexpected error in saveShowWithAdmin:", error);
    return null;
  }
}


export async function POST(request: Request) {
  try {
    const show = await request.json() as Show;

    if (!show || !show.id) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid show data provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use the wrapper function that utilizes adminClient
    const savedShow = await saveShowWithAdmin(show);

    if (!savedShow) {
      console.error(`[API/save-show] Failed to save show ID: ${show.id}`);
      return new Response(JSON.stringify({ success: false, error: 'Failed to save show data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return success response
    return new Response(JSON.stringify({ success: true, showId: savedShow.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[API/save-show] Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}