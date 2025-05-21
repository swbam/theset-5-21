import { supabaseAdmin } from './supabaseClient.ts';
import type { SpotifyTrack } from './types.ts';
// Assuming Spotify API logic is moved to a shared utility or another function
import { getArtistAllTracks } from './spotifyUtils.ts'; // Adjust if Spotify logic is elsewhere

/**
 * Store artist songs in the database (used internally by fetchAndStoreArtistTracks)
 */
async function storeSongsInDatabase(artistId: string, tracks: SpotifyTrack[]) {
  if (!tracks || tracks.length === 0) return false; // Return boolean for consistency

  try {
    console.log(`Storing ${tracks.length} songs for artist ${artistId}`);

    const batchSize = 50; // Supabase recommends batch sizes around 50-100

    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);

      const songs = batch.map(track => ({
        // Assuming your 'songs' table has these columns
        // Generate a UUID for the song ID if your table requires it and it's not auto-generated
        // id: crypto.randomUUID(), // Uncomment if needed
        name: track.name,
        artist_id: artistId, // Ensure this artistId corresponds to the DB entry
        spotify_id: track.id,
        duration_ms: track.duration_ms,
        popularity: track.popularity || 0,
        preview_url: track.preview_url || null,
        updated_at: new Date().toISOString()
      }));

      // Use the admin client imported for Edge Functions
      const { error } = await supabaseAdmin
        .from('songs')
        .upsert(songs, {
          onConflict: 'spotify_id', // Ensure this constraint exists on your 'songs' table
          ignoreDuplicates: false // Update existing songs based on spotify_id
        });

      if (error) {
        console.error(`[storeSongsInDatabase] Error storing songs batch for artist ${artistId}:`, error);
        // Throw error to signal failure to the calling function
        throw new Error(`Failed to store song batch for artist ${artistId}. Code: ${error.code}, Message: ${error.message}`);
      }
    }

    console.log(`Successfully stored/updated ${tracks.length} songs for artist ${artistId}`);
    return true;
  } catch (error) {
    console.error(`Error in storeSongsInDatabase for artist ${artistId}:`, error);
    // Re-throw the error so fetchAndStoreArtistTracks knows it failed
    throw error;
  }
}


/**
 * Fetch and store artist tracks from Spotify
 * NOTE: Depends on getArtistAllTracks being available in the shared scope.
 */
export async function fetchAndStoreArtistTracks(
  artistId: string, // This should be the ID from your 'artists' table
  spotifyId: string,
  artistName: string // For logging
): Promise<boolean> {
  try {
    console.log(`Fetching Spotify tracks for artist ${artistName} (Spotify ID: ${spotifyId}, DB ID: ${artistId})`);

    // Get tracks from Spotify (ensure getArtistAllTracks handles auth via Deno.env)
    const tracksResult = await getArtistAllTracks(spotifyId); // Assuming this returns { tracks: SpotifyTrack[] } | null

    if (!tracksResult || !tracksResult.tracks || tracksResult.tracks.length === 0) {
      console.log(`No Spotify tracks found for artist ${artistName}`);
      return false; // Indicate no tracks found, but not necessarily an error
    }

    console.log(`Got ${tracksResult.tracks.length} Spotify tracks for artist ${artistName}`);

    // Store tracks in the songs table using the internal DB artist ID
    await storeSongsInDatabase(artistId, tracksResult.tracks);

    return true; // Indicate success
  } catch (error) {
    console.error(`Error in fetchAndStoreArtistTracks for ${artistName} (Spotify ID: ${spotifyId}):`, error);
    return false; // Indicate failure
  }
}

// NOTE: getStoredTracksForArtist and updateArtistStoredTracks might not be needed
// directly by the Edge Functions if the logic is self-contained, but can be kept
// here if other shared utilities might use them.

/**
 * Get stored tracks for an artist from the database
 */
export async function getStoredTracksForArtist(artistId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('songs')
      .select('id, name, spotify_id, duration_ms, preview_url, popularity')
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false });

    if (error) {
      console.error("Error fetching stored tracks for artist:", error);
      return null;
    }
    return data;
  } catch (error) {
    console.error("Error in getStoredTracksForArtist:", error);
    return null;
  }
}