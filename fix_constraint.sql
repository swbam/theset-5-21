-- Fix for the constraint error
DO $$
BEGIN
  -- First check if the constraint already exists to avoid errors
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_pending_entity'
  ) THEN
    -- For PostgreSQL 9.6 and later, we can use a partial index instead
    CREATE UNIQUE INDEX unique_pending_entity 
    ON public.sync_jobs (entity_type, entity_id) 
    WHERE status IN ('pending', 'retrying');
  END IF;
END $$;

-- Ensure the constraint-equivalent unique index exists
DROP INDEX IF EXISTS idx_sync_jobs_unique_pending_entity;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_jobs_unique_pending_entity
ON public.sync_jobs (entity_type, entity_id)
WHERE status IN ('pending', 'retrying');