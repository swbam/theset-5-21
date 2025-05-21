import { supabase } from "@/integrations/supabase/client";
import { saveArtistToDatabase, saveShowToDatabase, saveVenueToDatabase } from "./database";
import { getArtistTopTracks } from "../spotify/top-tracks";

/**
 * VenueSyncService: Enhanced utilities for syncing venues and their shows
 * This implements a more efficient data flow where adding one show automatically 
 * syncs all shows for that venue
 */

/**
 * Synchronize all shows at a venue when one show is added
 * @param venueId - The ID of the venue to sync
 * @param venueName - The name of the venue (for logging)
 */
export async function syncVenueShows(venueId: string, venueName: string) {
  try {
    if (!venueId) {
      console.error("Invalid venue ID for syncing");
      return { success: false, error: "Invalid venue ID" };
    }
    
    console.log(`Starting venue sync for ${venueName} (ID: ${venueId})`);
    
    // First, ensure the venue exists in our database
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .maybeSingle();
    
    if (venueError) {
      console.error(`Error fetching venue data: ${venueError.message}`);
      return { success: false, error: venueError.message };
    }
    
    if (!venue) {
      console.error(`Venue not found in database: ${venueId}`);
      return { success: false, error: "Venue not found" };
    }
    
    // Now fetch all upcoming shows at this venue from Ticketmaster API
    const ticketmasterShows = await fetchVenueShowsFromTicketmaster(venueId);
    if (!ticketmasterShows?.events || !Array.isArray(ticketmasterShows.events)) {
      console.log(`No upcoming shows found for venue ${venueName}`);
      return { success: true, message: "No upcoming shows found" };
    }
    
    console.log(`Found ${ticketmasterShows.events.length} shows at ${venueName}`);
    
    // Process each show
    const results = [];
    for (const event of ticketmasterShows.events) {
      try {
        // Skip non-music events
        if (!event.classifications?.some(c => c.segment?.name === 'Music')) {
          continue;
        }
        
        // Get artist info
        const artistName = event.name.split(' at ')[0].trim();
        const artistId = event._embedded?.attractions?.[0]?.id;
        
        if (!artistId) {
          console.log(`No artist ID found for event ${event.name}, skipping`);
          continue;
        }
        
        // Create artist object
        const artistObject = {
          id: artistId,
          name: artistName,
          image: event._embedded?.attractions?.[0]?.images?.[0]?.url,
          spotify_id: null // Will be populated by Spotify search later
        };
        
        // Save the artist to database
        const savedArtist = await saveArtistToDatabase(artistObject);
        if (!savedArtist) {
          console.error(`Failed to save artist ${artistName}`);
          continue;
        }
        
        // Create show object
        const showObject = {
          id: event.id,
          name: event.name,
          date: event.dates?.start?.dateTime,
          artist_id: savedArtist.id,
          venue_id: venueId,
          ticket_url: event.url,
          image_url: event.images?.[0]?.url
        };
        
        // Save the show to database (this will also create a setlist)
        const savedShow = await saveShowToDatabase(showObject);
        if (!savedShow) {
          console.error(`Failed to save show ${event.name}`);
          continue;
        }
        
        results.push({
          show: savedShow.name,
          artist: artistName,
          success: true
        });
        
        // Get Spotify ID for this artist if we don't already have it
        if (!savedArtist.spotify_id) {
          // This would call a Spotify search function
          // For now we'll just log this as a TODO
          console.log(`TODO: Search Spotify for artist ID for ${artistName}`);
        }
      } catch (eventError) {
        console.error(`Error processing event: ${eventError}`);
        results.push({
          show: event.name,
          success: false,
          error: eventError instanceof Error ? eventError.message : String(eventError)
        });
      }
    }
    
    return {
      success: true,
      venue: venueName,
      processed: results.length,
      results
    };
  } catch (error) {
    console.error(`Error in syncVenueShows: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Fetch shows from Ticketmaster API for a venue
 * @param venueId - The Ticketmaster ID of the venue
 */
async function fetchVenueShowsFromTicketmaster(venueId: string) {
  try {
    const apiKey = process.env.VITE_TICKETMASTER_API_KEY || 
                  import.meta.env.VITE_TICKETMASTER_API_KEY;
                  
    if (!apiKey) {
      throw new Error('Missing Ticketmaster API key');
    }
    
    console.log(`Fetching shows for venue ${venueId} from Ticketmaster`);
    
    // Make API request to Ticketmaster
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&venueId=${venueId}&classificationName=music&size=100`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Successfully fetched ${data?._embedded?.events?.length || 0} events from Ticketmaster`);
    
    return {
      events: data?._embedded?.events || []
    };
  } catch (error) {
    console.error(`Error fetching shows from Ticketmaster: ${error}`);
    throw error;
  }
}

/**
 * Enhanced function to create a setlist for a show with better song selection
 * @param showId - The ID of the show
 * @param artistId - The ID of the artist
 */
export async function createSetlistWithPopularSongs(showId: string, artistId: string) {
  try {
    // Check if setlist already exists
    const { data: existingSetlist, error: checkError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (checkError) {
      console.error(`Error checking for existing setlist: ${checkError.message}`);
      return null;
    }
    
    // If setlist already exists, return its ID
    if (existingSetlist) {
      console.log(`Setlist already exists for show ${showId}`);
      return existingSetlist.id;
    }
    
    // Get artist's Spotify ID
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('spotify_id')
      .eq('id', artistId)
      .maybeSingle();
    
    if (artistError || !artist?.spotify_id) {
      console.error(`Cannot find Spotify ID for artist ${artistId}`);
      return null;
    }
    
    // Create new setlist
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert({
        artist_id: artistId,
        show_id: showId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError || !newSetlist) {
      console.error(`Error creating setlist: ${createError?.message}`);
      return null;
    }
    
    // Get artist's top tracks from Spotify
    const topTracksResponse = await getArtistTopTracks(artist.spotify_id);
    // Handle either array return type or object with tracks property
    const topTracks = Array.isArray(topTracksResponse) 
      ? topTracksResponse 
      : (topTracksResponse?.tracks || []);
      
    if (!topTracks || topTracks.length === 0) {
      console.log(`No tracks found for artist ${artistId}`);
      return newSetlist.id; // Return setlist ID even if we couldn't add songs
    }
    
    // Add top 10 tracks to the setlist
    const tracksToAdd = topTracks.slice(0, 10);
    let position = 0;
    
    for (const track of tracksToAdd) {
      position++;
      
      // First save the song to the songs table
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .upsert({
          name: track.name,
          artist_id: artistId,
          spotify_id: track.id,
          duration_ms: track.duration_ms,
          popularity: track.popularity || 0,
          preview_url: track.preview_url
        }, { onConflict: 'spotify_id' })
        .select()
        .single();
      
      if (songError || !songData) {
        console.error(`Error saving song ${track.name}: ${songError?.message}`);
        continue;
      }
      
      // Then add to setlist_songs
      await supabase
        .from('setlist_songs')
        .insert({
          setlist_id: newSetlist.id,
          song_id: songData.id,
          name: track.name,
          position: position,
          artist_id: artistId,
          vote_count: 0
        });
    }
    
    console.log(`Created setlist for show ${showId} with ${position} songs`);
    return newSetlist.id;
  } catch (error) {
    console.error(`Error creating setlist: ${error}`);
    return null;
  }
}
