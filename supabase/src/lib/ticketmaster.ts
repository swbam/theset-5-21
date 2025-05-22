// This file is a bridge to the _shared/ticketmasterUtils.ts for compatibility
// Re-export all necessary functions from the shared utility files

import { fetchArtistEvents, fetchVenueEvents } from '../../functions/_shared/ticketmasterUtils.ts';
import { retryableFetch } from '../../functions/_shared/retry.ts';

// Export Ticketmaster API functions needed by process-sync-tasks
export async function getEventDetails(eventId: string) {
  try {
    console.log(`[getEventDetails] Fetching event with ID: ${eventId}`);
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    
    if (!apiKey) {
      console.error("[getEventDetails] TICKETMASTER_API_KEY not configured in Edge Function environment variables.");
      throw new Error("Server configuration error: Missing Ticketmaster API Key.");
    }

    const response = await retryableFetch(async () => {
      const url = `https://app.ticketmaster.com/discovery/v2/events/${eventId}?apikey=${apiKey}`;
      console.log(`[getEventDetails] Requesting URL: ${url}`);

      const result = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!result.ok) {
        const errorBody = await result.text();
        console.error(`[getEventDetails] Ticketmaster API error response: ${errorBody}`);
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      return result.json();
    }, { retries: 3 });

    return response;
  } catch (error) {
    console.error(`[getEventDetails] Error fetching event ID '${eventId}':`, error);
    throw error;
  }
}

// Re-export other functions that might be needed
export { fetchArtistEvents, fetchVenueEvents };