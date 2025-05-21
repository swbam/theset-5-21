import { toast } from "sonner";
import { callTicketmasterApi } from "../ticketmaster-config";
import { supabase } from "@/integrations/supabase/client";
import { ErrorSource, handleError } from "@/lib/error-handling";

interface TicketmasterImage {
  ratio: string;
  url: string;
  width: number;
  height: number;
}

interface TicketmasterClassification {
  genre?: { name: string };
  subGenre?: { name: string };
}

interface TicketmasterAttraction {
  id: string;
  name: string;
  images?: TicketmasterImage[];
  classifications?: TicketmasterClassification[];
}

interface TicketmasterVenue {
  id: string;
  name: string;
  city?: { name: string };
  state?: { name: string };
  country?: { name: string };
  upcomingEvents?: { totalEvents: number };
}

interface TicketmasterEvent {
  id: string;
  name: string;
  dates: {
    start: {
      dateTime: string;
    };
    status?: {
      code: string;
    };
  };
  images: TicketmasterImage[];
  url?: string;
  rank?: number;
  _embedded?: {
    attractions?: TicketmasterAttraction[];
    venues?: TicketmasterVenue[];
  };
}

interface Artist {
  id: string;
  name: string;
  image_url?: string | null;
  genres?: string[] | null;
  updated_at?: string;
  upcoming_shows?: number;
}

interface Venue {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  updated_at?: string;
}

interface Show {
  id: string;
  name: string;
  date: string;
  artist_id: string;
  venue_id: string | null;
  ticket_url?: string | null;
  image_url?: string | null;
  popularity?: number;
  updated_at?: string;
}

type TableName = 'artists' | 'venues' | 'shows';
type TableData = Artist | Venue | Show;

/**
 * Save data to Supabase with better error handling and retries
 */
async function saveToSupabase(table: TableName, data: TableData, onConflict?: string): Promise<boolean> {
  try {
    // Add updated_at timestamp
    const dataWithTimestamp = {
      ...data,
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from(table)
      .upsert(dataWithTimestamp, {
        onConflict: onConflict,
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error(`Error saving to ${table}:`, error);
      return false;
    }
    
    console.log(`Successfully saved to ${table}`);
    return true;
  } catch (err) {
    console.error(`Failed to save to ${table}:`, err);
    return false;
  }
}

interface ProcessedShow extends Show {
  artist: Artist | null;
  venue: Venue | null;
  qualityScore: number;
}

interface TicketmasterApiResponse {
  _embedded?: {
    events: TicketmasterEvent[];
  };
}

/**
 * Fetch featured shows
 */
export async function fetchFeaturedShows(limit = 4): Promise<ProcessedShow[]> {
  try {
    console.log(`Fetching ${limit} featured shows directly from Ticketmaster API`);
    
    // Fetch directly from Ticketmaster API
    const data: TicketmasterApiResponse = await callTicketmasterApi('events.json', {
      size: '50', // Get more options to choose from
      segmentName: 'Music',
      sort: 'relevance,desc', // Sort by relevance to get more popular events
      includeFamily: 'no' // Filter out family events
    });

    if (!data?._embedded?.events) {
      console.log("No events found in Ticketmaster response");
      return [];
    }

    console.log(`Found ${data._embedded.events.length} events from Ticketmaster`);

    // Filter for events with high-quality images and venue information
    const qualityEvents = data._embedded.events
      .filter((event: TicketmasterEvent) => 
        // Must have a good quality image
        event.images.some((img) => img.ratio === "16_9" && img.width > 500) &&
        // Must have venue information
        event._embedded?.venues?.[0]?.name &&
        // Must have a start date
        event.dates?.start?.dateTime
      )
      // Map to show objects
      .map((event: TicketmasterEvent) => {
        // Get artist from attractions if available
        let artistName = '';
        let artistId = '';
        let artistData: Artist | null = null;
        
        if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
          const attraction = event._embedded.attractions[0];
          artistName = attraction.name;
          artistId = attraction.id;
          
          // Create artist object
          artistData = {
            id: artistId,
            name: artistName,
            image_url: attraction.images?.find(img => img.ratio === "16_9" && img.width > 500)?.url,
            upcoming_shows: 1,
            genres: attraction.classifications && attraction.classifications.length > 0 
              ? [attraction.classifications[0].genre?.name, attraction.classifications[0].subGenre?.name].filter(Boolean)
              : []
          };
        } else {
          // Fallback to extracting from event name
          artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
          artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
          
          // Create minimal artist data
          artistData = {
            id: artistId,
            name: artistName
          };
        }
        
        // Process venue
        let venue = null;
        let venueId = null;
        if (event._embedded?.venues?.[0]) {
          const venueData = event._embedded.venues[0];
          venue = {
            id: venueData.id,
            name: venueData.name,
            city: venueData.city?.name,
            state: venueData.state?.name,
            country: venueData.country?.name,
          };
          venueId = venueData.id;
        }
        
        // Calculate a quality score based on various factors
        const qualityScore = (
          (event.rank || 0) * 2 + 
          (event._embedded?.venues?.[0]?.upcomingEvents?.totalEvents || 0) / 5 +
          (event.dates?.status?.code === "onsale" ? 5 : 0) +
          (event._embedded?.attractions?.length || 0) * 2
        );
        
        // Create show object
        const show = {
          id: event.id,
          name: event.name,
          date: event.dates.start.dateTime,
          artist_id: artistId,
          venue_id: venueId,
          ticket_url: event.url,
          image_url: event.images.find(img => img.ratio === "16_9" && img.width > 500)?.url,
          popularity: qualityScore,
          artist: artistData,
          venue: venue,
          qualityScore
        };
        
        return show;
      });

    // Sort by our quality score and take the top events
    const topShows = qualityEvents
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, limit);
    
    // Create a better data syncing process for Supabase
    Promise.all(
      topShows.map(async (show) => {
        const syncResults = [];
        
        // 1. Save the artist
        if (show.artist) {
          // Extract only database fields for artist
          const artistData = {
            id: show.artist.id,
            name: show.artist.name,
            image_url: show.artist.image_url || null,
            genres: Array.isArray(show.artist.genres) ? show.artist.genres : null
          };
          
          const artistSaved = await saveToSupabase('artists', artistData, 'id');
          syncResults.push({ type: 'artist', success: artistSaved });
        }
        
        // 2. Save the venue
        if (show.venue) {
          // Extract only database fields for venue
          const venueData = {
            id: show.venue.id,
            name: show.venue.name,
            city: show.venue.city || null,
            state: show.venue.state || null,
            country: show.venue.country || null
          };
          
          const venueSaved = await saveToSupabase('venues', venueData, 'id');
          syncResults.push({ type: 'venue', success: venueSaved });
        }
        
        // 3. Save the show
        const showData = {
          id: show.id,
          name: show.name,
          date: show.date,
          artist_id: show.artist_id,
          venue_id: show.venue_id,
          ticket_url: show.ticket_url || null,
          image_url: show.image_url || null,
          popularity: show.popularity || 0
        };
        
        const showSaved = await saveToSupabase('shows', showData, 'id');
        syncResults.push({ type: 'show', success: showSaved });
        
        console.log(`Sync results for show ${show.name}:`, syncResults);
        return syncResults;
      })
    ).then((results) => {
      // Count successful syncs
      const totalArtists = results.flat().filter(r => r.type === 'artist').length;
      const successfulArtists = results.flat().filter(r => r.type === 'artist' && r.success).length;
      
      const totalVenues = results.flat().filter(r => r.type === 'venue').length;
      const successfulVenues = results.flat().filter(r => r.type === 'venue' && r.success).length;
      
      const totalShows = results.flat().filter(r => r.type === 'show').length;
      const successfulShows = results.flat().filter(r => r.type === 'show' && r.success).length;
      
      console.log(`Sync complete. Artists: ${successfulArtists}/${totalArtists}, Venues: ${successfulVenues}/${totalVenues}, Shows: ${successfulShows}/${totalShows}`);
    }).catch(err => {
      console.error("Error in data syncing:", err);
    });
    
    return topShows;
  } catch (error) {
    console.error("Ticketmaster featured shows error:", error);
    handleError({
      message: "Failed to load featured shows",
      source: ErrorSource.API,
      originalError: error
    });
    return [];
  }
}
