-- Supabase Full Database Initialization Script
-- This script creates all tables, relationships, RLS policies, and other database objects for TheSet application

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-----------------------------------------
-- Base Tables
-----------------------------------------

-- Artists table
CREATE TABLE IF NOT EXISTS public.artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  spotify_artist_id TEXT UNIQUE,
  spotify_url TEXT,
  ticketmaster_artist_id TEXT UNIQUE,
  setlist_fm_mbid TEXT UNIQUE,
  image_url TEXT,
  images JSONB,
  followers INTEGER DEFAULT 0,
  popularity INTEGER,
  genres TEXT[],
  external_urls JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE
);

-- Venues table
CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  address TEXT,
  postal_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  image_url TEXT,
  images JSONB,
  ticketmaster_venue_id TEXT UNIQUE,
  external_urls JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE
);

-- Shows table
CREATE TABLE IF NOT EXISTS public.shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  artist_id UUID REFERENCES public.artists(id),
  venue_id UUID REFERENCES public.venues(id),
  show_date TIMESTAMP WITH TIME ZONE,
  show_date_utc TIMESTAMP WITH TIME ZONE,
  timezone TEXT,
  image_url TEXT,
  images JSONB,
  ticket_url TEXT,
  ticket_info JSONB,
  popularity INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  ticketmaster_show_id TEXT UNIQUE,
  setlist_fm_id TEXT UNIQUE,
  external_urls JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE
);

-- Songs table
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  artist_id UUID REFERENCES public.artists(id),
  spotify_id TEXT UNIQUE,
  duration_ms INTEGER,
  popularity INTEGER DEFAULT 0,
  preview_url TEXT,
  external_urls JSONB,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE
);

-- Setlists table
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE
);

-- Setlist songs table
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

-- Votes table
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id UUID REFERENCES public.setlist_songs(id),
  user_id UUID,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(song_id, user_id)
);

-- User profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  spotify_id TEXT,
  spotify_access_token TEXT,
  spotify_refresh_token TEXT,
  spotify_token_expires_at TIMESTAMP WITH TIME ZONE,
  favorite_artists UUID[] DEFAULT '{}'::uuid[],
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Artist follows
CREATE TABLE IF NOT EXISTS public.artist_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, artist_id)
);

-- Sync task system
CREATE TABLE IF NOT EXISTS public.sync_tasks (
  id SERIAL PRIMARY KEY,
  source_system TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  external_id TEXT NOT NULL,
  internal_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  payload JSONB,
  error_log JSONB,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(source_system, entity_type, external_id)
);

-- API cache
CREATE TABLE IF NOT EXISTS public.api_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(endpoint)
);

-- Error logs
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  error TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trending shows cache
CREATE TABLE IF NOT EXISTS public.trending_shows_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID REFERENCES public.shows(id),
  show_name TEXT,
  show_date TIMESTAMPTZ,
  artist_id UUID,
  artist_name TEXT,
  artist_image_url TEXT,
  venue_name TEXT,
  venue_city TEXT,
  venue_state TEXT,
  total_votes INTEGER,
  rank INTEGER,
  cached_at TIMESTAMPTZ DEFAULT now()
);

-----------------------------------------
-- Indexes for performance
-----------------------------------------

-- Artists indexes
CREATE INDEX IF NOT EXISTS idx_artists_name ON public.artists(name);
CREATE INDEX IF NOT EXISTS idx_artists_spotify_id ON public.artists(spotify_artist_id);
CREATE INDEX IF NOT EXISTS idx_artists_ticketmaster_id ON public.artists(ticketmaster_artist_id);
CREATE INDEX IF NOT EXISTS idx_artists_setlist_fm_mbid ON public.artists(setlist_fm_mbid);

-- Venues indexes
CREATE INDEX IF NOT EXISTS idx_venues_name ON public.venues(name);
CREATE INDEX IF NOT EXISTS idx_venues_city ON public.venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_ticketmaster_id ON public.venues(ticketmaster_venue_id);

-- Shows indexes
CREATE INDEX IF NOT EXISTS idx_shows_artist_id ON public.shows(artist_id);
CREATE INDEX IF NOT EXISTS idx_shows_venue_id ON public.shows(venue_id);
CREATE INDEX IF NOT EXISTS idx_shows_date ON public.shows(show_date);
CREATE INDEX IF NOT EXISTS idx_shows_ticketmaster_id ON public.shows(ticketmaster_show_id);
CREATE INDEX IF NOT EXISTS idx_shows_popularity ON public.shows(popularity DESC);

-- Songs indexes
CREATE INDEX IF NOT EXISTS idx_songs_artist_id ON public.songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_songs_spotify_id ON public.songs(spotify_id);
CREATE INDEX IF NOT EXISTS idx_songs_name ON public.songs(name);

-- Setlists indexes
CREATE INDEX IF NOT EXISTS idx_setlists_artist_id ON public.setlists(artist_id);
CREATE INDEX IF NOT EXISTS idx_setlists_show_id ON public.setlists(show_id);
CREATE INDEX IF NOT EXISTS idx_setlists_setlist_fm_id ON public.setlists(setlist_fm_id);
CREATE INDEX IF NOT EXISTS idx_setlists_date ON public.setlists(date);

-- Setlist songs indexes
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id ON public.setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_song_id ON public.setlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_artist_id ON public.setlist_songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_vote_count ON public.setlist_songs(vote_count DESC);

-- Votes indexes
CREATE INDEX IF NOT EXISTS idx_votes_song_id ON public.votes(song_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON public.votes(user_id);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_spotify_id ON public.profiles(spotify_id);

-- Artist follows indexes
CREATE INDEX IF NOT EXISTS idx_artist_follows_user_id ON public.artist_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_follows_artist_id ON public.artist_follows(artist_id);

-- Sync tasks indexes
CREATE INDEX IF NOT EXISTS idx_sync_tasks_status ON public.sync_tasks(status);
CREATE INDEX IF NOT EXISTS idx_sync_tasks_priority ON public.sync_tasks(priority DESC);
CREATE INDEX IF NOT EXISTS idx_sync_tasks_external_id ON public.sync_tasks(external_id);
CREATE INDEX IF NOT EXISTS idx_sync_tasks_entity_type ON public.sync_tasks(entity_type);
CREATE INDEX IF NOT EXISTS idx_sync_tasks_source_system ON public.sync_tasks(source_system);

-- API cache indexes
CREATE INDEX IF NOT EXISTS idx_api_cache_endpoint ON public.api_cache(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON public.api_cache(expires_at DESC);

-- Trending shows cache indexes
CREATE INDEX IF NOT EXISTS idx_trending_shows_cache_show_id ON public.trending_shows_cache(show_id);
CREATE INDEX IF NOT EXISTS idx_trending_shows_cache_artist_id ON public.trending_shows_cache(artist_id);
CREATE INDEX IF NOT EXISTS idx_trending_shows_cache_rank ON public.trending_shows_cache(rank ASC);

-----------------------------------------
-- Functions and Triggers
-----------------------------------------

-- Updated at trigger function
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

DO $$ 
BEGIN
  CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE TRIGGER update_sync_tasks_updated_at
    BEFORE UPDATE ON sync_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Function to handle vote updates
CREATE OR REPLACE FUNCTION handle_vote_insert_or_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update vote_count in setlist_songs
  UPDATE public.setlist_songs
  SET vote_count = (
    SELECT COALESCE(SUM(count), 0)
    FROM public.votes
    WHERE song_id = NEW.song_id
  )
  WHERE id = NEW.song_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle vote deletions
CREATE OR REPLACE FUNCTION handle_vote_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Update vote_count in setlist_songs
  UPDATE public.setlist_songs
  SET vote_count = (
    SELECT COALESCE(SUM(count), 0)
    FROM public.votes
    WHERE song_id = OLD.song_id
  )
  WHERE id = OLD.song_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Vote triggers
DO $$ 
BEGIN
  CREATE TRIGGER after_vote_insert_or_update
    AFTER INSERT OR UPDATE ON public.votes
    FOR EACH ROW
    EXECUTE FUNCTION handle_vote_insert_or_update();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE TRIGGER after_vote_delete
    AFTER DELETE ON public.votes
    FOR EACH ROW
    EXECUTE FUNCTION handle_vote_delete();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for user creation
DO $$ 
BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-----------------------------------------
-- Row Level Security (RLS) Policies
-----------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_shows_cache ENABLE ROW LEVEL SECURITY;

-- Artists table policies
CREATE POLICY "Public read access for artists" ON public.artists
  FOR SELECT TO public USING (true);
  
CREATE POLICY "Auth users can insert artists" ON public.artists
  FOR INSERT TO authenticated WITH CHECK (true);

-- Venues table policies
CREATE POLICY "Public read access for venues" ON public.venues
  FOR SELECT TO public USING (true);
  
CREATE POLICY "Auth users can insert venues" ON public.venues
  FOR INSERT TO authenticated WITH CHECK (true);

-- Shows table policies
CREATE POLICY "Public read access for shows" ON public.shows
  FOR SELECT TO public USING (true);
  
CREATE POLICY "Auth users can insert shows" ON public.shows
  FOR INSERT TO authenticated WITH CHECK (true);

-- Songs table policies
CREATE POLICY "Public read access for songs" ON public.songs
  FOR SELECT TO public USING (true);
  
CREATE POLICY "Auth users can insert songs" ON public.songs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Setlists table policies
CREATE POLICY "Public read access for setlists" ON public.setlists
  FOR SELECT TO public USING (true);
  
CREATE POLICY "Auth users can insert setlists" ON public.setlists
  FOR INSERT TO authenticated WITH CHECK (true);

-- Setlist songs table policies
CREATE POLICY "Public read access for setlist_songs" ON public.setlist_songs
  FOR SELECT TO public USING (true);
  
CREATE POLICY "Auth users can insert setlist_songs" ON public.setlist_songs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Votes table policies
CREATE POLICY "Public read access for votes" ON public.votes
  FOR SELECT TO public USING (true);
  
CREATE POLICY "Auth users can manage their votes" ON public.votes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Profiles table policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
  
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Artist follows table policies
CREATE POLICY "Users can view all artist follows" ON public.artist_follows
  FOR SELECT TO authenticated USING (true);
  
CREATE POLICY "Users can manage their own artist follows" ON public.artist_follows
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sync tasks table policies
CREATE POLICY "Service role access for sync_tasks" ON public.sync_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- API cache table policies
CREATE POLICY "Public read access for api_cache" ON public.api_cache
  FOR SELECT TO public USING (true);
  
CREATE POLICY "Service role can manage api_cache" ON public.api_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Error logs table policies
CREATE POLICY "Service role access for error_logs" ON public.error_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trending shows cache table policies
CREATE POLICY "Public Read Access for trending_shows_cache" ON public.trending_shows_cache
  FOR SELECT TO public USING (true);
  
CREATE POLICY "Authenticated Insert Access for trending_shows_cache" ON public.trending_shows_cache
  FOR INSERT TO authenticated WITH CHECK (true);
  
CREATE POLICY "Service Role Full Access for trending_shows_cache" ON public.trending_shows_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-----------------------------------------
-- Permissions
-----------------------------------------

-- Grant permissions for public access
GRANT SELECT ON public.artists TO anon;
GRANT SELECT ON public.venues TO anon;
GRANT SELECT ON public.shows TO anon;
GRANT SELECT ON public.songs TO anon;
GRANT SELECT ON public.setlists TO anon;
GRANT SELECT ON public.setlist_songs TO anon;
GRANT SELECT ON public.api_cache TO anon;
GRANT SELECT ON public.trending_shows_cache TO anon;

-- Grant permissions for authenticated users
GRANT SELECT ON public.artists TO authenticated;
GRANT INSERT ON public.artists TO authenticated;
GRANT SELECT ON public.venues TO authenticated;
GRANT INSERT ON public.venues TO authenticated;
GRANT SELECT ON public.shows TO authenticated;
GRANT INSERT ON public.shows TO authenticated;
GRANT SELECT ON public.songs TO authenticated;
GRANT INSERT ON public.songs TO authenticated;
GRANT SELECT ON public.setlists TO authenticated;
GRANT INSERT ON public.setlists TO authenticated;
GRANT SELECT ON public.setlist_songs TO authenticated;
GRANT INSERT ON public.setlist_songs TO authenticated;
GRANT ALL ON public.votes TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.artist_follows TO authenticated;
GRANT SELECT ON public.api_cache TO authenticated;
GRANT SELECT ON public.trending_shows_cache TO authenticated;
GRANT INSERT ON public.trending_shows_cache TO authenticated;

-- Grant full permissions to service role
GRANT ALL ON public.artists TO service_role;
GRANT ALL ON public.venues TO service_role;
GRANT ALL ON public.shows TO service_role;
GRANT ALL ON public.songs TO service_role;
GRANT ALL ON public.setlists TO service_role;
GRANT ALL ON public.setlist_songs TO service_role;
GRANT ALL ON public.votes TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.artist_follows TO service_role;
GRANT ALL ON public.sync_tasks TO service_role;
GRANT ALL ON public.api_cache TO service_role;
GRANT ALL ON public.error_logs TO service_role;
GRANT ALL ON public.trending_shows_cache TO service_role;