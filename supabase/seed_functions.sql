-- Create function to seed artists with admin privileges
CREATE OR REPLACE FUNCTION public.seed_artists(artist_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run with the privileges of the function owner
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Create artists with provided data - uuid is auto-generated
    WITH inserted_artists AS (
      INSERT INTO public.artists (
        name, 
        image_url, 
        spotify_id, 
        followers, 
        popularity, 
        genres
      )
      SELECT 
        a->>'name', 
        a->>'image_url', 
        a->>'spotify_id', 
        (a->>'followers')::integer, 
        (a->>'popularity')::integer, 
        a->'genres'
      FROM jsonb_array_elements(artist_data) AS a
      RETURNING id, name
    )
    SELECT json_agg(inserted_artists) INTO result FROM inserted_artists;
    
    RETURN result;
END;
$$;

-- Create function to seed shows with admin privileges
CREATE OR REPLACE FUNCTION public.seed_shows(shows_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Create shows with provided data
    WITH inserted_shows AS (
      INSERT INTO public.shows (
        artist_id,
        date,
        venue,
        city,
        ticket_url
      )
      SELECT 
        s->>'artist_id', 
        (s->>'date')::timestamp, 
        s->>'venue', 
        s->>'city',
        s->>'ticket_url'
      FROM jsonb_array_elements(shows_data) AS s
      RETURNING id, artist_id, venue
    )
    SELECT json_agg(inserted_shows) INTO result FROM inserted_shows;
    
    RETURN result;
END;
$$;

-- Create function to seed setlists with admin privileges
CREATE OR REPLACE FUNCTION public.seed_setlists(setlists_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Create setlists with provided data
    WITH inserted_setlists AS (
      INSERT INTO public.setlists (
        artist_id,
        date,
        venue,
        venue_city,
        tour_name,
        setlist_fm_id
      )
      SELECT 
        s->>'artist_id', 
        (s->>'date')::timestamp, 
        s->>'venue', 
        s->>'venue_city',
        s->>'tour_name',
        s->>'setlist_fm_id'
      FROM jsonb_array_elements(setlists_data) AS s
      RETURNING id, artist_id, venue
    )
    SELECT json_agg(inserted_setlists) INTO result FROM inserted_setlists;
    
    RETURN result;
END;
$$;

-- Create function to seed setlist songs with admin privileges
CREATE OR REPLACE FUNCTION public.seed_setlist_songs(songs_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Create setlist songs with provided data
    WITH inserted_songs AS (
      INSERT INTO public.setlist_songs (
        setlist_id,
        name,
        position,
        artist_id,
        votes
      )
      SELECT 
        s->>'setlist_id', 
        s->>'name', 
        (s->>'position')::integer, 
        s->>'artist_id',
        (s->>'vote_count')::integer
      FROM jsonb_array_elements(songs_data) AS s
      RETURNING id, setlist_id, name
    )
    SELECT json_agg(inserted_songs) INTO result FROM inserted_songs;
    
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.seed_artists(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_shows(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_setlists(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_setlist_songs(JSONB) TO authenticated;
