import { supabase } from "@/integrations/supabase/client";
import { getArtistAllTracks } from "@/lib/spotify";
import { toast } from "sonner";
import { getStoredTracksForArtist, updateArtistStoredTracks } from "./tracks";

/**
 * Save artist to database
 */
export async function saveArtistToDatabase(artist: any) {
  try {
    if (!artist || !artist.id) {
      console.error("Invalid artist object:", artist);
      return null;
    }
    
    console.log(`Saving artist to database: ${artist.name} (ID: ${artist.id})`);
    
    // Check if artist already exists
    try {
      const { data: existingArtist, error: checkError } = await supabase
        .from('artists')
        .select('id, updated_at, stored_tracks, spotify_id, upcoming_shows')
        .eq('id', artist.id)
        .maybeSingle();
      
      if (checkError) {
        console.error("Error checking artist in database:", checkError);
        // Continue with insert/update anyway
      }
      
      // If artist exists and was updated in the last 7 days, only update if we have new data
      if (existingArtist) {
        const lastUpdated = new Date(existingArtist.updated_at || 0);
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        
        console.log(`Artist ${artist.name} exists, last updated ${daysSinceUpdate.toFixed(1)} days ago`);
        
        // Check if we need to update
        const needsUpdate = 
          daysSinceUpdate > 7 || // More than 7 days old
          !existingArtist.stored_tracks || // No stored tracks
          (artist.spotify_id && !existingArtist.spotify_id) || // New Spotify ID available
          (artist.upcoming_shows && artist.upcoming_shows > (existingArtist.upcoming_shows || 0)); // More upcoming shows
        
        if (!needsUpdate) {
          console.log(`No update needed for artist ${artist.name}`);
          return existingArtist;
        }
        
        console.log(`Updating artist ${artist.name} with fresh data`);
      } else {
        console.log(`Artist ${artist.name} is new, creating record`);
      }
    } catch (checkError) {
      console.error("Error checking if artist exists:", checkError);
      // Continue to try adding the artist anyway
    }
    
    // Prepare artist data for upsert
    const artistData: any = {
      id: artist.id,
      name: artist.name,
      image_url: artist.image || artist.image_url,
      genres: Array.isArray(artist.genres) ? artist.genres : [],
      popularity: artist.popularity || 0,
      upcoming_shows: artist.upcomingShows || artist.upcoming_shows || 0,
      spotify_id: artist.spotify_id || null,
      updated_at: new Date().toISOString()
    };
    
    // Only add stored_tracks if they exist
    if (artist.stored_tracks) {
      // Convert to JSON-compatible format
      artistData.stored_tracks = JSON.parse(JSON.stringify(artist.stored_tracks));
    }
    
    // For debugging: log what we're trying to insert
    console.log("Inserting/updating artist with data:", JSON.stringify(artistData, null, 2));
    
    // Insert or update artist - wrapped in try/catch to handle permission errors
    try {
      const { data, error } = await supabase
        .from('artists')
        .upsert(artistData)
        .select();
      
      if (error) {
        console.error("Error saving artist to database:", error);
        
        // If it's a permission error, try a fallback insert-only approach
        if (error.code === '42501' || error.message.includes('permission denied')) {
          console.log("Permission error detected. Trying insert-only approach...");
          
          const { data: insertData, error: insertError } = await supabase
            .from('artists')
            .insert(artistData)
            .select();
            
          if (insertError) {
            console.error("Insert-only approach also failed:", insertError);
            return artistData; // Return our data object as fallback
          }
          
          console.log("Insert-only approach succeeded");
          return insertData?.[0] || artistData;
        }
        
        return artistData; // Return our data object as fallback
      }
      
      console.log(`Successfully saved artist ${artist.name} to database`);
      
      // After creating/updating the artist, if they don't have stored tracks, fetch them from Spotify
      const savedArtist = data?.[0] || artistData;
      if ((!savedArtist.stored_tracks) && artistData.spotify_id) {
        console.log(`No stored tracks found for artist ${artist.id}, fetching from Spotify...`);
        
        // Don't await - let this run in the background
        fetchAndStoreArtistTracks(artist.id, artistData.spotify_id, artist.name)
          .catch(err => console.error("Error fetching tracks:", err));
      }
      
      return savedArtist;
    } catch (saveError) {
      console.error("Error in saveArtistToDatabase:", saveError);
      return artistData; // Return our data object as fallback
    }
  } catch (error) {
    console.error("Error in saveArtistToDatabase:", error);
    return artist; // Return the original artist as fallback
  }
}

/**
 * Fetches artist's tracks from Spotify and stores them individually in the songs table.
 */
export async function fetchAndStoreArtistTracks(artistId: string, spotifyId: string, artistName: string) {
  console.log(`Fetching tracks for artist ${artistName} (${spotifyId})`);

  try {
    // Basic check: Consider adding time-based logic to refetch periodically
    // For now, we always fetch if spotifyId is provided.

    // Fetch tracks from Spotify
    // Ensure getArtistAllTracks is implemented and fetches top tracks or relevant tracks
    const tracksData = await getArtistAllTracks(spotifyId); 

    if (!tracksData || !tracksData.tracks || tracksData.tracks.length === 0) {
      console.log(`No tracks found on Spotify for artist ${artistName}`);
      // Update artist record to note that tracks were checked
      await supabase
        .from('artists')
        .update({ tracks_last_updated: new Date().toISOString() })
        .eq('id', artistId);
      return []; // Return empty array as no tracks were found/saved
    }

    console.log(`Found ${tracksData.tracks.length} tracks for artist ${artistName}, storing in songs table...`);

    // Map Spotify tracks to the 'songs' table structure
    const songsToUpsert = tracksData.tracks.map((track: any) => ({
      // Ensure these fields match your 'songs' table columns
      spotify_id: track.id, // Using Spotify ID as the unique identifier
      name: track.name,
      artist_id: artistId, // Link to the artist in your DB
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      preview_url: track.preview_url,
      // Add other relevant fields like album info if available and needed in your 'songs' table
      // Example: album_name: track.album?.name, album_image_url: track.album?.images?.[0]?.url
      // vote_count: 0, // Initialize vote_count if it exists and needs a default
    }));

    // Upsert songs into the database
    // Make sure 'spotify_id' has a UNIQUE constraint in your 'songs' table.
    const { data: upsertedSongsData, error: upsertError } = await supabase
      .from('songs')
      .upsert(songsToUpsert, { 
          onConflict: 'spotify_id', // The column with the UNIQUE constraint
          ignoreDuplicates: false // Set to false to update existing matched rows
      })
      .select(); // Select the upserted rows to return them

    if (upsertError) {
      console.error(`Database error storing songs for artist ${artistName}:`, upsertError);
      // Log the error but potentially update timestamp to prevent immediate retries
      try {
        await supabase
          .from('artists')
          .update({ tracks_last_updated: new Date().toISOString() })
          .eq('id', artistId);
      } catch (tsError) { console.error('Failed to update timestamp after song upsert error:', tsError); }
      return null; // Indicate failure
    }

    const savedSongsCount = upsertedSongsData?.length || 0;
    console.log(`Successfully upserted ${savedSongsCount} songs for artist ${artistName}`);

    // Update artist record with last track update time
    await supabase
      .from('artists')
      .update({
        tracks_last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString() // Also update the main updated_at timestamp
      })
      .eq('id', artistId);

    // Return the songs as they are in the database after upsert
    return upsertedSongsData; 

  } catch (error) {
    console.error(`Error fetching and storing tracks for artist ${artistName}:`, error);
    // Attempt to update timestamp even on general error to avoid retrying too quickly
    try {
      await supabase
        .from('artists')
        .update({ tracks_last_updated: new Date().toISOString() }) 
        .eq('id', artistId);
    } catch (updateError) {
      console.error(`Failed to update artist timestamp after track fetch error:`, updateError);
    }
    return null; // Indicate failure
  }
}

/**
 * Get artist by ID
 */
export async function getArtistById(artistId: string) {
  try {
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching artist from database:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error in getArtistById:", error);
    return null;
  }
}
