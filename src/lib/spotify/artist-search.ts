import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getAccessToken } from './auth'; // Relies on client-side auth handling
import type { SpotifyArtist } from './types'; // Assuming types are still in ./types

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Type for the raw Spotify search API response
interface SpotifySearchResponse {
  artists: {
    items: SpotifyArtist[];
    // Add other pagination fields if needed
  };
}

// Function to search for artists (Client-side context)
export const searchArtists = async (query: string, limit = 5): Promise<SpotifySearchResponse | null> => {
  if (!query.trim()) return { artists: { items: [] } };

  try {
    // This will likely need a user access token from the session for client-side calls
    const token = await getAccessToken(); // Might throw if not implemented correctly client-side
    const response = await fetch(
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      throw new Error(`Failed to search artists: ${response.statusText}`);
    }
    const data: SpotifySearchResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching artists:', error);
    toast.error("Failed to search Spotify artists.");
    return null; // Return null on error
  }
};

// Get artist info by name (Client-side context)
export const getArtistByName = async (name: string): Promise<SpotifyArtist | null> => {
  try {
    const token = await getAccessToken(); // Might throw
    const response = await fetch(
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      throw new Error(`Failed to search artist: ${response.statusText}`);
    }

    const data: SpotifySearchResponse = await response.json();

    if (!data.artists || data.artists.items.length === 0) {
      console.log(`No artist found with name: ${name}`);
      return null; // Return null if not found
    }

    return data.artists.items[0]; // Return the first match
  } catch (error) {
    console.error(`Error searching for artist '${name}':`, error);
    toast.error(`Failed to find Spotify artist: ${name}`);
    // Don't re-throw, return null
    return null;
  }
};

// Function to get artist by ID (Client-side context)
export const getArtistById = async (artistId: string): Promise<SpotifyArtist | null> => {
  try {
    const token = await getAccessToken(); // Might throw
    const response = await fetch(`${SPOTIFY_API_BASE}/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
       if (response.status === 404) return null; // Not found
      throw new Error(`Failed to get artist: ${response.statusText}`);
    }

    const data: SpotifyArtist = await response.json();
    return data;
  } catch (error) {
    console.error(`Error getting artist by ID '${artistId}':`, error);
    toast.error(`Failed to get Spotify artist details.`);
    return null;
  }
};

// NOTE: resolveArtistId function was removed as it contained database logic
// that should now be handled server-side (e.g., within the import-artist Edge Function).
// Client-side code should primarily fetch data, not resolve/update DB records directly.