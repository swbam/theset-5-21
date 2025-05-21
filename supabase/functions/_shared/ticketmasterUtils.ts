import { retryableFetch } from './retry.ts'; // Assuming retry logic is moved/available
import type { Show, TicketmasterEvent, TicketmasterImage } from './types.ts';

// Helper function to map Ticketmaster event to our Show type
function mapTicketmasterEventToShow(event: TicketmasterEvent): Show {
    let imageUrl;
    if (event.images && event.images.length > 0) {
      const sortedImages = [...event.images].sort((a: TicketmasterImage, b: TicketmasterImage) => (b.width || 0) - (a.width || 0));
      imageUrl = sortedImages[0]?.url;
    }

    let artist = null;
    if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
      const attraction = event._embedded.attractions[0];
      artist = {
        id: attraction.id,
        name: attraction.name,
        image_url: attraction.images?.[0]?.url
      };
    }

    let venue = null;
    if (event._embedded?.venues && event._embedded.venues.length > 0) {
      const venueData = event._embedded.venues[0];
      venue = {
        id: venueData.id,
        ticketmaster_id: venueData.id,
        name: venueData.name,
        city: venueData.city?.name,
        state: venueData.state?.name,
        country: venueData.country?.name,
        address: venueData.address?.line1,
        postal_code: venueData.postalCode,
        image_url: venueData.images?.[0]?.url,
      };
    }

    return {
      id: event.id,
      ticketmaster_id: event.id,
      name: event.name,
      date: event.dates?.start?.dateTime || new Date().toISOString(),
      ticket_url: event.url,
      image_url: imageUrl,
      artist_id: artist?.id,
      artist: artist || undefined,
      venue_id: venue?.id,
      venue: venue || undefined,
      popularity: event.popularity || 0,
    };
}


/**
 * Fetch upcoming events for an artist by their Ticketmaster ID
 */
export async function fetchArtistEvents(artistTmId: string): Promise<Show[]> {
  try {
    if (!artistTmId) {
      console.warn("[EF fetchArtistEvents] No artist Ticketmaster ID provided.");
      return [];
    }

    // Use Deno.env for server-side API key access in Edge Functions
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      console.error("[EF fetchArtistEvents] TICKETMASTER_API_KEY not configured in Edge Function environment variables.");
      throw new Error("Server configuration error: Missing Ticketmaster API Key.");
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&attractionId=${artistTmId}&size=50&sort=date,asc`;
      console.log(`[EF fetchArtistEvents] Requesting URL: ${url}`);

      const result = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!result.ok) {
         const errorBody = await result.text();
         console.error(`[EF fetchArtistEvents] Ticketmaster API error response: ${errorBody}`);
         throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 3 });

    // console.log('[EF fetchArtistEvents] Raw API Response:', response); // Optional: for debugging

    if (!response._embedded?.events) {
      console.log(`[EF fetchArtistEvents] No _embedded.events found for artist TM ID: ${artistTmId}`);
      return [];
    }

    const events = response._embedded.events.map(mapTicketmasterEventToShow);
    console.log(`[EF fetchArtistEvents] Mapped ${events.length} events for artist TM ID: ${artistTmId}`);
    return events;

  } catch (error) {
    console.error(`[EF fetchArtistEvents] Error fetching events for artist TM ID ${artistTmId}:`, error);
    // Re-throw or return empty array depending on desired handling
    // Throwing makes the calling function aware of the failure.
    throw error;
  }
}

/**
 * Fetch upcoming events for a venue by their Ticketmaster ID
 */
export async function fetchVenueEvents(venueTmId: string): Promise<Show[]> {
  try {
    if (!venueTmId) {
      console.warn('[EF fetchVenueEvents] No venue Ticketmaster ID provided.');
      return [];
    }

    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      console.error("[EF fetchVenueEvents] TICKETMASTER_API_KEY not configured in Edge Function environment variables.");
      throw new Error("Server configuration error: Missing Ticketmaster API Key.");
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&venueId=${venueTmId}&size=100&sort=date,asc`;
      console.log(`[EF fetchVenueEvents] Requesting URL: ${url}`);

      const result = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!result.ok) {
        const errorBody = await result.text();
        console.error(`[EF fetchVenueEvents] Ticketmaster API error response: ${errorBody}`);
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 3 });

    // console.log(`[EF fetchVenueEvents] Raw API Response for venue ${venueTmId}:`, response); // Optional: for debugging

    if (!response._embedded?.events) {
      console.log(`[EF fetchVenueEvents] No upcoming events found for venue TM ID: ${venueTmId}`);
      return [];
    }

    const events = response._embedded.events.map(mapTicketmasterEventToShow);
    console.log(`[EF fetchVenueEvents] Mapped ${events.length} events for venue TM ID: ${venueTmId}`);
    return events;

  } catch (error) {
    console.error(`[EF fetchVenueEvents] Error fetching events for venue TM ID ${venueTmId}:`, error);
    throw error; // Re-throw
  }
}

// NOTE: Other functions like fetchShowDetails, fetchVenueDetails etc. could also be moved here if needed by Edge Functions.