import { supabase } from '@/integrations/supabase/client';
import { APIClientManager } from './api-client';
import { IncrementalSyncService } from './incremental';
import { SyncOptions, SyncResult } from './types';
import { Artist, Show } from '@/lib/types'; // Assuming Show type is defined correctly here or needs update

// --- Interfaces for API Responses ---
// Simplified - add more detail as needed
interface TmImage {
  url: string;
  width: number;
  height: number;
}

interface TmAttraction {
  id: string;
  name: string;
  url?: string;
  images?: TmImage[];
  type?: string; // Add type property
}

interface TmVenue {
  id: string;
}

interface TmEventDateInfo {
  start?: { dateTime?: string };
  status?: { code?: string };
}

interface TmEvent {
  id: string;
  name: string;
  url?: string;
  images?: TmImage[];
  dates?: TmEventDateInfo;
  _embedded?: {
    venues?: TmVenue[];
    attractions?: TmAttraction[]; // Added for consistency, though not directly used in show loop
  };
}

interface TmAttractionResponse {
  _embedded?: {
    attractions?: TmAttraction[];
  };
}

interface TmEventResponse {
  _embedded?: {
    events?: TmEvent[];
  };
}

interface SpotifyArtist {
  id: string;
  name: string; // For debugging/logging
  external_urls?: { spotify?: string };
  genres?: string[];
  popularity?: number;
  images?: TmImage[];
}

interface SpotifySearchResponse {
  artists?: {
    items?: SpotifyArtist[];
  };
}
// --- End Interfaces ---

/**
 * Service for syncing artist data from external APIs
 */
export class ArtistSyncService {
  private apiClient: APIClientManager;
  private syncService: IncrementalSyncService;
  
  constructor() {
    this.apiClient = new APIClientManager();
    this.syncService = new IncrementalSyncService();
  }
  
  /**
   * Sync an artist by ID
   */
  // Modified syncArtist to primarily invoke the sync-artist Edge Function
  async syncArtist(artistExternalId: string, options?: SyncOptions): Promise<SyncResult<Artist>> {
    // The 'artistId' parameter now refers to the external ID (e.g., Ticketmaster ID)
    try {
      // Optional: Add incremental sync check here if desired
      const syncStatus = await this.syncService.getSyncStatus(artistExternalId, 'artist', options);
      if (!syncStatus.needsSync && !options?.force) {
         console.log(`[ArtistService] Sync not needed for artist ${artistExternalId}`);
         const { data: existingArtist } = await supabase
           .from('artists')
           .select('*')
           .eq('external_id', artistExternalId)
           .maybeSingle();
         // Return undefined instead of null if not found
         return { success: true, updated: false, data: (existingArtist as Artist) || undefined };
      }

      console.log(`[ArtistService] Invoking sync-artist function for external ID: ${artistExternalId}`);
      const { data, error: invokeError } = await supabase.functions.invoke('sync-artist', {
        body: { artistId: artistExternalId } // Pass the external ID
      });

      if (invokeError) {
        console.error(`[ArtistService] Error invoking sync-artist for ${artistExternalId}:`, invokeError);
        return { success: false, updated: false, error: invokeError.message };
      }

      if (!data?.success) {
         const errorMessage = data?.error || data?.message || 'Sync function failed without specific error';
         console.warn(`[ArtistService] sync-artist function failed for ${artistExternalId}:`, errorMessage);
         return { success: false, updated: false, error: errorMessage };
      }

      console.log(`[ArtistService] Successfully invoked sync-artist for ${artistExternalId}.`);
      await this.syncService.markSynced(artistExternalId, 'artist');

      return {
        success: true,
        updated: data.updated ?? true,
        data: data.data as Artist
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ArtistService] Error in syncArtist for ${artistExternalId}:`, errorMessage);
      return {
        success: false,
        updated: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Fetch artist data from all available sources
   * Combines data from Ticketmaster/setlist.fm and Spotify for the most complete profile
   */
  private async fetchArtistData(artistId: string): Promise<Artist | null> {
    // First try to get existing artist
    const { data: existingArtist } = await supabase
      .from('artists')
      .select('*')
      .eq('external_id', artistId)
      .single();
      
    let artist = existingArtist as Artist | null;
    
    // Ticketmaster API for artist details
    try {
      const tmData = await this.apiClient.callAPI(
        'ticketmaster',
        `attractions/${artistId}`,
        { }
      ) as TmAttraction | null; // Assert type
      
      if (tmData) {
        artist = {
          id: artist?.id || undefined, // Keep UUID if it exists
          external_id: artistId, // Store Ticketmaster ID as external_id
          name: tmData.name,
          image_url: this.getBestImage(tmData.images),
          url: tmData.url,
          // Placeholder fields for Spotify data
          spotify_id: artist?.spotify_id || null,
          spotify_url: artist?.spotify_url || null,
          genres: artist?.genres || [],
          popularity: artist?.popularity || null,
          // Preserve existing fields
          ...((artist && {
            created_at: artist.created_at,
            updated_at: new Date().toISOString()
          }) || {
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        };
      }
    } catch (error) {
      console.warn(`Error fetching Ticketmaster data for artist ${artistId}:`, error);
      // Continue with other sources
    }
    
    // If we have an artist, enrich with Spotify data
    if (artist) {
      try {
        // Search Spotify by artist name
        const spotifyData = await this.apiClient.callAPI(
          'spotify',
          'search',
          {
            q: artist.name,
            type: 'artist',
            limit: 1
          }
        ) as SpotifySearchResponse | null; // Assert type
        
        // Refined check for Spotify data
        if (spotifyData?.artists?.items && spotifyData.artists.items.length > 0) {
          const spotifyArtist = spotifyData.artists.items[0]; // Now safe to access
          
          // Update with Spotify data
          artist.spotify_id = spotifyArtist.id;
          artist.spotify_url = spotifyArtist.external_urls?.spotify || null;
          artist.genres = spotifyArtist.genres || [];
          artist.popularity = spotifyArtist.popularity || null;
          
          // If Spotify has a better image, use it
          if (!artist.image_url && spotifyArtist.images && spotifyArtist.images.length > 0) {
            artist.image_url = spotifyArtist.images[0].url;
          }
        }
      } catch (error) {
        console.warn(`Error fetching Spotify data for artist ${artistId}:`, error);
      }
    }
    
    return artist;
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
   * Get upcoming shows for an artist
   */
  async getArtistUpcomingShows(artistId: string): Promise<Show[]> {
    try {
      // First get the artist to ensure we have the name
      const { data: artist, error } = await supabase
        .from('artists')
        .select('name, id')
        .or(`id.eq.${artistId},external_id.eq.${artistId}`)
        .single();
        
      if (!artist || error) {
        console.error(`Artist ${artistId} not found for upcoming shows:`, error);
        return [];
      }
      
      // Now get upcoming shows from Ticketmaster
      const response = await this.apiClient.callAPI(
        'ticketmaster',
        'events',
        {
          attractionId: artistId,
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
        
        // const venueId = event._embedded?.venues?.[0]?.id; // No longer needed here
        
        // Construct show object matching the 'shows' table schema
        const show = { // Don't explicitly type as Show if Show type definition is outdated
          external_id: event.id, // Correct: Use TM event ID
          name: event.name,      // Correct
          date: event.dates?.start?.dateTime || null, // Correct
          artist_id: artist.id, // Correct: Use internal artist UUID
          // venue_id: null, // Set explicitly to null if venue not synced yet (handled in upsert below)
          ticket_url: event.url || null, // Correct: Use ticket_url column name
          image_url: this.getBestImage(event.images), // Correct
          popularity: 0, // Default popularity, adjust if needed
          // created_at and updated_at are handled by DB defaults/triggers usually
          // Remove fields not in 'shows' table: venue_external_id, status
        };
        
        shows.push(show);
        
        // --- MODIFIED: Invoke sync-show function instead of direct upsert ---
        console.log(`[ArtistService/getArtistUpcomingShows] Invoking sync-show for show ID: ${event.id}`);
        supabase.functions.invoke('sync-show', {
          body: { showId: event.id } // Pass the Ticketmaster event ID
        }).then(({ data: showSyncData, error: invokeShowError }) => {
           if (invokeShowError) {
             console.error(`[ArtistService/getArtistUpcomingShows] Error invoking sync-show for ${event.id}:`, invokeShowError.message);
           } else if (!showSyncData?.success) {
             console.warn(`[ArtistService/getArtistUpcomingShows] sync-show function failed for ${event.id}:`, showSyncData?.error || showSyncData?.message);
           } else {
             console.log(`[ArtistService/getArtistUpcomingShows] Successfully invoked sync-show for ${event.id}.`);
             // Sync status marking should ideally happen within the sync-show function upon successful upsert
             // Or potentially update based on the response here if needed:
             // this.syncService.markSynced(event.id, 'show');
           }
        }).catch(err => {
           const errorMsg = err instanceof Error ? err.message : String(err);
           console.error(`[ArtistService/getArtistUpcomingShows] Exception invoking sync-show for ${event.id}:`, errorMsg);
        });
        // We don't await here, let sync happen in the background
        // --- END MODIFIED ---
      }
      
      return shows;
    } catch (error) {
      console.error(`Error getting upcoming shows for artist ${artistId}:`, error);
      return [];
    }
  }
  
  /**
   * Search for artists by name
   */
  async searchArtists(name: string): Promise<Artist[]> {
    try {
      // Search Ticketmaster for artists
      const response = await this.apiClient.callAPI(
        'ticketmaster',
        'attractions',
        {
          keyword: name,
          classificationName: 'music', // Ensures we only get music artists
          size: 10
        }
      ) as TmAttractionResponse | null; // Assert type
      
      if (!response?._embedded?.attractions) {
        return [];
      }
      
      const results: Artist[] = [];
      
      for (const attraction of response._embedded.attractions) {
        if (!attraction.id || attraction.type !== 'attraction') continue;
        
        const artist: Artist = {
          external_id: attraction.id, // Store external ID 
          name: attraction.name,
          image_url: this.getBestImage(attraction.images),
          url: attraction.url,
          spotify_id: null,
          spotify_url: null,
          genres: [],
          popularity: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        results.push(artist);
        
        // Invoke the sync-artist function instead of client-side upsert
        console.log(`[ArtistService/searchArtists] Invoking sync-artist for artist ID: ${artist.external_id}`);
        supabase.functions.invoke('sync-artist', {
          body: { artistId: artist.external_id }
        }).then(({ data, error: invokeError }) => {
           if (invokeError) {
             console.error(`[ArtistService/searchArtists] Error invoking sync-artist for ${artist.external_id}:`, invokeError);
           } else if (!data?.success) {
             console.warn(`[ArtistService/searchArtists] sync-artist function failed for ${artist.external_id}:`, data?.error || data?.message);
           }
           // Sync status marking should happen within the syncArtist method or Edge Function
        }).catch(err => console.error(`[ArtistService/searchArtists] Exception invoking sync-artist for ${artist.external_id}:`, err));
        // We don't await here, let sync happen in the background
      }
      
      return results;
    } catch (error) {
      console.error(`Error searching for artists: ${name}`, error);
      return [];
    }
  }
} 