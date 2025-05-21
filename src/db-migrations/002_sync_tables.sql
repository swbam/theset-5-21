-- Create sync-related tables for the application

-- Table: api_cache
CREATE TABLE IF NOT EXISTS public.api_cache (
    cache_key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.api_cache IS 'Cached API responses to reduce external API calls';

-- Table: sync_states
CREATE TABLE IF NOT EXISTS public.sync_states (
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    last_synced TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sync_version INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (entity_id, entity_type)
);
COMMENT ON TABLE public.sync_states IS 'Tracks sync status of entities';

-- Index for quick lookup by entity type
CREATE INDEX IF NOT EXISTS sync_states_entity_type_idx ON public.sync_states (entity_type);
CREATE INDEX IF NOT EXISTS sync_states_last_synced_idx ON public.sync_states (last_synced);

-- Table: sync_queue
CREATE TABLE IF NOT EXISTS public.sync_queue (
    id SERIAL PRIMARY KEY,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    operation TEXT NOT NULL, -- e.g. 'create', 'refresh', 'cascade_sync'
    priority TEXT NOT NULL DEFAULT 'medium', -- 'high', 'medium', 'low'
    attempts INTEGER NOT NULL DEFAULT 0,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.sync_queue IS 'Queue for asynchronous entity sync operations';

-- Indexes for the sync queue
CREATE INDEX IF NOT EXISTS sync_queue_entity_idx ON public.sync_queue (entity_id, entity_type);
CREATE INDEX IF NOT EXISTS sync_queue_priority_idx ON public.sync_queue (priority, created_at);

-- Enable RLS for these tables
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for the sync tables
CREATE POLICY "Allow read access to api_cache for authenticated users" 
ON public.api_cache FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow insert/update to api_cache for authenticated users" 
ON public.api_cache FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow read access to sync_states for authenticated users" 
ON public.sync_states FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow insert/update to sync_states for authenticated users" 
ON public.sync_states FOR ALL
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow read access to sync_queue for authenticated users" 
ON public.sync_queue FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow operations on sync_queue for authenticated users" 
ON public.sync_queue FOR ALL
TO authenticated 
USING (true)
WITH CHECK (true);

-- Add update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns on existing tables
DO
$$
BEGIN
    -- Artists table updated_at trigger
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'artists') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'artists_updated_at_trigger') THEN
            CREATE TRIGGER artists_updated_at_trigger
            BEFORE UPDATE ON public.artists
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
        END IF;
    END IF;

    -- Shows table updated_at trigger
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shows') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'shows_updated_at_trigger') THEN
            CREATE TRIGGER shows_updated_at_trigger
            BEFORE UPDATE ON public.shows
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
        END IF;
    END IF;

    -- Venues table updated_at trigger
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'venues') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'venues_updated_at_trigger') THEN
            CREATE TRIGGER venues_updated_at_trigger
            BEFORE UPDATE ON public.venues
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at();
        END IF;
    END IF;
END
$$; 