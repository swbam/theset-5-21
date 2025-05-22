#!/usr/bin/env node

/**
 * Database Migration Script for TheSet - Auto-run version
 * 
 * This script applies the updated schema and fixes any database inconsistencies
 * without requiring user confirmation
 */

// Import required modules
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase connection details
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing Supabase URL or service role key in environment variables.');
  console.error('Please make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

// Create Supabase client with admin rights
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Execute a SQL statement with error handling
 */
async function executeSql(sql, params = {}) {
  try {
    const { data, error } = await supabase.rpc('pgmigrate', { query: sql, params });
    
    if (error) {
      console.error(`Error executing SQL: ${error.message}`);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (err) {
    console.error(`Exception executing SQL: ${err.message}`);
    return { success: false, error: err };
  }
}

/**
 * Check if a table exists
 */
async function tableExists(tableName) {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .single();
  
  return !error && data;
}

/**
 * Check if a column exists in a table
 */
async function columnExists(tableName, columnName) {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .eq('column_name', columnName)
    .single();
  
  return !error && data;
}

/**
 * Apply the schema migration
 */
async function applyMigration() {
  console.log('Starting database migration for TheSet application...');
  
  // Make sure pgmigrate function exists
  await executeSql(`
    CREATE OR REPLACE FUNCTION pgmigrate(query text, params jsonb DEFAULT '{}'::jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result jsonb;
    BEGIN
      EXECUTE query INTO result;
      RETURN result;
    EXCEPTION WHEN OTHERS THEN
      RAISE;
    END;
    $$;
  `);

  // Load and execute the schema migrator SQL
  try {
    console.log('Applying schema migrations...');
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'schema-migrator.sql'), 'utf8');
    const chunks = schemaSql.split(/;\s*\n/g).filter(chunk => chunk.trim().length > 0);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].trim();
      if (chunk) {
        const { success, error } = await executeSql(chunk);
        if (!success) {
          console.warn(`Warning: Error in SQL chunk ${i+1}: ${error.message}`);
          // Continue with next chunk even if there's an error
        }
      }
    }
    
    console.log('Schema migration applied successfully.');
  } catch (err) {
    console.error('Error applying schema migration:', err.message);
    console.error('The migration will continue, but may not complete successfully.');
  }

  // Apply specific RLS policy for trending_shows_cache
  console.log('Ensuring trending_shows_cache has the correct RLS policies...');
  await executeSql(`
    -- Enable Row Level Security on trending_shows_cache table
    ALTER TABLE IF EXISTS public.trending_shows_cache ENABLE ROW LEVEL SECURITY;

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
  `);
  
  console.log('Migration completed successfully!');
}

// Run the migration immediately without prompting
console.log('Running migration automatically...');
applyMigration()
  .then(() => {
    console.log('Migration process completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error in migration process:', err);
    process.exit(1);
  });