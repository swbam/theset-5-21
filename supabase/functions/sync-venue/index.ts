/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Define expected request body structure
interface SyncVenuePayload {
  tm_id: string; // Use the correct column name: Ticketmaster Venue ID
  forceRefresh?: boolean;
}

// Define the structure of your Venue data (align with DB schema and types)
interface Venue {
  id: string; // Supabase UUID
  tm_id: string; // Ticketmaster Venue ID (renamed from external_id, removed redundant one)
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null; // Added back based on TM data availability
  latitude?: string | null; // Changed to string to match TM response
  longitude?: string | null; // Changed to string to match TM response
  url?: string | null; // Added back based on TM data availability
  image_url?: string | null;
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
 * Fetches and combines venue data, primarily from Ticketmaster.
 */
async function fetchAndCombineVenueData(
  supabaseAdmin: any,
  existingVenue: Venue | null,
  payload: SyncVenuePayload
): Promise<Partial<Venue>> {
  const combinedData: Partial<Venue> = { ...existingVenue };
  const forceRefresh = payload.forceRefresh ?? false;
  const tmIdToFetch = payload.tm_id; // Always use the ID from payload

  console.log(`[sync-venue] Processing venue TM ID: ${tmIdToFetch}`);

  // Fetch from Ticketmaster if no existing data or forceRefresh is true
  if (!existingVenue || forceRefresh) {
    const tmApiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!tmApiKey) {
      console.error('[sync-venue] TICKETMASTER_API_KEY not set.');
      // If we have existing data, return it, otherwise fail
      if (existingVenue) return combinedData;
      else throw new Error("TICKETMASTER_API_KEY is not set and no existing venue data found.");
    }

    try {
      const tmUrl = `https://app.ticketmaster.com/discovery/v2/venues/${tmIdToFetch}.json?apikey=${tmApiKey}`;
      console.log(`[sync-venue] Fetching from Ticketmaster: ${tmUrl}`);
      const tmResponse = await fetch(tmUrl);

      if (!tmResponse.ok) {
        const errorText = await tmResponse.text();
        console.warn(`[sync-venue] Ticketmaster API error for venue ${tmIdToFetch}: ${tmResponse.status} ${errorText}`);
        // If fetch fails, return existing data if available, otherwise throw
        if (existingVenue) return combinedData;
        else throw new Error(`Ticketmaster API error: ${tmResponse.status}`);
      }

      const tmData = await tmResponse.json();
      console.log(`[sync-venue] Received Ticketmaster data for venue ${tmIdToFetch}`);

      // Combine data, prioritizing fetched data
      combinedData.tm_id = tmIdToFetch; // Ensure TM ID is set
      combinedData.name = tmData.name || combinedData.name;
      combinedData.city = tmData.city?.name || combinedData.city;
      combinedData.state = tmData.state?.stateCode || combinedData.state;
      combinedData.country = tmData.country?.countryCode || combinedData.country;
      combinedData.address = tmData.address?.line1 || combinedData.address; // Assuming line1 is the primary address
      combinedData.latitude = tmData.location?.latitude || combinedData.latitude;
      combinedData.longitude = tmData.location?.longitude || combinedData.longitude;
      combinedData.url = tmData.url || combinedData.url;
      combinedData.image_url = getBestImage(tmData.images) || combinedData.image_url;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[sync-venue] Error fetching/processing Ticketmaster data for ${tmIdToFetch}:`, errorMsg);
      // If fetch fails, return existing data if available, otherwise throw
      if (existingVenue) return combinedData;
      else throw new Error(`Failed to fetch Ticketmaster data: ${errorMsg}`);
    }
  }

  if (!combinedData.name) {
     console.error(`[sync-venue] Failed to resolve venue name for TM ID ${tmIdToFetch}.`);
     throw new Error("Venue name could not be resolved.");
  }

  // Add updated_at timestamp
  combinedData.updated_at = new Date().toISOString();

  return combinedData;
}


serve(async (req: Request) => {
  console.log('--- sync-venue function handler started ---');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: SyncVenuePayload = await req.json();
    const tmId = payload.tm_id; // Use tm_id

    if (!tmId) {
      return new Response(JSON.stringify({ error: 'Missing tm_id in request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`[sync-venue] Sync request received for venue TM ID: ${tmId}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Find Existing Venue by tm_id
    let existingVenue: Venue | null = null;
    try {
      const { data: foundVenue, error: findError } = await supabaseAdmin
        .from('venues')
        .select('*')
        .eq('tm_id', tmId)
        .maybeSingle();

      if (findError) throw findError;
      existingVenue = foundVenue as Venue | null;
      if(existingVenue) console.log(`[sync-venue] Found existing venue by TM ID: ${existingVenue.id}`);
      else console.log(`[sync-venue] No existing venue found for TM ID: ${tmId}`);

    } catch (e) {
       const errorMsg = e instanceof Error ? e.message : String(e);
       console.error(`[sync-venue] Error finding existing venue:`, errorMsg);
       // Decide whether to proceed or return error
    }

    // 2. Fetch and Combine Data
    const combinedData = await fetchAndCombineVenueData(supabaseAdmin, existingVenue, payload);

    // 3. Upsert (Insert or Update)
    let finalVenueData: Venue | null = null;
    // Initialize operationType before the try block
    let operationType: 'INSERT' | 'UPDATE' | 'UNKNOWN' = 'UNKNOWN'; 

    // Prepare data for upsert
    const dataToUpsert = { ...combinedData };
    if (!existingVenue) {
       delete dataToUpsert.id; // Let DB generate UUID
       dataToUpsert.created_at = new Date().toISOString();
    } else {
       dataToUpsert.id = existingVenue.id; // Use existing UUID for update
    }

    try {
      if (existingVenue) {
        // UPDATE
        operationType = 'UPDATE';
        console.log(`[sync-venue] Updating existing venue: ${existingVenue.id}`);
        const { data, error } = await supabaseAdmin
          .from('venues')
          .update(dataToUpsert)
          .eq('id', existingVenue.id)
          .select()
          .single();
        if (error) throw error;
        finalVenueData = data as Venue;
      } else {
        // INSERT
        operationType = 'INSERT';
        console.log(`[sync-venue] Inserting new venue with TM ID: ${dataToUpsert.tm_id}`);
        const { data, error } = await supabaseAdmin
          .from('venues')
          .insert(dataToUpsert)
          .select()
          .single();
        if (error) throw error;
        finalVenueData = data as Venue;
      }

       if (!finalVenueData?.id) {
         throw new Error("Upsert operation did not return valid venue data with ID.");
      }

      console.log(`[sync-venue] Successfully performed ${operationType} for venue ${finalVenueData.name} (UUID: ${finalVenueData.id})`);

    } catch (upsertError) {
      // operationType might still be 'UNKNOWN' if error happened before assignment
      const errorMsg = upsertError instanceof Error ? upsertError.message : String(upsertError);
      console.error(`[sync-venue] Supabase ${operationType} error:`, errorMsg);
      return new Response(JSON.stringify({ error: `Database error during ${operationType} attempt`, details: errorMsg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // TODO: Optionally trigger sync for related shows? (Less common for venues)

    return new Response(JSON.stringify({ success: true, data: finalVenueData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[sync-venue] Unhandled error:', errorMessage, error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
