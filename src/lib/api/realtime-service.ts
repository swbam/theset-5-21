import { supabase, subscribeToTable, subscribeToRecord } from "@/integrations/supabase/client";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Creates a real-time connection for voting on a show
 * @param showId The ID of the show to subscribe to
 * @returns An object with methods to interact with the real-time connection
 */
export function createRealtimeVotingConnection(showId: string) {
  console.log("Creating real-time voting connection for show", showId);
  
  let unsubscribeFunction: (() => void) | null = null;
  
  return {
    /**
     * Connect to the real-time channel
     */
    connect: async () => {
      console.log(`Connecting to real-time channel for show ${showId}`);
      return Promise.resolve();
    },
    
    /**
     * Subscribe to vote updates for this show
     * @param callback Function to call when votes are updated
     * @returns A function to unsubscribe
     */
    subscribe: (callback: (data: RealtimePostgresChangesPayload<Record<string, unknown>>) => void) => {
      console.log(`Subscribing to vote updates for show ${showId}`);
      
      // Subscribe to the setlist_songs table for this show
      // First, we need to get the setlist ID for this show
      supabase
        .from('setlists')
        .select('id')
        .eq('show_id', showId)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error getting setlist ID:', error);
            return;
          }
          
          if (data) {
            const setlistId = data.id;
            
            // Now subscribe to changes on setlist_songs for this setlist
            unsubscribeFunction = subscribeToRecord(
              'setlist_songs',
              'setlist_id',
              setlistId,
              (payload) => {
                console.log('Vote update received:', payload);
                callback(payload);
              }
            );
          }
        });
      
      // Return a function to unsubscribe
      return () => {
        console.log(`Unsubscribing from vote updates for show ${showId}`);
        if (unsubscribeFunction) {
          unsubscribeFunction();
          unsubscribeFunction = null;
        }
      };
    },
    
    /**
     * Send a vote for a song
     * @param songId The ID of the song to vote for
     * @param userId The ID of the user voting
     * @returns A promise that resolves when the vote is sent
     */
    sendVote: async (songId: string, userId: string) => {
      console.log(`Sending vote for song ${songId} by user ${userId}`);
      
      try {
        // For authenticated users, create a vote record
        if (userId) {
          const { error: voteError } = await supabase
            .from('votes')
            .insert({
              setlist_song_id: songId,
              user_id: userId
            });
            
          if (voteError) throw voteError;
        }
        
        // Increment the vote count on the song
        const { error: updateError } = await supabase
          .from('setlist_songs')
          .select('votes')
          .eq('id', songId)
          .single();
          
        if (updateError) throw updateError;
        
        // Use RPC to increment the vote (this will trigger the realtime update)
        const { error: rpcError } = await supabase.rpc('increment_votes', {
          song_id: songId
        });
        
        if (rpcError) throw rpcError;
        
        return Promise.resolve();
      } catch (error) {
        console.error('Error sending vote:', error);
        return Promise.reject(error);
      }
    },
    
    /**
     * Close the real-time connection
     */
    close: () => {
      console.log(`Closing real-time connection for show ${showId}`);
      if (unsubscribeFunction) {
        unsubscribeFunction();
        unsubscribeFunction = null;
      }
    }
  };
}

/**
 * Helper function to format an artist name for use in URLs and IDs
 */
export function formatArtistNameForUrl(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
}

/**
 * Format a date for display
 */
export function formatDate(dateString?: string, includeTime = false): string {
  if (!dateString) return "TBA";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "TBA";
    
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    };
    
    if (includeTime) {
      options.hour = 'numeric';
      options.minute = '2-digit';
    }
    
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
    console.error("Date formatting error:", error);
    return "TBA";
  }
}