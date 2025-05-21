/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Define the result types
interface ArtistSearchResult {
  id: string;
  name: string;
  images?: Array<{url: string, width?: number, height?: number}>;
  upcomingEvents?: number;
}

// Search for artists using Ticketmaster API
serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json();
    const { query, limit = 10 } = payload;

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid search query' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[search-artists] Searching for artists matching: "${query}"`);

    // Get Ticketmaster API key from environment
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Ticketmaster API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Search for attractions (artists) via Ticketmaster API
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/attractions.json?apikey=${apiKey}&keyword=${encodeURIComponent(query)}&size=${limit}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      console.error(`[search-artists] Ticketmaster API error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: `Ticketmaster API returned status ${response.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    const data = await response.json();
    const attractions = data._embedded?.attractions || [];

    // Transform results to our desired format
    const artists: ArtistSearchResult[] = attractions.map((attraction: any) => ({
      id: attraction.id,
      name: attraction.name,
      images: attraction.images || [],
      upcomingEvents: attraction.upcomingEvents?.total || 0
    }));

    console.log(`[search-artists] Found ${artists.length} artists matching "${query}"`);

    return new Response(
      JSON.stringify({ artists }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[search-artists] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 