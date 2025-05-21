import { SpotifyTrack, SpotifyTracksResponse, SpotifyArtist } from './types.ts';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Get Spotify API token using client credentials flow (Edge Function context)
// NOTE: This fetches a new token on every call, suitable for stateless functions.
// Consider caching strategies (e.g., Supabase secrets, external cache) if rate limits become an issue.
export const getSpotifyAccessToken = async (): Promise<string> => {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('[EF Spotify Auth] Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in Edge Function environment variables.');
    throw new Error('Server configuration error: Missing Spotify credentials.');
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Use btoa from Deno's standard library or a polyfill if needed, but it's usually available
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[EF Spotify Auth] Failed to get Spotify access token: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`Failed to get Spotify access token: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.access_token) {
       throw new Error('Spotify token response did not contain access_token');
    }
    console.log('[EF Spotify Auth] Successfully obtained Spotify access token.');
    return data.access_token;
  } catch (error) {
    console.error('[EF Spotify Auth] Error getting Spotify access token:', error);
    throw error; // Re-throw
  }
};

// Get all tracks for an artist (Adapted from src/lib/spotify/all-tracks.ts)
// Note: Removed the DB caching logic as Edge Functions should rely on external state.
// The calling function (e.g., import-artist) can handle DB checks if needed.
export const getArtistAllTracks = async (artistSpotifyId: string): Promise<SpotifyTracksResponse> => {
  try {
    console.log(`[EF Spotify Tracks] Fetching complete track catalog for artist Spotify ID: ${artistSpotifyId}`);
    const token = await getSpotifyAccessToken();

    // Fetch top tracks first
    const topTracksResponse = await fetch(
      `${SPOTIFY_API_BASE}/artists/${artistSpotifyId}/top-tracks?market=US`, // Use a relevant market
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!topTracksResponse.ok) {
      console.error(`[EF Spotify Tracks] Failed to get top tracks: ${topTracksResponse.statusText}`);
      return { tracks: [] }; // Return empty on failure
    }
    const topTracksData = await topTracksResponse.json();
    if (!topTracksData.tracks || !Array.isArray(topTracksData.tracks)) {
      console.error("[EF Spotify Tracks] Invalid top tracks data received from Spotify");
      return { tracks: [] };
    }

    // Use a Set to efficiently track unique track IDs
    const trackIds = new Set<string>();
    const allTracks: SpotifyTrack[] = [];

    topTracksData.tracks.forEach((track: any) => {
      if (track.id && !trackIds.has(track.id)) {
        trackIds.add(track.id);
        allTracks.push({
          id: track.id,
          name: track.name,
          duration_ms: track.duration_ms,
          popularity: track.popularity,
          preview_url: track.preview_url,
        });
      }
    });

    // Fetch albums (limit to reduce API calls, adjust as needed)
    const albumsResponse = await fetch(
      `${SPOTIFY_API_BASE}/artists/${artistSpotifyId}/albums?include_groups=album,single&limit=20&market=US`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (albumsResponse.ok) {
      const albumsData = await albumsResponse.json();
      if (albumsData.items && Array.isArray(albumsData.items)) {
        console.log(`[EF Spotify Tracks] Found ${albumsData.items.length} albums/singles for artist ${artistSpotifyId}`);
        // Fetch tracks for each album concurrently
        const albumTrackPromises = albumsData.items.map(async (album: any) => {
          try {
            const tracksResponse = await fetch(
              `${SPOTIFY_API_BASE}/albums/${album.id}/tracks?limit=50&market=US`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!tracksResponse.ok) return []; // Skip album on error
            const tracksData = await tracksResponse.json();
            return tracksData.items || [];
          } catch (albumErr) {
            console.warn(`[EF Spotify Tracks] Error fetching tracks for album ${album.id}:`, albumErr);
            return [];
          }
        });

        const albumTracksArrays = await Promise.all(albumTrackPromises);

        // Add tracks from albums, avoiding duplicates
        albumTracksArrays.flat().forEach((track: any) => {
          if (track.id && !trackIds.has(track.id)) {
            trackIds.add(track.id);
            allTracks.push({
              id: track.id,
              name: track.name,
              duration_ms: track.duration_ms,
              popularity: track.popularity, // May not be present on album tracks endpoint
              preview_url: track.preview_url,
            });
          }
        });
      } else {
         console.warn("[EF Spotify Tracks] Invalid albums data received from Spotify");
      }
    } else {
       console.warn(`[EF Spotify Tracks] Failed to get albums: ${albumsResponse.statusText}`);
    }

    console.log(`[EF Spotify Tracks] Fetched ${allTracks.length} unique tracks for artist ${artistSpotifyId}`);
    return { tracks: allTracks };

  } catch (error) {
    console.error(`[EF Spotify Tracks] Error getting all artist tracks for ${artistSpotifyId}:`, error);
    return { tracks: [] }; // Return empty on error
  }
};


// Get artist info by name (Adapted from src/lib/spotify/artist-search.ts)
export const getArtistByName = async (name: string): Promise<SpotifyArtist | null> => {
  try {
    console.log(`[EF Spotify Search] Searching for artist by name: ${name}`);
    const token = await getSpotifyAccessToken();
    const response = await fetch(
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      console.error(`[EF Spotify Search] Failed to search artist: ${response.statusText}`);
      throw new Error(`Failed to search artist: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.artists || !data.artists.items || data.artists.items.length === 0) {
      console.log(`[EF Spotify Search] No artist found with name: ${name}`);
      return null; // Return null instead of throwing
    }

    console.log(`[EF Spotify Search] Found artist: ${data.artists.items[0].name}`);
    // Map to our simplified SpotifyArtist type
    const item = data.artists.items[0];
    return {
        id: item.id,
        name: item.name,
        external_urls: item.external_urls,
        popularity: item.popularity,
        followers: item.followers,
        images: item.images,
        genres: item.genres,
    };
  } catch (error) {
    console.error(`[EF Spotify Search] Error searching for artist '${name}':`, error);
    throw error; // Re-throw
  }
};

// NOTE: getArtistById and resolveArtistId could also be moved here if needed.
// resolveArtistId in particular might need significant changes as it interacts with the DB.