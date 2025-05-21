import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { ArtistSyncService } from '@/lib/sync/artist-service';
import { VenueSyncService } from '@/lib/sync/venue-service';
import { ShowSyncService } from '@/lib/sync/show-service';
import { SongSyncService } from '@/lib/sync/song-service';
// Import APIClientManager to call Setlist.fm directly
import { APIClientManager } from '@/lib/sync/api-client';

// Initialize services (Keep for now, might be used by other cases)
const artistService = new ArtistSyncService();
const venueService = new VenueSyncService();
const showService = new ShowSyncService();
const songService = new SongSyncService();
const apiClient = new APIClientManager(); // Initialize API client

// Define expected structure for Setlist.fm search response
interface SetlistFmSearchResult {
  setlist?: Array<{
    id: string;
    eventDate: string;
    venue?: { name?: string; city?: { name?: string } };
    // Add other fields if needed
  }>;
  // Add other top-level fields like 'total', 'page', 'itemsPerPage' if needed
}

/**
 * API route for searching external data sources
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const query = searchParams.get('query');
    const city = searchParams.get('city');
    const stateCode = searchParams.get('state');

    if (!type || !query) {
      return NextResponse.json(
        { error: 'Missing required parameters: type and query' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    if (type !== 'venue') {
      return NextResponse.json(
        { error: `Unsupported search type: ${type}` },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    // Call the searchVenues method from the venue service
    const results = await venueService.searchVenues(
      query,
      city || undefined,
      stateCode || undefined
    );

    return NextResponse.json(
      { results },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  } catch (error) {
    console.error('Search API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to perform search', details: error instanceof Error ? error.message : String(error) },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * API route for getting artist top songs
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    // Use server client for auth check and invoking functions
    const supabaseAdmin = createClient();
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    if (!body.type || !body.id) {
      return NextResponse.json(
        { error: 'Missing required fields: type, id' },
        { status: 400 }
      );
    }
    
    let results: any[] = [];
    
    // Execute request based on type
    switch (body.type) {
      case 'artist_top_songs':
        results = await songService.getArtistTopSongs(body.id, body.limit || 10);
        break;
        
      case 'artist_upcoming_shows':
        results = await artistService.getArtistUpcomingShows(body.id);
        break;
        
      case 'venue_upcoming_shows':
        results = await venueService.getVenueUpcomingShows(body.id);
        break;
        
      case 'artist_setlists':
        // Fetch artist name needed for Setlist.fm API
        const { data: artist } = await supabaseAdmin
          .from('artists')
          .select('name')
          .eq('id', body.id) // body.id should be the artist UUID
          .single();

        if (!artist) {
          return NextResponse.json({ error: `Artist not found for ID: ${body.id}` }, { status: 404 });
        }

        // Fetch recent setlists directly from Setlist.fm API
        const limit = body.limit || 10;
        let rawSetlistData: SetlistFmSearchResult['setlist'] = []; // Use defined type
        try {
           // Cast the response after checking it's not null/undefined
           const response = await apiClient.callAPI(
             'setlistfm',
             'search/setlists',
             {
               artistName: artist.name,
               p: 1,
               sort: 'date'
             }
           ) as SetlistFmSearchResult | null; // Cast the result

           // Check if response and setlist property exist
           if (response?.setlist) {
              rawSetlistData = response.setlist;
           }
        } catch (apiError) {
            console.error(`Error fetching setlists from Setlist.fm for artist ${artist.name}:`, apiError);
            // Decide if you want to return an error or empty results
            // return NextResponse.json({ error: 'Failed to fetch setlists from Setlist.fm' }, { status: 502 });
        }

        // Process results: trigger sync and return basic info
        const processedIds = new Set<string>();
        results = []; // Store basic info to return

        for (const setlist of rawSetlistData) {
          if (results.length >= limit) break;
          if (!setlist.id || processedIds.has(setlist.id)) continue;

          processedIds.add(setlist.id);

          // Return basic info about the setlist
          results.push({
            id: setlist.id,
            eventDate: setlist.eventDate,
            venue: setlist.venue?.name,
            city: setlist.venue?.city?.name,
            // Add other relevant basic fields if needed
          });

          // Asynchronously invoke the sync function (fire-and-forget)
          // No need to await this in the API route response path
          supabaseAdmin.functions.invoke('sync-setlist', {
            body: { setlistId: setlist.id }
          }).then(({ data, error }) => {
            if (error) {
              console.error(`Error invoking sync-setlist for ${setlist.id}:`, error);
            } else if (!data?.success) {
              console.warn(`sync-setlist function reported failure for ${setlist.id}:`, data?.error || data?.message);
            } else {
              console.log(`Successfully invoked sync-setlist for ${setlist.id}`);
            }
          }).catch(invokeError => {
             console.error(`Exception invoking sync-setlist for ${setlist.id}:`, invokeError);
          });
        }
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid request type' },
          { status: 400 }
        );
    }
    
    return NextResponse.json(
      { 
        success: true, 
        results,
        count: results.length
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in search API (POST):', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 