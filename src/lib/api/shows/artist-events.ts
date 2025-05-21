
import { toast } from "sonner";
import { callTicketmasterApi } from "../ticketmaster-config";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch upcoming shows for an artist
 */
export async function fetchArtistEvents(artistIdentifier: string): Promise<any[]> {
  try {
    console.log(`Fetching events for artist ID: ${artistIdentifier}`);
    
    // Skip database check and go straight to API
    // Determine search parameter based on ID format
    let searchParam: any = {};
    
    if (artistIdentifier.startsWith('K')) {
      // Ticketmaster ID
      searchParam = { attractionId: artistIdentifier };
    } else if (artistIdentifier.startsWith('tm-')) {
      // Custom ID with artist name
      const artistName = decodeURIComponent(artistIdentifier.replace('tm-', '')).replace(/-/g, ' ');
      searchParam = { keyword: artistName };
    } else {
      // Treat as keyword
      searchParam = { keyword: artistIdentifier };
    }
    
    console.log(`Fetching from Ticketmaster API with params:`, searchParam);
    
    // Fetch from Ticketmaster API with increased size to get all shows
    const data = await callTicketmasterApi('events.json', {
      ...searchParam,
      segmentName: 'Music',
      sort: 'date,asc',
      size: '100' // Increased from 20 to 100 to get more shows
    });

    if (!data._embedded?.events) {
      console.log(`No events found for artist ID: ${artistIdentifier}`);
      return [];
    }

    console.log(`Found ${data._embedded.events.length} events from Ticketmaster for artist ID: ${artistIdentifier}`);
    
    const shows = data._embedded.events.map((event: any) => {
      // Get artist info from the event
      let artistName = '';
      let artistId = '';
      
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        const attraction = event._embedded.attractions[0];
        artistName = attraction.name;
        artistId = attraction.id;
      } else {
        // Fallback to extracting from event name
        artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
        artistId = artistIdentifier;
      }
      
      // Process venue
      let venue = null;
      if (event._embedded?.venues?.[0]) {
        const venueData = event._embedded.venues[0];
        venue = {
          id: venueData.id,
          name: venueData.name,
          city: venueData.city?.name,
          state: venueData.state?.name,
          country: venueData.country?.name,
        };
      }
      
      // Create show object
      return {
        id: event.id,
        name: event.name,
        date: event.dates.start.dateTime,
        venue: venue,
        ticket_url: event.url,
        image_url: event.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
        artist_id: artistId
      };
    });

    return shows;
  } catch (error) {
    console.error("Ticketmaster event error:", error);
    return [];
  }
}
