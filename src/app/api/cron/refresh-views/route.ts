import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * API route to refresh materialized views
 * Should be called by a CRON job every hour
 * 
 * Uses the service role key to call database functions
 */
export async function GET(request: NextRequest) {
  try {
    // Extract API key from header
    const apiKey = request.headers.get('x-api-key');
    
    // Verify API key
    if (!apiKey || apiKey !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Call the database function to refresh all materialized views
    const { data, error } = await supabase.rpc('refresh_all_materialized_views');
    
    if (error) {
      console.error('Error refreshing materialized views:', error);
      return NextResponse.json({ error: 'Failed to refresh views' }, { status: 500 });
    }
    
    // Log the refresh operation
    await supabase
      .from('api_cache')
      .upsert({
        endpoint: 'refresh-views',
        data: { last_refreshed: new Date().toISOString() },
        expires_at: new Date(Date.now() + 86400000).toISOString() // 1 day
      }, {
        onConflict: 'endpoint'
      });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Materialized views refreshed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Unexpected error in refresh-views API:', error);
    
    // Log the error
    await supabase
      .from('error_logs')
      .insert({
        endpoint: 'refresh-views',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 