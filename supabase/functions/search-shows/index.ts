/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Define the result types
interface ShowSearchResult {
  id: string;
  name: string;
  date?: string;
  venue?: {
    id: string;
    name: string;
    city?: string;
    state?: string;
  };
  images?: Array<{url: string, width?: number, height?: number}>;
  url?: string;
}

// Search for shows/events using Ticketmaster API
serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json();
    const { artistId, limit = 20 } = payload;

    if (!artistId) {
      return new Response(
        JSON.stringify({ error: 'Missing artistId parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[search-shows] Searching for shows with artist ID: ${artistId}`);

    // Get Ticketmaster API key from environment
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Ticketmaster API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Search for events with the specified artist via Ticketmaster API
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&attractionId=${artistId}&sort=date,asc&size=${limit}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      console.error(`[search-shows] Ticketmaster API error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: `Ticketmaster API returned status ${response.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    const data = await response.json();
    const events = data._embedded?.events || [];

    // Transform results to our desired format
    const shows: ShowSearchResult[] = events.map((event: any) => {
      // Extract venue info if available
      const venue = event._embedded?.venues?.[0];
      
      return {
        id: event.id,
        name: event.name,
        date: event.dates?.start?.dateTime,
        venue: venue ? {
          id: venue.id,
          name: venue.name,
          city: venue.city?.name,
          state: venue.state?.name
        } : undefined,
        images: event.images || [],
        url: event.url
      };
    });

    console.log(`[search-shows] Found ${shows.length} shows for artist ${artistId}`);

    return new Response(
      JSON.stringify({ shows }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[search-shows] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 