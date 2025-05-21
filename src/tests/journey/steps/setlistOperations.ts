
import { supabase } from "@/integrations/supabase/client";
import { TestResults } from '../types';
import { logError, logSuccess, DETAILED_LOGGING } from '../logger';

/**
 * Step 5: Select a show
 */
export async function selectShow(
  results: TestResults, 
  show: any
): Promise<any> {
  console.log(`\n📍 STEP 5: Selecting show: "${show.name}" (Simulating user clicking on a show card)`);
  
  try {
    logSuccess(results, "Show Selection", `User clicked on show: ${show.name} (Client action)`, {
      showId: show.id,
      showName: show.name,
      showDate: show.date,
      venueId: show.venue_id
    });
    
    return show;
  } catch (error) {
    logError(results, "Show Selection", "Client", `Error selecting show: ${(error as Error).message}`, error);
    throw error;
  }
}

/**
 * Step 6: Get or create setlist for the show
 */
export async function getOrCreateSetlist(
  results: TestResults, 
  show: any
): Promise<string> {
  console.log(`\n📍 STEP 6: Checking for setlist on show page (Simulating loading show details page)`);
  
  try {
    // Check for existing setlist in database
    const { data: existingSetlist, error: setlistError } = await supabase
      .from('setlists')
      .select('*')
      .eq('show_id', show.id)
      .maybeSingle();
    
    if (setlistError) {
      logError(results, "Setlist Check", "Database", `Database error checking setlist: ${setlistError.message}`, setlistError);
      throw setlistError;
    }
    
    let setlistId = existingSetlist?.id;
    
    if (!existingSetlist) {
      // Create new setlist
      console.log(`Creating new setlist for show: ${show.name}`);
      
      const { data: newSetlist, error: createError } = await supabase
        .from('setlists')
        .insert({
          show_id: show.id
        })
        .select()
        .single();
      
      if (createError) {
        logError(results, "Setlist Creation", "Database", `Database error creating setlist: ${createError.message}`, createError);
        throw createError;
      }
      
      setlistId = newSetlist.id;
      logSuccess(results, "Setlist Creation", `Created new setlist for show: ${show.name} (Database)`, {
        setlistId: setlistId
      });
    } else {
      logSuccess(results, "Setlist Check", `Found existing setlist for show: ${show.name} (Database)`, {
        setlistId: setlistId
      });
    }
    
    return setlistId;
  } catch (error) {
    logError(results, "Setlist", "Database", `Error with setlist operations: ${(error as Error).message}`, error);
    throw error;
  }
}

/**
 * Step 7: Check setlist songs and add songs if needed
 */
export async function manageSetlistSongs(
  results: TestResults, 
  setlistId: string, 
  tracks: any[]
): Promise<any[]> {
  console.log(`\n📍 STEP 7: Loading setlist songs (Simulating viewing the setlist on show page)`);
  
  try {
    // Using let instead of const to allow reassignment
    let { data: setlistSongs, error: songsError } = await supabase
      .from('setlist_songs')
      .select('*')
      .eq('setlist_id', setlistId);
    
    if (songsError) {
      logError(results, "Setlist Songs", "Database", `Database error fetching setlist songs: ${songsError.message}`, songsError);
      throw songsError;
    }
    
    if (!setlistSongs || setlistSongs.length === 0) {
      // Add some songs to the setlist
      console.log(`No songs in setlist. Adding 5 random tracks (Simulating system auto-populating setlist)...`);
      
      // Shuffle tracks and pick 5 random ones
      const shuffledTracks = [...tracks].sort(() => 0.5 - Math.random());
      const selectedTracks = shuffledTracks.slice(0, 5);
      
      for (const track of selectedTracks) {
        const { error: addError } = await supabase
          .from('setlist_songs')
          .insert({
            setlist_id: setlistId,
            track_id: track.id
          });
        
        if (addError) {
          logError(results, "Add Setlist Song", "Database", `Error adding song "${track.name}" to setlist: ${addError.message}`, addError);
          throw addError;
        }
      }
      
      // Fetch the songs again
      const { data: updatedSongs, error: updatedError } = await supabase
        .from('setlist_songs')
        .select('*')
        .eq('setlist_id', setlistId);
      
      if (updatedError) {
        logError(results, "Updated Setlist Songs", "Database", `Database error fetching updated setlist songs: ${updatedError.message}`, updatedError);
        throw updatedError;
      }
      
      logSuccess(results, "Add Setlist Songs", `Added ${updatedSongs?.length || 0} songs to the setlist (Database)`, {
        songCount: updatedSongs?.length || 0,
        setlistId: setlistId
      });
      
      // Update our reference
      if (updatedSongs) {
        setlistSongs = updatedSongs;
      }
    } else {
      logSuccess(results, "Setlist Songs", `Found ${setlistSongs.length} songs in the setlist (Database)`, {
        songCount: setlistSongs.length,
        setlistId: setlistId
      });
    }
    
    return setlistSongs || [];
  } catch (error) {
    logError(results, "Setlist Songs", "Database", `Error managing setlist songs: ${(error as Error).message}`, error);
    throw error;
  }
}

/**
 * Step 8: Select a track from the dropdown
 */
export async function selectTrackFromDropdown(
  results: TestResults,
  availableTracks: any[]
): Promise<any> {
  console.log(`\n📍 STEP 8: Selecting a track from dropdown (Simulating user selecting a song to add)`);
  
  try {
    if (!availableTracks || availableTracks.length === 0) {
      logError(results, "Track Selection", "Client", "No tracks available to select from dropdown");
      throw new Error("No tracks available to select from dropdown");
    }
    
    // Select a random track from available tracks
    const selectedTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
    
    logSuccess(results, "Track Selection", `User selected track "${selectedTrack.name}" from dropdown (Client action)`, {
      trackId: selectedTrack.id,
      trackName: selectedTrack.name
    });
    
    return selectedTrack;
  } catch (error) {
    logError(results, "Track Selection", "Client", `Error selecting track: ${(error as Error).message}`, error);
    throw error;
  }
}

/**
 * Step 9: Add selected song to setlist
 */
export async function addSongToSetlist(
  results: TestResults,
  setlistId: string,
  selectedTrack: any
): Promise<any> {
  console.log(`\n📍 STEP 9: Adding selected song to setlist (Simulating user clicking "Add to Setlist" button)`);
  
  try {
    if (!selectedTrack || !selectedTrack.id) {
      logError(results, "Add Song", "Client", "No track selected to add to setlist");
      throw new Error("No track selected to add to setlist");
    }
    
    // First check if the song already exists in the setlist
    const { data: existingSong, error: checkError } = await supabase
      .from('setlist_songs')
      .select('*')
      .eq('setlist_id', setlistId)
      .eq('track_id', selectedTrack.id)
      .maybeSingle();
    
    if (checkError) {
      logError(results, "Add Song Check", "Database", `Database error checking if song exists: ${checkError.message}`, checkError);
      throw checkError;
    }
    
    if (existingSong) {
      logSuccess(results, "Add Song Check", `Song "${selectedTrack.name}" already exists in setlist (Database)`, {
        songId: existingSong.id,
        trackId: selectedTrack.id,
        setlistId: setlistId
      });
      
      return existingSong;
    }
    
    // Add the song to the setlist
    const { data: newSong, error: addError } = await supabase
      .from('setlist_songs')
      .insert({
        setlist_id: setlistId,
        track_id: selectedTrack.id
      })
      .select()
      .single();
    
    if (addError) {
      logError(results, "Add Song", "Database", `Database error adding song to setlist: ${addError.message}`, addError);
      throw addError;
    }
    
    logSuccess(results, "Add Song", `Successfully added "${selectedTrack.name}" to setlist (Database)`, {
      songId: newSong.id,
      trackId: selectedTrack.id,
      setlistId: setlistId
    });
    
    return newSong;
  } catch (error) {
    logError(results, "Add Song", "Database", `Error adding song to setlist: ${(error as Error).message}`, error);
    throw error;
  }
}

/**
 * Step 10: Vote for a song
 */
export async function voteForSong(
  results: TestResults, 
  setlistSong: any,
  userId: string = 'test-user-id'
): Promise<void> {
  console.log(`\n📍 STEP 10: Voting for a song (Simulating user clicking upvote button)`);
  
  try {
    if (!setlistSong) {
      logError(results, "Vote", "Client", "No song available to vote for");
      throw new Error("No song available to vote for");
    }
    
    // First check if we already voted for this song
    const { data: existingVote, error: voteCheckError } = await supabase
      .from('votes')
      .select('*')
      .eq('setlist_song_id', setlistSong.id)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (voteCheckError) {
      logError(results, "Vote Check", "Database", `Database error checking existing vote: ${voteCheckError.message}`, voteCheckError);
      // Continue anyway - this is just a test
    }
    
    if (!existingVote) {
      // Insert a new vote
      const { error: voteError } = await supabase
        .from('votes')
        .insert({
          setlist_song_id: setlistSong.id,
          user_id: userId
        });
      
      if (voteError) {
        logError(results, "Vote", "Database", `Database error voting for song: ${voteError.message}`, voteError);
        throw voteError;
      }
      
      // Increment the vote count
      const { error: incrementError } = await supabase.rpc(
        'increment_votes',
        { song_id: setlistSong.id }
      );
      
      if (incrementError) {
        logError(results, "Vote Increment", "Database", `Database error incrementing vote count: ${incrementError.message}`, incrementError);
        throw incrementError;
      }
      
      logSuccess(results, "Vote", `Successfully voted for song ID: ${setlistSong.id} (Database & Client action)`, {
        songId: setlistSong.id,
        userId: userId
      });
    } else {
      logSuccess(results, "Vote Check", `Already voted for song ID: ${setlistSong.id} (Database check)`, {
        voteId: existingVote.id,
        songId: setlistSong.id,
        userId: userId
      });
    }
    
    // Check vote count after voting
    const { data: updatedSong, error: checkError } = await supabase
      .from('setlist_songs')
      .select('*')
      .eq('id', setlistSong.id)
      .single();
    
    if (!checkError && updatedSong) {
      logSuccess(results, "Vote Result", `Current vote count for song: ${updatedSong.votes} (Database)`, {
        songId: updatedSong.id,
        votes: updatedSong.votes
      });
    }
  } catch (error) {
    logError(results, "Vote", "Database", `Error voting for song: ${(error as Error).message}`, error);
    throw error;
  }
}

/**
 * Step 11: Verify setlist reordering by votes
 */
export async function verifySetlistOrder(
  results: TestResults, 
  setlistId: string
): Promise<void> {
  console.log(`\n📍 STEP 11: Verifying setlist reordering (Simulating checking the updated setlist order)`);
  
  try {
    // Get the updated setlist songs
    const { data: setlistSongs, error: songsError } = await supabase
      .from('setlist_songs')
      .select('*')
      .eq('setlist_id', setlistId)
      .order('votes', { ascending: false });
    
    if (songsError) {
      logError(results, "Setlist Order", "Database", `Database error fetching ordered setlist: ${songsError.message}`, songsError);
      throw songsError;
    }
    
    if (!setlistSongs || setlistSongs.length === 0) {
      logError(results, "Setlist Order", "Database", "No songs found in setlist after voting");
      throw new Error("No songs found in setlist after voting");
    }
    
    // Check if setlist is ordered by votes (descending)
    let isOrdered = true;
    for (let i = 0; i < setlistSongs.length - 1; i++) {
      if (setlistSongs[i].votes < setlistSongs[i + 1].votes) {
        isOrdered = false;
        break;
      }
    }
    
    if (isOrdered) {
      logSuccess(results, "Setlist Order", `Setlist is correctly ordered by votes (Database)`, {
        songCount: setlistSongs.length,
        topSongVotes: setlistSongs[0]?.votes || 0
      });
    } else {
      logError(results, "Setlist Order", "Database", "Setlist is not properly ordered by votes");
    }
  } catch (error) {
    logError(results, "Setlist Order", "Database", `Error verifying setlist order: ${(error as Error).message}`, error);
    throw error;
  }
}
