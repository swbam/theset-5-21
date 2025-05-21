'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function handleVote(songId: string, userId: string, increment: boolean) {
  try {
    console.log(`Processing vote: songId=${songId}, userId=${userId}, increment=${increment}`);
    
    // Verify the setlist_song exists
    const { data: songData, error: songError } = await supabase
      .from('setlist_songs')
      .select('id, name, vote_count')
      .eq('id', songId)
      .single();
      
    if (songError) {
      console.error('Error finding setlist song:', songError);
      return { error: 'Setlist song not found' };
    }
    
    // Atomic update with error handling
    const { error: voteError } = await supabase.rpc(increment ? 'increment_vote' : 'decrement_vote', {
      song_id: songId,
      user_id: userId
    });

    if (voteError) {
      console.error('RPC vote function error:', voteError);
      throw voteError;
    }
    
    // Log success
    console.log(`Vote ${increment ? 'added' : 'removed'} for song: ${songData.name}`);

    // Cache invalidation
    revalidatePath(`/songs/${songId}`);
    revalidatePath(`/artist`); // Invalidate artist pages that might show setlists
    
    return { success: true };
  } catch (error) {
    console.error('Voting error:', error);
    return { error: 'Failed to process vote' };
  }
} 