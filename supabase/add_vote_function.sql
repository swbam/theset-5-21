-- Create SQL function for atomic voting

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to add a vote to a song and handle atomicity
CREATE OR REPLACE FUNCTION add_song_vote(p_song_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  vote_exists BOOLEAN;
  setlist_id UUID;
BEGIN
  -- Check if vote already exists
  SELECT EXISTS(
    SELECT 1 FROM user_votes 
    WHERE setlist_song_id = p_song_id AND user_id = p_user_id
  ) INTO vote_exists;
  
  -- If vote doesn't exist, add it and increment count
  IF NOT vote_exists THEN
    -- Get the setlist_id for this song (for realtime broadcast)
    SELECT setlist_id INTO setlist_id FROM setlist_songs WHERE id = p_song_id;
    
    -- Insert the vote in a transaction
    BEGIN
      -- Insert the vote record
      INSERT INTO user_votes (id, user_id, setlist_song_id, created_at)
      VALUES (uuid_generate_v4(), p_user_id, p_song_id, NOW());
      
      -- Increment vote count
      UPDATE setlist_songs
      SET 
        votes = votes + 1,
        updated_at = NOW()
      WHERE id = p_song_id;
      
      RETURN TRUE;
    EXCEPTION WHEN OTHERS THEN
      -- Log error and roll back transaction
      RAISE NOTICE 'Error adding vote: %', SQLERRM;
      RETURN FALSE;
    END;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Function to get a complete setlist with user vote status
CREATE OR REPLACE FUNCTION get_setlist_with_votes(p_setlist_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  title TEXT,
  spotify_id TEXT,
  duration_ms INTEGER,
  preview_url TEXT,
  album_name TEXT,
  album_image_url TEXT,
  votes INTEGER,
  has_voted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.id,
    ss.title,
    ss.spotify_id,
    ss.duration_ms,
    ss.preview_url,
    ss.album_name,
    ss.album_image_url,
    ss.votes,
    CASE
      WHEN p_user_id IS NULL THEN FALSE
      ELSE EXISTS(
        SELECT 1 FROM user_votes 
        WHERE user_id = p_user_id AND setlist_song_id = ss.id
      )
    END as has_voted
  FROM
    setlist_songs ss
  WHERE
    ss.setlist_id = p_setlist_id
  ORDER BY
    ss.votes DESC;
END;
$$;

-- Function to create all voting procedures
CREATE OR REPLACE FUNCTION create_vote_procedures()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function exists to be called once on app initialization
  -- No need for additional logic since the functions are created above
  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_song_vote TO authenticated;
GRANT EXECUTE ON FUNCTION get_setlist_with_votes TO authenticated;
GRANT EXECUTE ON FUNCTION get_setlist_with_votes TO anon;
GRANT EXECUTE ON FUNCTION create_vote_procedures TO authenticated; 