import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { orchestrateSync } from '@/lib/sync/orchestrator';
import { EntityType, SyncOperation, SyncTask } from '@/lib/sync/types';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * API route to initiate orchestrated sync operations
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return NextResponse.json(
        { error: `Authentication error: ${authError.message}` },
        { status: 401, headers: corsHeaders }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Parse the request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate tasks array or single task
    if (!requestBody.tasks && !requestBody.task) {
      return NextResponse.json(
        { error: 'Missing required field: tasks' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Format tasks
    let tasks: SyncTask[];
    
    if (requestBody.tasks) {
      // Handle array of tasks
      if (!Array.isArray(requestBody.tasks)) {
        return NextResponse.json(
          { error: 'Invalid tasks field: must be an array' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Validate each task
      tasks = requestBody.tasks.map((task: any) => validateTask(task)).filter(Boolean);
      
      if (tasks.length === 0) {
        return NextResponse.json(
          { error: 'No valid tasks provided' },
          { status: 400, headers: corsHeaders }
        );
      }
    } else {
      // Handle single task
      const task = validateTask(requestBody.task);
      if (!task) {
        return NextResponse.json(
          { error: 'Invalid task' },
          { status: 400, headers: corsHeaders }
        );
      }
      tasks = [task];
    }
    
    // Parse options
    const options = {
      trackInDatabase: requestBody.trackInDatabase !== false,
      parallelLimit: requestBody.parallelLimit || 5,
      dependencyCheck: requestBody.dependencyCheck !== false,
      retryFailed: requestBody.retryFailed !== false,
    };
    
    // Execute orchestrated sync
    const result = await orchestrateSync(tasks, options);
    
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error('Orchestrator error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Validate and normalize a task object
 */
function validateTask(task: any): SyncTask | null {
  if (!task || typeof task !== 'object') {
    return null;
  }
  
  // Validate required fields
  if (!task.type || !task.id || !task.operation) {
    return null;
  }
  
  // Validate entity type
  const validEntityTypes: EntityType[] = ['artist', 'venue', 'show', 'setlist', 'song'];
  if (!validEntityTypes.includes(task.type as EntityType)) {
    return null;
  }
  
  // Validate operation
  const validOperations: SyncOperation[] = ['create', 'refresh', 'expand_relations', 'cascade_sync'];
  if (!validOperations.includes(task.operation as SyncOperation)) {
    return null;
  }
  
  // Validate priority
  const validPriorities = ['high', 'medium', 'low'];
  if (task.priority && !validPriorities.includes(task.priority)) {
    task.priority = 'medium'; // Default to medium if invalid
  }
  
  return {
    type: task.type,
    id: task.id,
    operation: task.operation,
    priority: task.priority || 'medium',
    payload: task.payload || {},
    attempts: task.attempts || 0
  };
}

/**
 * Get status of sync operations
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return NextResponse.json(
        { error: `Authentication error: ${authError.message}` },
        { status: 401, headers: corsHeaders }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Parse URL parameters
    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const status = url.searchParams.get('status');
    
    let query = supabase
      .from('sync_operations')
      .select('*', { count: 'exact' });
    
    // Apply filters if provided
    if (taskId) {
      query = query.eq('id', taskId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    // Apply pagination
    query = query
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const { data, count, error } = await query;
    
    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500, headers: corsHeaders }
      );
    }
    
    return NextResponse.json({
      tasks: data,
      total: count,
      limit,
      offset
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching sync operations:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 