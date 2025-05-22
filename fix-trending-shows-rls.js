// Fix trending_shows_cache RLS using the Supabase REST API
// This script directly applies RLS policies to fix 401 Unauthorized errors
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gruqanluymjblstdjgad.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing Supabase URL or service role key in environment variables.');
  console.error('Please make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.');
  process.exit(1);
}

// SQL query to fix trending_shows_cache RLS
const sql = `
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

-- Return the list of policies to verify they were created
SELECT
    schemaname as schema,
    tablename as table,
    policyname as policy,
    permissive,
    roles
FROM
    pg_policies
WHERE
    tablename = 'trending_shows_cache';
`;

async function applyRLSFix() {
  console.log('Applying RLS fix to trending_shows_cache table...');

  try {
    // Use the REST API to execute SQL directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'params=single-object'
      },
      body: JSON.stringify({
        sql: sql
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: API request failed with status ${response.status}`);
      console.error('Error details:', errorText);
      process.exit(1);
    }

    const result = await response.json();
    console.log('Successfully applied RLS policies to trending_shows_cache table!');
    console.log('Policies created:');
    console.log(JSON.stringify(result, null, 2));
    
    // Write success to a log file
    const timestamp = new Date().toISOString();
    fs.appendFileSync(
      path.join(process.cwd(), 'rls-fix-log.txt'), 
      `${timestamp}: Successfully applied RLS fix to trending_shows_cache\n`
    );
    
    console.log('The trending shows should now be accessible to all users.');
  } catch (error) {
    console.error('Error applying RLS fix:', error.message);
    process.exit(1);
  }
}

// Execute the fix
applyRLSFix();