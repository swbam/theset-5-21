-- Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Sync System Tables

-- sync_states table - Tracks the sync state of each entity for incremental sync purposes
CREATE TABLE IF NOT EXISTS public.sync_states (
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT now(),
    sync_version INTEGER DEFAULT 1,
    PRIMARY KEY (entity_id, entity_type)
);

-- Create index for entity type to allow filtering sync states by type
CREATE INDEX IF NOT EXISTS idx_sync_states_entity_type ON public.sync_states (entity_type);

-- sync_queue table - Stores pending sync tasks for asynchronous processing
CREATE TABLE IF NOT EXISTS public.sync_queue (
    id SERIAL PRIMARY KEY,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    operation TEXT NOT NULL,
    priority TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON public.sync_queue (priority);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON public.sync_queue (entity_type, entity_id);

-- api_cache table - Stores cached API responses for reducing external API calls
CREATE TABLE IF NOT EXISTS public.api_cache (
    cache_key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for cache expiration cleanup
CREATE INDEX IF NOT EXISTS idx_api_cache_created_at ON public.api_cache (created_at);

-- Ensure existing core entity tables have necessary columns and constraints

-- Add missing columns to artists table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'artists') THEN
        BEGIN
            ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS spotify_id TEXT;
            ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS spotify_url TEXT;
            ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS genres JSONB DEFAULT '[]'::jsonb;
            ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS popularity INTEGER;
            ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Error adding columns to artists table: %', SQLERRM;
        END;
    END IF;
END
$$;

-- Add missing columns to shows table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shows') THEN
        BEGIN
            ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS setlist_id TEXT;
            ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Error adding columns to shows table: %', SQLERRM;
        END;
    END IF;
END
$$;

-- Add missing columns to songs table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'songs') THEN
        BEGIN
            ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS spotify_id TEXT;
            ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS spotify_url TEXT;
            ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS preview_url TEXT;
            ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
            ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS popularity INTEGER;
            ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS album_name TEXT;
            ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS album_image TEXT;
            ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Error adding columns to songs table: %', SQLERRM;
        END;
    END IF;
END
$$;

-- Enable Row Level Security
ALTER TABLE IF EXISTS public.sync_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- sync_states policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sync_states') THEN
        DROP POLICY IF EXISTS "Anyone can read sync states" ON public.sync_states;
        CREATE POLICY "Anyone can read sync states" 
        ON public.sync_states FOR SELECT 
        TO authenticated 
        USING (true);
        
        DROP POLICY IF EXISTS "Only admins can modify sync states" ON public.sync_states;
        CREATE POLICY "Only admins can modify sync states" 
        ON public.sync_states USING (
            -- Check if user is an admin or service role
            (auth.uid() IN (SELECT user_id FROM public.admins WHERE is_active = true)) OR
            auth.role() = 'service_role'
        );
    END IF;
END
$$;

-- sync_queue policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sync_queue') THEN
        DROP POLICY IF EXISTS "Anyone can read sync queue" ON public.sync_queue;
        CREATE POLICY "Anyone can read sync queue" 
        ON public.sync_queue FOR SELECT 
        TO authenticated 
        USING (true);
        
        DROP POLICY IF EXISTS "Only admins can modify sync queue" ON public.sync_queue;
        CREATE POLICY "Only admins can modify sync queue" 
        ON public.sync_queue USING (
            -- Check if user is an admin or service role
            (auth.uid() IN (SELECT user_id FROM public.admins WHERE is_active = true)) OR
            auth.role() = 'service_role'
        );
    END IF;
END
$$;

-- api_cache policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_cache') THEN
        DROP POLICY IF EXISTS "Anyone can read api cache" ON public.api_cache;
        CREATE POLICY "Anyone can read api cache" 
        ON public.api_cache FOR SELECT 
        TO authenticated 
        USING (true);
        
        DROP POLICY IF EXISTS "Only admins can modify api cache" ON public.api_cache;
        CREATE POLICY "Only admins can modify api cache" 
        ON public.api_cache USING (
            -- Check if user is an admin or service role
            (auth.uid() IN (SELECT user_id FROM public.admins WHERE is_active = true)) OR
            auth.role() = 'service_role'
        );
    END IF;
END
$$;

-- Create trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at column
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        IF EXISTS (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = t 
              AND column_name = 'updated_at'
        ) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
            EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
        END IF;
    END LOOP;
END
$$; 