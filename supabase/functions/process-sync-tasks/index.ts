import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

import * as spotifyApi from '../../src/lib/spotify/index.ts'; 
import * as ticketmasterApi from '../../src/lib/ticketmaster.ts'; 

const BATCH_SIZE = 10;

interface SyncTask {
  id: number;
  source_system: string;
  entity_type: string;
  external_id: string;
  internal_id?: string | null;
  status: string;
  priority: number;
  attempts: number;
  max_attempts: number;
  payload?: Record<string, any> | null; // Will now check for is_search_term
  error_log?: Record<string, any> | null;
  last_attempt_at?: string | null;
  processing_started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

async function enqueueNewTask(
  supabaseClient: SupabaseClient,
  sourceSystem: string,
  entityType: string,
  externalId: string,
  priority: number,
  payload?: Record<string, any> | null // Added to allow passing payload for new tasks
) {
  const { error: enqueueError } = await supabaseClient.from('sync_tasks').insert({
    source_system: sourceSystem,
    entity_type: entityType,
    external_id: externalId,
    status: 'pending',
    priority: priority,
    payload: payload, // Pass along payload if provided
  });
  if (enqueueError) {
    console.error(`Failed to enqueue dependent ${entityType} task for ${externalId}:`, enqueueError);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseClient: SupabaseClient;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase credentials");
    supabaseClient = createClient(supabaseUrl, serviceRoleKey);
  } catch (initError) {
    console.error("Error initializing Supabase client:", initError);
    return new Response(JSON.stringify({ error: `Client init failed: ${initError.message}` }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }

  try {
    const { data: tasks, error: fetchError } = await supabaseClient
      .from('sync_tasks').select('*').in('status', ['pending', 'retrying'])
      .lt('attempts', supabaseClient.sql('max_attempts'))
      .order('priority', { ascending: false }).order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) throw fetchError;
    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ message: "No pending tasks." }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    let succeeded = 0, failed = 0, otherOutcomes = 0;

    for (const task of tasks as SyncTask[]) {
      const currentAttempts = task.attempts + 1;
      const currentTime = new Date().toISOString();
      let taskSpecificProcessingError = null;

      try {
        const { error: updateToProcessingError } = await supabaseClient
          .from('sync_tasks').update({
            status: 'processing', attempts: currentAttempts, last_attempt_at: currentTime,
            processing_started_at: currentTime, updated_at: currentTime,
          }).eq('id', task.id);
        if (updateToProcessingError) {
            taskSpecificProcessingError = updateToProcessingError; throw updateToProcessingError;
        }

        let processingError: Error | null = null;
        let internalDbId: string | null | undefined = task.internal_id;
        let spotifyArtistDetails: any = null; // To store result from getArtist

        if (task.source_system === 'spotify' && task.entity_type === 'artist') {
          let spotifyIdToFetch = task.external_id;

          if (task.payload?.is_search_term === true) {
            console.log(`Spotify artist task for "${task.external_id}" is a search term. Searching...`);
            if (typeof (spotifyApi as any).searchArtists !== 'function') {
              throw new Error('spotifyApi.searchArtists is not a function. Check Spotify library exports.');
            }
            // Assuming searchArtists is { artists: { items: [...] } }
            const searchResults = await (spotifyApi as any).searchArtists(task.external_id, 1); 
            if (!searchResults?.artists?.items?.length || !searchResults.artists.items[0].id) {
              throw new Error(`No artists found on Spotify for search term: "${task.external_id}"`);
            }
            spotifyIdToFetch = searchResults.artists.items[0].id;
            console.log(`Found Spotify ID ${spotifyIdToFetch} for search term "${task.external_id}". Fetching details...`);
          }
          
          if (typeof (spotifyApi as any).getArtist !== 'function') { 
            throw new Error('spotifyApi.getArtist is not a function.');
          }
          spotifyArtistDetails = await (spotifyApi as any).getArtist(spotifyIdToFetch);
          if (!spotifyArtistDetails || !spotifyArtistDetails.id) {
              throw new Error(`Artist details not found on Spotify for ID: ${spotifyIdToFetch}`);
          }

          const artistData = {
            name: spotifyArtistDetails.name, spotify_artist_id: spotifyArtistDetails.id,
            images: spotifyArtistDetails.images || null, genres: spotifyArtistDetails.genres || null,
            external_urls: spotifyArtistDetails.external_urls?.spotify ? { spotify: spotifyArtistDetails.external_urls.spotify } : null,
            popularity: spotifyArtistDetails.popularity, last_synced_at: currentTime,
          };
          const { data: upsertedArtist, error: upsertError } = await supabaseClient
            .from('artists').upsert(artistData, { onConflict: 'spotify_artist_id', ignoreDuplicates: false })
            .select('id').single();
            
          if (upsertError) processingError = upsertError;
          else if (upsertedArtist && upsertedArtist.id) {
            internalDbId = upsertedArtist.id;
            await supabaseClient.from('sync_tasks').update({
                status: 'completed', completed_at: currentTime, internal_id: internalDbId,
                payload: artistData, error_log: null, updated_at: currentTime,
            }).eq('id', task.id);
            succeeded++;
          } else processingError = new Error("Upsert (Spotify Artist) did not return ID.");

        } else if (task.source_system === 'ticketmaster' && task.entity_type === 'show') {
          // Ticketmaster Show Sync Logic (from previous step)
          if (typeof (ticketmasterApi as any).getEventDetails !== 'function') {
            throw new Error('ticketmasterApi.getEventDetails is not a function.');
          }
          const event = await (ticketmasterApi as any).getEventDetails(task.external_id);
          if (!event || !event.id || !event.name) {
            throw new Error(`Event details not found for TM ID: ${task.external_id}`);
          }
          const tmArtist = event._embedded?.attractions?.[0];
          if (!tmArtist || !tmArtist.id) throw new Error("Missing TM artist info.");
          let { data: existingArtist, error: artistFetchErr } = await supabaseClient
            .from('artists').select('id').eq('ticketmaster_artist_id', tmArtist.id).single();
          if (artistFetchErr && artistFetchErr.code !== 'PGRST116') { processingError = artistFetchErr; throw processingError; }
          if (!existingArtist) {
            await enqueueNewTask(supabaseClient, 'ticketmaster', 'artist', tmArtist.id, task.priority + 1);
            throw new Error(`Dependent TM artist ${tmArtist.id} not found. Enqueued. Retrying show.`);
          }
          const internalArtistId = existingArtist.id;

          const tmVenue = event._embedded?.venues?.[0];
          if (!tmVenue || !tmVenue.id) throw new Error("Missing TM venue info.");
          let { data: existingVenue, error: venueFetchErr } = await supabaseClient
            .from('venues').select('id').eq('ticketmaster_venue_id', tmVenue.id).single();
          if (venueFetchErr && venueFetchErr.code !== 'PGRST116') { processingError = venueFetchErr; throw processingError; }
          if (!existingVenue) {
            await enqueueNewTask(supabaseClient, 'ticketmaster', 'venue', tmVenue.id, task.priority + 1);
            throw new Error(`Dependent TM venue ${tmVenue.id} not found. Enqueued. Retrying show.`);
          }
          const internalVenueId = existingVenue.id;

          const showData = { /* ... data transformation ... */ 
            name: event.name, ticketmaster_show_id: event.id, artist_id: internalArtistId, venue_id: internalVenueId,
            show_date_utc: event.dates?.start?.dateTime || null, timezone: event.dates?.timezone || null,
            images: event.images || null, external_urls: event.url ? { ticketmaster: event.url } : null,
            ticket_info: event.priceRanges || null, last_synced_at: currentTime,
          };
          const { data: upsertedShow, error: upsertShowErr } = await supabaseClient
            .from('shows').upsert(showData, { onConflict: 'ticketmaster_show_id', ignoreDuplicates: false })
            .select('id').single();
          if (upsertShowErr) processingError = upsertShowErr;
          else if (upsertedShow && upsertedShow.id) {
            internalDbId = upsertedShow.id;
            await supabaseClient.from('sync_tasks').update({
                status: 'completed', completed_at: currentTime, internal_id: internalDbId,
                payload: showData, error_log: null, updated_at: currentTime,
            }).eq('id', task.id);
            succeeded++;
          } else processingError = new Error("Upsert (TM Show) did not return ID.");
        } else {
          console.log(`Handler not implemented for ${task.source_system} ${task.entity_type}. Retrying.`);
          await supabaseClient.from('sync_tasks').update({ 
                status: 'retrying', 
                error_log: { message: `Handler not implemented: ${task.source_system} ${task.entity_type}` },
                updated_at: currentTime,
            }).eq('id', task.id);
          otherOutcomes++;
        }
        if (processingError) throw processingError;
      } catch (e) {
        const errorToLog = taskSpecificProcessingError || e;
        console.error(`Task ${task.id} failed: ${errorToLog.message}`, errorToLog.stack);
        failed++;
        const newStatus = (currentAttempts >= task.max_attempts) ? 'failed' : 'retrying';
        await supabaseClient.from('sync_tasks').update({
            status: newStatus, error_log: { message: errorToLog.message, details: errorToLog.stack },
            updated_at: new Date().toISOString(),
          }).eq('id', task.id);
      }
    }
    return new Response(JSON.stringify({ message: `Processed: ${tasks.length}, Succeeded: ${succeeded}, Failed: ${failed}, Other: ${otherOutcomes}` }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    console.error("Main error:", error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
