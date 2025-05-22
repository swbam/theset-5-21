// This script applies RLS fixes to the trending_shows_cache table
// Usage: node apply_trending_shows_fix.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gruqanluymjblstdjgad.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('ERROR: SUPABASE_SERVICE_KEY environment variable is required.');
  console.error('This must be the service role key, not the anon key.');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRLSFixes() {
  console.log('Applying RLS fixes to trending_shows_cache table...');

  try {
    // Execute the SQL query to fix RLS
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        -- Enable Row Level Security on trending_shows_cache table
        ALTER TABLE public.trending_shows_cache ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist to avoid conflicts
        DROP POLICY IF EXISTS "Public Read Access for trending_shows_cache" ON public.trending_shows_cache;
        DROP POLICY IF EXISTS "Authenticated Insert Access for trending_shows_cache" ON public.trending_shows_cache;
        DROP POLICY IF EXISTS "Service Role Full Access for trending_shows_cache" ON public.trending_shows_cache;
        
        -- Create a policy to allow public read access (both anonymous and authenticated users)
        CREATE POLICY "Public Read Access for trending_shows_cache"
        ON public.trending_shows_cache
        FOR SELECT
        TO public
        USING (true);
        
        -- Create a policy to allow only authenticated users to insert
        CREATE POLICY "Authenticated Insert Access for trending_shows_cache"
        ON public.trending_shows_cache
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
        
        -- Create a policy to allow only service role to update or delete
        CREATE POLICY "Service Role Full Access for trending_shows_cache"
        ON public.trending_shows_cache
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
        
        -- Grant necessary permissions
        GRANT SELECT ON public.trending_shows_cache TO anon;
        GRANT SELECT ON public.trending_shows_cache TO authenticated;
        GRANT ALL ON public.trending_shows_cache TO service_role;
      `
    });

    if (error) {
      console.error('Error applying RLS fixes:', error.message);
      process.exit(1);
    }

    console.log('Successfully applied RLS fixes to trending_shows_cache table!');
    console.log('The trending shows should now be accessible to all users.');

    // Verify that the policies were created
    const { data, error: verifyError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          schemaname,
          tablename,
          policyname,
          roles
        FROM
          pg_policies
        WHERE
          tablename = 'trending_shows_cache';
      `
    });

    if (verifyError) {
      console.error('Error verifying policies:', verifyError.message);
    } else {
      console.log('Policies created:');
      console.log(data);
    }

  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  }
}

applyRLSFixes();