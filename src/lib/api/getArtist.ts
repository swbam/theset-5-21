import { supabase } from '@/integrations/supabase/client';
import { getArtistTopTracks as fetchSpotifyTopTracks } from '@/lib/spotify/top-tracks';
import { SpotifyTrack, SpotifyTracksResponse } from '@/lib/spotify/types';

// Cache durations in milliseconds
const CACHE_DURATIONS = {
  ARTIST: 24 * 60 * 60 * 1000, // 24 hours
  TRACKS: 12 * 60 * 60 * 1000  // 12 hours
};

// Define types for better type safety
interface SpotifyArtist {
  id: string;
  name: string;
  images?: Array<{ url: string }>;
  followers?: { total: number };
  popularity?: number;
  genres?: string[];
  external_urls?: { spotify: string };
}

// Extended track interface with album details
interface ExtendedSpotifyTrack extends SpotifyTrack {
  album_image_url?: string;
  album_id?: string;
  spotify_url?: string;
  external_urls?: { spotify: string };
}

/**
 * Get artist data with lazy loading strategy
 * 1. Try to get from database first
 * 2. If not found or stale, fetch from Spotify API
 * 3. Store in database for future use
 */
export async function getArtist(artistId: string) {
  try {
    if (!artistId) {
      throw new Error('Artist ID is required');
    }

    // 1. Try to get from database first (fast)
    const { data: dbArtist, error: dbError } = await supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .single();

    if (dbArtist && !dbError) {
      // Check if data is fresh enough (less than 24 hours old)
      const lastUpdated = new Date(dbArtist.updated_at);
      const now = new Date();
      const timeSinceUpdate = now.getTime() - lastUpdated.getTime();
      
      if (timeSinceUpdate < CACHE_DURATIONS.ARTIST) {
        console.log(`Using cached artist data for ${dbArtist.name}`);
        return dbArtist;
      }
      // Data is stale, will refresh from API
      console.log(`Artist data for ${dbArtist.name} is stale, refreshing...`);
    }

    // 2. Fetch from Spotify API
    const spotifyArtist = await fetchSpotifyArtist(artistId);
    
    if (!spotifyArtist) {
      // If API fetch fails but we have stale data, return that
      if (dbArtist) {
        console.log(`API fetch failed, using stale data for ${dbArtist.name}`);
        return dbArtist;
      }
      throw new Error('Failed to fetch artist data from Spotify');
    }
    
    // 3. Store in database for future use
    const { data: updatedArtist, error: updateError } = await supabase
      .from('artists')
      .upsert({
        id: spotifyArtist.id,
        name: spotifyArtist.name,
        spotify_id: spotifyArtist.id,
        image_url: spotifyArtist.images?.[0]?.url || null,
        followers: spotifyArtist.followers?.total || 0,
        popularity: spotifyArtist.popularity || 0,
        genres: spotifyArtist.genres || [],
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (updateError) {
      console.error('Error updating artist in database:', updateError);
      // If update fails but we have the Spotify data, return that
      return spotifyArtist;
    }
    
    // 4. Fetch and store top tracks
    await fetchAndStoreTopTracks(artistId);
    
    return updatedArtist?.[0] || spotifyArtist;
  } catch (error) {
    console.error('Error in getArtist:', error);
    throw error;
  }
}

/**
 * Fetch artist's top tracks and store them in the database
 */
async function fetchAndStoreTopTracks(artistId: string) {
  try {
    // Always refresh tracks for now - we can add caching logic later
    // when the table structure is confirmed
    
    // Fetch top tracks from Spotify
    const tracksResponse = await fetchSpotifyTopTracks(artistId);
    
    if (!tracksResponse) {
      console.error('No tracks data returned from Spotify');
      return;
    }
    
    // Extract tracks from response
    let tracks: SpotifyTrack[] = [];
    if (Array.isArray(tracksResponse)) {
      tracks = tracksResponse;
    } else if ('tracks' in tracksResponse && Array.isArray(tracksResponse.tracks)) {
      tracks = tracksResponse.tracks;
    } else {
      console.error('Invalid tracks data format returned from Spotify');
      return;
    }
    
    // Store tracks in database
    for (const track of tracks) {
      // Extract album image and ID if available
      let albumImageUrl = null;
      let albumId = null;
      let spotifyUrl = null;
      
      // Handle different track formats
      const extendedTrack = track as ExtendedSpotifyTrack;
      
      if (extendedTrack.external_urls?.spotify) {
        spotifyUrl = extendedTrack.external_urls.spotify;
      } else if (extendedTrack.spotify_url) {
        spotifyUrl = extendedTrack.spotify_url;
      }
      
      if (extendedTrack.album_image_url) {
        albumImageUrl = extendedTrack.album_image_url;
      }
      
      if (extendedTrack.album_id) {
        albumId = extendedTrack.album_id;
      }
      
      const { error: trackError } = await supabase
        .from('top_tracks')
        .upsert({
          id: track.id,
          artist_id: artistId,
          name: track.name,
          album: typeof track.album === 'string' ? track.album : null,
          album_id: albumId,
          spotify_id: track.id,
          duration_ms: track.duration_ms || 0,
          popularity: track.popularity || 0,
          preview_url: track.preview_url || null,
          spotify_url: spotifyUrl,
          album_image_url: albumImageUrl,
          updated_at: new Date().toISOString()
        });
      
      if (trackError) {
        console.error(`Error storing track ${track.name}:`, trackError);
      }
    }
    
    console.log(`Stored ${tracks.length} top tracks for artist ${artistId}`);
  } catch (error) {
    console.error('Error fetching and storing top tracks:', error);
  }
}

/**
 * Fetch artist data from Spotify API
 */
async function fetchSpotifyArtist(artistId: string): Promise<SpotifyArtist | null> {
  try {
    // Get Spotify credentials
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Missing Spotify credentials');
    }
    
    // Get access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Spotify token error: ${tokenResponse.status}`);
    }
    
    const { access_token } = await tokenResponse.json();
    
    // Get artist data
    const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    if (!artistResponse.ok) {
      throw new Error(`Spotify artist API error: ${artistResponse.status}`);
    }
    
    return await artistResponse.json();
  } catch (error) {
    console.error('Error fetching artist from Spotify:', error);
    return null;
  }
}

/**
 * Get artist's top tracks from database
 */
export async function getArtistTopTracksFromDb(artistId: string) {
  try {
    // Try to get from database first
    const { data: tracks, error } = await supabase
      .from('top_tracks')
      .select('*')
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false })
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    // If no tracks in database, fetch and store them
    if (!tracks || tracks.length === 0) {
      await fetchAndStoreTopTracks(artistId);
      
      // Try again after fetching
      const { data: refreshedTracks, error: refreshError } = await supabase
        .from('top_tracks')
        .select('*')
        .eq('artist_id', artistId)
        .order('popularity', { ascending: false })
        .limit(10);
      
      if (refreshError) {
        throw refreshError;
      }
      
      return refreshedTracks || [];
    }
    
    return tracks;
  } catch (error) {
    console.error('Error getting artist top tracks:', error);
    return [];
  }
}