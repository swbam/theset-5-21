-- Fix for missing setlist_fm_mbid column

-- First, check if the column exists, add it only if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'artists' 
        AND column_name = 'setlist_fm_mbid'
    ) THEN
        ALTER TABLE public.artists ADD COLUMN setlist_fm_mbid TEXT;
        ALTER TABLE public.artists ADD CONSTRAINT unique_setlist_fm_mbid UNIQUE (setlist_fm_mbid);
    END IF;
END $$;

-- Create or replace indexes (will skip if already exists)
CREATE INDEX IF NOT EXISTS idx_artists_setlist_fm_mbid ON public.artists(setlist_fm_mbid);

-- Check for other missing columns mentioned in the schema
DO $$
BEGIN
    -- Check for ticketmaster_id column on artists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'artists' 
        AND column_name = 'ticketmaster_id'
    ) THEN
        ALTER TABLE public.artists ADD COLUMN ticketmaster_id TEXT;
        ALTER TABLE public.artists ADD CONSTRAINT unique_ticketmaster_id UNIQUE (ticketmaster_id);
    END IF;

    -- Check for last_synced_at column on artists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'artists' 
        AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE public.artists ADD COLUMN last_synced_at TIMESTAMPTZ;
    END IF;

    -- Check for ticketmaster_id column on venues
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'venues' 
        AND column_name = 'ticketmaster_id'
    ) THEN
        ALTER TABLE public.venues ADD COLUMN ticketmaster_id TEXT;
        ALTER TABLE public.venues ADD CONSTRAINT unique_ticketmaster_id_venue UNIQUE (ticketmaster_id);
    END IF;

    -- Check for last_synced_at column on venues
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'venues' 
        AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE public.venues ADD COLUMN last_synced_at TIMESTAMPTZ;
    END IF;

    -- Check for ticketmaster_id column on shows
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'shows' 
        AND column_name = 'ticketmaster_id'
    ) THEN
        ALTER TABLE public.shows ADD COLUMN ticketmaster_id TEXT;
        ALTER TABLE public.shows ADD CONSTRAINT unique_ticketmaster_id_show UNIQUE (ticketmaster_id);
    END IF;

    -- Check for setlist_fm_id column on shows
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'shows' 
        AND column_name = 'setlist_fm_id'
    ) THEN
        ALTER TABLE public.shows ADD COLUMN setlist_fm_id TEXT;
        ALTER TABLE public.shows ADD CONSTRAINT unique_setlist_fm_id UNIQUE (setlist_fm_id);
    END IF;

    -- Check for last_synced_at column on shows
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'shows' 
        AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE public.shows ADD COLUMN last_synced_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create indexes for the columns we just verified
CREATE INDEX IF NOT EXISTS idx_artists_ticketmaster_id ON public.artists(ticketmaster_id);
CREATE INDEX IF NOT EXISTS idx_venues_ticketmaster_id ON public.venues(ticketmaster_id);
CREATE INDEX IF NOT EXISTS idx_shows_ticketmaster_id ON public.shows(ticketmaster_id);
CREATE INDEX IF NOT EXISTS idx_shows_setlist_fm_id ON public.shows(setlist_fm_id);

-- Ensure sync_jobs table exists
CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  reference_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 3,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempted_at TIMESTAMPTZ,
  last_error JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Ensure the sync functions exist
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
EXCEPTION
  WHEN unique_violation THEN
    -- This can happen if the unique constraint doesn't exist yet
    -- Or if there's another race condition
    UPDATE sync_jobs
    SET 
      priority = LEAST(priority, $4),
      reference_data = COALESCE($3, reference_data),
      updated_at = now()
    WHERE entity_type = $1 AND entity_id = $2 AND status IN ('pending', 'retrying')
    RETURNING id INTO job_id;
    
    IF job_id IS NULL THEN
      -- If no update happened, do a regular insert
      INSERT INTO sync_jobs (
        entity_type,
        entity_id,
        reference_data,
        priority,
        max_attempts,
        status
      ) VALUES (
        entity_type,
        external_id,
        reference_data,
        priority,
        max_attempts,
        'pending'
      )
      RETURNING id INTO job_id;
    END IF;
    
    RETURN job_id;
END;
$$ LANGUAGE plpgsql;

-- Constraint moved to fix_constraint.sql for better handling
-- DO $$
-- BEGIN
--   ALTER TABLE public.sync_jobs 
--   ADD CONSTRAINT unique_pending_entity UNIQUE (entity_type, entity_id) 
--   WHERE status IN ('pending', 'retrying');
-- EXCEPTION WHEN duplicate_table THEN NULL;
-- END $$;