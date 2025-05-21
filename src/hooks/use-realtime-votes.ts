import { useState, useEffect, useCallback } from 'react';
import { supabase, subscribeToRecord } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Song {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
}

interface UseRealtimeVotesProps {
  showId: string;
  initialSongs: Song[];
}

export function useRealtimeVotes({ showId, initialSongs }: UseRealtimeVotesProps) {
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [anonymousVoteCount, setAnonymousVoteCount] = useState<number>(() => {
    // Initialize from localStorage if it exists
    const stored = localStorage.getItem(`anonymousVotes-${showId}`);
    return stored ? parseInt(stored, 10) : 0;
  });
  
  // Store voted songs for anonymous users
  const [anonymousVotedSongs, setAnonymousVotedSongs] = useState<string[]>(() => {
    // Initialize from localStorage if it exists
    const stored = localStorage.getItem(`anonymousVotedSongs-${showId}`);
    return stored ? JSON.parse(stored) : [];
  });
  
  // Initialize songs from initialSongs when they're available
  useEffect(() => {
    if (initialSongs.length > 0 && !isInitialized) {
      // Restore user voted state from local storage for anonymous users
      const songsWithLocalVotes = initialSongs.map(song => ({
        ...song,
        userVoted: anonymousVotedSongs.includes(song.id)
      }));
      
      setSongs(songsWithLocalVotes);
      setIsInitialized(true);
      console.log("Initialized setlist with tracks:", initialSongs.length);
    }
  }, [initialSongs, isInitialized, anonymousVotedSongs]);
  
  // Setup real-time connection with Supabase
  useEffect(() => {
    if (!showId) return;
    
    console.log(`Setting up real-time voting for show: ${showId}`);
    
    // Subscribe to votes for this show
    const unsubscribe = subscribeToRecord('shows', 'id', showId, (payload) => {
      console.log('Received vote update:', payload);
      
      // If this is a vote update, refresh the songs
      if (payload.eventType === 'UPDATE' && payload.new) {
        // Fetch the latest setlist songs for this show
        // First get the setlist ID for this show
        supabase
          .from('setlists')
          .select('id')
          .eq('show_id', showId)
          .single()
          .then(({ data: setlistData, error: setlistError }) => {
            if (setlistError) {
              console.error('Error fetching setlist:', setlistError);
              return;
            }
            
            if (setlistData) {
              const setlistId = setlistData.id;
              
              // Now get the songs for this setlist
              supabase
                .from('setlist_songs')
                .select(`
                  id,
                  track_id,
                  votes,
                  top_tracks!inner(name)
                `)
                .eq('setlist_id', setlistId)
                .order('votes', { ascending: false })
                .then(({ data: songsData, error: songsError }) => {
                  if (songsError) {
                    console.error('Error fetching updated songs:', songsError);
                    return;
                  }
                  
                  if (songsData) {
                    // Map the data to our Song interface
                    const updatedSongs = songsData.map(item => ({
                      id: item.id,
                      name: item.top_tracks?.name || 'Unknown Song',
                      votes: item.votes || 0,
                      // Preserve the user's voted state
                      userVoted: songs.find(s => s.id === item.id)?.userVoted || 
                                anonymousVotedSongs.includes(item.id)
                    }));
                    
                    setSongs(updatedSongs);
                    console.log('Updated songs from realtime event:', updatedSongs.length);
                  }
                });
            }
          });
      }
    });
    
    setIsConnected(true);
    
    // Cleanup on unmount
    return () => {
      unsubscribe();
      setIsConnected(false);
      console.log("Real-time connection closed");
    };
  }, [showId, songs, anonymousVotedSongs]);
  
  // Vote for a song
  const voteForSong = useCallback(async (songId: string, isAuthenticated: boolean) => {
    // Check if anonymous user has used all their votes
    if (!isAuthenticated && anonymousVoteCount >= 3) {
      console.log(`Anonymous user has used all ${anonymousVoteCount} votes`);
      toast.info("You've used all your free votes. Log in to vote more!", {
        style: { background: "#14141F", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" },
        action: {
          label: "Log in",
          onClick: () => {
            // The login action will be handled in the ShowDetail component
          }
        }
      });
      return false;
    }
    
    // Check if user has already voted for this song
    const songToVote = songs.find(song => song.id === songId);
    if (songToVote?.userVoted) {
      console.log(`Already voted for song: ${songToVote.name}`);
      toast.info("You've already voted for this song", {
        style: { background: "#14141F", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }
      });
      return false;
    }
    
    try {
      // Optimistically update the UI
      setSongs(currentSongs => 
        currentSongs.map(song => {
          if (song.id === songId) {
            return {
              ...song,
              votes: song.votes + 1,
              userVoted: true
            };
          }
          return song;
        })
      );
      
      // If not authenticated, update anonymous vote count
      if (!isAuthenticated) {
        const newCount = anonymousVoteCount + 1;
        setAnonymousVoteCount(newCount);
        localStorage.setItem(`anonymousVotes-${showId}`, newCount.toString());
        
        // Store voted song ID in localStorage
        const newVotedSongs = [...anonymousVotedSongs, songId];
        setAnonymousVotedSongs(newVotedSongs);
        localStorage.setItem(`anonymousVotedSongs-${showId}`, JSON.stringify(newVotedSongs));
      }
      
      // Send the vote to the server
      if (isAuthenticated) {
        // For authenticated users, use the vote API
        const response = await fetch('/api/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            songId,
            action: 'increment'
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to submit vote');
        }
      } else {
        // For anonymous users, just update the vote count in the database
        // This is a simplified approach - in a real app, you might want to
        // implement rate limiting or other protections
        const { error } = await supabase
          .from('setlist_songs')
          .update({ votes: songToVote ? songToVote.votes + 1 : 1 })
          .eq('id', songId);
          
        if (error) {
          throw error;
        }
      }
      
      console.log(`Vote registered for song ID: ${songId}`);
      return true;
    } catch (error) {
      console.error('Error voting for song:', error);
      
      // Revert the optimistic update
      setSongs(currentSongs => 
        currentSongs.map(song => {
          if (song.id === songId && song.userVoted) {
            return {
              ...song,
              votes: song.votes - 1,
              userVoted: false
            };
          }
          return song;
        })
      );
      
      // Revert anonymous vote count if needed
      if (!isAuthenticated) {
        const newCount = anonymousVoteCount - 1;
        setAnonymousVoteCount(newCount);
        localStorage.setItem(`anonymousVotes-${showId}`, newCount.toString());
        
        // Remove voted song ID from localStorage
        const newVotedSongs = anonymousVotedSongs.filter(id => id !== songId);
        setAnonymousVotedSongs(newVotedSongs);
        localStorage.setItem(`anonymousVotedSongs-${showId}`, JSON.stringify(newVotedSongs));
      }
      
      toast.error('Failed to submit vote. Please try again.');
      return false;
    }
  }, [anonymousVoteCount, anonymousVotedSongs, showId, songs]);
  
  // Add a new song to the setlist
  const addSongToSetlist = useCallback(async (newSong: Song) => {
    console.log("Adding song to setlist:", newSong);
    
    // Check if song already exists in the setlist by ID
    const songExists = songs.some(song => song.id === newSong.id);
    
    if (songExists) {
      console.log(`Song already exists in setlist: ${newSong.name}`);
      toast.info("This song is already in the setlist", {
        style: { background: "#14141F", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }
      });
      return;
    }
    
    try {
      // First get the setlist ID for this show
      const { data: setlistData, error: setlistError } = await supabase
        .from('setlists')
        .select('id')
        .eq('show_id', showId)
        .single();
        
      if (setlistError) {
        throw setlistError;
      }
      
      if (!setlistData) {
        throw new Error('Setlist not found for this show');
      }
      
      // Optimistically update the UI
      setSongs(currentSongs => [...currentSongs, newSong]);
      
      // Add the song to the database
      const { error } = await supabase
        .from('setlist_songs')
        .insert({
          setlist_id: setlistData.id,
          track_id: newSong.id,
          votes: 0
        });
        
      if (error) {
        throw error;
      }
      
      console.log(`Added new song to setlist: ${newSong.name}`);
    } catch (error) {
      console.error('Error adding song to setlist:', error);
      
      // Revert the optimistic update
      setSongs(currentSongs => currentSongs.filter(song => song.id !== newSong.id));
      
      toast.error('Failed to add song to setlist. Please try again.');
    }
  }, [showId, songs]);
  
  return {
    songs,
    isConnected,
    voteForSong,
    addSongToSetlist,
    anonymousVoteCount,
    anonymousVotedSongs
  };
}
