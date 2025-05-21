-- Fix the enqueue_sync function
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
  -- First try to update an existing job (using index-enforced uniqueness)
  UPDATE sync_jobs
  SET 
    priority = LEAST(priority, $4),
    reference_data = COALESCE($3, reference_data),
    updated_at = now()
  WHERE entity_type = $1 
    AND entity_id = $2 
    AND status IN ('pending', 'retrying')
  RETURNING id INTO job_id;
    
  -- If no existing job was updated, insert a new one
  IF job_id IS NULL THEN
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
      $1,
      $2,
      $3,
      $4,
      $5,
      'pending',
      now(),
      now()
    )
    RETURNING id INTO job_id;
  END IF;
    
  RETURN job_id;
EXCEPTION
  WHEN unique_violation THEN
    -- In case of race condition, try again with update
    UPDATE sync_jobs
    SET 
      priority = LEAST(priority, $4),
      reference_data = COALESCE($3, reference_data),
      updated_at = now()
    WHERE entity_type = $1 
      AND entity_id = $2 
      AND status IN ('pending', 'retrying')
    RETURNING id INTO job_id;
    
    RETURN job_id;
END;
$$ LANGUAGE plpgsql;