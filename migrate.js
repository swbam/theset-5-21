#!/usr/bin/env node

/**
 * Database Migration Script for TheSet
 * 
 * This script applies the updated schema and fixes any database inconsistencies
 * to ensure the application works correctly with the Ticketmaster and Spotify APIs.
 */

// Import required modules
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
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

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Promisified version of readline question
 */
function question(query) {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer);
    });
  });
}

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
      RETURN jsonb_build_object('error', SQLERRM, 'context', SQLSTATE);
    END;
    $$;
  `);
  
  // Enable required extensions
  console.log('Enabling required extensions...');
  await executeSql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  await executeSql('CREATE EXTENSION IF NOT EXISTS "pg_trgm";');

  // Step 1: Fix column naming inconsistencies
  console.log('Fixing column naming inconsistencies...');
  
  // Check artists table
  if (await tableExists('artists')) {
    // Fix external_id to ticketmaster_id
    if (await columnExists('artists', 'external_id') && !(await columnExists('artists', 'ticketmaster_id'))) {
      console.log('Renaming artists.external_id to ticketmaster_id...');
      await executeSql('ALTER TABLE public.artists RENAME COLUMN external_id TO ticketmaster_id;');
    } else if (!(await columnExists('artists', 'ticketmaster_id'))) {
      console.log('Adding ticketmaster_id to artists table...');
      await executeSql('ALTER TABLE public.artists ADD COLUMN ticketmaster_id TEXT UNIQUE;');
    }
    
    // Add setlist_fm_mbid if it doesn't exist
    if (!(await columnExists('artists', 'setlist_fm_mbid'))) {
      console.log('Adding setlist_fm_mbid to artists table...');
      await executeSql('ALTER TABLE public.artists ADD COLUMN setlist_fm_mbid TEXT UNIQUE;');
    }
    
    // Add last_synced_at if it doesn't exist
    if (!(await columnExists('artists', 'last_synced_at'))) {
      console.log('Adding last_synced_at to artists table...');
      await executeSql('ALTER TABLE public.artists ADD COLUMN last_synced_at TIMESTAMPTZ;');
    }
  }
  
  // Check venues table
  if (await tableExists('venues')) {
    // Fix external_id to ticketmaster_id
    if (await columnExists('venues', 'external_id') && !(await columnExists('venues', 'ticketmaster_id'))) {
      console.log('Renaming venues.external_id to ticketmaster_id...');
      await executeSql('ALTER TABLE public.venues RENAME COLUMN external_id TO ticketmaster_id;');
    } else if (!(await columnExists('venues', 'ticketmaster_id'))) {
      console.log('Adding ticketmaster_id to venues table...');
      await executeSql('ALTER TABLE public.venues ADD COLUMN ticketmaster_id TEXT UNIQUE;');
    }
    
    // Add last_synced_at if it doesn't exist
    if (!(await columnExists('venues', 'last_synced_at'))) {
      console.log('Adding last_synced_at to venues table...');
      await executeSql('ALTER TABLE public.venues ADD COLUMN last_synced_at TIMESTAMPTZ;');
    }
  }
  
  // Check shows table
  if (await tableExists('shows')) {
    // Fix external_id to ticketmaster_id
    if (await columnExists('shows', 'external_id') && !(await columnExists('shows', 'ticketmaster_id'))) {
      console.log('Renaming shows.external_id to ticketmaster_id...');
      await executeSql('ALTER TABLE public.shows RENAME COLUMN external_id TO ticketmaster_id;');
    } else if (!(await columnExists('shows', 'ticketmaster_id'))) {
      console.log('Adding ticketmaster_id to shows table...');
      await executeSql('ALTER TABLE public.shows ADD COLUMN ticketmaster_id TEXT UNIQUE;');
    }
    
    // Add setlist_fm_id if it doesn't exist
    if (!(await columnExists('shows', 'setlist_fm_id'))) {
      console.log('Adding setlist_fm_id to shows table...');
      await executeSql('ALTER TABLE public.shows ADD COLUMN setlist_fm_id TEXT UNIQUE;');
    }
    
    // Add last_synced_at if it doesn't exist
    if (!(await columnExists('shows', 'last_synced_at'))) {
      console.log('Adding last_synced_at to shows table...');
      await executeSql('ALTER TABLE public.shows ADD COLUMN last_synced_at TIMESTAMPTZ;');
    }
  }
  
  // Check songs table
  if (await tableExists('songs')) {
    // Add album_name if it doesn't exist
    if (!(await columnExists('songs', 'album_name'))) {
      console.log('Adding album_name to songs table...');
      await executeSql('ALTER TABLE public.songs ADD COLUMN album_name TEXT;');
    }
    
    // Add album_image_url if it doesn't exist
    if (!(await columnExists('songs', 'album_image_url'))) {
      console.log('Adding album_image_url to songs table...');
      await executeSql('ALTER TABLE public.songs ADD COLUMN album_image_url TEXT;');
    }
    
    // Add spotify_url if it doesn't exist
    if (!(await columnExists('songs', 'spotify_url'))) {
      console.log('Adding spotify_url to songs table...');
      await executeSql('ALTER TABLE public.songs ADD COLUMN spotify_url TEXT;');
    }
    
    // Add last_synced_at if it doesn't exist
    if (!(await columnExists('songs', 'last_synced_at'))) {
      console.log('Adding last_synced_at to songs table...');
      await executeSql('ALTER TABLE public.songs ADD COLUMN last_synced_at TIMESTAMPTZ;');
    }
  }
  
  // Step 2: Create missing tables
  console.log('Creating missing tables...');
  
  // Create setlists table if it doesn't exist
  if (!(await tableExists('setlists'))) {
    console.log('Creating setlists table...');
    await executeSql(`
      CREATE TABLE public.setlists (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        show_id UUID NOT NULL REFERENCES public.shows(id),
        title TEXT,
        is_custom BOOLEAN DEFAULT FALSE,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(show_id)
      );
    `);
  }
  
  // Create setlist_songs table if it doesn't exist
  if (!(await tableExists('setlist_songs'))) {
    console.log('Creating setlist_songs table...');
    await executeSql(`
      CREATE TABLE public.setlist_songs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        setlist_id UUID NOT NULL REFERENCES public.setlists(id),
        song_id UUID NOT NULL REFERENCES public.songs(id),
        position INTEGER NOT NULL,
        vote_count INTEGER DEFAULT 0,
        is_encore BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(setlist_id, song_id),
        UNIQUE(setlist_id, position)
      );
    `);
  }
  
  // Create votes table if it doesn't exist
  if (!(await tableExists('votes'))) {
    console.log('Creating votes table...');
    await executeSql(`
      CREATE TABLE public.votes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        setlist_song_id UUID REFERENCES public.setlist_songs(id),
        user_id UUID,
        session_key TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(setlist_song_id, session_key)
      );
    `);
  }
  
  // Create played_setlists table if it doesn't exist
  if (!(await tableExists('played_setlists'))) {
    console.log('Creating played_setlists table...');
    await executeSql(`
      CREATE TABLE public.played_setlists (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        show_id UUID NOT NULL REFERENCES public.shows(id),
        setlist_fm_id TEXT UNIQUE,
        source_url TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(show_id)
      );
    `);
  }
  
  // Create played_setlist_songs table if it doesn't exist
  if (!(await tableExists('played_setlist_songs'))) {
    console.log('Creating played_setlist_songs table...');
    await executeSql(`
      CREATE TABLE public.played_setlist_songs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        played_setlist_id UUID NOT NULL REFERENCES public.played_setlists(id),
        song_id UUID REFERENCES public.songs(id),
        song_name_override TEXT,
        position INTEGER NOT NULL,
        is_encore BOOLEAN DEFAULT false,
        info TEXT,
        is_tape BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(played_setlist_id, position)
      );
    `);
  }
  
  // Create sync_jobs table if it doesn't exist
  if (!(await tableExists('sync_jobs'))) {
    console.log('Creating sync_jobs table...');
    await executeSql(`
      CREATE TABLE public.sync_jobs (
        id BIGSERIAL PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        reference_data JSONB,
        status TEXT NOT NULL DEFAULT 'pending',
        priority INTEGER DEFAULT 3,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        last_attempted_at TIMESTAMPTZ,
        last_error JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        processed_at TIMESTAMPTZ
      );
    `);
  }
  
  // Create api_cache table if it doesn't exist
  if (!(await tableExists('api_cache'))) {
    console.log('Creating api_cache table...');
    await executeSql(`
      CREATE TABLE public.api_cache (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cache_key TEXT NOT NULL UNIQUE,
        data JSONB NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
  }
  
  // Create error_logs table if it doesn't exist
  if (!(await tableExists('error_logs'))) {
    console.log('Creating error_logs table...');
    await executeSql(`
      CREATE TABLE public.error_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        entity_type TEXT,
        entity_id TEXT,
        function_name TEXT,
        error TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
  }
  
  // Create trending_shows_cache table if it doesn't exist
  if (!(await tableExists('trending_shows_cache'))) {
    console.log('Creating trending_shows_cache table...');
    await executeSql(`
      CREATE TABLE public.trending_shows_cache (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        show_id UUID REFERENCES public.shows(id),
        show_name TEXT,
        show_date TIMESTAMPTZ,
        artist_id UUID,
        artist_name TEXT,
        artist_image_url TEXT,
        venue_name TEXT,
        venue_city TEXT,
        venue_state TEXT,
        total_votes INTEGER,
        cached_at TIMESTAMPTZ DEFAULT now()
      );
    `);
  }
  
  // Create profiles table if it doesn't exist
  if (!(await tableExists('profiles'))) {
    console.log('Creating profiles table...');
    await executeSql(`
      CREATE TABLE public.profiles (
        id UUID PRIMARY KEY,
        username TEXT UNIQUE,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
  }
  
  // Create artist_follows table if it doesn't exist
  if (!(await tableExists('artist_follows'))) {
    console.log('Creating artist_follows table...');
    await executeSql(`
      CREATE TABLE public.artist_follows (
        user_id UUID NOT NULL,
        artist_id UUID NOT NULL REFERENCES public.artists(id),
        created_at TIMESTAMPTZ DEFAULT now(),
        PRIMARY KEY (user_id, artist_id)
      );
    `);
  }
  
  // Step 3: Create functions
  console.log('Creating functions...');
  
  // Create update_updated_at function
  await executeSql(`
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  // Create record_vote function
  await executeSql(`
    CREATE OR REPLACE FUNCTION record_vote(p_setlist_song_id UUID, p_user_id UUID, p_session_key TEXT)
    RETURNS BOOLEAN AS $$
    DECLARE
      v_success BOOLEAN := FALSE;
    BEGIN
      -- Insert the vote
      INSERT INTO votes (setlist_song_id, user_id, session_key)
      VALUES (p_setlist_song_id, p_user_id, p_session_key)
      ON CONFLICT (setlist_song_id, session_key) DO NOTHING;
      
      -- If the vote was successfully recorded
      IF FOUND THEN
        -- Update the vote count on the setlist_song
        UPDATE setlist_songs
        SET vote_count = vote_count + 1
        WHERE id = p_setlist_song_id;
        
        v_success := TRUE;
      END IF;
      
      RETURN v_success;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  // Create claim_next_sync_item function
  await executeSql(`
    CREATE OR REPLACE FUNCTION claim_next_sync_item()
    RETURNS SETOF sync_jobs AS $$
    DECLARE
      next_item sync_jobs;
    BEGIN
      -- Select and lock the next item based on priority and age
      SELECT * INTO next_item
      FROM sync_jobs
      WHERE status = 'pending' 
        OR (status = 'retrying' AND 
           (last_attempted_at IS NULL OR last_attempted_at < now() - INTERVAL '5 minutes' * attempts))
      ORDER BY 
        priority ASC, -- Lower number = higher priority
        attempts ASC, -- Fewest attempts first
        created_at ASC -- Oldest first
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
      
      -- Update status if item found
      IF FOUND THEN
        UPDATE sync_jobs
        SET 
          status = 'processing',
          attempts = attempts + 1,
          last_attempted_at = now(),
          updated_at = now()
        WHERE id = next_item.id;
        
        RETURN NEXT next_item;
      END IF;
      
      RETURN;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  // Create complete_sync_item function
  await executeSql(`
    CREATE OR REPLACE FUNCTION complete_sync_item(item_id BIGINT)
    RETURNS BOOLEAN AS $$
    BEGIN
      UPDATE sync_jobs
      SET 
        status = 'completed',
        processed_at = now(),
        updated_at = now()
      WHERE id = item_id;
      
      RETURN FOUND;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  // Create fail_sync_item function
  await executeSql(`
    CREATE OR REPLACE FUNCTION fail_sync_item(item_id BIGINT, error_message TEXT)
    RETURNS BOOLEAN AS $$
    DECLARE
      v_attempts INT;
      v_max_attempts INT;
    BEGIN
      -- Get current attempts for this job
      SELECT attempts, max_attempts INTO v_attempts, v_max_attempts
      FROM sync_jobs
      WHERE id = item_id;
      
      -- Determine if we should retry or mark as permanently failed
      IF v_attempts >= v_max_attempts THEN
        UPDATE sync_jobs
        SET 
          status = 'failed',
          last_error = jsonb_build_object('message', error_message, 'timestamp', now()),
          updated_at = now()
        WHERE id = item_id;
      ELSE
        UPDATE sync_jobs
        SET 
          status = 'retrying',
          last_error = jsonb_build_object('message', error_message, 'timestamp', now()),
          updated_at = now()
        WHERE id = item_id;
      END IF;
      
      RETURN FOUND;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  // Create enqueue_sync function
  await executeSql(`
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
      -- First check if there's already a pending or retrying job
      SELECT id INTO job_id
      FROM sync_jobs
      WHERE entity_type = $1
        AND entity_id = $2
        AND status IN ('pending', 'retrying');
      
      IF FOUND THEN
        -- Update existing job
        UPDATE sync_jobs
        SET
          priority = LEAST(priority, $4),
          reference_data = COALESCE($3, reference_data),
          updated_at = now()
        WHERE id = job_id;
        
        RETURN job_id;
      END IF;
      
      -- Insert new job
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
      
      RETURN job_id;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  // Step 4: Create triggers for updated_at
  console.log('Creating triggers...');
  
  // Get all tables
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .neq('table_name', 'spatial_ref_sys');
  
  // Create triggers for each table
  for (const table of tables) {
    const tableName = table.table_name;
    
    // Check if the table has updated_at column
    const hasUpdatedAt = await columnExists(tableName, 'updated_at');
    
    if (hasUpdatedAt) {
      console.log(`Creating updated_at trigger for ${tableName}...`);
      await executeSql(`
        DO $$ 
        BEGIN
          CREATE TRIGGER update_${tableName}_updated_at
            BEFORE UPDATE ON ${tableName}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    }
  }
  
  // Step 5: Create indexes
  console.log('Creating indexes...');
  
  // Artists indexes
  await executeSql('CREATE INDEX IF NOT EXISTS idx_artists_name ON artists USING gin (name gin_trgm_ops);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_artists_ticketmaster_id ON artists(ticketmaster_id);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_artists_spotify_id ON artists(spotify_id);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_artists_setlist_fm_mbid ON artists(setlist_fm_mbid);');
  
  // Venues indexes
  await executeSql('CREATE INDEX IF NOT EXISTS idx_venues_name ON venues USING gin (name gin_trgm_ops);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_venues_ticketmaster_id ON venues(ticketmaster_id);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_venues_city_state ON venues(city, state);');
  
  // Shows indexes
  await executeSql('CREATE INDEX IF NOT EXISTS idx_shows_artist_id ON shows(artist_id);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_shows_venue_id ON shows(venue_id);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_shows_date ON shows(date);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_shows_ticketmaster_id ON shows(ticketmaster_id);');
  
  // Songs indexes
  await executeSql('CREATE INDEX IF NOT EXISTS idx_songs_artist_id ON songs(artist_id);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_songs_name ON songs USING gin (name gin_trgm_ops);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_songs_spotify_id ON songs(spotify_id);');
  
  // Setlists indexes
  await executeSql('CREATE INDEX IF NOT EXISTS idx_setlists_show_id ON setlists(show_id);');
  
  // Setlist Songs indexes
  await executeSql('CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id ON setlist_songs(setlist_id);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_setlist_songs_song_id ON setlist_songs(song_id);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_setlist_songs_vote_count ON setlist_songs(vote_count DESC);');
  
  // Votes indexes
  await executeSql('CREATE INDEX IF NOT EXISTS idx_votes_setlist_song_id ON votes(setlist_song_id);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_votes_session_key ON votes(session_key);');
  
  // Played Setlists indexes
  await executeSql('CREATE INDEX IF NOT EXISTS idx_played_setlists_show_id ON played_setlists(show_id);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_played_setlists_setlist_fm_id ON played_setlists(setlist_fm_id);');
  
  // Played Setlist Songs indexes
  await executeSql('CREATE INDEX IF NOT EXISTS idx_played_setlist_songs_played_setlist_id ON played_setlist_songs(played_setlist_id);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_played_setlist_songs_song_id ON played_setlist_songs(song_id);');
  
  // Sync Jobs indexes
  await executeSql('CREATE INDEX IF NOT EXISTS idx_sync_jobs_status_priority ON sync_jobs(status, priority);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_sync_jobs_entity ON sync_jobs(entity_type, entity_id);');
  await executeSql('CREATE INDEX IF NOT EXISTS idx_sync_jobs_attempts ON sync_jobs(attempts) WHERE status = \'retrying\';');
  
  // API Cache indexes
  await executeSql('CREATE INDEX IF NOT EXISTS idx_api_cache_expires_at ON api_cache(expires_at);');
  
  // Artist Follows indexes
  await executeSql('CREATE INDEX IF NOT EXISTS idx_artist_follows_artist_id ON artist_follows(artist_id);');
  
  // Add constraint for sync_jobs
  await executeSql(`
    DO $$
    BEGIN
      ALTER TABLE public.sync_jobs 
      ADD CONSTRAINT unique_pending_entity UNIQUE (entity_type, entity_id) 
      WHERE status IN ('pending', 'retrying');
    EXCEPTION
      WHEN duplicate_table THEN NULL;
    END $$;
  `);
  
  console.log('Migration completed successfully!');
}

/**
 * Main function
 */
async function main() {
  try {
    const confirm = await question('This will migrate your database schema for TheSet application. Continue? (y/n): ');
    
    if (confirm.toLowerCase() !== 'y') {
      console.log('Migration aborted by user.');
      rl.close();
      return;
    }
    
    await applyMigration();
    
    // Offer to initialize the sync system by queueing trending shows
    const initSync = await question('Would you like to initialize the sync system by queueing trending shows? (y/n): ');
    
    if (initSync.toLowerCase() === 'y') {
      console.log('Queueing trending shows sync job...');
      await supabase.rpc('enqueue_sync', { 
        entity_type: 'trending_shows',
        external_id: 'initial',
        priority: 1
      });
      console.log('Trending shows sync job queued. You can now run the unified-sync function to process it.');
    }
    
    console.log('TheSet database is now ready for use!');
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    rl.close();
  }
}

// Run the main function as IIFE
(async () => {
  try {
    await main();
  } catch (error) {
    console.error('Unhandled error:', error);
    process.exit(1);
  }
})();