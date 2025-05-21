// Types shared between Edge Functions and potentially the frontend

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

// Define base types used across functions
export type Artist = {
  id: string; // Usually Ticketmaster ID initially
  name: string;
  spotify_id?: string;
  setlist_fm_mbid?: string;
  image_url?: string;
  images?: Array<{ url: string; height?: number; width?: number }>;
  genres?: string[];
  spotify_url?: string;
  popularity?: number;
  followers?: number;
  last_updated?: string; // From DB
  updated_at?: string; // From DB
};

export type Venue = {
  id: string; // Usually Ticketmaster ID initially
  name: string;
  ticketmaster_id?: string; // Explicit TM ID
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  postal_code?: string;
  image_url?: string;
  updated_at?: string; // From DB
  last_updated?: string; // From DB
};

export type Show = {
  id: string; // Usually Ticketmaster ID initially
  name?: string;
  date?: string;
  image_url?: string;
  ticket_url?: string;
  popularity?: number;
  artist_id?: string; // Usually Ticketmaster Artist ID initially
  venue_id?: string; // Usually Ticketmaster Venue ID initially
  ticketmaster_id?: string; // Explicit TM ID
  artist?: Artist; // Nested artist data from API
  venue?: Venue; // Nested venue data from API
  last_updated?: string; // From DB
  updated_at?: string; // From DB
  setlist_id?: string; // Added by DB utils after setlist creation
};

export type Setlist = {
  id: string; // DB generated UUID
  show_id: string; // Foreign key to shows table (using DB show ID)
  artist_id: string; // Foreign key to artists table (using DB artist ID)
  date?: string; // Copied from show
  venue?: string; // Copied from show/venue
  venue_city?: string; // Copied from show/venue
  tour_name?: string; // Optional
  setlist_fm_id?: string; // Optional
  created_at?: string; // DB timestamp
  updated_at?: string; // DB timestamp
};

// Represents a song in the DB
export type Song = {
  id: string; // DB generated UUID
  name: string;
  artist_id: string; // Foreign key to artists table (using DB artist ID)
  spotify_id?: string;
  duration_ms?: number;
  popularity?: number;
  preview_url?: string | null;
  vote_count?: number; // Managed by voting logic
  created_at?: string; // DB timestamp
  updated_at?: string; // DB timestamp
};

// Represents an entry in the junction table
export type SetlistSong = {
    id?: string; // DB generated UUID
    setlist_id: string; // Foreign key to setlists table
    song_id: string; // Foreign key to songs table
    name?: string; // Denormalized song name
    position: number; // Order in the setlist
    artist_id: string; // Denormalized artist ID
    vote_count?: number; // Initialized to 0
    track_id?: string; // Potentially spotify_id? Check usage
    created_at?: string; // DB timestamp
    updated_at?: string; // DB timestamp
    last_updated?: string; // From DB? Check usage
};

export type Vote = {
  id: string;
  song_id: string;
  user_id: string;
  count: number;
  created_at: string;
  updated_at: string;
};

// Type for Spotify track object (simplified)
export type SpotifyTrack = {
  id: string;
  name: string;
  duration_ms?: number;
  popularity?: number;
  preview_url?: string | null; // Move this back inside SpotifyTrack
  // Add other fields if needed from Spotify API response
};

// Type for the response structure of Spotify track fetching
export type SpotifyTracksResponse = {
  tracks: SpotifyTrack[];
};

// Type for Spotify artist object (simplified)
export type SpotifyArtist = {
    id: string;
    name: string;
    external_urls: {
        spotify?: string;
    };
    popularity?: number;
    followers: {
        total?: number;
    };
    images?: Array<{ url: string; height?: number; width?: number }>;
    genres?: string[];
};

// Type for Ticketmaster Image object
export interface TicketmasterImage {
  url: string;
  ratio?: string;
  width?: number;
  height?: number;
  fallback?: boolean;
}

// Type for the raw event object from Ticketmaster API response
export interface TicketmasterEvent {
  id: string;
  name: string;
  url?: string;
  dates?: {
    start?: {
      dateTime?: string;
      localDate?: string;
      localTime?: string;
    };
    timezone?: string;
    status?: {
      code?: string;
    };
  };
  images?: TicketmasterImage[];
  popularity?: number;
  _embedded?: {
    venues?: Array<{
      id: string;
      name: string;
      city?: { name: string };
      state?: { name: string };
      country?: { name: string; countryCode?: string };
      address?: { line1?: string };
      postalCode?: string;
      location?: { latitude?: string; longitude?: string };
      url?: string;
      images?: TicketmasterImage[];
    }>;
    attractions?: Array<{
      id: string;
      name: string;
      images?: TicketmasterImage[];
    }>;
  };
}