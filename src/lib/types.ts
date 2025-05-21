export type ConcertData = {
  id: string;
  date: string;
  venue: string;
  setlist: Array<{
    id: string;
    title: string;
    vote_count: number;
  }>;
  artist: {
    id: string;
    name: string;
  };
  last_updated: string;
};

export type SyncStatus = {
  ticketmaster: 'syncing' | 'success' | 'error';
  spotify: 'syncing' | 'success' | 'error';
  setlistfm: 'syncing' | 'success' | 'error';
  lastUpdated: string;
};

export interface Artist {
  id?: string; // UUID
  external_id?: string; // Ticketmaster/Setlist.fm ID
  name: string;
  image_url?: string | null;
  url?: string | null;
  spotify_id?: string | null;
  spotify_url?: string | null;
  setlist_fm_mbid?: string | null;
  genres?: string[] | null;
  popularity?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Venue {
  id?: string; // UUID
  external_id?: string; // Ticketmaster/Setlist.fm ID
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null; // Uncommented to match venue table in database
  latitude?: string | null; // Updated type to match database schema
  longitude?: string | null; // Updated type to match database schema
  url?: string | null; // Added to match database schema
  image_url?: string | null; // In schema
  ticketmaster_id?: string | null; // Added to match database schema
  created_at?: string;
  updated_at?: string;
}

export interface Show {
  id?: string; // UUID
  external_id?: string; // Ticketmaster/Setlist.fm ID
  name: string;
  date?: string | null;
  artist_id?: string | null;
  // artist_external_id?: string | null; // Not in schema
  venue_id?: string | null; // In schema
  // venue_external_id?: string | null; // Not in schema
  // setlist_id?: string | null; // Not in schema
  // setlist_external_id?: string | null; // Not in schema
  // status?: string; // Not in schema
  ticket_url?: string | null; // In schema
  image_url?: string | null; // In schema
  popularity?: number | null; // Added from schema.sql
  created_at?: string;
  updated_at?: string;
  // Add nested objects for joined data
  artist?: Artist | null;
  venue?: Venue | null;
}

export interface Setlist {
  id?: string; // UUID
  setlist_fm_id?: string; // Renamed from external_id to match schema
  artist_id?: string | null; // In schema
  // artist_external_id?: string | null; // Not in schema
  show_id?: string | null; // In schema
  // show_external_id?: string | null; // Not in schema
  // songs?: any[] | null; // Not in schema (use setlist_songs)
  tour_name?: string | null; // In schema
  venue?: string | null; // Renamed from venue_name to match schema
  venue_city?: string | null; // Renamed from city to match schema
  // country?: string | null; // Not in schema
  date?: string | null; // In schema
  created_at?: string;
  updated_at?: string;
}

export interface Song {
  id?: string; // UUID
  external_id?: string; // Spotify or custom ID
  name: string;
  artist_id?: string | null;
  // artist_external_id?: string | null; // Not in schema
  spotify_id?: string | null; // In schema
  // spotify_url?: string | null; // Not in schema
  preview_url?: string | null; // In schema
  duration_ms?: number | null; // In schema
  popularity?: number | null; // In schema
  // album_name?: string | null; // Not in schema
  // album_image?: string | null; // Not in schema
  // encore?: number | null; // Belongs in setlist_songs
  // position?: number | null; // Belongs in setlist_songs
  created_at?: string;
  updated_at?: string;
}

export type Vote = {
  id: string;
  song_id: string;
  user_id: string;
  count: number;
  created_at: string;
  updated_at: string;
};