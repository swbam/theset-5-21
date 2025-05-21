
import { supabase } from '@/integrations/supabase/client';
import { SpotifyTrack, SpotifyTracksResponse } from './types';
import { Json } from '@/integrations/supabase/types';

// Safely convert stored tracks from Json to SpotifyTrack[]
export const convertStoredTracks = (storedTracks: Json | null): SpotifyTrack[] => {
  if (!storedTracks || !Array.isArray(storedTracks) || storedTracks.length === 0) {
    return [];
  }
  return storedTracks as unknown as SpotifyTrack[];
};

// Get stored tracks for an artist from database
export const getStoredTracksFromDb = async (artistId: string): Promise<SpotifyTrack[] | null> => {
  const { data: artistData, error } = await supabase
    .from('artists')
    .select('stored_tracks')
    .eq('id', artistId)
    .maybeSingle();
  
  if (error || !artistData || !artistData.stored_tracks) {
    return null;
  }
  
  return convertStoredTracks(artistData.stored_tracks);
};

// Save tracks to database for an artist
export const saveTracksToDb = async (artistId: string, tracks: SpotifyTrack[]): Promise<void> => {
  // Convert tracks to a JSON-compatible format but maintain type safety
  const tracksForStorage = tracks as unknown as Json;
  
  await supabase
    .from('artists')
    .update({ 
      stored_tracks: tracksForStorage,
      updated_at: new Date().toISOString()
    })
    .eq('id', artistId);
  
  console.log(`Stored ${tracks.length} tracks in database for artist ${artistId}`);
};
