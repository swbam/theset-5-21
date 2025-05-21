/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Define expected request body structure
interface SyncShowPayload {
  tm_id: string; // Use the correct column name: Ticketmaster Show ID
  forceRefresh?: boolean; // Allow forcing refresh of TM data
}

// Define the structure of your Show data (align with DB schema and types)
interface Show {
  id: string; // Supabase UUID
  tm_id: string; // Ticketmaster Show ID (renamed from external_id)
  name: string;
  date?: string | null;
  artist_id: string; // FK to artists table (non-nullable after sync)
  venue_id: string;  // FK to venues table (non-nullable after sync)
  ticket_url?: string | null;
  image_url?: string | null;
  popularity?: number | null;
  created_at?: string;
  updated_at?: string;
}

// Helper to get the best image
function getBestImage(images?: Array<{url: string, width: number, height: number}>): string | null {
  if (!images || images.length === 0) return null;
  // Add explicit types for sort parameters
  const sorted = [...images].sort((a: {width: number}, b: {width: number}) => (b.width || 0) - (a.width || 0));
  return sorted[0].url;
}

/**
 * Fetches show data from Ticketmaster and prioritizes dependencies in the queue.
 */
async function fetchShowDataAndQueueDependencies(
  supabaseAdmin: any,
  payload: SyncShowPayload
): Promise<{ showData: Partial<Show>; artistId?: string; venueId?: string }> {
  const tmShowId = payload.tm_id;
  // We'll use forceRefresh in the reference_data for the queue items
  const forceRefresh = payload.forceRefresh ?? false;

  console.log(`[sync-show] Processing show TM ID: ${tmShowId}`);

  // 1. Fetch Show Data from Ticketmaster
  const tmApiKey = Deno.env.get('TICKETMASTER_API_KEY');
  if (!tmApiKey) {
    console.error('[sync-show] TICKETMASTER_API_KEY not set.');
    throw new Error("TICKETMASTER_API_KEY is not set.");
  }

  let tmData: any; // To store the fetched TM show data
  try {
    const tmUrl = `https://app.ticketmaster.com/discovery/v2/events/${tmShowId}.json?apikey=${tmApiKey}`;
    console.log(`[sync-show] Fetching from Ticketmaster: ${tmUrl}`);
    const tmResponse = await fetch(tmUrl);
    if (!tmResponse.ok) {
      throw new Error(`Ticketmaster API error for show ${tmShowId}: ${tmResponse.status} ${await tmResponse.text()}`);
    }
    tmData = await tmResponse.json();
    console.log(`[sync-show] Received Ticketmaster data for show ${tmShowId}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[sync-show] Error fetching Ticketmaster data for show ${tmShowId}:`, errorMsg);
    throw new Error(`Failed to fetch Ticketmaster data: ${errorMsg}`); // Fail fast if TM fetch fails
  }

  // Extract TM Artist and Venue IDs
  const tmArtistId = tmData._embedded?.attractions?.[0]?.id;
  const tmVenueId = tmData._embedded?.venues?.[0]?.id;

  if (!tmArtistId) {
    console.error(`[sync-show] No artist ID found in Ticketmaster data for show ${tmShowId}. Cannot proceed.`);
    throw new Error("Missing artist ID in Ticketmaster data.");
  }
  if (!tmVenueId) {
    console.error(`[sync-show] No venue ID found in Ticketmaster data for show ${tmShowId}. Cannot proceed.`);
    throw new Error("Missing venue ID in Ticketmaster data.");
  }

  // 2. Check if artist and venue already exist in database
  let artistId: string | undefined;
  let venueId: string | undefined;

  try {
    const { data: artistData, error: artistError } = await supabaseAdmin
      .from('artists')
      .select('id')
      .eq('tm_id', tmArtistId)
      .maybeSingle();

    if (artistError) throw artistError;
    if (artistData) {
      artistId = artistData.id;
      console.log(`[sync-show] Found existing artist with ID: ${artistId}`);
    }

    const { data: venueData, error: venueError } = await supabaseAdmin
      .from('venues')
      .select('id')
      .eq('tm_id', tmVenueId)
      .maybeSingle();

    if (venueError) throw venueError;
    if (venueData) {
      venueId = venueData.id;
      console.log(`[sync-show] Found existing venue with ID: ${venueId}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[sync-show] Error checking for existing entities:`, errorMsg);
    // Non-fatal, continue processing
  }

  // 3. Queue dependencies with high priority
  try {
    // Queue artist sync with priority 1 (high)
    const { data: artistQueueItem, error: artistQueueError } = await supabaseAdmin.rpc(
      'enqueue_sync',
      { 
        entity_type: 'artist',
        external_id: tmArtistId,
        reference_data: { forceRefresh }, // Pass through forceRefresh
        priority: 1, // High priority
        max_attempts: 3
      }
    );

    if (artistQueueError) {
      console.error(`[sync-show] Error enqueueing artist sync: ${artistQueueError.message}`);
    } else {
      console.log(`[sync-show] Artist sync queued, queue item ID: ${artistQueueItem}`);
    }

    // Queue venue sync with priority 1 (high)
    const { data: venueQueueItem, error: venueQueueError } = await supabaseAdmin.rpc(
      'enqueue_sync',
      { 
        entity_type: 'venue',
        external_id: tmVenueId,
        reference_data: { forceRefresh }, // Pass through forceRefresh
        priority: 1, // High priority
        max_attempts: 3
      }
    );

    if (venueQueueError) {
      console.error(`[sync-show] Error enqueueing venue sync: ${venueQueueError.message}`);
    } else {
      console.log(`[sync-show] Venue sync queued, queue item ID: ${venueQueueItem}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[sync-show] Error during queue operations:`, errorMsg);
    // Non-fatal, continue processing
  }

  // 4. Prepare Show Data for Upsert using fetched TM data
  // If we have venue and artist IDs, include them, otherwise they'll be updated later
  const showDataForUpsert: Partial<Show> = {
    tm_id: tmShowId,
    name: tmData.name,
    date: tmData.dates?.start?.dateTime || null,
    ticket_url: tmData.url || null,
    image_url: getBestImage(tmData.images) || null,
    updated_at: new Date().toISOString(),
  };

  // Only include artist_id and venue_id if we have them
  if (artistId) {
    showDataForUpsert.artist_id = artistId;
  }

  if (venueId) {
    showDataForUpsert.venue_id = venueId;
  }

  return { 
    showData: showDataForUpsert, 
    artistId, 
    venueId 
  };
}


serve(async (req: Request) => {
  console.log('--- sync-show function handler started ---');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: SyncShowPayload = await req.json();
    const tmId = payload.tm_id;

    if (!tmId) {
      return new Response(JSON.stringify({ error: 'Missing tm_id in request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`[sync-show] Sync request received for show TM ID: ${tmId}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch TM Data and Queue Dependencies (Artist & Venue)
    // This function now handles fetching TM data and queueing dependencies
    const syncResult = await fetchShowDataAndQueueDependencies(supabaseAdmin, payload);
    // Error handling within fetchShowDataAndQueueDependencies should throw if critical issues occur

    // We only need the showData from the result
    const { showData: dataToCombine } = syncResult;

    // 2. Find Existing Show by tm_id
    let existingShow: Show | null = null;
    try {
      const { data: foundShow, error: findError } = await supabaseAdmin
        .from('shows')
        .select('*')
        .eq('tm_id', tmId)
        .maybeSingle();

      if (findError) throw findError;
      existingShow = foundShow as Show | null;
      if(existingShow) console.log(`[sync-show] Found existing show by TM ID: ${existingShow.id}`);
      else console.log(`[sync-show] No existing show found for TM ID: ${tmId}`);

    } catch (e) {
       const errorMsg = e instanceof Error ? e.message : String(e);
       console.error(`[sync-show] Error finding existing show:`, errorMsg);
       // Consider if this should be fatal or if insert should proceed
    }

    // 3. Prepare final data and Upsert
    let finalShowData: Show | null = null;
    let operationType: 'INSERT' | 'UPDATE' | 'UNKNOWN' = 'UNKNOWN';

    // Merge fetched/resolved data with existing data (if any)
    const dataToUpsert = {
       ...existingShow, // Start with existing fields (like popularity, created_at)
       ...dataToCombine, // Overwrite with fetched/resolved data (name, date, ids, urls, image)
       updated_at: new Date().toISOString(), // Ensure updated_at is current
    };

    // Remove UUID for insert, set created_at
    if (!existingShow) {
       delete dataToUpsert.id;
       dataToUpsert.created_at = new Date().toISOString();
    } else {
       dataToUpsert.id = existingShow.id; // Ensure ID is present for update
    }

    // Note: We handle the case where artist_id or venue_id might be missing
    // If IDs were not found in the existing database, the deps are queued and will be processed separately
    // Since the new system works with asynch deps, we won't validate them as strictly

    try {
      if (existingShow) {
        // UPDATE
        operationType = 'UPDATE';
        console.log(`[sync-show] Updating existing show: ${existingShow.id}`);
        const { data, error } = await supabaseAdmin
          .from('shows')
          .update(dataToUpsert)
          .eq('id', existingShow.id)
          .select()
          .single();
        if (error) throw error;
        finalShowData = data as Show;
      } else {
        // INSERT
        operationType = 'INSERT';
        console.log(`[sync-show] Inserting new show with TM ID: ${dataToUpsert.tm_id}`);
        const { data, error } = await supabaseAdmin
          .from('shows')
          .insert(dataToUpsert)
          .select()
          .single();
        if (error) throw error;
        finalShowData = data as Show;
      }

       if (!finalShowData?.id) {
         throw new Error("Upsert operation did not return valid show data with ID.");
      }

      console.log(`[sync-show] Successfully performed ${operationType} for show ${finalShowData.name} (UUID: ${finalShowData.id})`);

      // Queue this show to be processed for setlists (low priority)
      try {
        const { data: setlistQueueItem, error: setlistQueueError } = await supabaseAdmin.rpc(
          'enqueue_sync',
          { 
            entity_type: 'setlist',
            external_id: tmId, // Use the TM ID as external ID for consistency
            reference_data: { 
              show_id: finalShowData.id, 
              artist_id: finalShowData.artist_id
            },
            priority: 3, // Low priority
            max_attempts: 2 // Fewer attempts for setlists since they're optional
          }
        );

        if (setlistQueueError) {
          console.error(`[sync-show] Error enqueueing setlist sync: ${setlistQueueError.message}`);
        } else {
          console.log(`[sync-show] Setlist sync queued, queue item ID: ${setlistQueueItem}`);
        }
      } catch (qError) {
        console.error(`[sync-show] Error queueing setlist lookup: ${qError}`);
        // Non-critical error, continue
      }

    } catch (upsertError) {
      const errorMsg = upsertError instanceof Error ? upsertError.message : String(upsertError);
      console.error(`[sync-show] Supabase ${operationType} error:`, errorMsg);
      return new Response(JSON.stringify({ error: `Database error during ${operationType} attempt`, details: errorMsg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true, data: finalShowData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[sync-show] Unhandled error:', errorMessage, error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
