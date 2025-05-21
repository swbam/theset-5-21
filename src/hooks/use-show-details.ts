import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { fetchShowDetails } from '@/lib/ticketmaster';
import { searchArtists } from '@/lib/spotify';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
// Removed import for createSetlistDirectly as setlist creation is handled server-side by Edge Functions
import { v4 as uuidv4 } from 'uuid';

export function useShowDetails(id: string | undefined) {
  const [spotifyArtistId, setSpotifyArtistId] = useState<string>('');
  
  // Memoize the checkShowInDatabase function to prevent recreating it on each render
  const checkShowInDatabase = useCallback(async (showId: string) => {
    try {
      const { data, error } = await supabase
        .from('shows')
        .select(`
          id, 
          name, 
          date, 
          artist_id,
          venue_id,
          ticket_url,
          image_url
        `)
        .eq('id', showId)
        .maybeSingle();
      
      if (error) {
        console.log("Database check error:", error.message);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error("Error checking show in database:", err);
      return null;
    }
  }, []);
  
  // Optimize the Spotify artist ID search with better caching
  const findSpotifyArtistId = useCallback(async (artistName: string) => {
    if (!artistName) return 'mock-artist';
    
    try {
      // Check localStorage cache first to avoid unnecessary API calls
      const cachedId = localStorage.getItem(`spotify_artist_${artistName}`);
      if (cachedId) {
        console.log(`Using cached Spotify ID for ${artistName}: ${cachedId}`);
        return cachedId;
      }
      
      const artistResult = await searchArtists(artistName, 1);
      if (artistResult?.artists?.items && artistResult.artists.items.length > 0) {
        const spotifyId = artistResult.artists.items[0].id;
        
        // Cache the result
        localStorage.setItem(`spotify_artist_${artistName}`, spotifyId);
        return spotifyId;
      } else {
        return 'mock-artist';
      }
    } catch (error) {
      console.error("Error searching for artist by name:", error);
      return 'mock-artist';
    }
  }, []);
  
  const { 
    data: show, 
    isLoading: isLoadingShow,
    error: showError,
    isError
  } = useQuery({
    queryKey: ['show', id],
    queryFn: async () => {
      if (!id) throw new Error("Show ID is required");
      
      // First check if show exists in database
      const dbShow = await checkShowInDatabase(id);
      
      // Whether or not show was in database, fetch fresh details
      const showDetails = await fetchShowDetails(id);
      
      // Find and set Spotify artist ID if we have an artist name
      if (showDetails?.artist?.name) {
        const spotifyId = await findSpotifyArtistId(showDetails.artist.name);
        setSpotifyArtistId(spotifyId);
      } else {
        setSpotifyArtistId('mock-artist');
      }
      
      // Removed client-side call to createSetlistDirectly.
      // Setlist creation is now handled automatically by the Edge Functions
      // when the show is saved to the database (via import-artist or sync-venue).
      // This hook should focus only on fetching data for display.
      
      return showDetails;
    },
    enabled: !!id,
    retry: 1,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 60, // 60 minutes
    gcTime: 1000 * 60 * 120,   // 2 hours
    refetchOnWindowFocus: false,
    meta: {
      onError: (error: unknown) => { // Use unknown for better type safety
        console.error("Show details query error:", error);
      }
    }
  });

  // vote for a song in the database
  const voteForSong = useCallback(async (songId: string) => {
    if (!songId) return false;
    
    try {
      // Get the current votes for this song
      const { data: songData, error: fetchError } = await supabase
        .from('setlist_songs')
        .select('votes')
        .eq('id', songId)
        .single();
      
      if (fetchError) {
        console.error("Error fetching song votes:", fetchError);
        return false;
      }
      
      // Increment the votes
      const { error: updateError } = await supabase
        .from('setlist_songs')
        .update({ votes: (songData.votes || 0) + 1 })
        .eq('id', songId);
      
      if (updateError) {
        console.error("Error updating song votes:", updateError);
        return false;
      }
      
      console.log(`Vote recorded for song ${songId}`);
      return true;
    } catch (error) {
      console.error("Error voting for song:", error);
      return false;
    }
  }, []);
  
  // Add new song to setlist in database
  // Define a basic type for the track object expected here
  type TrackInput = { id: string; name: string; /* add other relevant fields if needed */ };

  const addSongToSetlist = useCallback(async (setlistId: string, track: TrackInput) => { // Use TrackInput type
    if (!setlistId || !track) return false;
    
    try {
      const { error } = await supabase
        .from('setlist_songs')
        .insert({
          id: uuidv4(),
          setlist_id: setlistId,
          track_id: track.id,
          name: track.name,
          votes: 0
        });
      
      if (error) {
        console.error("Error adding song to setlist:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error adding song to setlist:", error);
      return false;
    }
  }, []);

  return {
    show,
    isLoadingShow,
    showError,
    isError,
    spotifyArtistId,
    voteForSong,
    addSongToSetlist
  };
}
