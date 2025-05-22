import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface EnqueueRequestBody {
  source_system: string;
  entity_type: string;
  external_id: string;
  priority?: number;
  // Potentially other payload data from the client in the future
  initial_payload?: Record<string, any>; 
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseClient: SupabaseClient;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined");
    }
    supabaseClient = createClient(supabaseUrl, serviceRoleKey);
  } catch (initError) {
    console.error("Error initializing Supabase client:", initError);
    return new Response(JSON.stringify({ error: `Supabase client initialization failed: ${initError.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  try {
    const body = await req.json() as EnqueueRequestBody;

    const { source_system, entity_type, external_id, priority, initial_payload } = body;

    if (!source_system || !entity_type || !external_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: source_system, entity_type, external_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let taskPayload: Record<string, any> | null = initial_payload || null;

    if (source_system === 'spotify' && entity_type === 'artist') {
      taskPayload = { ...(taskPayload || {}), is_search_term: true };
    }

    const taskToInsert = {
      source_system,
      entity_type,
      external_id,
      status: 'pending',
      priority: priority || 0,
      payload: taskPayload,
      // attempts, max_attempts, etc., will use database defaults
    };

    const { data, error } = await supabaseClient
      .from('sync_tasks')
      .insert(taskToInsert)
      .select()
      .single(); // Assuming you want to return the created task

    if (error) {
      console.error('Error inserting task:', error);
      throw error;
    }

    return new Response(JSON.stringify({ message: 'Task enqueued successfully', task: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // 201 Created
    });

  } catch (error) {
    console.error("Error in enqueue-sync-task:", error);
    // Check if error is a known type or just rethrow generic
    let errorMessage = error.message;
    if (error.details) errorMessage += ` (${error.details})`;
    
    return new Response(JSON.stringify({ error: `Failed to enqueue task: ${errorMessage}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.status || 500, // Use error status if available (e.g., from Supabase client error)
    });
  }
});
