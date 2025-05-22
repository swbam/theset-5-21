// This file is a bridge to the _shared/spotifyUtils.ts for compatibility
// Re-export all necessary functions from the shared utility files

import { getSpotifyAccessToken, getArtistByName, getArtistAllTracks } from '../../../functions/_shared/spotifyUtils.ts';

// Export Spotify API functions needed by process-sync-tasks
export async function searchArtists(artistName: string, limit = 1) {
  try {
    console.log(`[searchArtists] Searching for artist: ${artistName}`);
    const artist = await getArtistByName(artistName);
    if (!artist) {
      return { artists: { items: [] } };
    }
    
    // Return in the format expected by process-sync-tasks
    return {
      artists: {
        items: [artist]
      }
    };
  } catch (error) {
    console.error(`[searchArtists] Error searching for artist '${artistName}':`, error);
    return { artists: { items: [] } };
  }
}

export async function getArtist(artistId: string) {
  try {
    console.log(`[getArtist] Fetching artist with ID: ${artistId}`);
    const token = await getSpotifyAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      console.error(`[getArtist] Failed to get artist: ${response.statusText}`);
      throw new Error(`Failed to get artist: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[getArtist] Error fetching artist ID '${artistId}':`, error);
    throw error;
  }
}

// Re-export other functions that might be needed
export { getArtistAllTracks as getArtistTracks };