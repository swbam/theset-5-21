/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const TICKETMASTER_API_KEY = Deno.env.get('TICKETMASTER_API_KEY');
const TRENDING_SHOW_LIMIT = 8; // How many shows to cache

// Simplified interface for TM event data needed
interface TmEvent {
  id: string; // Event ID (used for show external_id)
  _embedded?: {
    attractions?: [{ id: string }]; // Artist ID (used for artist external_id)
    venues?: [{ id: string }]; // Venue ID (used for venue external_id)
  };
}

// Helper to invoke other sync functions safely
async function invokeSyncFunction(supabaseAdmin: SupabaseClient, functionName: string, body: Record<string, unknown>) {
  try {
    const { error } = await supabaseAdmin.functions.invoke(functionName, { body });
    if (error) {
      console.warn(`Error invoking ${functionName} for ${JSON.stringify(body)}:`, error.message);
    } else {
      console.log(`Successfully invoked ${functionName} for ${JSON.stringify(body)}`);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`Exception invoking ${functionName} for ${JSON.stringify(body)}:`, errorMsg);
  }
  // Add a small delay to help with potential rate limits if invoking many functions rapidly
  await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay to 500ms
}

serve(async (req: Request) => {
  // This function should ideally be triggered by a schedule, not HTTP request
  // But we include basic HTTP handling for testing/manual triggers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  // Optional: Add security check (e.g., check for a specific header or secret) if triggering via HTTP
  // const authHeader = req.headers.get('Authorization');
  // if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
  //   return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  // }

  console.log('--- update-trending-shows function started ---');

  if (!TICKETMASTER_API_KEY) {
    console.error('TICKETMASTER_API_KEY is not set.');
    return new Response(JSON.stringify({ error: 'Ticketmaster API key not configured' }), { status: 500 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // 1. Fetch trending/popular events from Ticketmaster
    // Example: Fetching music events in US sorted by relevance (adjust as needed)
    const tmUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_API_KEY}&classificationName=Music&countryCode=US&sort=relevance,date,asc&size=20`; // Fetch more than needed initially
    console.log(`Fetching trending events from Ticketmaster: ${tmUrl}`);
    const tmResponse = await fetch(tmUrl);

    if (!tmResponse.ok) {
      throw new Error(`Ticketmaster API error: ${tmResponse.status} ${await tmResponse.text()}`);
    }

    const tmData = await tmResponse.json();
    const tmEvents: TmEvent[] = tmData._embedded?.events || [];
    console.log(`Fetched ${tmEvents.length} events from Ticketmaster.`);

    if (tmEvents.length === 0) {
      console.log('No trending events found from Ticketmaster.');
      return new Response(JSON.stringify({ success: true, message: 'No trending events found from source.' }), { status: 200 });
    }

    // 2. Trigger sync for fetched shows and their artists (in background, don't wait)
    // Use a Set to avoid duplicate sync calls for the same artist
    const artistIdsToSync = new Set<string>();
    tmEvents.forEach(event => {
      const artistId = event._embedded?.attractions?.[0]?.id;
      if (artistId) {
        artistIdsToSync.add(artistId);
      }
      // Invoke sync-show for each event
      invokeSyncFunction(supabaseAdmin, 'sync-show', { showId: event.id });
    });

    // Invoke sync-artist for unique artists
    artistIdsToSync.forEach(artistId => {
      invokeSyncFunction(supabaseAdmin, 'sync-artist', { artistId: artistId });
    });

    // Note: Since syncs are invoked without await, the data might not be in the DB *immediately*
    // when the next step runs. This is a trade-off for speed. A more robust system might use queues.
    // For simplicity here, we'll query based on the data *already* in the DB.

    // 3. Query local 'shows' table to determine actual trending shows based on DB data
    // (e.g., order by popularity, assuming sync-show populates this)
    console.log('Querying local shows table for trending order...');
    const { data: localShows, error: queryError } = await supabaseAdmin
      .from('shows')
      .select('id') // Only need the ID
      // Order by date descending (most recent first) as popularity isn't reliably populated
      .order('date', { ascending: false, nullsFirst: false })
      .limit(TRENDING_SHOW_LIMIT);

    if (queryError) {
      throw new Error(`Error querying local shows: ${queryError.message}`);
    }

    if (!localShows || localShows.length === 0) {
      console.log('No shows found in local DB after sync attempt.');
       return new Response(JSON.stringify({ success: true, message: 'No shows found in DB to cache.' }), { status: 200 });
    }

    console.log(`Found ${localShows.length} top shows in local DB.`);

    // 4. Update the cache table
    console.log('Updating trending_shows_cache table...');
    // Delete old entries
    const { error: deleteError } = await supabaseAdmin
      .from('trending_shows_cache')
      .delete()
      .neq('rank', -1); // Delete all rows (use a condition that's always true)

    if (deleteError) {
      throw new Error(`Error clearing trending cache: ${deleteError.message}`);
    }

    // Insert new trending shows with rank
    const cacheInserts = localShows.map((show: { id: string }, index: number) => ({
      show_id: show.id,
      rank: index + 1,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('trending_shows_cache')
      .insert(cacheInserts);

    if (insertError) {
      throw new Error(`Error inserting into trending cache: ${insertError.message}`);
    }

    console.log(`Successfully updated trending_shows_cache with ${cacheInserts.length} shows.`);

    return new Response(JSON.stringify({ success: true, updated: cacheInserts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in update-trending-shows function:', errorMessage, error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})