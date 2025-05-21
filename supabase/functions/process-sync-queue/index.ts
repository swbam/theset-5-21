/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Define queue item interface
interface QueueItem {
  id: number;
  entity_type: string;
  external_id: string;
  reference_data?: any;
  priority: number;
  status: string;
  attempts: number;
  max_attempts: number;
  error?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

// Handle mapping entity types to their respective sync functions
const syncFunctionMap: Record<string, string> = {
  'artist': 'sync-artist',
  'show': 'sync-show',
  'venue': 'sync-venue',
  'setlist': 'sync-setlist',
  'song': 'sync-song',
};

// Map entity types to their ID field names in the sync function payloads
const idFieldMap: Record<string, string> = {
  'artist': 'tm_id', // If using Ticketmaster ID as primary
  'show': 'tm_id',
  'venue': 'tm_id',
  'setlist': 'setlistId',
  'song': 'spotify_id',
};

// Function to process a single queue item
async function processQueueItem(supabaseAdmin: any, item: QueueItem): Promise<boolean> {
  console.log(`[process-sync-queue] Processing ${item.entity_type} with ID ${item.external_id} (queue item ${item.id})`);
  
  try {
    // Determine which sync function to call
    const functionName = syncFunctionMap[item.entity_type];
    if (!functionName) {
      throw new Error(`Unknown entity type: ${item.entity_type}`);
    }
    
    // Determine which ID field to use in the function payload
    const idField = idFieldMap[item.entity_type];
    if (!idField) {
      throw new Error(`Unknown ID field for entity type: ${item.entity_type}`);
    }
    
    // Construct base payload
    const payload: Record<string, any> = {
      [idField]: item.external_id
    };
    
    // Add any additional data from reference_data
    if (item.reference_data) {
      Object.assign(payload, item.reference_data);
    }
    
    console.log(`[process-sync-queue] Invoking ${functionName} with payload:`, JSON.stringify(payload));
    
    // Call the appropriate sync function
    const { error } = await supabaseAdmin.functions.invoke(
      functionName,
      { body: payload }
    );
    
    if (error) {
      throw new Error(`Error invoking ${functionName}: ${error.message}`);
    }
    
    // Mark item as complete
    const { error: completeError } = await supabaseAdmin.rpc(
      'complete_sync_item',
      { item_id: item.id }
    );
    
    if (completeError) {
      console.error(`[process-sync-queue] Error marking item ${item.id} as complete:`, completeError.message);
      return false;
    }
    
    console.log(`[process-sync-queue] Successfully processed queue item ${item.id}`);
    return true;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[process-sync-queue] Error processing queue item ${item.id}:`, errorMessage);
    
    // Mark item as failed
    const { error: failError } = await supabaseAdmin.rpc(
      'fail_sync_item',
      { 
        item_id: item.id, 
        error_message: errorMessage.substring(0, 500) // Limit error message length
      }
    );
    
    if (failError) {
      console.error(`[process-sync-queue] Error marking item ${item.id} as failed:`, failError.message);
    }
    
    return false;
  }
}

// Main function to process the queue
async function processQueue(supabaseAdmin: any, maxItems = 5): Promise<{ processed: number, succeeded: number, failed: number }> {
  console.log(`[process-sync-queue] Starting queue processing, max items: ${maxItems}`);
  
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  
  // Process up to maxItems
  for (let i = 0; i < maxItems; i++) {
    // Claim the next item from the queue
    const { data: item, error } = await supabaseAdmin.rpc('claim_next_sync_item');
    
    if (error) {
      console.error(`[process-sync-queue] Error claiming next queue item:`, error.message);
      break;
    }
    
    // No more items in the queue
    if (!item || item.length === 0) {
      console.log(`[process-sync-queue] No more items in queue`);
      break;
    }
    
    processed++;
    
    // Process the claimed item
    const success = await processQueueItem(supabaseAdmin, item[0]);
    if (success) {
      succeeded++;
    } else {
      failed++;
    }
    
    // Add a small delay between processing items to avoid rate limiting
    if (i < maxItems - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`[process-sync-queue] Finished processing. Processed: ${processed}, Succeeded: ${succeeded}, Failed: ${failed}`);
  
  return { processed, succeeded, failed };
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Parse request to get processing options
    const requestData = await req.json().catch(() => ({}));
    const maxItems = requestData.maxItems || 5;
    
    console.log(`[process-sync-queue] Queue processing requested with maxItems=${maxItems}`);
    
    // Initialize Supabase client with SERVICE_ROLE key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Process the queue
    const result = await processQueue(supabaseAdmin, maxItems);
    
    // Return the processing results
    return new Response(
      JSON.stringify({
        success: true,
        ...result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[process-sync-queue] Unhandled error:`, errorMessage);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
