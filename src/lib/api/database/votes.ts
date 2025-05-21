import { supabase } from "@/integrations/supabase/client";

/**
 * Add a vote to a setlist song, handling duplicate votes
 */
export async function addVoteToSong(songId: string, userId: string) {
  try {
    // Check if user has already voted for this song
    const { data: existingVote, error: checkError } = await supabase
      .from('user_votes')
      .select('id')
      .eq('setlist_song_id', songId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking existing vote:", checkError);
      throw new Error(`Failed to check existing vote: ${checkError.message}`);
    }
    
    if (existingVote) {
      console.log(`User ${userId} has already voted for song ${songId}`);
      return { success: false, message: "You've already voted for this song" };
    }
    
    // Create the vote in a transaction with incrementing the vote count
    const { data, error } = await supabase.rpc('add_song_vote', {
      p_song_id: songId,
      p_user_id: userId
    });
    
    if (error) {
      console.error("Error adding vote:", error);
      throw new Error(`Failed to add vote: ${error.message}`);
    }
    
    console.log(`Vote added successfully for song ${songId} by user ${userId}`);
    
    // Get updated song details to return
    const { data: updatedSong, error: songError } = await supabase
      .from('setlist_songs')
      .select('id, title, votes, setlist_id')
      .eq('id', songId)
      .single();
    
    if (songError) {
      console.error("Error fetching updated song:", songError);
      return { success: true, message: "Vote recorded", votes: null };
    }
    
    return { 
      success: true, 
      message: "Vote recorded successfully", 
      votes: updatedSong.votes,
      song: updatedSong
    };
  } catch (error) {
    console.error("Error in addVoteToSong:", error);
    throw error;
  }
}

/**
 * Get all songs for a setlist with vote counts and user's voting status
 */
export async function getSetlistWithVotes(setlistId: string, userId?: string) {
  try {
    // Get all songs in the setlist
    const { data: songs, error: songsError } = await supabase
      .from('setlist_songs')
      .select('*')
      .eq('setlist_id', setlistId)
      .order('votes', { ascending: false });
    
    if (songsError) {
      console.error("Error fetching setlist songs:", songsError);
      throw new Error(`Failed to fetch setlist songs: ${songsError.message}`);
    }
    
    // If no user ID, just return the songs
    if (!userId) {
      return songs.map(song => ({
        ...song,
        hasVoted: false
      }));
    }
    
    // Get all songs the user has voted for in this setlist
    const { data: userVotes, error: votesError } = await supabase
      .from('user_votes')
      .select('setlist_song_id')
      .eq('user_id', userId)
      .in('setlist_song_id', songs.map(song => song.id));
    
    if (votesError) {
      console.error("Error fetching user votes:", votesError);
      return songs.map(song => ({
        ...song,
        hasVoted: false
      }));
    }
    
    // Create a set of song IDs the user has voted for
    const votedSongIds = new Set(userVotes.map(vote => vote.setlist_song_id));
    
    // Add hasVoted flag to each song
    return songs.map(song => ({
      ...song,
      hasVoted: votedSongIds.has(song.id)
    }));
  } catch (error) {
    console.error("Error in getSetlistWithVotes:", error);
    throw error;
  }
}

/**
 * Setup Supabase stored procedure for atomic vote operations
 * This should be run once during app initialization
 */
export async function setupVotingProcedures() {
  try {
    const { error } = await supabase.rpc('create_vote_procedures');
    
    if (error) {
      console.error("Error setting up voting procedures:", error);
      return false;
    }
    
    console.log("Voting procedures set up successfully");
    return true;
  } catch (error) {
    console.error("Error in setupVotingProcedures:", error);
    return false;
  }
} 