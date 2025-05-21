-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create base tables
CREATE TABLE IF NOT EXISTS public.artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  spotify_id TEXT UNIQUE,
  image_url TEXT,
  followers INTEGER DEFAULT 0,
  popularity INTEGER,
  genres TEXT[],
  setlist_fm_mbid TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  artist_id UUID REFERENCES public.artists(id),
  venue_id UUID REFERENCES public.venues(id),
  date TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  ticket_url TEXT,
  popularity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  artist_id UUID REFERENCES public.artists(id),
  spotify_id TEXT UNIQUE,
  duration_ms INTEGER,
  popularity INTEGER DEFAULT 0,
  preview_url TEXT,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id),
  show_id UUID REFERENCES public.shows(id),
  date TIMESTAMP WITH TIME ZONE,
  venue TEXT,
  venue_city TEXT,
  tour_name TEXT,
  setlist_fm_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.setlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id UUID REFERENCES public.setlists(id),
  song_id UUID REFERENCES public.songs(id),
  name TEXT NOT NULL,
  position INTEGER,
  artist_id UUID REFERENCES public.artists(id),
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(setlist_id, position)
);

CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id UUID REFERENCES public.setlist_songs(id),
  user_id UUID,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(song_id, user_id)
);

-- Create cache tables
CREATE TABLE IF NOT EXISTS public.api_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(endpoint)
);

CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  error TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
DO $$ 
BEGIN
  CREATE TRIGGER update_artists_updated_at
    BEFORE UPDATE ON artists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE TRIGGER update_venues_updated_at
    BEFORE UPDATE ON venues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE TRIGGER update_shows_updated_at
    BEFORE UPDATE ON shows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE TRIGGER update_songs_updated_at
    BEFORE UPDATE ON songs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE TRIGGER update_setlists_updated_at
    BEFORE UPDATE ON setlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE TRIGGER update_setlist_songs_updated_at
    BEFORE UPDATE ON setlist_songs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE TRIGGER update_votes_updated_at
    BEFORE UPDATE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shows_artist_id ON shows(artist_id);
CREATE INDEX IF NOT EXISTS idx_shows_venue_id ON shows(venue_id);
CREATE INDEX IF NOT EXISTS idx_songs_artist_id ON songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_setlists_artist_id ON setlists(artist_id);
CREATE INDEX IF NOT EXISTS idx_setlists_show_id ON setlists(show_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id ON setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_song_id ON setlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_votes_song_id ON votes(song_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_api_cache_endpoint ON api_cache(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at DESC);
