/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore: Cannot find module 'next/server' type declarations
import { NextResponse } from 'next/server';
import { retryableFetch } from '@/lib/retry';

/**
 * Search for venues using Ticketmaster API
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    
    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }
    
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Ticketmaster API key not configured' }, { status: 500 });
    }
    
    // Search for venues using Ticketmaster Discovery API
    const url = `https://app.ticketmaster.com/discovery/v2/venues.json?apikey=${apiKey}&keyword=${encodeURIComponent(keyword)}&size=20`;
    
    const response = await retryableFetch(async () => {
      const result = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!result.ok) {
        throw new Error(`Ticketmaster API error: ${result.status} ${result.statusText}`);
      }
      
      return result.json();
    }, { retries: 3 });
    
    // Extract venue data from response
    const venues = response._embedded?.venues || [];
    
    // Format venue data for client
    const formattedVenues = venues.map((venue: any) => ({
      id: venue.id,
      name: venue.name,
      city: venue.city?.name,
      state: venue.state?.name || venue.state?.stateCode,
      country: venue.country?.name || venue.country?.countryCode,
      address: venue.address?.line1,
      postalCode: venue.postalCode,
      location: {
        latitude: venue.location?.latitude,
        longitude: venue.location?.longitude,
      },
      url: venue.url,
      image_url: venue.images?.[0]?.url,
    }));
    
    return NextResponse.json({
      success: true,
      query: keyword,
      total: formattedVenues.length,
      venues: formattedVenues
    });
  } catch (error) {
    console.error('Error searching venues:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error searching venues'
    }, { status: 500 });
  }
}
