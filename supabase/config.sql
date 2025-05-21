-- Configure RLS policies for proper data access and security

-- Try enabling Row Level Security on core tables (with error handling)
DO $$
BEGIN
  -- Artists table
  BEGIN
    ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on artists table';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table artists does not exist, skipping';
  END;

  -- Shows table
  BEGIN
    ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on shows table';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table shows does not exist, skipping';
  END;

  -- Venues table
  BEGIN
    ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on venues table';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table venues does not exist, skipping';
  END;

  -- Setlists table
  BEGIN
    ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on setlists table';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table setlists does not exist, skipping';
  END;

  -- Songs table
  BEGIN
    ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on songs table';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table songs does not exist, skipping';
  END;

  -- Setlist_songs table
  BEGIN
    ALTER TABLE setlist_songs ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on setlist_songs table';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table setlist_songs does not exist, skipping';
  END;

  -- Votes table
  BEGIN
    ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on votes table';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table votes does not exist, skipping';
  END;
END
$$;

-- Apply read-only policies with error handling
DO $$
BEGIN
  -- Artists: Anyone can read
  BEGIN
    CREATE POLICY "Artists are readable by anyone" 
    ON artists FOR SELECT 
    TO anon, authenticated 
    USING (true);
    RAISE NOTICE 'Created read policy for artists table';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table artists does not exist, skipping policy';
  WHEN duplicate_object THEN
    RAISE NOTICE 'Policy for artists already exists, skipping';
  END;

  -- Shows: Anyone can read
  BEGIN
    CREATE POLICY "Shows are readable by anyone" 
    ON shows FOR SELECT 
    TO anon, authenticated 
    USING (true);
    RAISE NOTICE 'Created read policy for shows table';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table shows does not exist, skipping policy';
  WHEN duplicate_object THEN
    RAISE NOTICE 'Policy for shows already exists, skipping';
  END;

  -- Venues: Anyone can read
  BEGIN
    CREATE POLICY "Venues are readable by anyone" 
    ON venues FOR SELECT 
    TO anon, authenticated 
    USING (true);
    RAISE NOTICE 'Created read policy for venues table';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table venues does not exist, skipping policy';
  WHEN duplicate_object THEN
    RAISE NOTICE 'Policy for venues already exists, skipping';
  END;

  -- Setlists: Anyone can read
  BEGIN
    CREATE POLICY "Setlists are readable by anyone" 
    ON setlists FOR SELECT 
    TO anon, authenticated 
    USING (true);
    RAISE NOTICE 'Created read policy for setlists table';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table setlists does not exist, skipping policy';
  WHEN duplicate_object THEN
    RAISE NOTICE 'Policy for setlists already exists, skipping';
  END;

  -- Songs: Anyone can read
  BEGIN
    CREATE POLICY "Songs are readable by anyone" 
    ON songs FOR SELECT 
    TO anon, authenticated 
    USING (true);
    RAISE NOTICE 'Created read policy for songs table';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table songs does not exist, skipping policy';
  WHEN duplicate_object THEN
    RAISE NOTICE 'Policy for songs already exists, skipping';
  END;

  -- Setlist Songs: Anyone can read
  BEGIN
    CREATE POLICY "Setlist songs are readable by anyone" 
    ON setlist_songs FOR SELECT 
    TO anon, authenticated 
    USING (true);
    RAISE NOTICE 'Created read policy for setlist_songs table';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table setlist_songs does not exist, skipping policy';
  WHEN duplicate_object THEN
    RAISE NOTICE 'Policy for setlist_songs already exists, skipping';
  END;
END
$$;

-- Add helpful functions
DO $$
BEGIN
  -- Create voting aggregation function
  CREATE OR REPLACE FUNCTION get_setlist_song_votes(setlist_id TEXT)
  RETURNS TABLE (song_id TEXT, total_votes BIGINT) AS $$
  BEGIN
    RETURN QUERY
    SELECT ss.song_id::TEXT, COALESCE(SUM(v.count), 0) as total_votes
    FROM setlist_songs ss
    LEFT JOIN votes v ON ss.song_id = v.song_id
    WHERE ss.setlist_id = get_setlist_song_votes.setlist_id
    GROUP BY ss.song_id;
  EXCEPTION 
    WHEN undefined_table THEN
      RAISE NOTICE 'Required tables for get_setlist_song_votes function do not exist';
      RETURN;
  END;
  $$ LANGUAGE plpgsql;
END
$$; 