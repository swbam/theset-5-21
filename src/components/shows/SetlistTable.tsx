import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { addVoteToSong, getSetlistWithVotes } from '@/lib/api/database/votes';
import { toast } from 'sonner';

interface Song {
  id: string;
  title: string;
  votes: number;
  spotify_id?: string;
  album_name?: string;
  album_image_url?: string;
  preview_url?: string;
  hasVoted?: boolean;
}

interface SetlistTableProps {
  setlistId: string;
  showTitle?: string;
}

export default function SetlistTable({ setlistId, showTitle }: SetlistTableProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  // Fetch setlist data on component mount
  useEffect(() => {
    if (!setlistId) return;
    
    async function fetchSetlist() {
      try {
        setLoading(true);
        
        // Use the database function to get setlist with user's vote status
        const songsData = await getSetlistWithVotes(setlistId, user?.id);
        setSongs(songsData);
      } catch (error) {
        console.error('Error fetching setlist:', error);
        toast.error('Failed to load setlist');
      } finally {
        setLoading(false);
      }
    }
    
    fetchSetlist();
    
    // Set up real-time subscription for votes
    const channel = supabase
      .channel(`setlist:${setlistId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'setlist_songs',
        filter: `setlist_id=eq.${setlistId}`
      }, (payload) => {
        console.log('Setlist song updated:', payload);
        // Update the song in the local state
        setSongs(currentSongs => 
          currentSongs.map(song => 
            song.id === payload.new.id 
              ? { ...song, votes: payload.new.votes } 
              : song
          ).sort((a, b) => b.votes - a.votes) // Re-sort by votes
        );
      })
      .subscribe();
    
    // Clean up subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [setlistId, user?.id]);
  
  // Vote for a song
  const handleVote = async (songId: string) => {
    if (!user) {
      toast.error('Please sign in to vote');
      return;
    }
    
    // Check if user already voted for this song
    const songIndex = songs.findIndex(song => song.id === songId);
    if (songIndex === -1) return;
    
    const song = songs[songIndex];
    if (song.hasVoted) {
      toast.info("You've already voted for this song");
      return;
    }
    
    // Optimistic update
    const updatedSongs = [...songs];
    updatedSongs[songIndex] = {
      ...song,
      votes: song.votes + 1,
      hasVoted: true
    };
    
    // Sort by votes (highest first)
    const sortedSongs = [...updatedSongs].sort((a, b) => b.votes - a.votes);
    setSongs(sortedSongs);
    
    try {
      // Call the voting API
      const result = await addVoteToSong(songId, user.id);
      
      if (!result.success) {
        // Revert optimistic update if failed
        toast.error(result.message || 'Failed to record vote');
        
        // Refresh setlist to ensure accurate state
        const refreshedSongs = await getSetlistWithVotes(setlistId, user.id);
        setSongs(refreshedSongs);
      } else {
        toast.success('Vote recorded!');
      }
    } catch (error) {
      console.error('Error voting for song:', error);
      toast.error('Failed to record vote');
      
      // Refresh setlist to ensure accurate state
      const refreshedSongs = await getSetlistWithVotes(setlistId, user.id);
      setSongs(refreshedSongs);
    }
  };
  
  if (loading) {
    return (
      <div className="animate-pulse p-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/3"></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded mb-2 flex items-center p-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 mr-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }
  
  if (!songs.length) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Setlist</h2>
        <p className="text-muted-foreground">
          No songs have been added to this setlist yet.
        </p>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        {showTitle ? `${showTitle} Setlist` : 'Setlist'}
      </h2>
      
      <div className="space-y-2">
        {songs.map((song) => (
          <div
            key={song.id}
            className="flex items-center justify-between p-3 bg-background/80 rounded-lg shadow-sm border"
          >
            <div className="flex items-center">
              {song.album_image_url && (
                <img 
                  src={song.album_image_url} 
                  alt={song.album_name || song.title}
                  className="w-10 h-10 mr-3 rounded"
                />
              )}
              <div>
                <p className="font-medium">{song.title}</p>
                {song.album_name && (
                  <p className="text-xs text-muted-foreground">{song.album_name}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-lg font-semibold">{song.votes}</span>
              <button
                onClick={() => handleVote(song.id)}
                disabled={song.hasVoted || !user}
                className={`p-2 rounded-full ${
                  song.hasVoted
                    ? 'bg-primary/20 text-primary'
                    : 'hover:bg-primary/10 text-muted-foreground'
                }`}
                title={song.hasVoted ? "You've voted for this song" : "Vote for this song"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {!user && (
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Sign in to vote for songs
        </p>
      )}
    </div>
  );
} 