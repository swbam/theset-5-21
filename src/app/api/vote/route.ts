/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore: Cannot find module 'next/server' type declarations
import { NextResponse } from 'next/server';
// @ts-ignore: Cannot find module 'next/headers' type declarations
import { cookies } from 'next/headers';
import { adminClient, supabase } from '../../../lib/db';

// Define types for better code safety
type VoteAction = 'increment' | 'decrement';

interface VoteRequest {
  songId: string;
  action: VoteAction;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { songId, action } = body as VoteRequest;

    // Validation
    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }
    
    if (!action || (action !== 'increment' && action !== 'decrement')) {
      return NextResponse.json({ error: 'Valid action (increment/decrement) is required' }, { status: 400 });
    }

    // Get user from session using the regular client
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session verification error:', sessionError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Use the admin client for database operations
    const admin = adminClient();
    
    // Check if song exists
    const { data: song, error: songError } = await admin
      .from('setlist_songs')
      .select('id')
      .eq('id', songId)
      .single();
      
    if (songError || !song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }
    
    // Check for existing vote
    const { data: existingVote, error: voteError } = await admin
      .from('votes')
      .select('id')
      .eq('user_id', userId)
      .eq('song_id', songId)
      .single();
    
    // Handle different vote scenarios
    if (action === 'increment') {
      if (!existingVote) {
        // Create new vote
        const { error: insertError } = await admin
          .from('votes')
          .insert({ user_id: userId, song_id: songId });
          
        if (insertError) {
          console.error('Failed to add vote:', insertError);
          return NextResponse.json({ error: 'Failed to add vote' }, { status: 500 });
        }
        
        // Call stored procedure to increment song's vote count
        const { error: incError } = await admin.rpc('increment_vote', { 
          p_song_id: songId,  // Updated parameter name to match function definition
          p_user_id: userId   // Updated parameter name to match function definition
        });
        
        if (incError) {
          console.error('Failed to increment vote count:', incError);
          return NextResponse.json({ error: 'Failed to update vote count' }, { status: 500 });
        }
      }
      
      // If vote already exists, it's a no-op (idempotent)
      return NextResponse.json({ success: true, message: 'Vote recorded' });
      
    } else if (action === 'decrement') {
      if (existingVote) {
        // Delete existing vote
        const { error: deleteError } = await admin
          .from('votes')
          .delete()
          .eq('user_id', userId)
          .eq('song_id', songId);
          
        if (deleteError) {
          console.error('Failed to remove vote:', deleteError);
          return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 });
        }
        
        // Call stored procedure to decrement song's vote count
        const { error: decError } = await admin.rpc('decrement_vote', { 
          p_song_id: songId,  // Updated parameter name to match function definition
          p_user_id: userId   // Updated parameter name to match function definition
        });
        
        if (decError) {
          console.error('Failed to decrement vote count:', decError);
          return NextResponse.json({ error: 'Failed to update vote count' }, { status: 500 });
        }
      }
      
      // If no vote exists, it's a no-op (idempotent)
      return NextResponse.json({ success: true, message: 'Vote removed' });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Vote API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}