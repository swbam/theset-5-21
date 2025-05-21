import { supabase } from '@/integrations/supabase/client';
import { APIClientManager } from './api-client';
import { IncrementalSyncService } from './incremental';
import { SyncOptions, SyncResult } from './types';
import { Show } from '@/lib/types';

// --- Interfaces for API Responses ---
// Simplified - add more detail as needed
interface TmImage {
  url: string;
  width: number;
  height: number;
}

interface TmAttraction {
  id: string;
}

interface TmVenue {
  id: string;
}

interface TmEventDateInfo {
  start?: { dateTime?: string };
  status?: { code?: string };
}

interface TmEventData {
  id: string;
  name?: string; // Name can sometimes be missing
  url?: string;
  images?: TmImage[];
  dates?: TmEventDateInfo;
  _embedded?: {
    venues?: TmVenue[];
    attractions?: TmAttraction[];
  };
}

// Combined structure for both single event fetch and event search
interface TmEventResponse {
   // Fields for single event fetch
   id?: string;
   name?: string;
   url?: string;
   images?: TmImage[];
   dates?: TmEventDateInfo;
   _embedded?: { // Can contain venues/attractions for single event OR events for search
     venues?: TmVenue[];
     attractions?: TmAttraction[];
     events?: TmEventData[]; // For search results
   };
}

interface SetlistFmSetlist {
  id: string;
  // other fields...
}

interface SetlistFmSearchResponse {
  setlist?: SetlistFmSetlist[];
  // other fields...
}
// --- End Interfaces ---

/**
 * Service for syncing shows data from external APIs
 */
export class ShowSyncService {
  private apiClient: APIClientManager;
  private syncService: IncrementalSyncService;
  
  constructor() {
    this.apiClient = new APIClientManager();
    this.syncService = new IncrementalSyncService();
  }
  
  /**
   * Sync a show by ID
   */
  // Modified syncShow to primarily invoke the sync-show Edge Function
  async syncShow(showExternalId: string, options?: SyncOptions): Promise<SyncResult<Show>> {
    // The 'showId' parameter now refers to the external ID (e.g., Ticketmaster ID)
    try {
      // Optional: Add incremental sync check here if desired, before invoking function
      // const syncStatus = await this.syncService.getSyncStatus(showExternalId, 'show', options);
      // if (!syncStatus.needsSync && !options?.force) { ... return existing data ... }

      console.log(`[ShowService] Invoking sync-show function for external ID: ${showExternalId}`);
      const { data, error: invokeError } = await supabase.functions.invoke('sync-show', {
        body: { showId: showExternalId } // Pass the external ID
      });

      if (invokeError) {
        console.error(`[ShowService] Error invoking sync-show for ${showExternalId}:`, invokeError);
        return { success: false, updated: false, error: invokeError.message };
      }

      if (!data?.success) {
         const errorMessage = data?.error || data?.message || 'Sync function failed without specific error';
         console.warn(`[ShowService] sync-show function failed for ${showExternalId}:`, errorMessage);
         return { success: false, updated: false, error: errorMessage };
      }

      console.log(`[ShowService] Successfully invoked sync-show for ${showExternalId}.`);
      // Mark as synced locally after successful function invocation
      await this.syncService.markSynced(showExternalId, 'show');

      // The function returns the upserted data which should match the Show type
      return {
        success: true,
        updated: data.updated ?? true, // Assume updated if function succeeded
        data: data.data as Show // Data returned by the function
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ShowService] Error in syncShow for ${showExternalId}:`, errorMessage);
      return {
        success: false,
        updated: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Fetch show data from all available sources
   * Combines data from Ticketmaster/setlist.fm and other sources
   */
  private async fetchShowData(showId: string): Promise<Show | null> {
    // First try to get existing show
    const { data: existingShow } = await supabase
      .from('shows')
      .select('*, venue_id, artist_id')
      .eq('id', showId)
      .single();
      
    let show = existingShow as Show | null;
    
    // Ticketmaster API for event details
    try {
      const tmData = await this.apiClient.callAPI(
        'ticketmaster',
        `events/${showId}`,
        { include: 'venues,attractions' }
      ) as TmEventResponse | null; // Assert type for single event fetch
      
      if (tmData && tmData._embedded) {
        // Process Ticketmaster data
        // Access _embedded directly for single event fetch
        const artistId = tmData._embedded?.attractions?.[0]?.id;
        const venueId = tmData._embedded?.venues?.[0]?.id;
        
        // Align with DB schema (schema.sql)
        show = {
          id: show?.id || undefined, // Preserve existing UUID if updating
          external_id: showId, // Ensure external_id is set
          name: tmData.name ?? 'Unknown Show',
          date: tmData.dates?.start?.dateTime || null,
          // artist_id and venue_id should be UUIDs, handle linking elsewhere
          // artist_id: artistId || (show?.artist_id || null), // Incorrect: artistId is external
          // venue_id: venueId || (show?.venue_id || null), // Incorrect: venueId is external
          ticket_url: tmData.url || null, // Use ticket_url
          image_url: this.getBestImage(tmData.images),
          popularity: show?.popularity || 0, // Add popularity if needed
          // created_at/updated_at handled by DB
          created_at: show?.created_at || undefined, // Preserve if exists
          updated_at: new Date().toISOString(), // Always update this
        } as Show; // Cast to Show type from types.ts (ensure it's updated)
      }
    } catch (error) {
      console.warn(`Error fetching Ticketmaster data for show ${showId}:`, error);
      // Continue with other sources
    }
    
    // Setlist.fm API for setlist info
    if (show && show.artist_id) {
      try {
        // Get artist info to search by name
        const { data: artist } = await supabase
          .from('artists')
          .select('name')
          .eq('id', show.artist_id)
          .single();
          
        if (artist) {
          // Search for setlists by artist and date
          const eventDate = new Date(show.date as string);
          const formattedDate = `${eventDate.getDate()}-${eventDate.getMonth() + 1}-${eventDate.getFullYear()}`;
          
          const setlistData = await this.apiClient.callAPI(
            'setlistfm',
            'search/setlists',
            {
              artistName: artist.name,
              date: formattedDate,
              p: 1
            }
          ) as SetlistFmSearchResponse | null; // Assert type
          
          // Update with setlist data if available
          if (setlistData && setlistData.setlist && setlistData.setlist.length > 0) {
            const setlist = setlistData.setlist[0];
            // The 'shows' table doesn't have setlist_id, link is in 'setlists' table
            // show.setlist_id = setlist.id;

            // Trigger setlist sync if needed (use external setlist.id)
            if (setlist.id) {
              console.log(`Found setlist ${setlist.id} for show ${showId}, triggering sync...`);
              // Consider invoking sync-setlist function or using SetlistSyncService
              // supabase.functions.invoke('sync-setlist', { body: { setlistId: setlist.id } });
            }
          }
        }
      } catch (error) {
        console.warn(`Error fetching setlist data for show ${showId}:`, error);
      }
    }
    
    return show;
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
   * Sync multiple shows by their IDs
   */
  async syncMultipleShows(showIds: string[], options?: SyncOptions): Promise<SyncResult<Show[]>> {
    const results: Show[] = [];
    const errors: string[] = [];
    let hasUpdates = false;
    
    for (const showId of showIds) {
      const result = await this.syncShow(showId, options);
      
      if (result.success && result.data) {
        results.push(result.data);
        if (result.updated) {
          hasUpdates = true;
        }
      } else if (result.error) {
        errors.push(`Show ${showId}: ${result.error}`);
      }
    }
    
    return {
      success: errors.length === 0,
      updated: hasUpdates,
      data: results,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  }
  
  /**
   * Search for upcoming shows by location and genre
   */
  async searchUpcomingShows(
    city?: string, 
    stateCode?: string, 
    genreId?: string, 
    startDate?: string,
    endDate?: string,
    radius?: number
  ): Promise<Show[]> {
    try {
      const params: Record<string, any> = {
        size: 50,
        sort: 'date,asc'
      };
      
      if (city && stateCode) {
        params.city = city;
        params.stateCode = stateCode;
      }
      
      if (genreId) {
        params.genreId = genreId;
      }
      
      if (startDate) {
        params.startDateTime = startDate;
      } else {
        // Default to today
        const today = new Date();
        params.startDateTime = today.toISOString().split('T')[0] + 'T00:00:00Z';
      }
      
      if (endDate) {
        params.endDateTime = endDate;
      }
      
      if (radius) {
        params.radius = radius;
        params.unit = 'miles';
      }
      
      const response = await this.apiClient.callAPI(
        'ticketmaster',
        'events',
        params
      ) as TmEventResponse | null; // Assert type for event search
      
      // Check response and _embedded.events safely
      if (!response?._embedded?.events) {
        return [];
      }
      
      // Process shows and store them
      const shows: Show[] = [];
      
      // response is checked above, _embedded.events is checked above
      for (const event of response._embedded!.events!) {
        if (!event.id) continue;
        
        const artistId = event._embedded?.attractions?.[0]?.id;
        const venueId = event._embedded?.venues?.[0]?.id;
        
        // Check if we need to create artist/venue first
        if (artistId) {
          // This would queue artist sync in a real implementation
          // await this.syncArtist(artistId);
        }
        
        if (venueId) {
          // This would queue venue sync in a real implementation
          // await this.syncVenue(venueId);
        }
        
        // Align with DB schema (schema.sql)
        const show = {
          external_id: event.id, // Use external_id
          name: event.name ?? 'Unknown Show',
          date: event.dates?.start?.dateTime || null,
          // artist_id and venue_id need to be UUIDs, set later
          // artist_id: artistId || null,
          // venue_id: venueId || null,
          ticket_url: event.url || null, // Use ticket_url
          image_url: this.getBestImage(event.images),
          popularity: 0, // Default popularity
          // created_at/updated_at handled by DB
        };
        
        shows.push(show);
        
        // Upsert show to database
        await supabase
          .from('shows')
          .upsert(show, { onConflict: 'external_id' }); // Use external_id
          
        // Mark as synced
        await this.syncService.markSynced(event.id, 'show');
      }
      
      return shows;
    } catch (error) {
      console.error('Error searching upcoming shows:', error);
      return [];
    }
  }
} 