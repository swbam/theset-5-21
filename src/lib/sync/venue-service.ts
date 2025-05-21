import { supabase } from '@/integrations/supabase/client';
import { APIClientManager } from './api-client';
import { IncrementalSyncService } from './incremental';
import { SyncOptions, SyncResult } from './types';
import { Venue, Show } from '@/lib/types'; // Assuming Venue/Show types match DB or need update

// --- Interfaces for API Responses ---
// Simplified - add more detail as needed
interface TmImage {
  url: string;
  width: number;
  height: number;
}

interface TmLocation {
  latitude?: string | number | null;
  longitude?: string | number | null;
}

interface TmAddress {
  line1?: string;
}

interface TmCity {
  name?: string;
}

interface TmState {
  stateCode?: string;
}

interface TmCountry {
  countryCode?: string;
}

interface TmVenueData {
  id: string;
  name: string;
  url?: string;
  images?: TmImage[];
  address?: TmAddress;
  city?: TmCity;
  state?: TmState;
  country?: TmCountry;
  location?: TmLocation;
}

interface TmAttraction { // Copied from artist-service for consistency
  id: string;
  name: string;
  url?: string;
  images?: TmImage[];
  type?: string;
}

interface TmEventDateInfo {
  start?: { dateTime?: string };
  status?: { code?: string };
}

interface TmEventData {
  id: string;
  name: string;
  url?: string;
  images?: TmImage[];
  dates?: TmEventDateInfo;
  _embedded?: {
    venues?: TmVenueData[]; // Use TmVenueData here
    attractions?: TmAttraction[];
  };
}

interface TmVenueResponse {
  _embedded?: {
    venues?: TmVenueData[];
  };
  // Add top-level fields if needed based on actual API response for single venue fetch
  id?: string;
  name?: string;
  url?: string;
  images?: TmImage[];
  address?: TmAddress;
  city?: TmCity;
  state?: TmState;
  country?: TmCountry;
  location?: TmLocation;
}

interface TmEventResponse {
  _embedded?: {
    events?: TmEventData[];
  };
}
// --- End Interfaces ---

/**
 * Service for syncing venue data from external APIs
 */
export class VenueSyncService {
  private apiClient: APIClientManager;
  private syncService: IncrementalSyncService;
  
  constructor() {
    this.apiClient = new APIClientManager();
    this.syncService = new IncrementalSyncService();
  }
  
  /**
   * Sync a venue by ID
   */
  // Modified syncVenue to primarily invoke the sync-venue Edge Function
  async syncVenue(venueExternalId: string, options?: SyncOptions): Promise<SyncResult<Venue>> {
    // The 'venueId' parameter now refers to the external ID (e.g., Ticketmaster ID)
    try {
      // Optional: Add incremental sync check here if desired
      const syncStatus = await this.syncService.getSyncStatus(venueExternalId, 'venue', options);
      if (!syncStatus.needsSync && !options?.force) {
         console.log(`[VenueService] Sync not needed for venue ${venueExternalId}`);
         const { data: existingVenue } = await supabase
           .from('venues')
           .select('*')
           .eq('external_id', venueExternalId)
           .maybeSingle();
         // Return undefined instead of null if not found, to match SyncResult type expectation
         return { success: true, updated: false, data: (existingVenue as Venue) || undefined };
      }

      console.log(`[VenueService] Invoking sync-venue function for external ID: ${venueExternalId}`);
      const { data, error: invokeError } = await supabase.functions.invoke('sync-venue', {
        body: { venueId: venueExternalId } // Pass the external ID
      });

      if (invokeError) {
        console.error(`[VenueService] Error invoking sync-venue for ${venueExternalId}:`, invokeError);
        return { success: false, updated: false, error: invokeError.message };
      }

      if (!data?.success) {
         const errorMessage = data?.error || data?.message || 'Sync function failed without specific error';
         console.warn(`[VenueService] sync-venue function failed for ${venueExternalId}:`, errorMessage);
         return { success: false, updated: false, error: errorMessage };
      }

      console.log(`[VenueService] Successfully invoked sync-venue for ${venueExternalId}.`);
      await this.syncService.markSynced(venueExternalId, 'venue');

      return {
        success: true,
        updated: data.updated ?? true,
        data: data.data as Venue
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[VenueService] Error in syncVenue for ${venueExternalId}:`, errorMessage);
      return {
        success: false,
        updated: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Fetch venue data from all available sources
   */
  private async fetchVenueData(venueId: string): Promise<Venue | null> {
    // First try to get existing venue
    const { data: existingVenue } = await supabase
      .from('venues')
      .select('*')
      .eq('external_id', venueId)
      .single();
      
    let venue = existingVenue as Venue | null;
    
    // Ticketmaster API for venue details
    try {
      const tmData = await this.apiClient.callAPI(
        'ticketmaster',
        `venues/${venueId}`,
        {}
      ) as TmVenueResponse | null; // Assert type for single venue fetch
      
      if (tmData) {
        const address = [
          tmData.address?.line1,
          tmData.city?.name
        ].filter(Boolean).join(', ');
        
        // Simplify object creation and explicitly cast
        venue = {
          id: venue?.id || undefined, // Keep existing UUID if updating
          external_id: venueId,
          name: tmData.name ?? 'Unknown Venue', // Default ensures string type
          city: tmData.city?.name || venue?.city || null,
          state: tmData.state?.stateCode || venue?.state || null,
          country: tmData.country?.countryCode || venue?.country || null,
          image_url: this.getBestImage(tmData.images) || venue?.image_url || null,
          // Preserve existing created_at or set default, always update updated_at
          created_at: venue?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Ensure all required fields from Venue type are present
        } as Venue; // Explicit cast to satisfy compiler
      }
    } catch (error) {
      console.warn(`Error fetching Ticketmaster data for venue ${venueId}:`, error);
    }
    
    return venue;
  }
  
  /**
   * Get the best quality image from an array of images
   */
  private getBestImage(images?: Array<{url: string, width: number, height: number}>): string | null {
    if (!images || images.length === 0) return null;
    
    // Sort by width to get highest resolution
    const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
    return sorted[0].url;
  }
  
  /**
   * Get upcoming shows at a venue
   */
  async getVenueUpcomingShows(venueId: string): Promise<Show[]> {
    try {
      // First get the venue to ensure it exists
      const { data: venue, error } = await supabase
        .from('venues')
        .select('name, id')
        .or(`id.eq.${venueId},external_id.eq.${venueId}`)
        .single();
        
      if (!venue || error) {
        console.error(`Venue ${venueId} not found for upcoming shows:`, error);
        return [];
      }
      
      // Now get upcoming shows from Ticketmaster
      const response = await this.apiClient.callAPI(
        'ticketmaster',
        'events',
        {
          venueId: venueId, // Use the external ID for API call
          sort: 'date,asc',
          size: 50
        }
      ) as TmEventResponse | null; // Assert type
      
      if (!response?._embedded?.events) {
        return [];
      }
      
      // Process shows
      const shows: Show[] = [];
      
      for (const event of response._embedded.events) {
        if (!event.id) continue;
        
        const artistId = event._embedded?.attractions?.[0]?.id;
        
        // Construct show object matching the 'shows' table schema
        const show = { // Use inferred type
          external_id: event.id, // Correct
          name: event.name,      // Correct
          date: event.dates?.start?.dateTime || null, // Correct
          // artist_id: null, // Will be set later by artist sync
          venue_id: venue.id, // Correct: Use internal venue UUID
          ticket_url: event.url || null, // Correct: Use ticket_url column name
          image_url: this.getBestImage(event.images), // Correct
          popularity: 0, // Default popularity
          // created_at/updated_at handled by DB
          // Remove fields not in 'shows' table: artist_external_id, venue_external_id, status
        };
        
        shows.push(show);
        
        // Store each show as we find it
        const { error: upsertError } = await supabase
          .from('shows')
          .upsert({
            ...show,
            // Explicitly set artist_id to null if not yet known/synced.
            artist_id: null
          }, {
            onConflict: 'external_id',
            ignoreDuplicates: false
          });
          
        if (upsertError) {
          console.error(`Error upserting show ${event.id}:`, upsertError);
        } else {
          // Mark as synced
          await this.syncService.markSynced(event.id, 'show');
        }
      }
      
      return shows;
    } catch (error) {
      console.error(`Error getting upcoming shows for venue ${venueId}:`, error);
      return [];
    }
  }
  
  /**
   * Search for venues by location
   */
  async searchVenues(keyword: string, city?: string, stateCode?: string): Promise<Venue[]> {
    try {
      // Search parameters
      const params: Record<string, any> = {
        keyword,
        size: 10
      };
      if (city) params.city = city;
      if (stateCode) params.stateCode = stateCode;

      // Search Ticketmaster for venues
      const response = await this.apiClient.callAPI(
        'ticketmaster',
        'venues',
        params
      ) as TmVenueResponse | null; // Assert type for venue search

      if (!response?._embedded?.venues) {
        return [];
      }

      const results: Venue[] = [];

      for (const tmVenue of response._embedded.venues) {
        // Skip if essential data like id or name is missing
        if (!tmVenue.id || !tmVenue.name) continue;

        // Construct venue object matching the 'venues' table schema from schema.sql
        const venue = {
          external_id: tmVenue.id,
          name: tmVenue.name, // Known non-null due to check above
          city: tmVenue.city?.name || null,
          state: tmVenue.state?.stateCode || null,
          country: tmVenue.country?.countryCode || null,
          image_url: this.getBestImage(tmVenue.images),
        };

        // We push the venue data as returned by the API *before* invoking the sync.
        // The UI will display this, and the sync happens in the background.
        results.push(venue as Venue); // Cast needed as we didn't include all optional Venue fields

        // Invoke the sync-venue function in the background
        console.log(`[VenueService/searchVenues] Invoking sync-venue for venue ID: ${venue.external_id}`);
        supabase.functions.invoke('sync-venue', {
          body: { venueId: venue.external_id }
        }).then(({ data, error: invokeError }) => {
           if (invokeError) {
             console.error(`[VenueService/searchVenues] Error invoking sync-venue for ${venue.external_id}:`, invokeError);
           } else if (!data?.success) {
             console.warn(`[VenueService/searchVenues] sync-venue function failed for ${venue.external_id}:`, data?.error || data?.message);
           }
           // Sync status marking should happen within the syncVenue method or Edge Function
        }).catch(err => console.error(`[VenueService/searchVenues] Exception invoking sync-venue for ${venue.external_id}:`, err));
      }

      return results;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error searching for venues: ${keyword}`, errorMessage);
      return [];
    }
  }
} 