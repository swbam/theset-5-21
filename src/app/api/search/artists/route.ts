import { NextRequest, NextResponse } from 'next/server';

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY || 'GkB8Z8XIJoZLR9RtAf4feBmP5GCCbRbC';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    // Get the search query
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json(
        { error: 'Artist name is required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Search for artists using Ticketmaster API
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/attractions.json?keyword=${encodeURIComponent(name)}&apikey=${TICKETMASTER_API_KEY}&size=10&classificationName=music`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );
    
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract only the relevant artist data
    const artists = data._embedded?.attractions?.map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      image: artist.images?.[0]?.url,
      url: artist.url,
      popularity: artist.popularity || null,
      upcomingEvents: artist.upcomingEvents?._total || 0,
      genres: artist.classifications?.[0]?.segment?.name === 'Music' 
        ? [
            artist.classifications[0].genre?.name, 
            artist.classifications[0].subGenre?.name
          ].filter(Boolean)
        : []
    })) || [];
    
    return NextResponse.json(
      { artists },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Artist search error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to search for artists',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 