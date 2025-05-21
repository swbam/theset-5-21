import { NextRequest, NextResponse } from 'next/server';
// Removed SyncManager import
import { EntityType } from '@/lib/sync/types'; // Keep EntityType if used for validation
import { createClient } from '@/integrations/supabase/server'; // Server client for invoking functions (Removed SupabaseClient import)

// No SyncManager needed

// CORS headers for responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Custom error class for API route
class SyncAPIError extends Error {
  status: number;
  context?: Record<string, any>;
  
  constructor(message: string, status: number = 500, context?: Record<string, any>) {
    super(message);
    this.name = 'SyncAPIError';
    this.status = status;
    this.context = context;
  }
}

// Log function with environment-aware behavior
function logError(error: any, context?: Record<string, any>) {
  const errorObj = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
  };
  
  // In production we'd want to send this to a logging service
  // For now, we'll just console.error it with proper formatting
  console.error('SYNC API ERROR:', JSON.stringify(errorObj, null, 2));
}

// Helper function for invoking sync functions asynchronously
// Helper function for invoking sync functions asynchronously
async function invokeSyncFunction(
  supabaseAdmin: any, // Keeping 'any' here for simplicity, or use SupabaseClient from @supabase/supabase-js
  functionName: string,
  payload: Record<string, any>,
  entityType: string,
  entityId: string
) {
  console.log(`[Async Invoke] Triggering ${functionName} for ${entityType} ID ${entityId}`);
  supabaseAdmin.functions.invoke(functionName, { body: payload })
    .then(({ data, error }) => {
      if (error) {
        console.error(`[Async Invoke] Error invoking ${functionName} for ${entityType} ID ${entityId}:`, error);
      } else if (!data?.success) {
        console.warn(`[Async Invoke] Function ${functionName} reported failure for ${entityType} ID ${entityId}:`, data?.error || data?.message);
      } else {
        console.log(`[Async Invoke] Successfully invoked ${functionName} for ${entityType} ID ${entityId}`);
      }
    }).catch(invokeError => {
      const errorMsg = invokeError instanceof Error ? invokeError.message : String(invokeError);
      console.error(`[Async Invoke] Exception invoking ${functionName} for ${entityType} ID ${entityId}:`, errorMsg);
    });
}

/**
 * API route for initiating entity sync operations
 */
export async function POST(request: NextRequest): Promise<NextResponse> { // Add return type
  let requestBody;
  
  try {
    // Check if user is authenticated
    // Use the server client for invoking functions and potential DB lookups
    const supabaseAdmin = createClient();
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
    
    if (authError) {
      throw new SyncAPIError(`Authentication error: ${authError.message}`, 401, { code: 'auth_error' });
    }
    
    if (!user) {
      throw new SyncAPIError('Authentication required', 401, { code: 'auth_required' });
    }
    
    // Parse the request body
    try {
      requestBody = await request.json();
    } catch { // Removed unused 'e' variable
      throw new SyncAPIError('Invalid JSON in request body', 400, { code: 'invalid_json' });
    }
    
    // Validate required fields
    if (!requestBody.type || !requestBody.operation) {
      throw new SyncAPIError('Missing required fields: type, operation', 400, { 
        code: 'missing_fields',
        fields: ['type', 'operation']
      });
    }
    
    // Validate entity type
    if (!['artist', 'venue', 'show', 'setlist', 'song'].includes(requestBody.type)) {
      throw new SyncAPIError('Invalid entity type', 400, { 
        code: 'invalid_entity_type',
        providedType: requestBody.type,
        validTypes: ['artist', 'venue', 'show', 'setlist', 'song']
      });
    }
    
    // Validate operation
    if (!['create', 'refresh', 'expand_relations', 'cascade_sync'].includes(requestBody.operation)) {
      throw new SyncAPIError('Invalid operation', 400, { 
        code: 'invalid_operation',
        providedOperation: requestBody.operation,
        validOperations: ['create', 'refresh', 'expand_relations', 'cascade_sync']
      });
    }
    
    // For certain operations, entityId is required
    if (['create', 'refresh', 'expand_relations'].includes(requestBody.operation) && !requestBody.id) {
      throw new SyncAPIError('Entity ID is required for this operation', 400, { 
        code: 'missing_entity_id',
        operation: requestBody.operation
      });
    }
    
    // Handle different operations
    let result: any = { success: false }; // Initialize result
    const entityId = requestBody.id;
    const entityType = requestBody.type as EntityType;
    
    try {
      // Map entity type to function name and payload key
      const functionMap: Record<EntityType, { name: string; idKey: string }> = {
        artist: { name: 'sync-artist', idKey: 'artistId' },
        show: { name: 'sync-show', idKey: 'showId' },
        venue: { name: 'sync-venue', idKey: 'venueId' }, // Expects external_id
        setlist: { name: 'sync-setlist', idKey: 'setlistId' }, // Expects setlist.fm ID
        song: { name: 'sync-song', idKey: 'songId' }, // Expects DB song ID (UUID or Spotify ID)
      };

      if (!functionMap[entityType]) {
         throw new SyncAPIError(`Sync function mapping not found for type: ${entityType}`, 500);
      }

      const { name: functionName, idKey } = functionMap[entityType];
      const payload = { [idKey]: entityId };

      // --- Handle Operations ---
      if (requestBody.operation === 'create' || requestBody.operation === 'refresh') {
        console.log(`Invoking ${functionName} for ${entityType} ID ${entityId}`);
        const { data: funcData, error: funcError } = await supabaseAdmin.functions.invoke(functionName, {
          body: payload,
        });

        if (funcError) {
          throw new SyncAPIError(`Error invoking ${functionName}: ${funcError.message}`, 500, { context: funcError.context });
        }
        if (!funcData?.success) {
           throw new SyncAPIError(`Function ${functionName} reported failure: ${funcData?.error || funcData?.message || 'Unknown function error'}`, 500, { functionResponse: funcData });
        }
        result = funcData; // Contains { success: true, data: ..., updated: ... }

      } else if (requestBody.operation === 'expand_relations') {
        console.log(`Expanding relations for ${entityType} ID ${entityId}`);
        result = { success: true, message: `Expansion triggered for ${entityType} ${entityId}. Related entities syncing asynchronously.` }; // Immediate response

        if (entityType === 'show') {
          const { data: show, error: showError } = await supabaseAdmin
            .from('shows')
            .select('artist_id, venue_id') // Removed non-existent 'setlist_id' column
            .eq('id', entityId)
            .single();
          // Using 'any' temporarily due to potential type generation issues
          // Type should now be inferred correctly, removing 'as any'
          // Type should now be inferred correctly after regenerating types
          const typedShow = show;

          if (showError) throw new SyncAPIError(`Failed to fetch show ${entityId}: ${showError.message}`, 500);
          if (!typedShow) throw new SyncAPIError(`Show ${entityId} not found`, 404);

          if (typedShow.artist_id) {
            await invokeSyncFunction(supabaseAdmin, 'sync-artist', { artistId: typedShow.artist_id }, 'artist', typedShow.artist_id);
          }
          if (typedShow.venue_id) {
            // Venue sync needs external_id, which doesn't exist on venues table per schema.sql.
            // Fetch the venue using the venue_id from the show to get its external_id
            const { data: venue, error: venueError } = await supabaseAdmin
              .from('venues')
              .select('external_id') // Select the newly added external_id
              .eq('id', typedShow.venue_id) // Filter by the venue's UUID
              .maybeSingle();

            if (venueError) {
               console.error(`[Expand Relations] Error fetching venue ${typedShow.venue_id} for show ${entityId}:`, venueError.message);
            } else if (venue?.external_id) {
               // Now we have the external_id, invoke sync-venue
               await invokeSyncFunction(supabaseAdmin, 'sync-venue', { venueId: venue.external_id }, 'venue', venue.external_id);
            } else {
               console.warn(`[Expand Relations] Venue ${typedShow.venue_id} found for show ${entityId}, but it has no external_id. Cannot sync venue.`);
            }
          }
          // shows.setlist_id does not exist per schema.sql
          // if (typedShow.setlist_id) {
          //   await invokeSyncFunction(supabaseAdmin, 'sync-setlist', { setlistId: typedShow.setlist_id }, 'setlist', typedShow.setlist_id);
          // }

        } else if (entityType === 'setlist') {
           const { data: setlist, error: setError } = await supabaseAdmin
             .from('setlists')
             .select('artist_id, show_id') // Removed non-existent 'songs' column
             .eq('id', entityId) // setlist.fm ID
             .single();
             // Using 'any' temporarily due to potential type generation issues
             // Type should now be inferred correctly, removing 'as any'
             // Type should now be inferred correctly after regenerating types
             const typedSetlist = setlist;

             if (setError) throw new SyncAPIError(`Failed to fetch setlist ${entityId}: ${setError.message}`, 500);
             if (!typedSetlist) throw new SyncAPIError(`Setlist ${entityId} not found`, 404);

             if (typedSetlist.artist_id) {
                await invokeSyncFunction(supabaseAdmin, 'sync-artist', { artistId: typedSetlist.artist_id }, 'artist', typedSetlist.artist_id);
             }
             if (typedSetlist.show_id) {
                await invokeSyncFunction(supabaseAdmin, 'sync-show', { showId: typedSetlist.show_id }, 'show', typedSetlist.show_id);
             }
             // Trigger song enrichment based on setlist_songs junction table
             // Fetch song IDs associated with this setlist ID (UUID)
             // Need the setlist UUID first
             // Fetch setlist UUID using setlist_fm_id (which is unique per schema.sql)
             // Fetch setlist UUID using setlist_fm_id (which is unique per schema.sql)
             // Casting to 'any' to bypass potential deep type instantiation errors
             // Removing 'as any' cast, hoping regenerated types fix the deep instantiation error
             // Re-adding 'as any' cast to bypass potential deep type instantiation errors
             // Removing 'as any' cast - hopefully fixed by regenerated types
             const { data: setlistUUIDData } = await supabaseAdmin.from('setlists').select('id').eq('setlist_fm_id', entityId).maybeSingle();
             if (setlistUUIDData?.id) {
                 const { data: songLinks, error: songLinksError } = await supabaseAdmin
                   .from('setlist_songs')
                   .select('song_id')
                   .eq('setlist_id', setlistUUIDData.id);

                 // Cast link inside the loop
                 if (songLinksError) {
                    console.error(`[Expand Relations] Error fetching songs for setlist ${entityId}:`, songLinksError.message);
                 } else if (songLinks) {
                    for (const link of songLinks) {
                       // Type should now be inferred correctly, removing 'as any'
                       // Type should now be inferred correctly after regenerating types
                       const typedLinkLoop = link;
                       if (typedLinkLoop.song_id) {
                          await invokeSyncFunction(supabaseAdmin, 'sync-song', { songId: typedLinkLoop.song_id }, 'song', typedLinkLoop.song_id);
                       }
                    }
                 }
             } else {
                 console.warn(`[Expand Relations] Could not find internal UUID for setlist.fm ID ${entityId} to fetch songs.`);
             }
        } else {
           // Expand relations for artist/venue might involve external API calls (e.g., get upcoming shows)
           // which is better suited for cascade_sync or dedicated functions.
           console.warn(`expand_relations for ${entityType} is limited in this implementation. Use cascade_sync or specific actions.`);
           result = { success: true, message: `expand_relations for ${entityType} is limited. Use cascade_sync.` };
        }

      } else if (requestBody.operation === 'cascade_sync') {
         console.log(`Cascading sync for ${entityType} ID ${entityId}`);
         result = { success: true, message: `Cascade sync triggered for ${entityType} ${entityId}. Related entities syncing asynchronously.` }; // Immediate response

         if (entityType === 'artist') {
            // 1. Sync the artist first (await to ensure it exists for relation lookup)
            console.log(`[Cascade] Syncing primary artist ${entityId}...`);
            const { data: artistSyncData, error: artistSyncError } = await supabaseAdmin.functions.invoke('sync-artist', { body: { artistId: entityId } });
            if (artistSyncError || !artistSyncData?.success) {
               throw new SyncAPIError(`[Cascade] Failed to sync primary artist ${entityId}: ${artistSyncError?.message || artistSyncData?.error || 'Unknown error'}`, 500);
            }
            console.log(`[Cascade] Primary artist ${entityId} synced.`);

            // 2. Fetch related shows and setlists
            const { data: shows, error: showsError } = await supabaseAdmin.from('shows').select('id').eq('artist_id', entityId);
            // Casting to 'any' to bypass potential deep type instantiation errors
            // Removing 'as any' cast, hoping regenerated types fix the deep instantiation error
            // Re-adding 'as any' cast to bypass potential deep type instantiation errors
            // Removing 'as any' cast - hopefully fixed by regenerated types
            const { data: setlists, error: setlistsError } = await supabaseAdmin.from('setlists').select('setlist_fm_id').eq('artist_id', entityId); // Select setlist_fm_id

            if (showsError) console.error(`[Cascade] Error fetching shows for artist ${entityId}:`, showsError.message);
            if (setlistsError) console.error(`[Cascade] Error fetching setlists for artist ${entityId}:`, setlistsError.message);

            // 3. Trigger async sync for related items
            if (shows) {
               for (const show of shows) {
                  await invokeSyncFunction(supabaseAdmin, 'sync-show', { showId: show.id }, 'show', show.id);
               }
            }
            if (setlists) {
                for (const setlist of setlists) {
                   // Type should now be inferred correctly, removing 'as any'
                   // Type should now be inferred correctly after regenerating types
                   const typedSetlistLoop = setlist;
                   if (typedSetlistLoop.setlist_fm_id) { // Check if the ID exists
                      await invokeSyncFunction(supabaseAdmin, 'sync-setlist', { setlistId: typedSetlistLoop.setlist_fm_id }, 'setlist', typedSetlistLoop.setlist_fm_id);
                   }
                }
            }

         } else if (entityType === 'venue') {
            // 1. Sync the venue first (await) - venueId here is the external_id
            console.log(`[Cascade] Syncing primary venue ${entityId}...`);
            const { data: venueSyncData, error: venueSyncError } = await supabaseAdmin.functions.invoke('sync-venue', { body: { venueId: entityId } });
            if (venueSyncError || !venueSyncData?.success) {
                throw new SyncAPIError(`[Cascade] Failed to sync primary venue ${entityId}: ${venueSyncError?.message || venueSyncData?.error || 'Unknown error'}`, 500);
            }
            console.log(`[Cascade] Primary venue ${entityId} synced.`);
            const venueUUID = venueSyncData.data?.id; // Get the internal UUID from the sync result

            if (!venueUUID) {
                throw new SyncAPIError(`[Cascade] Could not determine internal UUID for venue ${entityId} after sync.`, 500);
            }

            // 2. Fetch related shows using the internal venue UUID (venue.id)
            const { data: shows, error: showsError } = await supabaseAdmin.from('shows').select('id').eq('venue_id', venueUUID);
            if (showsError) console.error(`[Cascade] Error fetching shows for venue ${entityId} (UUID: ${venueUUID}):`, showsError.message);

            // 3. Trigger async sync for related shows
            if (shows) {
                for (const show of shows) {
                   await invokeSyncFunction(supabaseAdmin, 'sync-show', { showId: show.id }, 'show', show.id);
                }
            }

         } else {
            throw new SyncAPIError('Cascade sync only supported for artist and venue', 400);
         }

      } else {
         // This case should be caught by earlier validation, but added for safety
         throw new SyncAPIError(`Unsupported operation: ${requestBody.operation}`, 400);
      }
    } catch (error) {
      // Specialized error handling for sync operations
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(error, { 
        operation: requestBody.operation, 
        entityType: requestBody.type, 
        entityId: requestBody.id 
      });
      
      throw new SyncAPIError(`Sync operation failed: ${errorMessage}`, 500, {
        code: 'sync_operation_failed',
        operationDetails: {
          operation: requestBody.operation,
          entityType: requestBody.type,
          entityId: requestBody.id
        }
      });
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      result,
      // queueStatus: syncManager.getQueueStatus() // Remove queue status
    }, { 
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    // Handle all errors in one place
    if (error instanceof SyncAPIError) {
      // Already formatted error
      logError(error, error.context);
      return NextResponse.json({
        error: error.message,
        code: error.context?.code || 'unknown_error',
        details: error.context
      }, { 
        status: error.status,
        headers: corsHeaders
      });
    } else {
      // Unexpected error
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(error, { requestBody });
      return NextResponse.json({
        error: 'Internal server error',
        code: 'internal_error',
        message: errorMessage
      }, { 
        status: 500,
        headers: corsHeaders
      });
    }
  }
}

/**
 * API route for checking sync status
 */
export async function GET(_request: NextRequest) { // Prefixed unused 'request' parameter
  try {
    // Check if user is authenticated
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      throw new SyncAPIError(`Authentication error: ${authError.message}`, 401, { code: 'auth_error' });
    }
    
    if (!user) {
      throw new SyncAPIError('Authentication required', 401, { code: 'auth_required' });
    }
    
    // Get queue status
    // const queueStatus = syncManager.getQueueStatus(); // Remove queue status
    
    return NextResponse.json({
      success: true,
      // queueStatus // Remove queue status
      status: "Queue status endpoint deprecated." // Or return relevant status if needed
    }, { 
      status: 200,
      headers: corsHeaders 
    });
    
  } catch (error) {
    // Handle all errors
    if (error instanceof SyncAPIError) {
      // Already formatted error
      logError(error, error.context);
      return NextResponse.json({
        error: error.message,
        code: error.context?.code || 'unknown_error',
        details: error.context
      }, { 
        status: error.status,
        headers: corsHeaders
      });
    } else {
      // Unexpected error
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(error);
      return NextResponse.json({
        error: 'Internal server error',
        code: 'internal_error',
        message: errorMessage
      }, { 
        status: 500,
        headers: corsHeaders
      });
    }
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
} 