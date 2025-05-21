import { getAccessToken } from './auth'; // Relies on client-side auth
import type { SpotifyTrack, SpotifyTracksResponse } from './types'; // Assuming types are still in ./types

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Type for raw Spotify track object from API
// Use Record<string, unknown> instead of any for index signature
type SpotifyApiTrack = { id: string; name: string; duration_ms?: number; popularity?: number; preview_url?: string | null; [key: string]: unknown };
// Type for raw Spotify album object from API
// Use Record<string, unknown> instead of any for index signature
type SpotifyApiAlbum = { id: string; name: string; [key: string]: unknown };


// Get all tracks for an artist (Client-side context - fetches directly from Spotify)
export const getArtistAllTracks = async (artistSpotifyId: string): Promise<SpotifyTracksResponse | null> => {
  try {
    console.log(`[Client Spotify] Fetching tracks for artist Spotify ID: ${artistSpotifyId}`);
    const token = await getAccessToken(); // Might throw if client-side auth fails

    // Fetch top tracks first
    const topTracksResponse = await fetch(
      `${SPOTIFY_API_BASE}/artists/${artistSpotifyId}/top-tracks?market=US`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!topTracksResponse.ok) {
      console.error(`[Client Spotify] Failed to get top tracks: ${topTracksResponse.statusText}`);
      // Decide if partial results are okay or if we should return null/throw
      return null;
    }
    const topTracksData = await topTracksResponse.json();
    if (!topTracksData.tracks || !Array.isArray(topTracksData.tracks)) {
      console.error("[Client Spotify] Invalid top tracks data received from Spotify");
      return null;
    }

    const trackIds = new Set<string>();
    const allTracks: SpotifyTrack[] = [];

    topTracksData.tracks.forEach((track: SpotifyApiTrack) => {
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

    // Fetch albums (limit to reduce API calls)
    const albumsResponse = await fetch(
      `${SPOTIFY_API_BASE}/artists/${artistSpotifyId}/albums?include_groups=album,single&limit=20&market=US`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (albumsResponse.ok) {
      const albumsData = await albumsResponse.json();
      if (albumsData.items && Array.isArray(albumsData.items)) {
        console.log(`[Client Spotify] Found ${albumsData.items.length} albums/singles for artist ${artistSpotifyId}`);
        const albumTrackPromises = albumsData.items.map(async (album: SpotifyApiAlbum) => {
          try {
            const tracksResponse = await fetch(
              `${SPOTIFY_API_BASE}/albums/${album.id}/tracks?limit=50&market=US`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!tracksResponse.ok) return [];
            const tracksData = await tracksResponse.json();
            return tracksData.items || [];
          } catch (albumErr) {
            console.warn(`[Client Spotify] Error fetching tracks for album ${album.id}:`, albumErr);
            return [];
          }
        });
        const albumTracksArrays = await Promise.all(albumTrackPromises);

        albumTracksArrays.flat().forEach((track: SpotifyApiTrack) => {
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
      } else {
         console.warn("[Client Spotify] Invalid albums data received from Spotify");
      }
    } else {
       console.warn(`[Client Spotify] Failed to get albums: ${albumsResponse.statusText}`);
    }

    console.log(`[Client Spotify] Fetched ${allTracks.length} unique tracks for artist ${artistSpotifyId}`);
    return { tracks: allTracks };

  } catch (error) {
    console.error(`[Client Spotify] Error getting all artist tracks for ${artistSpotifyId}:`, error);
    // Return null or throw depending on how TanStack Query should handle it
    return null;
  }
};