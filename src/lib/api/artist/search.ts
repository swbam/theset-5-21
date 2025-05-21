import { toast } from "sonner";
import { callTicketmasterApi } from "../ticketmaster-config";
import { saveArtistToDatabase } from "../database-utils";
import { fetchAndStoreArtistTracks } from "../database";
import { getArtistByName } from "@/lib/spotify";
import { supabase } from "@/integrations/supabase/client";
import { ErrorSource, handleError } from "@/lib/error-handling";

/**
 * Search for artists with upcoming events
 */
export async function searchArtistsWithEvents(query: string, limit = 10): Promise<any[]> {
  try {
    if (!query.trim()) return [];
    
    console.log(`Searching for artists with query: "${query}"`);
    
    // First check if we already have this artist in our database
    let existingArtists: any[] = [];
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(limit);
        
      if (error) {
        console.error("Error searching database for artists:", error);
        // Continue with Ticketmaster search if DB search fails
      } else if (data && data.length > 0) {
        console.log(`Found ${data.length} artists in database matching '${query}'`);
        // Format artists to have consistent structure
        existingArtists = data.map(artist => ({
          id: artist.id,
          name: artist.name,
          image: artist.image_url,
          upcomingShows: artist.upcoming_shows || 0,
          genres: artist.genres || [],
          spotify_id: artist.spotify_id || null
        }));
        
        // Return the existing artists but still do the API call in the background to refresh data
        // Don't await this so we return results quickly
        callTicketmasterApi('events.json', {
          keyword: query,
          segmentName: 'Music',
          sort: 'date,asc',
          size: limit.toString()
        }).then(data => {
          if (data && data._embedded?.events) {
            processAndSaveTicketmasterArtists(data, limit);
          }
        }).catch(err => {
          console.error("Background Ticketmaster refresh error:", err);
        });
        
        return existingArtists;
      }
    } catch (dbSearchError) {
      console.error("Database search error:", dbSearchError);
      // Continue with API search if DB search fails
    }
    
    // If not found in DB or we want fresh data, search Ticketmaster
    try {
      console.log(`Searching Ticketmaster for artists matching '${query}'`);
      const data = await callTicketmasterApi('events.json', {
        keyword: query,
        segmentName: 'Music',
        sort: 'date,asc',
        size: limit.toString()
      });

      if (!data || !data._embedded?.events) {
        console.log(`No events found on Ticketmaster for query '${query}'`);
        
        // If we have existing artists from DB, return those
        if (existingArtists.length > 0) {
          return existingArtists;
        }
        
        // Attempt a direct artist search as fallback
        try {
          const fallbackArtists = await searchFallbackArtists(query, limit);
          return fallbackArtists;
        } catch (fallbackError) {
          console.error("Error during fallback artist search:", fallbackError);
          return [];
        }
      }

      // Process and save the artists
      const artists = await processAndSaveTicketmasterArtists(data, limit);
      console.log("Processed and returning artists:", artists.length);
      
      // Combine with existing artists if any, removing duplicates
      if (existingArtists.length > 0) {
        const existingIds = new Set(existingArtists.map(a => a.id));
        const newArtists = artists.filter(a => !existingIds.has(a.id));
        return [...existingArtists, ...newArtists];
      }
      
      return artists;
    } catch (ticketmasterError) {
      console.error("Ticketmaster API error:", ticketmasterError);
      
      // If we have DB results, return those even if API call fails
      if (existingArtists.length > 0) {
        return existingArtists;
      }
      
      // Try fallback search
      try {
        const fallbackArtists = await searchFallbackArtists(query, limit);
        return fallbackArtists;
      } catch (fallbackError) {
        console.error("Error during fallback artist search:", fallbackError);
        return [];
      }
    }
  } catch (error) {
    console.error("Artist search error:", error);
    handleError({
      message: "Failed to search for artists",
      source: ErrorSource.API,
      originalError: error
    });
    return [];
  }
}

/**
 * Fallback search for artists when Ticketmaster API fails
 */
async function searchFallbackArtists(query: string, limit = 10): Promise<any[]> {
  console.log(`Using fallback artist search for query: ${query}`);
  
  try {
    // Try a direct Spotify search
    const spotifyArtist = await getArtistByName(query);
    if (spotifyArtist && spotifyArtist.id) {
      console.log(`Found artist on Spotify: ${spotifyArtist.name}`);
      
      const artistId = `sp-${spotifyArtist.id}`;
      const artist = {
        id: artistId,
        name: spotifyArtist.name,
        image: spotifyArtist.images && spotifyArtist.images.length > 0 ? spotifyArtist.images[0].url : null,
        upcomingShows: 0,
        genres: spotifyArtist.genres || [],
        spotify_id: spotifyArtist.id
      };
      
      // Save to database in the background
      try {
        await saveArtistToDatabase({
          ...artist,
          image_url: artist.image
        });
      } catch (saveError) {
        console.error(`Error saving Spotify artist to database:`, saveError);
      }
      
      return [artist];
    }
    
    // If no results, check if we have any similar artists in database
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .or(`name.ilike.%${query}%,genres.cs.{"${query}"}`)
      .limit(limit);
      
    if (error) {
      console.error("Error in fallback database search:", error);
      return [];
    }
    
    if (data && data.length > 0) {
      console.log(`Found ${data.length} similar artists in database`);
      return data.map(artist => ({
        id: artist.id,
        name: artist.name,
        image: artist.image_url,
        upcomingShows: artist.upcoming_shows || 0,
        genres: artist.genres || [],
        spotify_id: artist.spotify_id || null
      }));
    }
    
    return [];
  } catch (error) {
    console.error("Fallback artist search error:", error);
    return [];
  }
}

/**
 * Helper function to process and save artists from Ticketmaster response
 */
async function processAndSaveTicketmasterArtists(data: any, limit: number): Promise<any[]> {
  if (!data || !data._embedded || !data._embedded.events) {
    console.warn("Invalid Ticketmaster data format for processing artists");
    return [];
  }
  
  console.log(`Processing ${data._embedded.events.length} events from Ticketmaster`);
  
  // Extract unique artists from events
  const artistsMap = new Map();
  
  data._embedded.events.forEach((event: any) => {
    // Get artist from attractions if available
    let artistName = '';
    let artistId = '';
    let artistImage = '';
    
    if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
      const attraction = event._embedded.attractions[0];
      artistName = attraction.name;
      artistId = attraction.id;
      artistImage = attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url;
    } else {
      // Fallback to extracting from event name if no attractions
      artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
      artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
      artistImage = event.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url;
    }
    
    if (!artistsMap.has(artistId) && artistName) {
      artistsMap.set(artistId, {
        id: artistId,
        name: artistName,
        image: artistImage,
        upcomingShows: 1
      });
    } else if (artistName) {
      // Increment upcoming shows count for this artist
      const artist = artistsMap.get(artistId);
      artist.upcomingShows = (artist.upcomingShows || 0) + 1;
      artistsMap.set(artistId, artist);
    }
  });
  
  // Process artists from Ticketmaster
  const artists = Array.from(artistsMap.values());
  console.log(`Found ${artists.length} unique artists from events`);
  
  // Try to save to DB but don't block returning results if it fails
  try {
    for (const artist of artists) {
      try {
        console.log(`Processing artist: ${artist.name} (ID: ${artist.id})`);
        
        // Try to fetch Spotify data for this artist
        try {
          const spotifyArtist = await getArtistByName(artist.name);
          if (spotifyArtist && spotifyArtist.id) {
            console.log(`Found Spotify ID ${spotifyArtist.id} for artist ${artist.name}`);
            artist.spotify_id = spotifyArtist.id;
            artist.spotify_url = spotifyArtist.external_urls?.spotify;
          } else {
            console.log(`No Spotify artist found for ${artist.name}`);
          }
        } catch (spotifyError) {
          console.error(`Error fetching Spotify details for ${artist.name}:`, spotifyError);
          // Continue without Spotify data
        }
        
        // Save to database (with or without Spotify data)
        try {
          await saveArtistToDatabase({
            ...artist,
            image_url: artist.image
          });
        } catch (saveError) {
          console.error(`Error saving artist ${artist.name} to database:`, saveError);
          // Continue even if database save fails - we'll still return API results
        }
      } catch (artistError) {
        console.error(`Error processing artist ${artist.name}:`, artistError);
        // Continue with next artist
      }
    }
  } catch (processingError) {
    console.error("Error processing artists:", processingError);
    // Even if DB operations fail, we still return the artists from the API
  }
  
  return artists;
}
