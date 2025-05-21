import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Use standard client import
import { SetlistSyncService } from '@/lib/sync/setlist-service';

// Create Supabase admin client directly using environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const setlistSyncService = new SetlistSyncService();

export async function GET(
  request: NextRequest,
  { params }: { params: { artistId: string } }
) {
  const { artistId } = params;
  
  try {
    // We don't necessarily need to fetch the artist here first,
    // the sync service and DB query can handle it.
    // const { data: artist, error: artistError } = await supabase
    //   .from('artists')
    //   .select('id, name, setlist_fm_mbid')
    //   .eq('id', artistId)
    //   .single();
    // if (artistError) {
    //   return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    // }
    
    // Removed unused variable assignment
    // const setlists = await setlistSyncService.getArtistSetlists(artistId, 50);

    // Let's assume for now getArtistSetlists returns the setlist data directly
    // and we need to fetch associated show data separately if required by frontend.
    // A simpler approach might be to query the 'setlists' table directly after ensuring sync.

    // Trigger sync in background (don't await) - let the service handle if needed
    setlistSyncService.getArtistSetlists(artistId, 10).catch(err => {
        console.error("Background setlist sync trigger failed:", err);
    });

    // Query DB directly for the data structure needed by the frontend
     const { data: setlistData, error: dbError } = await supabase
       .from('setlists')
       .select(`
         id: setlist_fm_id,  // Use setlist_fm_id as the primary identifier here
         date,
         venue,
         venue_city,
         tour_name,
         show ( id, date ),  // Join show data if needed
         setlist_songs ( song_id, name, position, encore, songs (id, name) ) // Join songs
       `)
       .eq('artist_id', artistId)
       .order('date', { ascending: false })
       .limit(50);

     if (dbError) {
       throw dbError; // Let the main error handler catch this
     }

    return NextResponse.json({
      data: setlistData || [],
      fromCache: true // Indicate data is from DB cache/sync
    });
  } catch (error) {
    console.error('Setlist fetch error:', error);
    
    // Log the error
    await supabase
      .from('error_logs')
      .insert({
        endpoint: 'setlist-api',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      
    return NextResponse.json(
      { error: 'Failed to fetch setlists' },
      { status: 500 }
    );
  }
} 