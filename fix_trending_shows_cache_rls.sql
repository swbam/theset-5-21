-- Fix trending_shows_cache RLS policies
-- IMPORTANT: Run this in the Supabase Dashboard SQL Editor to fix 401 Unauthorized errors
-- This script enables Row Level Security on trending_shows_cache table
-- and creates policies to allow public read access while restricting write operations

-- Step 1: Enable Row Level Security on trending_shows_cache table
ALTER TABLE public.trending_shows_cache ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public Read Access for trending_shows_cache" ON public.trending_shows_cache;
DROP POLICY IF EXISTS "Authenticated Insert Access for trending_shows_cache" ON public.trending_shows_cache;
DROP POLICY IF EXISTS "Service Role Full Access for trending_shows_cache" ON public.trending_shows_cache;

-- Step 3: Create policy to allow PUBLIC read access (this is the key fix for 401 errors)
-- This allows both anonymous and authenticated users to read from this table
CREATE POLICY "Public Read Access for trending_shows_cache"
ON public.trending_shows_cache
FOR SELECT
TO public
USING (true);

-- Step 4: Create a policy to allow only authenticated users to insert
CREATE POLICY "Authenticated Insert Access for trending_shows_cache"
ON public.trending_shows_cache
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Step 5: Create a policy to allow only service role to update or delete
CREATE POLICY "Service Role Full Access for trending_shows_cache"
ON public.trending_shows_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 6: Grant necessary permissions
GRANT SELECT ON public.trending_shows_cache TO anon;
GRANT SELECT ON public.trending_shows_cache TO authenticated;
GRANT ALL ON public.trending_shows_cache TO service_role;

-- Step 7: Validate changes by showing the policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    tablename = 'trending_shows_cache';