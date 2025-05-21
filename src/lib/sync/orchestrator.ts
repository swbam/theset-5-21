import { createClient } from '@/integrations/supabase/server';
import { SyncTask, EntityType, SyncOperation } from './types';

interface OrchestrationOptions {
  trackInDatabase?: boolean;
  parallelLimit?: number;
  dependencyCheck?: boolean;
  retryFailed?: boolean;
}

interface OrchestrationResult {
  success: boolean;
  taskId?: string;
  completedTasks?: number;
  failedTasks?: number;
  message?: string;
  errors?: string[];
}

/**
 * Orchestrator for data synchronization
 * - Centralizes all sync operations
 * - Manages dependencies between entities
 * - Tracks operations in database
 * - Handles retries and error reporting
 */
export async function orchestrateSync(
  tasks: SyncTask | SyncTask[],
  options: OrchestrationOptions = {}
): Promise<OrchestrationResult> {
  const {
    trackInDatabase = true,
    parallelLimit = 5,
    // dependencyCheck = true, // Removed as it's no longer used
    retryFailed = true
  } = options;

  const supabase = createClient();
  const taskList = Array.isArray(tasks) ? tasks : [tasks];
  const errors: string[] = [];
  
  // Create main task entry in database if tracking is enabled
  let mainTaskId: string | undefined;
  if (trackInDatabase) {
    try {
      const { data, error } = await supabase
        .from('sync_operations')
        .insert({
          task: 'orchestration',
          entity_type: 'batch',
          entity_id: 'multiple',
          status: 'started',
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (error) throw error;
      mainTaskId = data?.id;
    } catch (err) {
      console.error('Failed to create main sync task:', err);
      // Continue even if tracking fails
    }
  }
  
  // Sort tasks by priority
  const sortedTasks = [...taskList].sort((a, b) => {
    const priorityValues = { high: 3, medium: 2, low: 1 };
    return priorityValues[b.priority || 'medium'] - priorityValues[a.priority || 'medium'];
  });

  // Dependency check logic is removed as it's now handled within individual sync functions (e.g., sync-show awaits sync-artist/sync-venue)
  // if (dependencyCheck) {
  //   console.warn("[Orchestrator] Dependency pre-check is deprecated and bypassed.");
  //   // const enrichedTasks = await addDependencyTasks(sortedTasks);
  //   // sortedTasks.splice(0, sortedTasks.length, ...enrichedTasks);
  // }

  // Process tasks in batches based on parallelLimit
  let completedCount = 0;
  let failedCount = 0;
  
  // Process in batches for parallelism
  for (let i = 0; i < sortedTasks.length; i += parallelLimit) {
    const batch = sortedTasks.slice(i, i + parallelLimit);
    const results = await Promise.all(
      batch.map(task => processTask(task, mainTaskId, retryFailed))
    );
    
    results.forEach(result => {
      if (result.success) {
        completedCount++;
      } else {
        failedCount++;
        if (result.error) {
          errors.push(result.error);
        }
      }
    });
  }
  
  // Update main task if tracking is enabled
  if (trackInDatabase && mainTaskId) {
    try {
      await supabase
        .from('sync_operations')
        .update({
          status: failedCount > 0 ? 'completed_with_errors' : 'completed',
          completed_at: new Date().toISOString(),
          error: errors.length > 0 ? errors.join('\n') : null
        })
        .eq('id', mainTaskId);
    } catch (err) {
      console.error('Failed to update main sync task:', err);
      // Continue even if update fails
    }
  }
  
  return {
    success: failedCount === 0,
    taskId: mainTaskId,
    completedTasks: completedCount,
    failedTasks: failedCount,
    errors: errors.length > 0 ? errors : undefined,
    message: `Completed ${completedCount} tasks with ${failedCount} failures`
  };
}

/**
 * Process a single sync task
 */
async function processTask(
  task: SyncTask, 
  parentTaskId?: string,
  retry: boolean = true
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  let taskId: string | undefined;
  
  // Create task entry if parent exists
  if (parentTaskId) {
    try {
      const { data, error } = await supabase
        .from('sync_operations')
        .insert({
          task: task.operation,
          entity_type: task.type,
          entity_id: task.id,
          parent_task: parentTaskId,
          priority: task.priority,
          status: 'started',
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (error) throw error;
      taskId = data?.id;
    } catch (err) {
      console.error(`Failed to create sync task for ${task.type} ${task.id}:`, err);
      // Continue even if tracking fails
    }
  }
  
  try {
    // Map entity type to function name and the correct ID key expected by the function's payload
    // Note: The 'task.id' passed to orchestrateSync should be the relevant external ID (e.g., TM ID, Setlist.fm ID)
    const functionMap: Record<EntityType, { name: string; payloadIdKey: string }> = {
      artist: { name: 'sync-artist', payloadIdKey: 'tm_id' }, // sync-artist expects tm_id
      show: { name: 'sync-show', payloadIdKey: 'tm_id' },     // sync-show expects tm_id
      venue: { name: 'sync-venue', payloadIdKey: 'tm_id' },    // sync-venue expects tm_id
      setlist: { name: 'sync-setlist', payloadIdKey: 'setlistId' }, // sync-setlist expects setlistId (Setlist.fm ID)
      song: { name: 'sync-song', payloadIdKey: 'songId' }, // Assuming sync-song uses songId (Spotify ID or Supabase UUID?) - Verify if used
    };

    if (!functionMap[task.type]) {
      throw new Error(`Sync function mapping not found for type: ${task.type}`);
    }

    const { name: functionName, payloadIdKey } = functionMap[task.type];
    // Construct payload using the correct key expected by the target function
    const payload = { [payloadIdKey]: task.id, ...task.payload };

    // Invoke the appropriate Edge Function
    console.log(`Invoking ${functionName} for ${task.type} with ID ${task.id} (Payload Key: ${payloadIdKey})`);
    const { data: funcData, error: funcError } = await supabase.functions.invoke(functionName, {
      body: payload,
    });

    if (funcError) {
      throw new Error(`Error invoking ${functionName}: ${funcError.message}`);
    }
    
    if (!funcData?.success) {
      throw new Error(`Function ${functionName} reported failure: ${funcData?.error || 'Unknown function error'}`);
    }
    
    // Update task status
    if (taskId) {
      await supabase
        .from('sync_operations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error processing task ${task.type} ${task.id}:`, error);
    
    // Update task status
    if (taskId) {
      await supabase
        .from('sync_operations')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error)
        })
        .eq('id', taskId);
    }
    
    // Retry once if enabled
    if (retry && (!task.attempts || task.attempts < 1)) {
      console.log(`Retrying task ${task.type} ${task.id}`);
      return processTask({
        ...task,
        attempts: (task.attempts || 0) + 1
      }, parentTaskId, false);
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Removed deprecated addDependencyTasks function as logic is now within sync functions

/**
 * Helper function for creating artist sync task
 */
export function syncArtist(artistId: string, operation: SyncOperation = 'refresh'): SyncTask {
  return {
    type: 'artist',
    id: artistId,
    priority: 'high',
    operation
  };
}

/**
 * Helper function for creating show sync task
 */
export function syncShow(showId: string, operation: SyncOperation = 'refresh'): SyncTask {
  return {
    type: 'show',
    id: showId,
    priority: 'medium',
    operation
  };
}

/**
 * Helper function for creating venue sync task
 */
export function syncVenue(venueId: string, operation: SyncOperation = 'refresh'): SyncTask {
  return {
    type: 'venue',
    id: venueId,
    priority: 'low',
    operation
  };
}

/**
 * Helper function for creating setlist sync task
 */
export function syncSetlist(setlistId: string, operation: SyncOperation = 'refresh'): SyncTask {
  return {
    type: 'setlist',
    id: setlistId,
    priority: 'medium',
    operation
  };
}

/**
 * Helper function for creating song sync task
 */
export function syncSong(songId: string, operation: SyncOperation = 'refresh'): SyncTask {
  return {
    type: 'song',
    id: songId,
    priority: 'low',
    operation
  };
}
