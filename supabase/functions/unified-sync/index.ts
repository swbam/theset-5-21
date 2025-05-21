/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Define entity types the sync function can handle
type EntityType = 'artist' | 'show' | 'venue' | 'setlist' | 'song' | 'trending_shows';

// Define the request payload structure
interface SyncRequest {
  entity_type: EntityType;
  entity_id: string; // Could be external ID (TM, Spotify) or internal UUID
  reference_data?: Record<string, any>; // Optional data to use for the sync
  force_refresh?: boolean;
  batch_size?: number; // For batch processing
  process_queue?: boolean; // Whether to process the queue or just a specific entity
}

// Define the core data structures (matching our DB schema)
interface Artist {
  id?: string;
  name: string;
  ticketmaster_id?: string | null;
  spotify_id?: string | null;
  setlist_fm_mbid?: string | null;
  image_url?: string | null;
  spotify_url?: string | null;
  genres?: string[] | null;
  followers?: number | null;
  popularity?: number | null;
  last_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Venue {
  id?: string;
  name: string;
  ticketmaster_id?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
  url?: string | null;
  last_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Show {
  id?: string;
  name: string;
  artist_id?: string | null;
  venue_id?: string | null;
  date?: string | null;
  ticketmaster_id?: string | null;
  ticket_url?: string | null;
  image_url?: string | null;
  popularity?: number | null;
  setlist_fm_id?: string | null;
  last_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Song {
  id?: string;
  name: string;
  artist_id: string;
  spotify_id?: string | null;
  album_name?: string | null;
  album_image_url?: string | null;
  duration_ms?: number | null;
  popularity?: number | null;
  preview_url?: string | null;
  spotify_url?: string | null;
  last_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Setlist {
  id?: string;
  show_id: string;
  title?: string | null;
  is_custom?: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface SetlistSong {
  id?: string;
  setlist_id: string;
  song_id: string;
  position: number;
  vote_count?: number;
  is_encore?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SyncJob {
  id: number;
  entity_type: EntityType;
  entity_id: string;
  reference_data?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  priority: number;
  attempts: number;
  max_attempts: number;
  last_attempted_at?: string | null;
  last_error?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  processed_at?: string | null;
}

// API Client classes with rate limiting
class SpotifyClient {
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 50; // ms between requests

  constructor(private readonly clientId: string, private readonly clientSecret: string) {}

  async getToken(): Promise<string> {
    const now = Date.now();
    
    // Return existing token if it's still valid
    if (this.token && now < this.tokenExpiry - 60000) { // Refresh 1 min before expiry
      return this.token;
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(this.clientId + ':' + this.clientSecret)
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error(`Spotify token request failed: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      this.token = data.access_token;
      // Set expiry to slightly less than the actual expiry time for safety
      this.tokenExpiry = now + (data.expires_in * 1000) - 60000;
      return this.token;
    } catch (error) {
      console.error('Failed to get Spotify token:', error);
      throw error;
    }
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    
    if (elapsed < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - elapsed));
    }
    
    this.lastRequestTime = Date.now();
  }

  async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    await this.throttleRequest();
    
    const token = await this.getToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    return fetch(endpoint, { ...options, headers });
  }

  async searchArtist(name: string): Promise<any> {
    const encodedName = encodeURIComponent(name);
    const response = await this.fetch(`https://api.spotify.com/v1/search?q=${encodedName}&type=artist&limit=1`);
    
    if (!response.ok) {
      throw new Error(`Spotify artist search failed: ${response.status} ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.artists?.items?.[0] || null;
  }

  async getArtist(id: string): Promise<any> {
    const response = await this.fetch(`https://api.spotify.com/v1/artists/${id}`);
    
    if (!response.ok) {
      throw new Error(`Spotify artist fetch failed: ${response.status} ${await response.text()}`);
    }
    
    return response.json();
  }

  async getArtistTopTracks(id: string, market = 'US'): Promise<any[]> {
    const response = await this.fetch(`https://api.spotify.com/v1/artists/${id}/top-tracks?market=${market}`);
    
    if (!response.ok) {
      throw new Error(`Spotify top tracks fetch failed: ${response.status} ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.tracks || [];
  }

  async getArtistAlbums(id: string, limit = 50, includeGroups = 'album,single'): Promise<any[]> {
    let albums: any[] = [];
    let url = `https://api.spotify.com/v1/artists/${id}/albums?limit=${limit}&include_groups=${includeGroups}`;
    
    while (url) {
      const response = await this.fetch(url);
      
      if (!response.ok) {
        throw new Error(`Spotify albums fetch failed: ${response.status} ${await response.text()}`);
      }
      
      const data = await response.json();
      albums = albums.concat(data.items || []);
      url = data.next;
      
      // Break after first page for simplicity in this implementation
      // In a production environment, you'd want to handle pagination properly
      if (albums.length >= limit) break;
    }
    
    return albums;
  }

  async getAlbumTracks(albumId: string): Promise<any[]> {
    const response = await this.fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`);
    
    if (!response.ok) {
      throw new Error(`Spotify album tracks fetch failed: ${response.status} ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.items || [];
  }
}

class TicketmasterClient {
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 200; // ms between requests

  constructor(private readonly apiKey: string) {}

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    
    if (elapsed < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - elapsed));
    }
    
    this.lastRequestTime = Date.now();
  }

  async fetch(endpoint: string, params: Record<string, string> = {}): Promise<Response> {
    await this.throttleRequest();
    
    const queryParams = new URLSearchParams({
      ...params,
      apikey: this.apiKey
    });
    
    return fetch(`${endpoint}?${queryParams}`);
  }

  async searchAttractions(keyword: string, size = 10): Promise<any> {
    const response = await this.fetch(
      'https://app.ticketmaster.com/discovery/v2/attractions.json',
      { keyword, size: size.toString() }
    );
    
    if (!response.ok) {
      throw new Error(`Ticketmaster attractions search failed: ${response.status} ${await response.text()}`);
    }
    
    return response.json();
  }

  async getAttraction(id: string): Promise<any> {
    const response = await this.fetch(`https://app.ticketmaster.com/discovery/v2/attractions/${id}.json`);
    
    if (!response.ok) {
      throw new Error(`Ticketmaster attraction fetch failed: ${response.status} ${await response.text()}`);
    }
    
    return response.json();
  }

  async getAttractionEvents(id: string, size = 50): Promise<any> {
    const response = await this.fetch(
      'https://app.ticketmaster.com/discovery/v2/events.json',
      { attractionId: id, size: size.toString() }
    );
    
    if (!response.ok) {
      throw new Error(`Ticketmaster attraction events fetch failed: ${response.status} ${await response.text()}`);
    }
    
    return response.json();
  }

  async getEvent(id: string): Promise<any> {
    const response = await this.fetch(`https://app.ticketmaster.com/discovery/v2/events/${id}.json`);
    
    if (!response.ok) {
      throw new Error(`Ticketmaster event fetch failed: ${response.status} ${await response.text()}`);
    }
    
    return response.json();
  }

  async getVenue(id: string): Promise<any> {
    const response = await this.fetch(`https://app.ticketmaster.com/discovery/v2/venues/${id}.json`);
    
    if (!response.ok) {
      throw new Error(`Ticketmaster venue fetch failed: ${response.status} ${await response.text()}`);
    }
    
    return response.json();
  }

  async searchEvents(params: Record<string, string>): Promise<any> {
    const response = await this.fetch('https://app.ticketmaster.com/discovery/v2/events.json', params);
    
    if (!response.ok) {
      throw new Error(`Ticketmaster events search failed: ${response.status} ${await response.text()}`);
    }
    
    return response.json();
  }
}

class SetlistFmClient {
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 1000; // ms between requests (strict rate limit)

  constructor(private readonly apiKey: string) {}

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    
    if (elapsed < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - elapsed));
    }
    
    this.lastRequestTime = Date.now();
  }

  async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    await this.throttleRequest();
    
    const headers = {
      'Accept': 'application/json',
      'x-api-key': this.apiKey,
      ...options.headers
    };

    return fetch(endpoint, { ...options, headers });
  }

  async searchArtists(artistName: string, page = 1): Promise<any> {
    const encodedName = encodeURIComponent(artistName);
    const response = await this.fetch(`https://api.setlist.fm/rest/1.0/search/artists?artistName=${encodedName}&p=${page}&sort=relevance`);
    
    if (!response.ok) {
      throw new Error(`Setlist.fm artist search failed: ${response.status} ${await response.text()}`);
    }
    
    return response.json();
  }

  async getArtistSetlists(mbid: string, page = 1): Promise<any> {
    const response = await this.fetch(`https://api.setlist.fm/rest/1.0/artist/${mbid}/setlists?p=${page}`);
    
    if (!response.ok) {
      throw new Error(`Setlist.fm artist setlists fetch failed: ${response.status} ${await response.text()}`);
    }
    
    return response.json();
  }

  async getSetlist(setlistId: string): Promise<any> {
    const response = await this.fetch(`https://api.setlist.fm/rest/1.0/setlist/${setlistId}`);
    
    if (!response.ok) {
      throw new Error(`Setlist.fm setlist fetch failed: ${response.status} ${await response.text()}`);
    }
    
    return response.json();
  }
}

// Sync Handler class
class SyncHandler {
  private supabase: any;
  private spotifyClient: SpotifyClient | null = null;
  private ticketmasterClient: TicketmasterClient | null = null;
  private setlistFmClient: SetlistFmClient | null = null;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Initialize API clients if credentials are available
    const spotifyClientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const spotifyClientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
    if (spotifyClientId && spotifyClientSecret) {
      this.spotifyClient = new SpotifyClient(spotifyClientId, spotifyClientSecret);
    }
    
    const ticketmasterApiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (ticketmasterApiKey) {
      this.ticketmasterClient = new TicketmasterClient(ticketmasterApiKey);
    }
    
    const setlistFmApiKey = Deno.env.get('SETLISTFM_API_KEY');
    if (setlistFmApiKey) {
      this.setlistFmClient = new SetlistFmClient(setlistFmApiKey);
    }
  }

  // Process a single entity by type
  async syncEntity(type: EntityType, id: string, referenceData?: Record<string, any>, forceRefresh = false): Promise<any> {
    console.log(`[unified-sync] Processing ${type} with ID ${id}`);
    
    switch (type) {
      case 'artist':
        return this.syncArtist(id, referenceData, forceRefresh);
      case 'show':
        return this.syncShow(id, referenceData, forceRefresh);
      case 'venue':
        return this.syncVenue(id, referenceData, forceRefresh);
      case 'setlist':
        return this.syncSetlist(id, referenceData, forceRefresh);
      case 'song':
        return this.syncSong(id, referenceData, forceRefresh);
      case 'trending_shows':
        return this.syncTrendingShows(referenceData);
      default:
        throw new Error(`Unsupported entity type: ${type}`);
    }
  }

  // Process a batch of pending jobs from the queue
  async processQueue(batchSize = 5): Promise<{ processed: number, succeeded: number, failed: number }> {
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    
    for (let i = 0; i < batchSize; i++) {
      // Claim next job from queue
      const { data: jobs, error: claimError } = await this.supabase.rpc('claim_next_sync_item');
      
      if (claimError) {
        console.error('[unified-sync] Error claiming next queue item:', claimError);
        break;
      }
      
      if (!jobs || jobs.length === 0) {
        console.log('[unified-sync] No more items in queue');
        break;
      }
      
      const job = jobs[0] as SyncJob;
      processed++;
      
      try {
        // Process the job
        await this.syncEntity(job.entity_type, job.entity_id, job.reference_data, false);
        
        // Mark job as complete
        const { error: completeError } = await this.supabase.rpc('complete_sync_item', { item_id: job.id });
        
        if (completeError) {
          console.error(`[unified-sync] Error marking job ${job.id} as complete:`, completeError);
          failed++;
        } else {
          succeeded++;
        }
      } catch (error) {
        console.error(`[unified-sync] Error processing job ${job.id}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        const { error: failError } = await this.supabase.rpc('fail_sync_item', { 
          item_id: job.id,
          error_message: errorMessage.substring(0, 500)
        });
        
        if (failError) {
          console.error(`[unified-sync] Error marking job ${job.id} as failed:`, failError);
        }
        
        failed++;
      }
    }
    
    return { processed, succeeded, failed };
  }

  // Artist sync handler
  async syncArtist(id: string, referenceData?: Record<string, any>, forceRefresh = false): Promise<Artist> {
    console.log(`[unified-sync] Syncing artist with ID: ${id}`);
    
    if (!this.ticketmasterClient || !this.spotifyClient) {
      throw new Error('Missing required API client configuration');
    }
    
    // Determine if ID is Ticketmaster ID, Spotify ID, or internal UUID
    let artist: Artist | null = null;
    let ticketmasterData: any = null;
    let spotifyData: any = null;
    let setlistFmData: any = null;
    let isTicketmasterId = false;
    let isSpotifyId = false;
    
    // Try to find existing artist by ID or external IDs
    try {
      // Check by internal UUID
      const { data: existingArtist, error } = await this.supabase
        .from('artists')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (!error && existingArtist) {
        artist = existingArtist;
        console.log(`[unified-sync] Found artist by UUID: ${id}`);
        
        // If not force refresh and recently synced, return existing
        if (!forceRefresh && existingArtist.last_synced_at) {
          const lastSynced = new Date(existingArtist.last_synced_at);
          const hoursSinceSync = (Date.now() - lastSynced.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceSync < 24) { // Don't resync if less than 24 hours
            console.log(`[unified-sync] Artist synced recently (${hoursSinceSync.toFixed(2)} hours ago), skipping`);
            return existingArtist;
          }
        }
      } else {
        // Try by Ticketmaster ID
        const { data: tmArtist, error: tmError } = await this.supabase
          .from('artists')
          .select('*')
          .eq('ticketmaster_id', id)
          .maybeSingle();
        
        if (!tmError && tmArtist) {
          artist = tmArtist;
          isTicketmasterId = true;
          console.log(`[unified-sync] Found artist by Ticketmaster ID: ${id}`);
        } else {
          // Try by Spotify ID
          const { data: spotifyArtist, error: spotifyError } = await this.supabase
            .from('artists')
            .select('*')
            .eq('spotify_id', id)
            .maybeSingle();
          
          if (!spotifyError && spotifyArtist) {
            artist = spotifyArtist;
            isSpotifyId = true;
            console.log(`[unified-sync] Found artist by Spotify ID: ${id}`);
          }
        }
      }
    } catch (error) {
      console.error(`[unified-sync] Error finding existing artist:`, error);
    }
    
    // Fetch data from external APIs
    try {
      // If we have or suspect it's a Ticketmaster ID
      if (isTicketmasterId || (!artist && !isSpotifyId)) {
        try {
          ticketmasterData = await this.ticketmasterClient.getAttraction(id);
          console.log(`[unified-sync] Fetched Ticketmaster data for artist ID: ${id}`);
        } catch (tmError) {
          console.warn(`[unified-sync] Error fetching Ticketmaster data:`, tmError);
          // It might not be a TM ID, continue with other checks
        }
      }
      
      // If we have or suspect it's a Spotify ID
      if (isSpotifyId || (!artist && !ticketmasterData)) {
        try {
          spotifyData = await this.spotifyClient.getArtist(id);
          console.log(`[unified-sync] Fetched Spotify data for artist ID: ${id}`);
        } catch (spotifyError) {
          console.warn(`[unified-sync] Error fetching Spotify data:`, spotifyError);
          // It might not be a Spotify ID
        }
      }
      
      // If we have an artist with name but no external data yet
      if (artist?.name && !ticketmasterData && !spotifyData) {
        // Try to search Ticketmaster by name
        try {
          const searchResult = await this.ticketmasterClient.searchAttractions(artist.name, 1);
          if (searchResult._embedded?.attractions?.length > 0) {
            ticketmasterData = searchResult._embedded.attractions[0];
            console.log(`[unified-sync] Found Ticketmaster data by name search: ${artist.name}`);
          }
        } catch (tmSearchError) {
          console.warn(`[unified-sync] Error searching Ticketmaster:`, tmSearchError);
        }
        
        // Try to search Spotify by name
        if (!spotifyData) {
          try {
            spotifyData = await this.spotifyClient.searchArtist(artist.name);
            if (spotifyData) {
              console.log(`[unified-sync] Found Spotify data by name search: ${artist.name}`);
            }
          } catch (spotifySearchError) {
            console.warn(`[unified-sync] Error searching Spotify:`, spotifySearchError);
          }
        }
      }
      
      // If we have a name from reference data but no other data
      if (referenceData?.name && !artist && !ticketmasterData && !spotifyData) {
        // Try to search by provided name
        const name = referenceData.name;
        
        try {
          const searchResult = await this.ticketmasterClient.searchAttractions(name, 1);
          if (searchResult._embedded?.attractions?.length > 0) {
            ticketmasterData = searchResult._embedded.attractions[0];
            console.log(`[unified-sync] Found Ticketmaster data by reference name search: ${name}`);
          }
        } catch (tmSearchError) {
          console.warn(`[unified-sync] Error searching Ticketmaster by reference name:`, tmSearchError);
        }
        
        try {
          spotifyData = await this.spotifyClient.searchArtist(name);
          if (spotifyData) {
            console.log(`[unified-sync] Found Spotify data by reference name search: ${name}`);
          }
        } catch (spotifySearchError) {
          console.warn(`[unified-sync] Error searching Spotify by reference name:`, spotifySearchError);
        }
      }
      
      // If we have Spotify data, try to get Setlist.fm data
      if (this.setlistFmClient && (spotifyData?.name || ticketmasterData?.name || artist?.name)) {
        const artistName = spotifyData?.name || ticketmasterData?.name || artist?.name;
        
        try {
          const setlistSearch = await this.setlistFmClient.searchArtists(artistName, 1);
          if (setlistSearch.artist?.length > 0) {
            setlistFmData = setlistSearch.artist[0];
            console.log(`[unified-sync] Found Setlist.fm data for artist: ${artistName}`);
          }
        } catch (setlistError) {
          console.warn(`[unified-sync] Error fetching Setlist.fm data:`, setlistError);
        }
      }
    } catch (apiError) {
      console.error(`[unified-sync] Error fetching external API data:`, apiError);
      // Continue with whatever data we have
    }
    
    // Combine data from all sources
    const combinedData: Artist = {
      name: spotifyData?.name || ticketmasterData?.name || artist?.name || referenceData?.name,
      ticketmaster_id: ticketmasterData?.id || artist?.ticketmaster_id,
      spotify_id: spotifyData?.id || artist?.spotify_id,
      setlist_fm_mbid: setlistFmData?.mbid || artist?.setlist_fm_mbid,
      image_url: spotifyData?.images?.[0]?.url || 
                 ticketmasterData?.images?.find((i: any) => i.ratio === '16_9')?.url || 
                 artist?.image_url,
      spotify_url: spotifyData?.external_urls?.spotify || artist?.spotify_url,
      genres: spotifyData?.genres || artist?.genres || [],
      followers: spotifyData?.followers?.total || artist?.followers,
      popularity: spotifyData?.popularity || artist?.popularity,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (!combinedData.name) {
      throw new Error('Could not determine artist name from any source');
    }
    
    // Upsert to database
    let finalArtist: Artist;
    
    if (artist) {
      // Update existing
      const { data: updatedArtist, error: updateError } = await this.supabase
        .from('artists')
        .update(combinedData)
        .eq('id', artist.id)
        .select()
        .single();
      
      if (updateError) {
        throw new Error(`Error updating artist: ${updateError.message}`);
      }
      
      finalArtist = updatedArtist;
      console.log(`[unified-sync] Updated artist: ${finalArtist.id}`);
    } else {
      // Insert new
      const { data: newArtist, error: insertError } = await this.supabase
        .from('artists')
        .insert(combinedData)
        .select()
        .single();
      
      if (insertError) {
        throw new Error(`Error inserting artist: ${insertError.message}`);
      }
      
      finalArtist = newArtist;
      console.log(`[unified-sync] Created new artist: ${finalArtist.id}`);
    }
    
    // Queue dependent entities for sync
    // 1. If we have Spotify data, queue song sync
    if (finalArtist.spotify_id) {
      await this.queueSongSync(finalArtist.id, finalArtist.spotify_id);
    }
    
    // 2. If we have Ticketmaster data, queue upcoming shows
    if (finalArtist.ticketmaster_id) {
      await this.queueArtistShows(finalArtist.id, finalArtist.ticketmaster_id);
    }
    
    // 3. If we have Setlist.fm data, queue setlist sync
    if (finalArtist.setlist_fm_mbid && this.setlistFmClient) {
      await this.queueArtistSetlists(finalArtist.id, finalArtist.setlist_fm_mbid);
    }
    
    return finalArtist;
  }

  // Show sync handler
  async syncShow(id: string, referenceData?: Record<string, any>, forceRefresh = false): Promise<Show> {
    console.log(`[unified-sync] Syncing show with ID: ${id}`);
    
    if (!this.ticketmasterClient) {
      throw new Error('Missing Ticketmaster API configuration');
    }
    
    // Determine if ID is Ticketmaster ID or internal UUID
    let show: Show | null = null;
    let ticketmasterData: any = null;
    let isTicketmasterId = false;
    
    // Try to find existing show
    try {
      // Check by internal UUID
      const { data: existingShow, error } = await this.supabase
        .from('shows')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (!error && existingShow) {
        show = existingShow;
        console.log(`[unified-sync] Found show by UUID: ${id}`);
        
        // If not force refresh and recently synced, return existing
        if (!forceRefresh && existingShow.last_synced_at) {
          const lastSynced = new Date(existingShow.last_synced_at);
          const hoursSinceSync = (Date.now() - lastSynced.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceSync < 24) { // Don't resync if less than 24 hours
            console.log(`[unified-sync] Show synced recently (${hoursSinceSync.toFixed(2)} hours ago), skipping`);
            return existingShow;
          }
        }
      } else {
        // Try by Ticketmaster ID
        const { data: tmShow, error: tmError } = await this.supabase
          .from('shows')
          .select('*')
          .eq('ticketmaster_id', id)
          .maybeSingle();
        
        if (!tmError && tmShow) {
          show = tmShow;
          isTicketmasterId = true;
          console.log(`[unified-sync] Found show by Ticketmaster ID: ${id}`);
        }
      }
    } catch (error) {
      console.error(`[unified-sync] Error finding existing show:`, error);
    }
    
    // Fetch data from Ticketmaster
    try {
      if (isTicketmasterId || (!show)) {
        try {
          ticketmasterData = await this.ticketmasterClient.getEvent(id);
          console.log(`[unified-sync] Fetched Ticketmaster data for show ID: ${id}`);
        } catch (tmError) {
          console.warn(`[unified-sync] Error fetching Ticketmaster data:`, tmError);
          
          // If we have an existing show with TM ID, try that
          if (show?.ticketmaster_id && show.ticketmaster_id !== id) {
            try {
              ticketmasterData = await this.ticketmasterClient.getEvent(show.ticketmaster_id);
              console.log(`[unified-sync] Fetched Ticketmaster data using existing show's TM ID: ${show.ticketmaster_id}`);
            } catch (secondTmError) {
              console.warn(`[unified-sync] Error fetching with existing TM ID:`, secondTmError);
            }
          }
        }
      }
    } catch (apiError) {
      console.error(`[unified-sync] Error fetching external API data:`, apiError);
    }
    
    // Extract artist and venue IDs from TM data
    let artistTmId = null;
    let venueTmId = null;
    
    if (ticketmasterData) {
      if (ticketmasterData._embedded?.attractions?.length > 0) {
        artistTmId = ticketmasterData._embedded.attractions[0].id;
      }
      
      if (ticketmasterData._embedded?.venues?.length > 0) {
        venueTmId = ticketmasterData._embedded.venues[0].id;
      }
    }
    
    // Look up or create artist and venue
    let artistId = show?.artist_id || null;
    let venueId = show?.venue_id || null;
    
    // If we have TM IDs but no internal IDs, look them up
    if (artistTmId && !artistId) {
      const { data: artist } = await this.supabase
        .from('artists')
        .select('id')
        .eq('ticketmaster_id', artistTmId)
        .maybeSingle();
      
      if (artist) {
        artistId = artist.id;
      } else {
        // Queue artist sync and use placeholder for now
        await this.supabase.rpc('enqueue_sync', { 
          entity_type: 'artist',
          external_id: artistTmId,
          priority: 1
        });
      }
    }
    
    if (venueTmId && !venueId) {
      const { data: venue } = await this.supabase
        .from('venues')
        .select('id')
        .eq('ticketmaster_id', venueTmId)
        .maybeSingle();
      
      if (venue) {
        venueId = venue.id;
      } else {
        // Queue venue sync and use placeholder for now
        await this.supabase.rpc('enqueue_sync', { 
          entity_type: 'venue',
          external_id: venueTmId,
          priority: 1
        });
      }
    }
    
    // Combine data
    const combinedData: Show = {
      name: ticketmasterData?.name || show?.name || 'Unknown Show',
      artist_id: artistId,
      venue_id: venueId,
      date: ticketmasterData?.dates?.start?.dateTime || show?.date,
      ticketmaster_id: ticketmasterData?.id || show?.ticketmaster_id,
      ticket_url: ticketmasterData?.url || show?.ticket_url,
      image_url: ticketmasterData?.images?.find((i: any) => i.ratio === '16_9')?.url || show?.image_url,
      popularity: show?.popularity || 0,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Upsert to database
    let finalShow: Show;
    
    if (show) {
      // Update existing
      const { data: updatedShow, error: updateError } = await this.supabase
        .from('shows')
        .update(combinedData)
        .eq('id', show.id)
        .select()
        .single();
      
      if (updateError) {
        throw new Error(`Error updating show: ${updateError.message}`);
      }
      
      finalShow = updatedShow;
      console.log(`[unified-sync] Updated show: ${finalShow.id}`);
    } else {
      // Insert new
      const { data: newShow, error: insertError } = await this.supabase
        .from('shows')
        .insert(combinedData)
        .select()
        .single();
      
      if (insertError) {
        throw new Error(`Error inserting show: ${insertError.message}`);
      }
      
      finalShow = newShow;
      console.log(`[unified-sync] Created new show: ${finalShow.id}`);
    }
    
    // Ensure show has a votable setlist
    await this.ensureShowHasSetlist(finalShow.id);
    
    return finalShow;
  }

  // Venue sync handler
  async syncVenue(id: string, referenceData?: Record<string, any>, forceRefresh = false): Promise<Venue> {
    console.log(`[unified-sync] Syncing venue with ID: ${id}`);
    
    if (!this.ticketmasterClient) {
      throw new Error('Missing Ticketmaster API configuration');
    }
    
    // Determine if ID is Ticketmaster ID or internal UUID
    let venue: Venue | null = null;
    let ticketmasterData: any = null;
    let isTicketmasterId = false;
    
    // Try to find existing venue
    try {
      // Check by internal UUID
      const { data: existingVenue, error } = await this.supabase
        .from('venues')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (!error && existingVenue) {
        venue = existingVenue;
        console.log(`[unified-sync] Found venue by UUID: ${id}`);
        
        // If not force refresh and recently synced, return existing
        if (!forceRefresh && existingVenue.last_synced_at) {
          const lastSynced = new Date(existingVenue.last_synced_at);
          const hoursSinceSync = (Date.now() - lastSynced.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceSync < 24) { // Don't resync if less than 24 hours
            console.log(`[unified-sync] Venue synced recently (${hoursSinceSync.toFixed(2)} hours ago), skipping`);
            return existingVenue;
          }
        }
      } else {
        // Try by Ticketmaster ID
        const { data: tmVenue, error: tmError } = await this.supabase
          .from('venues')
          .select('*')
          .eq('ticketmaster_id', id)
          .maybeSingle();
        
        if (!tmError && tmVenue) {
          venue = tmVenue;
          isTicketmasterId = true;
          console.log(`[unified-sync] Found venue by Ticketmaster ID: ${id}`);
        }
      }
    } catch (error) {
      console.error(`[unified-sync] Error finding existing venue:`, error);
    }
    
    // Fetch data from Ticketmaster
    try {
      if (isTicketmasterId || (!venue)) {
        try {
          ticketmasterData = await this.ticketmasterClient.getVenue(id);
          console.log(`[unified-sync] Fetched Ticketmaster data for venue ID: ${id}`);
        } catch (tmError) {
          console.warn(`[unified-sync] Error fetching Ticketmaster data:`, tmError);
          
          // If we have an existing venue with TM ID, try that
          if (venue?.ticketmaster_id && venue.ticketmaster_id !== id) {
            try {
              ticketmasterData = await this.ticketmasterClient.getVenue(venue.ticketmaster_id);
              console.log(`[unified-sync] Fetched Ticketmaster data using existing venue's TM ID: ${venue.ticketmaster_id}`);
            } catch (secondTmError) {
              console.warn(`[unified-sync] Error fetching with existing TM ID:`, secondTmError);
            }
          }
        }
      }
    } catch (apiError) {
      console.error(`[unified-sync] Error fetching external API data:`, apiError);
    }
    
    // Combine data
    const combinedData: Venue = {
      name: ticketmasterData?.name || venue?.name || 'Unknown Venue',
      ticketmaster_id: ticketmasterData?.id || venue?.ticketmaster_id,
      city: ticketmasterData?.city?.name || venue?.city,
      state: ticketmasterData?.state?.name || venue?.state,
      country: ticketmasterData?.country?.name || venue?.country,
      address: ticketmasterData?.address?.line1 || venue?.address,
      postal_code: ticketmasterData?.postalCode || venue?.postal_code,
      latitude: ticketmasterData?.location?.latitude || venue?.latitude,
      longitude: ticketmasterData?.location?.longitude || venue?.longitude,
      image_url: venue?.image_url, // TM doesn't typically provide venue images
      url: ticketmasterData?.url || venue?.url,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Upsert to database
    let finalVenue: Venue;
    
    if (venue) {
      // Update existing
      const { data: updatedVenue, error: updateError } = await this.supabase
        .from('venues')
        .update(combinedData)
        .eq('id', venue.id)
        .select()
        .single();
      
      if (updateError) {
        throw new Error(`Error updating venue: ${updateError.message}`);
      }
      
      finalVenue = updatedVenue;
      console.log(`[unified-sync] Updated venue: ${finalVenue.id}`);
    } else {
      // Insert new
      const { data: newVenue, error: insertError } = await this.supabase
        .from('venues')
        .insert(combinedData)
        .select()
        .single();
      
      if (insertError) {
        throw new Error(`Error inserting venue: ${insertError.message}`);
      }
      
      finalVenue = newVenue;
      console.log(`[unified-sync] Created new venue: ${finalVenue.id}`);
    }
    
    return finalVenue;
  }

  // Song sync handler
  async syncSong(id: string, referenceData?: Record<string, any>, forceRefresh = false): Promise<Song> {
    console.log(`[unified-sync] Syncing song with ID: ${id}`);
    
    if (!this.spotifyClient) {
      throw new Error('Missing Spotify API configuration');
    }
    
    // Parse ID - this could be a Spotify track ID or internal UUID
    let song: Song | null = null;
    let spotifyData: any = null;
    let isSpotifyId = false;
    
    // Try to find existing song
    try {
      // Check by internal UUID
      const { data: existingSong, error } = await this.supabase
        .from('songs')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (!error && existingSong) {
        song = existingSong;
        console.log(`[unified-sync] Found song by UUID: ${id}`);
        
        // If not force refresh and has Spotify data, return existing
        if (!forceRefresh && existingSong.spotify_id) {
          return existingSong;
        }
      } else {
        // Try by Spotify ID
        const { data: spotifySong, error: spotifyError } = await this.supabase
          .from('songs')
          .select('*')
          .eq('spotify_id', id)
          .maybeSingle();
        
        if (!spotifyError && spotifySong) {
          song = spotifySong;
          isSpotifyId = true;
          console.log(`[unified-sync] Found song by Spotify ID: ${id}`);
        }
      }
    } catch (error) {
      console.error(`[unified-sync] Error finding existing song:`, error);
    }
    
    // Get artist ID from existing song or reference data
    const artistId = song?.artist_id || referenceData?.artist_id;
    
    if (!artistId) {
      throw new Error('Cannot sync song without artist_id');
    }
    
    // Fetch data from Spotify
    try {
      // If we have a Spotify ID
      if (isSpotifyId || song?.spotify_id === id) {
        try {
          // Get detailed track data - this requires additional API call for full details
          const response = await this.spotifyClient.fetch(`https://api.spotify.com/v1/tracks/${id}`);
          if (response.ok) {
            spotifyData = await response.json();
            console.log(`[unified-sync] Fetched Spotify data for track ID: ${id}`);
          }
        } catch (spotifyError) {
          console.warn(`[unified-sync] Error fetching Spotify track data:`, spotifyError);
        }
      } else if (referenceData?.name) {
        // If we only have a name, try to search for it
        try {
          const artistResponse = await this.supabase
            .from('artists')
            .select('name, spotify_id')
            .eq('id', artistId)
            .single();
          
          if (artistResponse.error) {
            throw new Error(`Error finding artist: ${artistResponse.error.message}`);
          }
          
          const artist = artistResponse.data;
          
          if (artist.spotify_id) {
            // Search for the track by name within the artist's tracks
            const tracks = await this.spotifyClient.getArtistTopTracks(artist.spotify_id);
            const matchingTrack = tracks.find((t: any) => 
              t.name.toLowerCase() === referenceData.name.toLowerCase());
            
            if (matchingTrack) {
              spotifyData = matchingTrack;
              console.log(`[unified-sync] Found Spotify track by name search: ${referenceData.name}`);
            }
          }
        } catch (searchError) {
          console.warn(`[unified-sync] Error searching for track:`, searchError);
        }
      }
    } catch (apiError) {
      console.error(`[unified-sync] Error fetching Spotify API data:`, apiError);
    }
    
    // Combine data
    const combinedData: Song = {
      name: spotifyData?.name || song?.name || referenceData?.name || 'Unknown Song',
      artist_id: artistId,
      spotify_id: spotifyData?.id || song?.spotify_id,
      album_name: spotifyData?.album?.name || song?.album_name,
      album_image_url: spotifyData?.album?.images?.[0]?.url || song?.album_image_url,
      duration_ms: spotifyData?.duration_ms || song?.duration_ms,
      popularity: spotifyData?.popularity || song?.popularity || 0,
      preview_url: spotifyData?.preview_url || song?.preview_url,
      spotify_url: spotifyData?.external_urls?.spotify || song?.spotify_url,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Upsert to database
    let finalSong: Song;
    
    if (song) {
      // Update existing
      const { data: updatedSong, error: updateError } = await this.supabase
        .from('songs')
        .update(combinedData)
        .eq('id', song.id)
        .select()
        .single();
      
      if (updateError) {
        throw new Error(`Error updating song: ${updateError.message}`);
      }
      
      finalSong = updatedSong;
      console.log(`[unified-sync] Updated song: ${finalSong.id}`);
    } else {
      // Insert new
      const { data: newSong, error: insertError } = await this.supabase
        .from('songs')
        .insert(combinedData)
        .select()
        .single();
      
      if (insertError) {
        throw new Error(`Error inserting song: ${insertError.message}`);
      }
      
      finalSong = newSong;
      console.log(`[unified-sync] Created new song: ${finalSong.id}`);
    }
    
    return finalSong;
  }
  
  // Setlist sync handler for a specific show
  async syncSetlist(id: string, referenceData?: Record<string, any>, forceRefresh = false): Promise<Setlist> {
    // id can be internal setlist UUID, show UUID, or setlist.fm ID
    console.log(`[unified-sync] Syncing setlist with ID: ${id}`);
    
    // First, try to find the setlist
    let setlist: Setlist | null = null;
    let showId: string | null = null;
    
    // Reference data can provide the show_id if available
    showId = referenceData?.show_id || null;
    
    try {
      if (!showId) {
        // Try to find by setlist UUID
        const { data: existingSetlist, error } = await this.supabase
          .from('setlists')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        
        if (!error && existingSetlist) {
          setlist = existingSetlist;
          showId = existingSetlist.show_id;
          console.log(`[unified-sync] Found setlist by UUID: ${id}`);
        } else {
          // Try to find by show UUID
          const { data: showSetlist, error: showError } = await this.supabase
            .from('setlists')
            .select('*')
            .eq('show_id', id)
            .maybeSingle();
          
          if (!showError && showSetlist) {
            setlist = showSetlist;
            showId = id; // The ID was a show ID
            console.log(`[unified-sync] Found setlist by show ID: ${id}`);
          } else {
            // If we still don't have a show ID, we need to create a new setlist
            // But first we need a valid show ID
            const { data: show, error: showFindError } = await this.supabase
              .from('shows')
              .select('id')
              .eq('id', id)
              .maybeSingle();
            
            if (!showFindError && show) {
              showId = show.id;
              console.log(`[unified-sync] Found show by UUID: ${showId}`);
            }
          }
        }
      }
      
      // If we still don't have a valid show ID, we can't proceed
      if (!showId) {
        throw new Error('Cannot sync setlist without a valid show ID');
      }
      
      // If we don't have a setlist yet, create one
      if (!setlist) {
        const { data: show, error: showError } = await this.supabase
          .from('shows')
          .select('id, name, artist_id')
          .eq('id', showId)
          .single();
        
        if (showError) {
          throw new Error(`Error finding show: ${showError.message}`);
        }
        
        const newSetlist: Partial<Setlist> = {
          show_id: show.id,
          title: `${show.name} Setlist`,
          is_custom: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: createdSetlist, error: createError } = await this.supabase
          .from('setlists')
          .insert(newSetlist)
          .select()
          .single();
        
        if (createError) {
          throw new Error(`Error creating setlist: ${createError.message}`);
        }
        
        setlist = createdSetlist;
        console.log(`[unified-sync] Created new setlist: ${setlist.id}`);
        
        // Now populate it with songs
        await this.populateSetlistWithTopSongs(setlist.id, show.artist_id);
      }
      
      return setlist;
    } catch (error) {
      console.error(`[unified-sync] Error syncing setlist:`, error);
      throw error;
    }
  }
  
  // Sync trending shows
  async syncTrendingShows(options?: Record<string, any>): Promise<any> {
    console.log(`[unified-sync] Syncing trending shows`);
    
    if (!this.ticketmasterClient) {
      throw new Error('Missing Ticketmaster API configuration');
    }
    
    // Get current date in format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    // Get date 6 months in future
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);
    const sixMonthsAhead = futureDate.toISOString().split('T')[0];
    
    try {
      // Search for popular upcoming music events
      const searchParams: Record<string, string> = {
        size: '50',
        sort: 'date,asc',
        classificationName: 'music',
        startDateTime: `${today}T00:00:00Z`,
        endDateTime: `${sixMonthsAhead}T23:59:59Z`
      };
      
      // Add market/city filter if provided
      if (options?.city) {
        searchParams.city = options.city;
      }
      
      if (options?.countryCode) {
        searchParams.countryCode = options.countryCode;
      }
      
      const searchResults = await this.ticketmasterClient.searchEvents(searchParams);
      
      if (!searchResults?._embedded?.events) {
        throw new Error('No events found in Ticketmaster response');
      }
      
      const events = searchResults._embedded.events;
      console.log(`[unified-sync] Found ${events.length} trending events`);
      
      // Process each event
      for (const event of events) {
        const eventId = event.id;
        
        // Check if we already have this show
        const { data: existingShow } = await this.supabase
          .from('shows')
          .select('id')
          .eq('ticketmaster_id', eventId)
          .maybeSingle();
        
        if (existingShow) {
          // Already exists, queue a refresh with low priority
          await this.supabase.rpc('enqueue_sync', { 
            entity_type: 'show',
            external_id: eventId,
            priority: 3
          });
          continue;
        }
        
        // New show, queue with high priority
        await this.supabase.rpc('enqueue_sync', { 
          entity_type: 'show',
          external_id: eventId,
          priority: 1
        });
        
        // Also queue artist and venue if they exist
        if (event._embedded?.attractions?.[0]?.id) {
          await this.supabase.rpc('enqueue_sync', { 
            entity_type: 'artist',
            external_id: event._embedded.attractions[0].id,
            priority: 1
          });
        }
        
        if (event._embedded?.venues?.[0]?.id) {
          await this.supabase.rpc('enqueue_sync', { 
            entity_type: 'venue',
            external_id: event._embedded.venues[0].id,
            priority: 2
          });
        }
      }
      
      // Update trending shows cache
      await this.updateTrendingShowsCache();
      
      return { success: true, eventsFound: events.length };
    } catch (error) {
      console.error(`[unified-sync] Error syncing trending shows:`, error);
      throw error;
    }
  }
  
  // Helper to ensure a show has a setlist
  private async ensureShowHasSetlist(showId: string): Promise<void> {
    try {
      // Check if setlist exists
      const { data: existingSetlist, error } = await this.supabase
        .from('setlists')
        .select('id')
        .eq('show_id', showId)
        .maybeSingle();
      
      if (error) {
        throw new Error(`Error checking for existing setlist: ${error.message}`);
      }
      
      if (existingSetlist) {
        console.log(`[unified-sync] Show ${showId} already has setlist ${existingSetlist.id}`);
        return;
      }
      
      // Get show details including artist
      const { data: show, error: showError } = await this.supabase
        .from('shows')
        .select('id, name, artist_id')
        .eq('id', showId)
        .single();
      
      if (showError) {
        throw new Error(`Error finding show: ${showError.message}`);
      }
      
      if (!show.artist_id) {
        throw new Error(`Show ${showId} does not have an artist_id`);
      }
      
      // Create new setlist
      const newSetlist: Partial<Setlist> = {
        show_id: showId,
        title: `${show.name} Setlist`,
        is_custom: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: setlist, error: createError } = await this.supabase
        .from('setlists')
        .insert(newSetlist)
        .select()
        .single();
      
      if (createError) {
        throw new Error(`Error creating setlist: ${createError.message}`);
      }
      
      console.log(`[unified-sync] Created new setlist ${setlist.id} for show ${showId}`);
      
      // Populate with songs
      await this.populateSetlistWithTopSongs(setlist.id, show.artist_id);
    } catch (error) {
      console.error(`[unified-sync] Error ensuring setlist for show ${showId}:`, error);
      // Don't rethrow - we don't want to fail the whole sync for this
    }
  }
  
  // Helper to populate a setlist with an artist's top songs
  private async populateSetlistWithTopSongs(setlistId: string, artistId: string): Promise<void> {
    try {
      // Get artist's top songs from our database
      const { data: artistSongs, error } = await this.supabase
        .from('songs')
        .select('id, name')
        .eq('artist_id', artistId)
        .order('popularity', { ascending: false })
        .limit(20);
      
      if (error) {
        throw new Error(`Error fetching artist songs: ${error.message}`);
      }
      
      // If no songs found, try to sync them first
      if (!artistSongs || artistSongs.length === 0) {
        // Try to get artist's Spotify ID
        const { data: artist, error: artistError } = await this.supabase
          .from('artists')
          .select('spotify_id')
          .eq('id', artistId)
          .single();
        
        if (artistError || !artist.spotify_id) {
          console.log(`[unified-sync] No Spotify ID for artist ${artistId}, cannot fetch songs`);
          return;
        }
        
        // Queue song sync
        await this.queueSongSync(artistId, artist.spotify_id);
        
        // Use placeholder songs for now
        const placeholderSongs = [
          { id: null, name: 'Greatest Hit 1' },
          { id: null, name: 'Popular Song' },
          { id: null, name: 'Fan Favorite' },
          { id: null, name: 'Classic Track' },
          { id: null, name: 'New Single' }
        ];
        
        for (let i = 0; i < placeholderSongs.length; i++) {
          const placeholderSong = placeholderSongs[i];
          
          // Create song if it doesn't exist
          if (!placeholderSong.id) {
            const { data: newSong, error: songError } = await this.supabase
              .from('songs')
              .insert({
                name: placeholderSong.name,
                artist_id: artistId
              })
              .select()
              .single();
            
            if (songError) {
              console.error(`[unified-sync] Error creating placeholder song: ${songError.message}`);
              continue;
            }
            
            placeholderSong.id = newSong.id;
          }
          
          // Add to setlist
          await this.supabase
            .from('setlist_songs')
            .insert({
              setlist_id: setlistId,
              song_id: placeholderSong.id,
              position: i + 1,
              is_encore: false
            });
        }
        
        console.log(`[unified-sync] Added ${placeholderSongs.length} placeholder songs to setlist ${setlistId}`);
        return;
      }
      
      // Add artist's top songs to the setlist
      for (let i = 0; i < artistSongs.length; i++) {
        await this.supabase
          .from('setlist_songs')
          .insert({
            setlist_id: setlistId,
            song_id: artistSongs[i].id,
            position: i + 1,
            is_encore: i >= artistSongs.length - 3 // Last 3 songs are encores
          });
      }
      
      console.log(`[unified-sync] Added ${artistSongs.length} songs to setlist ${setlistId}`);
    } catch (error) {
      console.error(`[unified-sync] Error populating setlist ${setlistId}:`, error);
      // Don't rethrow
    }
  }
  
  // Helper to queue song sync for an artist
  private async queueSongSync(artistId: string, spotifyId: string): Promise<void> {
    if (!spotifyId) {
      console.log(`[unified-sync] Cannot queue song sync without Spotify ID for artist ${artistId}`);
      return;
    }
    
    try {
      // Queue the sync job
      await this.supabase.rpc('enqueue_sync', { 
        entity_type: 'song',
        external_id: spotifyId, // Use Spotify ID as reference
        reference_data: { artist_id: artistId },
        priority: 2
      });
      
      console.log(`[unified-sync] Queued song sync for artist ${artistId} with Spotify ID ${spotifyId}`);
      
      // Directly fetch and populate top tracks if Spotify client is available
      if (this.spotifyClient) {
        try {
          const topTracks = await this.spotifyClient.getArtistTopTracks(spotifyId);
          console.log(`[unified-sync] Fetched ${topTracks.length} top tracks for artist ${artistId}`);
          
          // Prepare batch insert data
          const songsToInsert = topTracks.map((track: any, index: number) => ({
            name: track.name,
            artist_id: artistId,
            spotify_id: track.id,
            album_name: track.album?.name,
            album_image_url: track.album?.images?.[0]?.url,
            duration_ms: track.duration_ms,
            popularity: track.popularity || 0,
            preview_url: track.preview_url,
            spotify_url: track.external_urls?.spotify,
            last_synced_at: new Date().toISOString()
          }));
          
          if (songsToInsert.length > 0) {
            // Insert in batches to avoid payload limits
            const BATCH_SIZE = 20;
            for (let i = 0; i < songsToInsert.length; i += BATCH_SIZE) {
              const batch = songsToInsert.slice(i, i + BATCH_SIZE);
              
              await this.supabase
                .from('songs')
                .upsert(batch, {
                  onConflict: 'spotify_id',
                  ignoreDuplicates: false
                });
            }
            
            console.log(`[unified-sync] Inserted/updated ${songsToInsert.length} songs for artist ${artistId}`);
          }
        } catch (fetchError) {
          console.error(`[unified-sync] Error fetching top tracks for artist ${artistId}:`, fetchError);
          // Don't rethrow
        }
      }
    } catch (error) {
      console.error(`[unified-sync] Error queueing song sync for artist ${artistId}:`, error);
      // Don't rethrow
    }
  }
  
  // Helper to queue show syncs for an artist
  private async queueArtistShows(artistId: string, ticketmasterId: string): Promise<void> {
    if (!ticketmasterId || !this.ticketmasterClient) {
      console.log(`[unified-sync] Cannot queue show syncs without Ticketmaster ID for artist ${artistId}`);
      return;
    }
    
    try {
      // Fetch upcoming events for this artist
      const eventsData = await this.ticketmasterClient.getAttractionEvents(ticketmasterId);
      
      if (!eventsData?._embedded?.events) {
        console.log(`[unified-sync] No upcoming events found for artist ${artistId} (TM ID: ${ticketmasterId})`);
        return;
      }
      
      const events = eventsData._embedded.events;
      console.log(`[unified-sync] Found ${events.length} upcoming events for artist ${artistId}`);
      
      // Queue each event for sync
      for (const event of events) {
        await this.supabase.rpc('enqueue_sync', { 
          entity_type: 'show',
          external_id: event.id,
          reference_data: { artist_id: artistId },
          priority: 2
        });
        
        // Also queue venue if available
        if (event._embedded?.venues?.[0]?.id) {
          await this.supabase.rpc('enqueue_sync', { 
            entity_type: 'venue',
            external_id: event._embedded.venues[0].id,
            priority: 3
          });
        }
      }
    } catch (error) {
      console.error(`[unified-sync] Error queueing shows for artist ${artistId}:`, error);
      // Don't rethrow
    }
  }
  
  // Helper to queue setlist syncs for an artist
  private async queueArtistSetlists(artistId: string, setlistFmMbid: string): Promise<void> {
    if (!setlistFmMbid || !this.setlistFmClient) {
      console.log(`[unified-sync] Cannot queue setlist syncs without Setlist.fm MBID for artist ${artistId}`);
      return;
    }
    
    try {
      // Fetch recent setlists for this artist
      const setlistsData = await this.setlistFmClient.getArtistSetlists(setlistFmMbid);
      
      if (!setlistsData?.setlist) {
        console.log(`[unified-sync] No setlists found for artist ${artistId} (MBID: ${setlistFmMbid})`);
        return;
      }
      
      const setlists = setlistsData.setlist;
      console.log(`[unified-sync] Found ${setlists.length} setlists for artist ${artistId}`);
      
      // Queue each setlist for sync (limit to 5 most recent)
      const recentSetlists = setlists.slice(0, 5);
      for (const setlist of recentSetlists) {
        await this.supabase.rpc('enqueue_sync', { 
          entity_type: 'setlist',
          external_id: setlist.id,
          reference_data: { artist_id: artistId },
          priority: 3
        });
      }
    } catch (error) {
      console.error(`[unified-sync] Error queueing setlists for artist ${artistId}:`, error);
      // Don't rethrow
    }
  }
  
  // Helper to update trending shows cache
  private async updateTrendingShowsCache(): Promise<void> {
    try {
      // Clear existing cache
      await this.supabase
        .from('trending_shows_cache')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      
      // Get recent shows with votes
      const { data: popularShows, error } = await this.supabase
        .from('shows')
        .select(`
          id,
          name,
          date,
          artist:artists(id, name, image_url),
          venue:venues(name, city, state),
          setlists(id)
        `)
        .gte('date', new Date().toISOString()) // Only future shows
        .order('date', { ascending: true })
        .limit(50);
      
      if (error) {
        throw new Error(`Error fetching popular shows: ${error.message}`);
      }
      
      // For each show, get vote count
      const cacheEntries = [];
      
      for (const show of popularShows) {
        if (!show.setlists?.[0]?.id) continue;
        
        const setlistId = show.setlists[0].id;
        
        const { data: voteData, error: voteError } = await this.supabase
          .from('setlist_songs')
          .select('sum(vote_count)')
          .eq('setlist_id', setlistId)
          .single();
        
        if (voteError) {
          console.error(`[unified-sync] Error getting vote count for setlist ${setlistId}:`, voteError);
          continue;
        }
        
        cacheEntries.push({
          show_id: show.id,
          show_name: show.name,
          show_date: show.date,
          artist_id: show.artist?.id,
          artist_name: show.artist?.name,
          artist_image_url: show.artist?.image_url,
          venue_name: show.venue?.name,
          venue_city: show.venue?.city,
          venue_state: show.venue?.state,
          total_votes: voteData?.sum || 0,
          cached_at: new Date().toISOString()
        });
      }
      
      // Sort by vote count and take top 20
      cacheEntries.sort((a, b) => b.total_votes - a.total_votes);
      const topEntries = cacheEntries.slice(0, 20);
      
      // Insert into cache table
      if (topEntries.length > 0) {
        await this.supabase
          .from('trending_shows_cache')
          .insert(topEntries);
      }
      
      console.log(`[unified-sync] Updated trending shows cache with ${topEntries.length} entries`);
    } catch (error) {
      console.error(`[unified-sync] Error updating trending shows cache:`, error);
      // Don't rethrow
    }
  }
}

// Main HTTP handler
serve(async (req: Request) => {
  console.log('[unified-sync] Function handler started');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Parse request
    const syncRequest: SyncRequest = await req.json();
    console.log(`[unified-sync] Received request:`, JSON.stringify(syncRequest));
    
    // Initialize handler
    const syncHandler = new SyncHandler();
    
    // Process queue if requested
    if (syncRequest.process_queue) {
      const batchSize = syncRequest.batch_size || 5;
      const result = await syncHandler.processQueue(batchSize);
      
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
    // Process specific entity
    if (!syncRequest.entity_type || !syncRequest.entity_id) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters: entity_type and entity_id'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    const result = await syncHandler.syncEntity(
      syncRequest.entity_type,
      syncRequest.entity_id,
      syncRequest.reference_data,
      syncRequest.force_refresh
    );
    
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[unified-sync] Error:', errorMessage);
    
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
