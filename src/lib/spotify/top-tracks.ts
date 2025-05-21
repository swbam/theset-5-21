
import { getAccessToken } from './auth';
import { getStoredTracksFromDb } from './utils';
import { getArtistAllTracks } from './all-tracks';
import { SpotifyTrack, SpotifyTracksResponse } from './types';
import { supabase } from '@/integrations/supabase/client';

// Get top tracks for an artist
export const getArtistTopTracks = async (artistId: string, limit = 10): Promise<SpotifyTracksResponse> => {
  try {
    // Check if we have stored tracks in the database
    const storedTracks = await getStoredTracksFromDb(artistId);
    
    if (storedTracks && storedTracks.length > 0) {
      console.log("Using stored tracks from database");
      // Return top tracks sorted by popularity
      return { 
        tracks: storedTracks
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, limit)
      };
    }
    
    // If no stored tracks, fetch the complete catalog first
    await getArtistAllTracks(artistId);
    
    // Then get the artist data again
    const { data: refreshedData, error: refreshError } = await supabase
      .from('artists')
      .select('stored_tracks')
      .eq('id', artistId)
      .maybeSingle();
      
    if (!refreshError && refreshedData && refreshedData.stored_tracks && 
        Array.isArray(refreshedData.stored_tracks)) {
      // Properly cast the Json to SpotifyTrack[]
      const tracks = refreshedData.stored_tracks as unknown as SpotifyTrack[];
      return { 
        tracks: tracks
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, limit)
      };
    }
    
    // Fallback if something went wrong
    return { tracks: [] };
      
  } catch (error) {
    console.error('Error getting artist top tracks:', error);
    // In case of error, return empty array
    return { tracks: [] };
  }
};
