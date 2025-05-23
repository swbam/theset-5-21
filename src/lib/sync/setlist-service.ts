import { supabase } from '@/integrations/supabase/client';
import { APIClientManager } from './api-client';
import { IncrementalSyncService } from './incremental';
import { SyncOptions, SyncResult, SetlistData } from './types';
// Show import removed
import { Song } from '@/lib/types';

// --- Interfaces for API Responses ---
// Simplified Setlist.fm response structures
interface SetlistFmArtist {
  mbid?: string;
  name?: string;
}

interface SetlistFmSong {
  name?: string;
  // Add other fields like cover, tape, info if needed
}

interface SetlistFmSet {
  encore?: number;
  song?: SetlistFmSong[];
}

interface SetlistFmSetlistData {
  id: string;
  artist?: SetlistFmArtist;
  eventDate?: string; // DD-MM-YYYY
  sets?: {
    set?: SetlistFmSet[];
  };
  // Add venue, tour etc. if needed
}

interface SetlistFmSearchResponse {
  setlist?: SetlistFmSetlistData[];
  // other fields...
}
// --- End Interfaces ---

/**
 * Service for syncing setlist data from setlist.fm
 */
export class SetlistSyncService {
  private apiClient: APIClientManager;
  private syncService: IncrementalSyncService;
  
  constructor() {
    this.apiClient = new APIClientManager();
    this.syncService = new IncrementalSyncService();
  }
  
  /**
   * Sync a setlist by ID
   */
  // Modified syncSetlist to primarily invoke the sync-setlist Edge Function
  async syncSetlist(setlistExternalId: string, options?: SyncOptions): Promise<SyncResult<SetlistData>> {
     // The 'setlistId' parameter now refers to the external ID (e.g., setlist.fm ID)
    try {
      // Optional: Add incremental sync check here if desired
      const syncStatus = await this.syncService.getSyncStatus(setlistExternalId, 'setlist', options);
      if (!syncStatus.needsSync && !options?.force) {
         console.log(`[SetlistService] Sync not needed for setlist ${setlistExternalId}`);
         // Attempt to fetch existing data if sync not needed
         const { data: existingSetlist } = await supabase
           .from('setlists')
           .select('*') // Adjust select as needed for SetlistData type
           .eq('setlist_fm_id', setlistExternalId) // Use correct column
           .maybeSingle();
         // TODO: Adapt existingSetlist to SetlistData structure if necessary
         return { success: true, updated: false, data: (existingSetlist as any) || undefined };
      }

      console.log(`[SetlistService] Invoking sync-setlist function for external ID: ${setlistExternalId}`);
      const { data, error: invokeError } = await supabase.functions.invoke('sync-setlist', {
        body: { setlistId: setlistExternalId } // Pass the external ID
      });

      if (invokeError) {
        console.error(`[SetlistService] Error invoking sync-setlist for ${setlistExternalId}:`, invokeError);
        return { success: false, updated: false, error: invokeError.message };
      }

      if (!data?.success) {
         const errorMessage = data?.error || data?.message || 'Sync function failed without specific error';
         console.warn(`[SetlistService] sync-setlist function failed for ${setlistExternalId}:`, errorMessage);
         return { success: false, updated: false, error: errorMessage };
      }

      console.log(`[SetlistService] Successfully invoked sync-setlist for ${setlistExternalId}.`);
      await this.syncService.markSynced(setlistExternalId, 'setlist');

      // The function returns the upserted setlist record
      // TODO: Adapt data.data to SetlistData structure if necessary
      return {
        success: true,
        updated: data.updated ?? true,
        data: data.data as any // Cast needed, ensure function returns compatible data
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SetlistService] Error in syncSetlist for ${setlistExternalId}:`, errorMessage);
      return {
        success: false,
        updated: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Fetch setlist data from setlist.fm
   */
  private async fetchSetlistData(setlistId: string): Promise<SetlistData | null> {
    try {
      const setlistData = await this.apiClient.callAPI(
        'setlistfm',
        `setlists/${setlistId}`, // Endpoint might be slightly different for single fetch
        {}
      ) as SetlistFmSetlistData | null; // Assert type for single setlist fetch
      
      if (!setlistData) {
        return null;
      }
      
      // Extract songs from setlist
      const songs: Song[] = [];
      
      if (setlistData.sets && setlistData.sets.set) {
        setlistData.sets.set.forEach((set: any, setIndex: number) => {
          if (set.song) {
            set.song.forEach((song: any, songIndex: number) => {
              if (song.name) {
                const songId = `${setlistId}-${setIndex}-${songIndex}`;
                // Construct object matching the Song type from types.ts
                // Encore and position belong in the join table (setlist_songs), not here.
                // Artist ID should be the UUID, not MBID. We might not know it here yet.
                songs.push({
                  id: songId, // This temporary ID might need rethinking if songs are saved to DB here
                  name: song.name,
                  // artist_id: null, // Cannot reliably set artist UUID here
                  // Remove encore, position, created_at, updated_at
                });
              }
            });
          }
        });
      }
      
      // Look up related show based on artist and date
      let showId = null;
      if (setlistData.artist && setlistData.eventDate) {
        // Get the artist ID
        const artistId = setlistData.artist.mbid;
        
        // Parse date from eventDate (DD-MM-YYYY format)
        const dateParts = setlistData.eventDate.split('-');
        if (dateParts.length === 3) {
          const date = new Date(
            parseInt(dateParts[2]), // Year
            parseInt(dateParts[1]) - 1, // Month (0-based)
            parseInt(dateParts[0]) // Day
          );
          
          // Search for shows by artist and date
          const { data: shows } = await supabase
            .from('shows')
            .select('id')
            .eq('artist_id', artistId)
            .gte('date', new Date(date.setHours(0, 0, 0, 0)).toISOString())
            .lt('date', new Date(date.setHours(23, 59, 59, 999)).toISOString());
            
          if (shows && shows.length > 0) {
            showId = shows[0].id;
          }
        }
      }
      
      return {
        showId: showId || '',
        artistId: setlistData.artist?.mbid || '',
        songs: songs
      };
    } catch (error) {
      console.error(`Error fetching setlist ${setlistId} from API:`, error);
      return null;
    }
  }
  
  /**
   * Find and sync a setlist for a show
   */
  async findSetlistForShow(showId: string, artistId?: string | null): Promise<boolean> {
    try {
      if (!artistId) {
        // Get the artist ID from the show
        const { data: show } = await supabase
          .from('shows')
          .select('artist_id, date')
          .eq('id', showId)
          .single();
          
        if (!show || !show.artist_id || !show.date) {
          console.error(`Unable to find setlist for show ${showId}: missing artist or date`);
          return false;
        }
        
        artistId = show.artist_id;
      }
      
      // Get artist details
      const { data: artist } = await supabase
        .from('artists')
        .select('name')
        .eq('id', artistId)
        .single();
        
      if (!artist) {
        console.error(`Unable to find setlist for show ${showId}: artist not found`);
        return false;
      }
      
      // Get show date
      const { data: show } = await supabase
        .from('shows')
        .select('date')
        .eq('id', showId)
        .single();
        
      if (!show || !show.date) {
        console.error(`Unable to find setlist for show ${showId}: no date`);
        return false;
      }
      
      // Format date for setlist.fm (DD-MM-YYYY)
      const date = new Date(show.date);
      const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
      
      // Search for setlists
      const setlistData = await this.apiClient.callAPI(
        'setlistfm',
        'search/setlists',
        {
          artistName: artist.name,
          date: formattedDate,
          p: 1
        }
      ) as SetlistFmSearchResponse | null; // Assert type for search
      
      if (setlistData && setlistData.setlist && setlistData.setlist.length > 0) {
        const setlist = setlistData.setlist[0];
        
        // Don't update show table (no setlist_id column)

        // Invoke the sync-setlist Edge Function instead of local sync
        console.log(`Invoking sync-setlist function for setlist ID: ${setlist.id}`);
        const { error: invokeError } = await supabase.functions.invoke('sync-setlist', {
          body: { setlistId: setlist.id }
        });

        if (invokeError) {
          console.error(`Error invoking sync-setlist for ${setlist.id}:`, invokeError);
          // Decide if this should cause findSetlistForShow to return false
          return false; // Return false if invocation fails
        }

        console.log(`Successfully invoked sync-setlist for ${setlist.id}`);
        return true; // Indicate setlist was found and sync was triggered
      }
      
      return false;
    } catch (error) {
      console.error(`Error finding setlist for show ${showId}:`, error);
      return false;
    }
  }
  
  /**
   * Get recent setlists for an artist
   */
  async getArtistSetlists(artistId: string, limit = 10): Promise<SetlistData[]> {
    try {
      // Get artist info
      const { data: artist } = await supabase
        .from('artists')
        .select('name')
        .eq('id', artistId)
        .single();
        
      if (!artist) {
        console.error(`Artist ${artistId} not found for setlists`);
        return [];
      }
      
      // Search for recent setlists
      const response = await this.apiClient.callAPI(
        'setlistfm',
        'search/setlists', // Assuming this endpoint returns multiple setlists
        {
          artistName: artist.name,
          p: 1,
          sort: 'date' // Check if sort is valid parameter
        }
      ) as SetlistFmSearchResponse | null; // Assert type for search
      
      if (!response?.setlist) {
        return [];
      }
      
      const results: SetlistData[] = [];
      const processedIds: Set<string> = new Set();
      
      // Process each setlist (up to limit)
      for (const setlist of response.setlist) {
        if (results.length >= limit) break;
        if (!setlist.id || processedIds.has(setlist.id)) continue;
        
        processedIds.add(setlist.id);
        
        // Sync this setlist
        const syncResult = await this.syncSetlist(setlist.id, { force: true });
        
        if (syncResult.success && syncResult.data) {
          results.push(syncResult.data);
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error getting recent setlists for artist ${artistId}:`, error);
      return [];
    }
  }
} 