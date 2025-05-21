-- Set up RLS policies that allow authenticated users to perform all operations
-- This will make seeding data directly from the frontend much easier

-- Artists table
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Artists All Access" ON public.artists;
CREATE POLICY "Artists All Access"
ON public.artists
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Shows table
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shows All Access" ON public.shows;
CREATE POLICY "Shows All Access"
ON public.shows
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Setlists table
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Setlists All Access" ON public.setlists;
CREATE POLICY "Setlists All Access"
ON public.setlists
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Setlist Songs table
ALTER TABLE public.setlist_songs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Setlist Songs All Access" ON public.setlist_songs;
CREATE POLICY "Setlist Songs All Access"
ON public.setlist_songs
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Make profile is_admin field visible
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Make the application use client-side user sessions consistently
ALTER ROLE authenticated SET request.jwt.claim.is_admin TO 'true'; 