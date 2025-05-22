"use client";

import { useState, useEffect } from "react";
// import Image from "next/image"; // Removed unused import
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// import { useRouter } from "next/navigation"; // Removed unused import
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client"; // Keep for RPC call
import { Song } from "@/lib/types"; // Import the main Song type

// Remove SetlistSong and Setlist interfaces
// interface SetlistSong { ... }
// interface Setlist { ... }

interface Props {
  showId: string;
  artistSongs: Song[]; // Accept the full artist song catalog
  setlistId: string; // Re-add the prop as it's being used by parent component
}

// Update component signature
export function SetlistSongRequests({ showId, artistSongs, setlistId }: Props) {
  // const router = useRouter(); // Removed unused variable
  const [votedSongs, setVotedSongs] = useState<Record<string, boolean>>({});
  // Use artistSongs for the display list, but fetch actual vote counts from the database
  const [songs, setSongs] = useState<(Song & { votes: number })[]>(
    artistSongs.map(song => ({ ...song, votes: 0 })) || [] // Initialize with 0, will update with real counts
  );
  
  // Fetch real vote counts when component mounts
  useEffect(() => {
    const fetchVoteCounts = async () => {
      if (!showId || !artistSongs.length) return;
      
      try {
        // Get count of votes for each song at this show
        const { data, error } = await supabase
          .from('votes')
          .select('song_id, count')
          .eq('show_id', showId)
          .select('song_id, count(*)', { count: 'exact' })
          .groupBy('song_id');
          
        if (error) {
          console.error('Error fetching vote counts:', error);
          return;
        }
        
        if (data && data.length) {
          // Convert to a map of song_id -> vote count for easier lookup
          const voteCounts = data.reduce((acc, item) => {
            acc[item.song_id] = parseInt(item.count);
            return acc;
          }, {} as Record<string, number>);
          
          // Update song votes with real counts
          setSongs(currentSongs => 
            currentSongs.map(song => ({
              ...song,
              votes: voteCounts[song.id!] || 0
            }))
            // Sort by vote count, highest first
            .sort((a, b) => (b.votes || 0) - (a.votes || 0))
          );
        }
      } catch (error) {
        console.error('Error processing vote counts:', error);
      }
    };
    
    fetchVoteCounts();
    
    // Optional: Setup real-time subscription for vote updates
    const voteSubscription = supabase
      .channel('votes-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'votes', filter: `show_id=eq.${showId}` },
        () => {
          // When votes change, refetch the counts
          fetchVoteCounts();
        }
      )
      .subscribe();
      
    return () => {
      // Clean up subscription on unmount
      voteSubscription.unsubscribe();
    };
  }, [showId, artistSongs]);
  const [votingInProgress, setVotingInProgress] = useState<Record<string, boolean>>({});

  // Function to vote for a song using the RPC function
  const voteSong = async (songId: string | undefined) => {
    // Ensure songId is defined and not already voted/in progress
    if (!songId || votedSongs[songId] || votingInProgress[songId]) {
      return;
    }

    setVotingInProgress(prev => ({ ...prev, [songId]: true }));

    try {
      // Call the RPC function
      const { data: voteAdded, error } = await supabase
        .rpc('add_vote', { p_song_id: songId, p_show_id: showId });

      if (error) {
        console.error(`Error calling add_vote RPC:`, error);
        throw new Error(error.message || "Failed to add vote");
      }

      if (voteAdded) {
        // Vote was successfully added (not a duplicate)
        // Update local state optimistically
        setSongs(currentSongs =>
          currentSongs.map(song =>
            song.id === songId
              ? { ...song, votes: (song.votes || 0) + 1 }
              : song
          ).sort((a, b) => (b.votes || 0) - (a.votes || 0))
        );

        // Mark song as voted locally and in localStorage
        setVotedSongs(prev => ({ ...prev, [songId!]: true })); // Use non-null assertion as we checked earlier
        const storedVotes = JSON.parse(localStorage.getItem(`voted_${showId}`) || '{}');
        localStorage.setItem(`voted_${showId}`, JSON.stringify({
          ...storedVotes,
          [songId!]: true // Use non-null assertion
        }));

        toast.success("Vote registered!");
      } else {
        // Vote already existed or RPC returned false
        toast.info("You've already voted for this song.");
        // Ensure local state reflects voted status even if RPC returned false (e.g., page refresh)
        if (!votedSongs[songId]) {
           setVotedSongs(prev => ({ ...prev, [songId!]: true }));
        }
      }

    } catch (error) {
      console.error("Error voting for song:", error);
      toast.error("Failed to register vote");
    } finally {
      setVotingInProgress(prev => ({ ...prev, [songId!]: false })); // Use non-null assertion
    }
  };

  // Correctly placed useEffect hook
  useEffect(() => {
    try {
      const storedVotes = JSON.parse(localStorage.getItem(`voted_${showId}`) || '{}');
      setVotedSongs(storedVotes);
    } catch (e) {
      console.error("Error loading votes from localStorage:", e);
    }
  }, [showId]);

  return (
    <div className="space-y-4">
      {songs.length === 0 ? (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <p className="text-center text-muted-foreground">
              No songs found for this artist. Ensure the catalog has been imported.
            </p>
          </CardContent>
        </Card>
      ) : (
        // Use the 'songs' state derived from artistSongs
        songs.map((song) => (
          <Card key={song.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center p-4">
                {/* TODO: Need album art URL on the Song type */}
                <div className="h-12 w-12 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                  {/* {song.album_image_url ? (
                    <Image
                      src={song.album_image_url}
                      alt={song.album_name || song.name}
                    />
                  ) : ( */}
                    <div className="h-full w-full flex items-center justify-center bg-muted">
                      🎵 {/* Placeholder */}
                    </div>
                  {/* )} */}
                </div>

                <div className="ml-4 flex-1 overflow-hidden">
                  <h3 className="font-medium truncate">{song.name}</h3>
                  {/* TODO: Need album name on the Song type */}
                  {/* {song.album_name && (
                    <p className="text-sm text-muted-foreground truncate">
                      {song.album_name}
                    </p>
                  )} */}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "flex items-center justify-center ml-2",
                    // Use non-null assertion for song.id as key
                    votedSongs[song.id!] && "text-red-500"
                  )}
                  // Use non-null assertion for song.id as key/argument
                  disabled={votedSongs[song.id!] || votingInProgress[song.id!]}
                  onClick={() => voteSong(song.id)} // Pass potentially undefined id, handled in voteSong
                >
                  <Heart
                    className={cn(
                      "h-5 w-5",
                      // Use non-null assertion for song.id as key
                      votedSongs[song.id!] && "fill-current"
                    )}
                  />
                  {/* Display vote count from state */}
                  <span className="ml-1.5">{song.votes || 0}</span>
                </Button>
              </div>

              {song.preview_url && (
                <div className="p-2 bg-muted/10 border-t">
                  <audio
                    src={song.preview_url}
                    controls
                    className="w-full h-10 text-xs"
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
