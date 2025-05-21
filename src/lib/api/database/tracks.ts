
import { supabase } from "@/integrations/supabase/client";

/**
 * Save tracks to database for an artist
 */
export async function updateArtistStoredTracks(artistId: string, tracks: any[]) {
  if (!artistId || !tracks || !Array.isArray(tracks)) {
    console.error("Invalid parameters for updateArtistStoredTracks");
    return;
  }
  
  try {
    console.log(`Updating stored tracks for artist ${artistId}: ${tracks.length} tracks`);
    const { error } = await supabase
      .from('artists')
      .update({ 
        stored_tracks: tracks,
        tracks_last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', artistId);
    
    if (error) {
      console.error("Error updating artist stored tracks:", error);
    } else {
      console.log(`Updated stored tracks for artist ${artistId}: ${tracks.length} tracks successfully stored`);
    }
  } catch (error) {
    console.error("Error in updateArtistStoredTracks:", error);
  }
}

/**
 * Fetch stored tracks for an artist
 */
export async function getStoredTracksForArtist(artistId: string) {
  try {
    console.log(`Fetching stored tracks for artist ${artistId}`);
    const { data: artist, error } = await supabase
      .from('artists')
      .select('stored_tracks, spotify_id, tracks_last_updated')
      .eq('id', artistId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching stored tracks for artist:", error);
      return null;
    }
    
    if (artist && artist.stored_tracks && Array.isArray(artist.stored_tracks)) {
      console.log(`Found ${artist.stored_tracks.length} stored tracks for artist ${artistId}`);
      
      // Check if tracks need refresh (older than 30 days)
      if (artist.tracks_last_updated) {
        const lastUpdated = new Date(artist.tracks_last_updated);
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate > 30) {
          console.log(`Tracks for artist ${artistId} are ${daysSinceUpdate.toFixed(1)} days old, consider refreshing`);
          // We'll still return the tracks but log a suggestion to refresh
        }
      }
      
      return artist.stored_tracks;
    }
    
    console.log(`No stored tracks found for artist ${artistId}`);
    return null;
  } catch (error) {
    console.error("Error in getStoredTracksForArtist:", error);
    return null;
  }
}
