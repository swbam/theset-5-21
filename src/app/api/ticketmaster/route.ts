/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore: Cannot find module 'next/server' type declarations
import { NextResponse } from 'next/server';

// Ticketmaster API key from environment variables
const TICKETMASTER_API_KEY = process.env.VITE_TICKETMASTER_API_KEY || import.meta.env.VITE_TICKETMASTER_API_KEY;

// Ticketmaster API base URL
const API_BASE_URL = 'https://app.ticketmaster.com/discovery/v2/';

export async function GET(request: Request) {
  try {
    // Get endpoint and params from query string
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');
    
    // Validate endpoint
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint parameter' },
        { status: 400 }
      );
    }
    
    // Create a new URL for the Ticketmaster API
    const apiUrl = new URL(endpoint, API_BASE_URL);
    
    // Add API key
    apiUrl.searchParams.append('apikey', TICKETMASTER_API_KEY);
    
    // Copy all other search params except 'endpoint'
    url.searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        apiUrl.searchParams.append(key, value);
      }
    });
    
    console.log(`Proxying Ticketmaster API request to: ${apiUrl.toString()}`);
    
    // Make the request to Ticketmaster API
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    // Get the response data
    const data = await response.json();
    
    // Return the response
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error proxying Ticketmaster API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Ticketmaster API' },
      { status: 500 }
    );
  }
}