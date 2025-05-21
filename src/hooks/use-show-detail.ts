
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useShowDetails } from '@/hooks/use-show-details';
import { useArtistTracks } from '@/hooks/use-artist-tracks';
import { useSongManagement } from '@/hooks/use-song-management';
import { useAuth } from '@/contexts/auth';

export function useShowDetail(id: string | undefined) {
  const [documentMetadata, setDocumentMetadata] = useState({
    title: '',
    description: ''
  });
  const { isAuthenticated, login } = useAuth();
  
  // Get show details immediately
  const { 
    show, 
    isLoadingShow, 
    isError, 
    showError, 
    spotifyArtistId 
  } = useShowDetails(id);
  
  // Set document metadata when show data is available
  useEffect(() => {
    if (show && !isLoadingShow) {
      try {
        const artistName = show.artist?.name || 'Artist';
        const venueName = show.venue?.name || 'Venue';
        const venueCity = show.venue?.city || '';
        const venueState = show.venue?.state || '';
        const venueLocation = venueCity && venueState ? `${venueCity}, ${venueState}` : (venueCity || venueState || 'Location');
        
        let formattedDate = 'TBD';
        
        // Safely format the date
        if (show.date) {
          try {
            const showDate = new Date(show.date);
            
            // Check if date is valid
            if (!isNaN(showDate.getTime())) {
              formattedDate = showDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short', 
                day: 'numeric', 
                year: 'numeric'
              });
            }
          } catch (dateError) {
            console.error('Error formatting show date:', dateError);
          }
        }
        
        const title = `TheSet | ${artistName} at ${venueName} in ${venueLocation} | ${formattedDate}`;
        const description = `Vote on ${artistName}'s setlist for their show at ${venueName} in ${venueLocation} on ${formattedDate}. Influence what songs they'll play live!`;
        
        setDocumentMetadata({
          title,
          description
        });
      } catch (error) {
        console.error('Error setting document metadata:', error);
        setDocumentMetadata({
          title: 'Show Details | TheSet',
          description: 'Vote on setlists for upcoming concerts and shows on TheSet.'
        });
      }
    }
  }, [show, isLoadingShow]);
  
  // Get artist tracks with optimized settings:
  // - staleTime set to 1 hour to better utilize cache
  // - immediate loading enabled
  // - prioritize stored tracks
  const artistTracksResponse = useArtistTracks(
    show?.artist_id, 
    spotifyArtistId,
    { 
      immediate: true,  // Always load tracks immediately
      prioritizeStored: true // Prioritize stored tracks for faster loading
    }
  );
  
  // Function to load tracks manually when needed
  const loadTracks = useCallback(() => {
    if (artistTracksResponse.refetch) {
      artistTracksResponse.refetch();
    }
  }, [artistTracksResponse]);
  
  // Extract all needed properties with defaults to avoid undefined errors
  const {
    tracks = [],
    isLoading: isLoadingTracks = false,
    isError: isTracksError = false,
    error: tracksError = null,
    initialSongs = [],
    storedTracksData = [],
    getAvailableTracks = (setlist: any[]) => [],
  } = artistTracksResponse || {};
  
  // For backward compatibility
  const isLoadingAllTracks = isLoadingTracks;
  const allTracksData = { tracks };
  
  // Song management (voting, adding songs)
  const {
    setlist,
    isConnected,
    selectedTrack,
    setSelectedTrack,
    handleVote,
    handleAddSong,
    anonymousVoteCount
  } = useSongManagement(id || '', initialSongs, isAuthenticated, login);
  
  // Compute available tracks with memoization to prevent recalculations
  const availableTracks = useMemo(() => {
    if (storedTracksData && Array.isArray(storedTracksData) && storedTracksData.length > 0) {
      const setlistIds = new Set((setlist || []).map(song => song.id));
      return storedTracksData.filter((track: any) => !setlistIds.has(track.id));
    }
    
    if (typeof getAvailableTracks === 'function') {
      return getAvailableTracks(setlist || []);
    }
    
    return [];
  }, [storedTracksData, setlist, getAvailableTracks]);
  
  // Optimized add song handler with better error handling
  const handleAddSongClick = useCallback((trackId?: string) => {
    const trackToUse = trackId || selectedTrack;
    
    if (!trackToUse) {
      return;
    }
    
    if (storedTracksData && Array.isArray(storedTracksData) && storedTracksData.length > 0) {
      const track = storedTracksData.find((t: any) => t.id === trackToUse);
      if (track) {
        handleAddSong({ tracks: storedTracksData });
        return;
      }
    }
    
    if (allTracksData && allTracksData.tracks) {
      handleAddSong(allTracksData);
    }
  }, [storedTracksData, allTracksData, handleAddSong, selectedTrack]);
  
  return {
    show,
    setlist,
    loading: {
      show: isLoadingShow,
      tracks: isLoadingTracks,
      allTracks: isLoadingAllTracks
    },
    error: {
      show: isError ? showError : null
    },
    connected: isConnected,
    songManagement: {
      selectedTrack,
      setSelectedTrack,
      handleVote,
      handleAddSong: handleAddSongClick,
      anonymousVoteCount
    },
    availableTracks,
    documentMetadata,
    loadTracks
  };
}
