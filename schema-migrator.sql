-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-----------------------------------------
-- Core Entity Tables
-----------------------------------------

-- Artists table
CREATE TABLE IF NOT EXISTS public.artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  ticketmaster_id TEXT UNIQUE,
  spotify_id TEXT UNIQUE,
  setlist_fm_mbid TEXT UNIQUE,
  image_url TEXT,
  spotify_url TEXT,
  genres TEXT[] DEFAULT '{}',
  followers INTEGER DEFAULT 0,
  popularity INTEGER,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Venues table
CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  ticketmaster_id TEXT UNIQUE,
  city TEXT,
  state TEXT,
  country TEXT,
  address TEXT,
  postal_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  image_url TEXT,
  url TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Shows table
CREATE TABLE IF NOT EXISTS public.shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  artist_id UUID REFERENCES public.artists(id),
  venue_id UUID REFERENCES public.venues(id),
  date TIMESTAMPTZ,
  ticketmaster_id TEXT UNIQUE,
  ticket_url TEXT,
  image_url TEXT,
  popularity INTEGER DEFAULT 0,
  setlist_fm_id TEXT UNIQUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Songs table
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  artist_id UUID REFERENCES public.artists(id),
  spotify_id TEXT UNIQUE,
  album_name TEXT,
  album_image_url TEXT,
  duration_ms INTEGER,
  popularity INTEGER DEFAULT 0,
  preview_url TEXT,
  spotify_url TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-----------------------------------------
-- Votable Setlist Tables
-----------------------------------------

-- Setlists table
CREATE TABLE IF NOT EXISTS public.setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID NOT NULL REFERENCES public.shows(id),
  title TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  created_by UUID, -- Link to auth.users.id
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(show_id)
);

-- Setlist Songs table
CREATE TABLE IF NOT EXISTS public.setlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id UUID NOT NULL REFERENCES public.setlists(id),
  song_id UUID NOT NULL REFERENCES public.songs(id),
  position INTEGER NOT NULL,
  vote_count INTEGER DEFAULT 0,
  is_encore BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(setlist_id, song_id),
  UNIQUE(setlist_id, position)
);

-- Votes table
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_song_id UUID REFERENCES public.setlist_songs(id),
  user_id UUID, -- Optional, for anonymous votes this can be null
  session_key TEXT NOT NULL, -- Client-side generated identifier for grouping votes
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(setlist_song_id, session_key)
);

-----------------------------------------
-- Played Setlist Tables (From setlist.fm)
-----------------------------------------

-- Played Setlists table
CREATE TABLE IF NOT EXISTS public.played_setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID NOT NULL REFERENCES public.shows(id),
  setlist_fm_id TEXT UNIQUE,
  source_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(show_id)
);

-- Played Setlist Songs table
CREATE TABLE IF NOT EXISTS public.played_setlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  played_setlist_id UUID NOT NULL REFERENCES public.played_setlists(id),
  song_id UUID REFERENCES public.songs(id),
  song_name_override TEXT, -- If setlist.fm song name differs or song not in our DB
  position INTEGER NOT NULL,
  is_encore BOOLEAN DEFAULT false,
  info TEXT, -- e.g., "acoustic", "cover by X", "snippet"
  is_tape BOOLEAN DEFAULT false, -- If it was an intro/outro tape
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(played_setlist_id, position)
);

-----------------------------------------
-- Sync System Tables
-----------------------------------------

-- Sync Jobs table
CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  reference_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'retrying'
  priority INTEGER DEFAULT 3,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempted_at TIMESTAMPTZ,
  last_error JSONB, -- Error message and details
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- API Cache table
CREATE TABLE IF NOT EXISTS public.api_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Error Logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT,
  entity_id TEXT,
  function_name TEXT,
  error TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trending Shows Cache table
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
  cached_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security on trending_shows_cache table
ALTER TABLE public.trending_shows_cache ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public read access (both anonymous and authenticated users)
CREATE POLICY "Public Read Access for trending_shows_cache"
ON public.trending_shows_cache
FOR SELECT
TO public
USING (true);

-- Create a policy to allow only authenticated users to insert
CREATE POLICY "Authenticated Insert Access for trending_shows_cache"
ON public.trending_shows_cache
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create a policy to allow only service role to update or delete
CREATE POLICY "Service Role Full Access for trending_shows_cache"
ON public.trending_shows_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON public.trending_shows_cache TO anon;
GRANT SELECT ON public.trending_shows_cache TO authenticated;
GRANT ALL ON public.trending_shows_cache TO service_role;

-----------------------------------------
-- User Profiles & Preferences
-----------------------------------------

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY, -- References auth.users.id
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Artist Follows table
CREATE TABLE IF NOT EXISTS public.artist_follows (
  user_id UUID NOT NULL,
  artist_id UUID NOT NULL REFERENCES public.artists(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, artist_id)
);

-----------------------------------------
-- Functions
-----------------------------------------

-- Vote recording function
CREATE OR REPLACE FUNCTION record_vote(p_setlist_song_id UUID, p_user_id UUID, p_session_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN := FALSE;
BEGIN
  -- Insert the vote
  INSERT INTO votes (setlist_song_id, user_id, session_key)
  VALUES (p_setlist_song_id, p_user_id, p_session_key)
  ON CONFLICT (setlist_song_id, session_key) DO NOTHING;
  
  -- If the vote was successfully recorded
  IF FOUND THEN
    -- Update the vote count on the setlist_song
    UPDATE setlist_songs
    SET vote_count = vote_count + 1
    WHERE id = p_setlist_song_id;
    
    v_success := TRUE;
  END IF;
  
  RETURN v_success;
END;
$$ LANGUAGE plpgsql;

-- Function to claim next sync job
CREATE OR REPLACE FUNCTION claim_next_sync_item()
RETURNS SETOF sync_jobs AS $$
DECLARE
  next_item sync_jobs;
BEGIN
  -- Select and lock the next item based on priority and age
  SELECT * INTO next_item
  FROM sync_jobs
  WHERE status = 'pending' 
    OR (status = 'retrying' AND 
       (last_attempted_at IS NULL OR last_attempted_at < now() - INTERVAL '5 minutes' * attempts))
  ORDER BY 
    priority ASC, -- Lower number = higher priority
    attempts ASC, -- Fewest attempts first
    created_at ASC -- Oldest first
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  -- Update status if item found
  IF FOUND THEN
    UPDATE sync_jobs
    SET 
      status = 'processing',
      attempts = attempts + 1,
      last_attempted_at = now(),
      updated_at = now()
    WHERE id = next_item.id;
    
    RETURN NEXT next_item;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to mark sync job as complete
CREATE OR REPLACE FUNCTION complete_sync_item(item_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE sync_jobs
  SET 
    status = 'completed',
    processed_at = now(),
    updated_at = now()
  WHERE id = item_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to mark sync job as failed
CREATE OR REPLACE FUNCTION fail_sync_item(item_id BIGINT, error_message TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_attempts INT;
  v_max_attempts INT;
BEGIN
  -- Get current attempts for this job
  SELECT attempts, max_attempts INTO v_attempts, v_max_attempts
  FROM sync_jobs
  WHERE id = item_id;
  
  -- Determine if we should retry or mark as permanently failed
  IF v_attempts >= v_max_attempts THEN
    UPDATE sync_jobs
    SET 
      status = 'failed',
      last_error = jsonb_build_object('message', error_message, 'timestamp', now()),
      updated_at = now()
    WHERE id = item_id;
  ELSE
    UPDATE sync_jobs
    SET 
      status = 'retrying',
      last_error = jsonb_build_object('message', error_message, 'timestamp', now()),
      updated_at = now()
    WHERE id = item_id;
  END IF;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to enqueue a sync job
CREATE OR REPLACE FUNCTION enqueue_sync(
  entity_type TEXT,
  external_id TEXT,
  reference_data JSONB DEFAULT NULL,
  priority INTEGER DEFAULT 3,
  max_attempts INTEGER DEFAULT 3
) 
RETURNS BIGINT AS $$
DECLARE
  job_id BIGINT;
BEGIN
  INSERT INTO sync_jobs (
    entity_type,
    entity_id,
    reference_data,
    priority,
    max_attempts,
    status,
    created_at,
    updated_at
  ) VALUES (
    entity_type,
    external_id,
    reference_data,
    priority,
    max_attempts,
    'pending',
    now(),
    now()
  )
  ON CONFLICT (entity_type, entity_id) WHERE status IN ('pending', 'retrying')
  DO UPDATE SET
    -- Increase priority if the new request is higher priority
    priority = LEAST(sync_jobs.priority, EXCLUDED.priority),
    reference_data = COALESCE(EXCLUDED.reference_data, sync_jobs.reference_data),
    updated_at = now()
  RETURNING id INTO job_id;
  
  RETURN job_id;
END;
$$ LANGUAGE plpgsql;

-----------------------------------------
-- Triggers
-----------------------------------------

-- Create updated_at triggers for all tables
DO $$ 
BEGIN
  EXECUTE format('CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON artists FOR EACH ROW EXECUTE FUNCTION update_updated_at()');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  EXECUTE format('CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION update_updated_at()');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  EXECUTE format('CREATE TRIGGER update_shows_updated_at BEFORE UPDATE ON shows FOR EACH ROW EXECUTE FUNCTION update_updated_at()');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  EXECUTE format('CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs FOR EACH ROW EXECUTE FUNCTION update_updated_at()');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  EXECUTE format('CREATE TRIGGER update_setlists_updated_at BEFORE UPDATE ON setlists FOR EACH ROW EXECUTE FUNCTION update_updated_at()');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  EXECUTE format('CREATE TRIGGER update_setlist_songs_updated_at BEFORE UPDATE ON setlist_songs FOR EACH ROW EXECUTE FUNCTION update_updated_at()');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  EXECUTE format('CREATE TRIGGER update_votes_updated_at BEFORE UPDATE ON votes FOR EACH ROW EXECUTE FUNCTION update_updated_at()');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  EXECUTE format('CREATE TRIGGER update_played_setlists_updated_at BEFORE UPDATE ON played_setlists FOR EACH ROW EXECUTE FUNCTION update_updated_at()');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  EXECUTE format('CREATE TRIGGER update_played_setlist_songs_updated_at BEFORE UPDATE ON played_setlist_songs FOR EACH ROW EXECUTE FUNCTION update_updated_at()');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  EXECUTE format('CREATE TRIGGER update_sync_jobs_updated_at BEFORE UPDATE ON sync_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at()');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  EXECUTE format('CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at()');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-----------------------------------------
-- Indexes
-----------------------------------------

-- Artists indexes
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_artists_ticketmaster_id ON artists(ticketmaster_id);
CREATE INDEX IF NOT EXISTS idx_artists_spotify_id ON artists(spotify_id);
CREATE INDEX IF NOT EXISTS idx_artists_setlist_fm_mbid ON artists(setlist_fm_mbid);

-- Venues indexes
CREATE INDEX IF NOT EXISTS idx_venues_name ON venues USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_venues_ticketmaster_id ON venues(ticketmaster_id);
CREATE INDEX IF NOT EXISTS idx_venues_city_state ON venues(city, state);

-- Shows indexes
CREATE INDEX IF NOT EXISTS idx_shows_artist_id ON shows(artist_id);
CREATE INDEX IF NOT EXISTS idx_shows_venue_id ON shows(venue_id);
CREATE INDEX IF NOT EXISTS idx_shows_date ON shows(date);
CREATE INDEX IF NOT EXISTS idx_shows_ticketmaster_id ON shows(ticketmaster_id);

-- Songs indexes
CREATE INDEX IF NOT EXISTS idx_songs_artist_id ON songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_songs_name ON songs USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_songs_spotify_id ON songs(spotify_id);

-- Setlists indexes
CREATE INDEX IF NOT EXISTS idx_setlists_show_id ON setlists(show_id);

-- Setlist Songs indexes
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id ON setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_song_id ON setlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_vote_count ON setlist_songs(vote_count DESC);

-- Votes indexes
CREATE INDEX IF NOT EXISTS idx_votes_setlist_song_id ON votes(setlist_song_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_session_key ON votes(session_key);

-- Played Setlists indexes
CREATE INDEX IF NOT EXISTS idx_played_setlists_show_id ON played_setlists(show_id);
CREATE INDEX IF NOT EXISTS idx_played_setlists_setlist_fm_id ON played_setlists(setlist_fm_id);

-- Played Setlist Songs indexes
CREATE INDEX IF NOT EXISTS idx_played_setlist_songs_played_setlist_id ON played_setlist_songs(played_setlist_id);
CREATE INDEX IF NOT EXISTS idx_played_setlist_songs_song_id ON played_setlist_songs(song_id);

-- Sync Jobs indexes
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status_priority ON sync_jobs(status, priority);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_entity ON sync_jobs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_attempts ON sync_jobs(attempts) WHERE status = 'retrying';

-- API Cache indexes
CREATE INDEX IF NOT EXISTS idx_api_cache_expires_at ON api_cache(expires_at);

-- Artist Follows indexes
CREATE INDEX IF NOT EXISTS idx_artist_follows_artist_id ON artist_follows(artist_id);

-----------------------------------------
-- Constraints
-----------------------------------------

-- Missing constraint for sync_jobs
ALTER TABLE IF EXISTS public.sync_jobs DROP CONSTRAINT IF EXISTS unique_pending_entity;
DO $$
BEGIN
  -- This will give conflict errors if running multiple times, so we use DO block
  ALTER TABLE public.sync_jobs 
  ADD CONSTRAINT unique_pending_entity UNIQUE (entity_type, entity_id) 
  WHERE status IN ('pending', 'retrying');
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;