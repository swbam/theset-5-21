import { supabase } from '@/integrations/supabase/client';
import { EntityType, SyncResult, SyncOptions, EntityRef } from './types';
import { ShowSyncService } from './show-service';
import { ArtistSyncService } from './artist-service';
import { VenueSyncService } from './venue-service';
import { SetlistSyncService } from './setlist-service';
import { SongSyncService } from './song-service';
import { IncrementalSyncService } from './incremental';
import { SyncQueue } from './queue';
import { CacheService } from './cache';

/**
 * Central sync manager
 * Orchestrates data synchronization between all entity types
 */
export class SyncManager {
  private showService: ShowSyncService;
  private artistService: ArtistSyncService;
  private venueService: VenueSyncService;
  private setlistService: SetlistSyncService;
  private songService: SongSyncService;
  private incrementalSync: IncrementalSyncService;
  private cache: CacheService;
  private queue: SyncQueue;
  
  constructor() {
    this.showService = new ShowSyncService();
    this.artistService = new ArtistSyncService();
    this.venueService = new VenueSyncService();
    this.setlistService = new SetlistSyncService();
    this.songService = new SongSyncService();
    this.incrementalSync = new IncrementalSyncService();
    this.cache = new CacheService();
    this.queue = new SyncQueue(this);
  }
  
  /**
   * Sync an entity by type and ID
   * Generic entry point for any entity synchronization
   */
  async syncEntity<T>(type: EntityType, id: string, options?: SyncOptions): Promise<SyncResult<T>> {
    // Check if we need to sync
    const syncStatus = await this.incrementalSync.getSyncStatus(id, type, options);
    
    if (!syncStatus.needsSync && !options?.force) {
      console.log(`No sync needed for ${type} ${id}`);
      
      // Return existing entity
      const { data: entity } = await supabase
        .from(this.getTableName(type))
        .select('*')
        .eq('id', id)
        .single();
        
      return {
        success: true,
        updated: false,
        data: entity as unknown as T
      };
    }
    
    // Route to appropriate service based on entity type
    try {
      let result: SyncResult<any>;
      
      switch(type) {
        case 'artist':
          result = await this.artistService.syncArtist(id, options);
          break;
        case 'venue':
          result = await this.venueService.syncVenue(id, options);
          break;
        case 'show':
          result = await this.showService.syncShow(id, options);
          break;
        case 'setlist':
          result = await this.setlistService.syncSetlist(id, options);
          break;
        case 'song':
          result = await this.songService.syncSong(id, options);
          break;
        default:
          return {
            success: false,
            updated: false,
            error: `Unknown entity type: ${type}`
          };
      }
      
      // If sync was successful, mark as synced in the incremental sync service
      if (result.success && result.updated) {
        await this.incrementalSync.markSynced(id, type);
      }
      
      return result as SyncResult<T>;
    } catch (error) {
      console.error(`Error syncing ${type} ${id}:`, error);
      return {
        success: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Create a new entity (initial sync)
   */
  async createSingle(type: EntityType, id: string): Promise<boolean> {
    try {
      const result = await this.syncEntity(type, id, { force: true });
      return result.success;
    } catch (error) {
      console.error(`Error creating ${type} ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Refresh an existing entity
   */
  async refreshSingle(type: EntityType, id: string): Promise<boolean> {
    try {
      const result = await this.syncEntity(type, id, { force: true });
      return result.success;
    } catch (error) {
      console.error(`Error refreshing ${type} ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Expand relations for an entity (sync related entities)
   */
  async expandRelations(type: EntityType, id: string): Promise<boolean> {
    try {
      switch (type) {
        case 'artist':
          return await this.expandArtistRelations(id);
        case 'venue':
          return await this.expandVenueRelations(id);
        case 'show':
          return await this.expandShowRelations(id);
        case 'setlist':
          return await this.expandSetlistRelations(id);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error expanding relations for ${type} ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Cascade sync for an artist (sync artist and all related shows, setlists)
   */
  async artistCascadeSync(artistId: string): Promise<boolean> {
    try {
      // First sync the artist
      const artistResult = await this.artistService.syncArtist(artistId, { force: true });
      
      if (!artistResult.success) {
        return false;
      }
      
      // Then get all related shows
      const { data: relatedShows } = await supabase
        .from('shows')
        .select('id')
        .eq('artist_id', artistId);
        
      // Queue all related shows for sync
      if (relatedShows && relatedShows.length > 0) {
        for (const show of relatedShows) {
          this.queue.add({
            type: 'show',
            id: show.id,
            priority: 'medium',
            operation: 'refresh'
          });
        }
      }
      
      // Also check for any setlists associated with this artist
      const { data: relatedSetlists } = await supabase
        .from('setlists')
        .select('id')
        .eq('artist_id', artistId);
        
      if (relatedSetlists && relatedSetlists.length > 0) {
        for (const setlist of relatedSetlists) {
          this.queue.add({
            type: 'setlist',
            id: setlist.id,
            priority: 'medium',
            operation: 'refresh'
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error performing cascade sync for artist ${artistId}:`, error);
      return false;
    }
  }
  
  /**
   * Cascade sync for a venue (sync venue and all related shows)
   */
  async venueCascadeSync(venueId: string): Promise<boolean> {
    try {
      // First sync the venue
      const venueResult = await this.venueService.syncVenue(venueId, { force: true });
      
      if (!venueResult.success) {
        return false;
      }
      
      // Then get all related shows
      const { data: relatedShows } = await supabase
        .from('shows')
        .select('id')
        .eq('venue_id', venueId);
        
      // Queue all related shows for sync
      if (relatedShows && relatedShows.length > 0) {
        for (const show of relatedShows) {
          this.queue.add({
            type: 'show',
            id: show.id,
            priority: 'medium',
            operation: 'refresh'
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error performing cascade sync for venue ${venueId}:`, error);
      return false;
    }
  }
  
  /**
   * Expand artist relations
   */
  private async expandArtistRelations(artistId: string): Promise<boolean> {
    try {
      // Get upcoming shows for this artist from Ticketmaster
      const shows = await this.artistService.getArtistUpcomingShows(artistId);
      
      // Queue all shows for sync
      for (const show of shows) {
        this.queue.add({
          type: 'show',
          id: show.id,
          priority: 'medium',
          operation: 'create'
        });
      }
      
      return true;
    } catch (error) {
      console.error(`Error expanding artist relations for ${artistId}:`, error);
      return false;
    }
  }
  
  /**
   * Expand venue relations
   */
  private async expandVenueRelations(venueId: string): Promise<boolean> {
    try {
      // Get upcoming shows at this venue from Ticketmaster
      const shows = await this.venueService.getVenueUpcomingShows(venueId);
      
      // Queue all shows for sync
      for (const show of shows) {
        this.queue.add({
          type: 'show',
          id: show.id,
          priority: 'medium',
          operation: 'create'
        });
      }
      
      return true;
    } catch (error) {
      console.error(`Error expanding venue relations for ${venueId}:`, error);
      return false;
    }
  }
  
  /**
   * Expand show relations
   */
  private async expandShowRelations(showId: string): Promise<boolean> {
    try {
      // Get show data
      const { data: show } = await supabase
        .from('shows')
        .select('artist_id, venue_id, setlist_id')
        .eq('id', showId)
        .single();
        
      if (!show) return false;
      
      // Queue artist and venue for sync if available
      if (show.artist_id) {
        this.queue.add({
          type: 'artist',
          id: show.artist_id,
          priority: 'high',
          operation: 'refresh'
        });
      }
      
      if (show.venue_id) {
        this.queue.add({
          type: 'venue',
          id: show.venue_id,
          priority: 'high',
          operation: 'refresh'
        });
      }
      
      // If show has a setlist, queue it for sync
      if (show.setlist_id) {
        this.queue.add({
          type: 'setlist',
          id: show.setlist_id,
          priority: 'high',
          operation: 'refresh'
        });
      } else {
        // Try to find setlist if not already linked
        await this.setlistService.findSetlistForShow(showId, show.artist_id);
      }
      
      return true;
    } catch (error) {
      console.error(`Error expanding show relations for ${showId}:`, error);
      return false;
    }
  }
  
  /**
   * Expand setlist relations
   */
  private async expandSetlistRelations(setlistId: string): Promise<boolean> {
    try {
      // Get setlist data
      const { data: setlist } = await supabase
        .from('setlists')
        .select('artist_id, show_id, songs')
        .eq('id', setlistId)
        .single();
        
      if (!setlist) return false;
      
      // Queue all songs for sync
      if (setlist.songs && Array.isArray(setlist.songs)) {
        for (const song of setlist.songs) {
          if (song.id) {
            this.queue.add({
              type: 'song',
              id: song.id,
              priority: 'low',
              operation: 'refresh'
            });
          }
        }
      }
      
      // Queue show for update if available
      if (setlist.show_id) {
        this.queue.add({
          type: 'show',
          id: setlist.show_id,
          priority: 'medium',
          operation: 'refresh'
        });
      }
      
      return true;
    } catch (error) {
      console.error(`Error expanding setlist relations for ${setlistId}:`, error);
      return false;
    }
  }
  
  /**
   * Get database table name for entity type
   */
  private getTableName(type: EntityType): string {
    switch(type) {
      case 'artist':
        return 'artists';
      case 'venue':
        return 'venues';
      case 'show':
        return 'shows';
      case 'setlist':
        return 'setlists';
      case 'song':
        return 'songs';
      default:
        throw new Error(`Unknown entity type: ${type}`);
    }
  }
  
  /**
   * Get queue status
   */
  getQueueStatus() {
    return this.queue.getStatus();
  }
} 