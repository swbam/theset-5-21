import { retryableFetch } from '@/lib/retry';
import type { Show, Artist, Venue as AppVenue } from '@/lib/types';

// Type for Ticketmaster Image object (duplicate from shared types, consider consolidating later)
interface TicketmasterImage {
  url: string;
  ratio?: string;
  width?: number;
  height?: number;
  fallback?: boolean;
}

// Type for the raw event object from Ticketmaster API response (duplicate from shared types)
interface TicketmasterEvent {
  id: string;
  name: string;
  url?: string;
  dates?: { start?: { dateTime?: string } };
  images?: TicketmasterImage[];
  popularity?: number;
  _embedded?: {
    venues?: Array<{ id: string; name: string; city?: { name: string }; state?: { name: string }; country?: { name: string }; address?: { line1?: string }; postalCode?: string; images?: TicketmasterImage[] }>;
    attractions?: Array<{ id: string; name: string; images?: TicketmasterImage[] }>;
  };
}

// Helper function to map Ticketmaster event to our Show type (duplicate from shared utils)
// TODO: Consolidate this mapping logic if possible
function mapTicketmasterEventToShow(event: TicketmasterEvent): Show {
    let imageUrl;
    if (event.images && event.images.length > 0) {
      const sortedImages = [...event.images].sort((a, b) => (b.width || 0) - (a.width || 0));
      imageUrl = sortedImages[0]?.url;
    }
    // Ensure the created artist object satisfies the nested type in Show
    let mappedArtist: Show['artist'] | undefined = undefined;
    if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
      const attraction = event._embedded.attractions[0];
      if (attraction.id && attraction.name) { // Check required fields
         mappedArtist = {
           id: attraction.id,
           name: attraction.name,
           image_url: attraction.images?.[0]?.url
           // genres are not directly available here
         };
      }
    }
    // Ensure the created venue object satisfies the nested type in Show
    let mappedVenue: Show['venue'] | undefined = undefined;
    if (event._embedded?.venues && event._embedded.venues.length > 0) {
      const venueData = event._embedded.venues[0];
       if (venueData.id && venueData.name) { // Check required fields
          mappedVenue = {
            id: venueData.id,
            ticketmaster_id: venueData.id, // Add TM ID
            name: venueData.name,
            city: venueData.city?.name,
            state: venueData.state?.name,
            country: venueData.country?.name
            // address, postal_code, image_url are not part of the nested Show['venue'] type
          };
       }
    }
    return {
      id: event.id, 
      ticketmaster_id: event.id, 
      name: event.name, 
      date: event.dates?.start?.dateTime || new Date().toISOString(), 
      ticket_url: event.url, 
      image_url: imageUrl, 
      artist_id: mappedArtist?.id, 
      artist: mappedArtist, 
      venue_id: mappedVenue?.id, 
      venue: mappedVenue, 
      popularity: event.popularity || 0,
    };
}

/**
 * Fetch details for a specific show by ID (Client-side usage)
 */
export async function fetchShowDetails(showId: string): Promise<Show | null> {
  try {
    if (!showId) return null;

    // Use import.meta.env for client-side access
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("VITE_TICKETMASTER_API_KEY not configured");
      return null;
    }

    const response: TicketmasterEvent = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events/${showId}.json?apikey=${apiKey}`;
      const result = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!result.ok) {
         if (result.status === 404) return null; // Return null if show not found
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 3 });

    if (!response || !response.id) return null;

    return mapTicketmasterEventToShow(response);

  } catch (error) {
    console.error("Error fetching show details:", error);
    return null;
  }
}

/**
 * Fetch shows by music genre (Client-side usage)
 */
export async function fetchShowsByGenre(
  genre: string,
  size: number = 20,
  fromDate: string = new Date().toISOString().split('T')[0]
): Promise<Show[]> {
  try {
    if (!genre) return [];

    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("VITE_TICKETMASTER_API_KEY not configured");
      return [];
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&classificationName=${encodeURIComponent(genre)}&size=${size}&startDateTime=${fromDate}T00:00:00Z&sort=date,asc`;
      const result = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 3 });

    if (!response._embedded?.events) return [];

    // Map using the helper function
    const events = response._embedded.events.map(mapTicketmasterEventToShow);
    return events;

  } catch (error) {
    console.error("Error fetching shows by genre:", error);
    return [];
  }
}