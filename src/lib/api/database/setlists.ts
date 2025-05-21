import { supabase } from "@/integrations/supabase/client";

/**
 * Create a setlist for a show and populate it with songs
 */
export async function createSetlistForShow(showId: string, artistId: string) {
  try {
    console.log(`Creating setlist for show ${showId}`);
    
    // Check if setlist already exists
    const { data: existingSetlist, error: checkError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking for existing setlist:", checkError);
      return null;
    }
    
    // If setlist exists, return its ID
    if (existingSetlist) {
      console.log(`Setlist already exists for show ${showId}: ${existingSetlist.id}`);
      return existingSetlist.id;
    }
    
    // Get show details for date and venue information
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('date, venue_id, venues(name, city)')
      .eq('id', showId)
      .single();
    
    if (showError || !show) {
      console.error("Error getting show details:", showError);
      return null;
    }
    
    // Create new setlist
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert({
        artist_id: artistId,
        show_id: showId,
        date: show.date,
        venue: show.venues?.name || null,
        venue_city: show.venues?.city || null,
      })
      .select()
      .single();
    
    if (createError) {
      console.error("Error creating setlist:", createError);
      return null;
    }
    
    console.log(`Created setlist ${newSetlist.id} for show ${showId}`);
    
    // Populate setlist with songs
    await populateSetlistWithSongs(newSetlist.id, artistId);
    
    return newSetlist.id;
  } catch (error) {
    console.error("Error in createSetlistForShow:", error);
    return null;
  }
}

/**
 * Populate a setlist with songs from the artist's catalog
 */
async function populateSetlistWithSongs(setlistId: string, artistId: string) {
  try {
    console.log(`Populating setlist ${setlistId} with songs from artist ${artistId}`);
    
    // Get artist's songs from the database
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('id, name, spotify_id, duration_ms, preview_url, popularity')
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false })
      .limit(50);
    
    if (songsError) {
      console.error("Error fetching songs for setlist:", songsError);
      return false;
    }
    
    // If we don't have songs, fetch them from Spotify
    if (!songs || songs.length === 0) {
      // Get the artist's Spotify ID
      const { data: artist, error: artistError } = await supabase
        .from('artists')
        .select('spotify_id')
        .eq('id', artistId)
        .maybeSingle();
      
      if (artistError || !artist?.spotify_id) {
        console.error("Error getting artist Spotify ID:", artistError);
        return false;
      }
      
      // Import dynamically to avoid circular dependencies
      const { fetchAndStoreArtistTracks } = await import('../database');
      
      // Fetch songs from Spotify
      await fetchAndStoreArtistTracks(artistId, artist.spotify_id, "Artist");
      
      // Try again to get songs
      const { data: refreshedSongs, error: refreshError } = await supabase
        .from('songs')
        .select('id, name, spotify_id, duration_ms, preview_url, popularity')
        .eq('artist_id', artistId)
        .order('popularity', { ascending: false })
        .limit(50);
      
      if (refreshError || !refreshedSongs || refreshedSongs.length === 0) {
        console.error("Still couldn't get songs after fetching from Spotify:", refreshError);
        return false;
      }
      
      // Use the refreshed songs
      return await addSongsToSetlist(setlistId, artistId, refreshedSongs);
    }
    
    // Add songs to setlist
    return await addSongsToSetlist(setlistId, artistId, songs);
  } catch (error) {
    console.error("Error in populateSetlistWithSongs:", error);
    return false;
  }
}

/**
 * Add songs to a setlist
 */
async function addSongsToSetlist(setlistId: string, artistId: string, songs: {
  id: string;
  name: string;
  spotify_id?: string;
  duration_ms?: number;
  preview_url?: string | null;
  popularity?: number;
}[]) {
  try {
    // Select 5 random songs from the top 50
    const selectedSongs = songs
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
    
    if (selectedSongs.length === 0) {
      console.error("No songs available to add to setlist");
      return false;
    }
    
    // Prepare setlist songs data
    const setlistSongs = selectedSongs.map((song, index) => ({
      setlist_id: setlistId,
      song_id: song.id,
      name: song.name,
      position: index + 1,
      artist_id: artistId,
      vote_count: 0
    }));
    
    // Insert setlist songs
    const { error } = await supabase
      .from('setlist_songs')
      .insert(setlistSongs);
    
    if (error) {
      console.error("Error adding songs to setlist:", error);
      return false;
    }
    
    console.log(`Added ${setlistSongs.length} songs to setlist ${setlistId}`);
    return true;
  } catch (error) {
    console.error("Error in addSongsToSetlist:", error);
    return false;
  }
}
