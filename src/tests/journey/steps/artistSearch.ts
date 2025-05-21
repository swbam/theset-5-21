
import { searchArtistsWithEvents } from "@/lib/api/artist/search";
import { TestResults } from '../types';
import { logError, logSuccess } from '../logger';

/**
 * Step 1: Search for an artist
 */
export async function searchForArtist(
  results: TestResults, 
  artistName: string
): Promise<any[]> {
  console.log(`\n📍 STEP 1: Searching for artist: "${artistName}" (Simulating user typing in search bar)`);
  
  try {
    // This API call searches the database first, then falls back to Ticketmaster API if needed
    const artists = await searchArtistsWithEvents(artistName);
    
    if (!artists || artists.length === 0) {
      logError(results, "Artist Search", "API", `No artists found for query: ${artistName}`);
      throw new Error(`No artists found for query: ${artistName}`);
    }
    
    logSuccess(results, "Artist Search", `Found ${artists.length} artists matching "${artistName}" (API & Database combined)`, {
      artistCount: artists.length,
      firstArtistId: artists[0].id,
      firstArtistName: artists[0].name
    });
    
    return artists;
  } catch (error) {
    logError(results, "Artist Search", "API", `Error searching for artist: ${(error as Error).message}`, error);
    throw error;
  }
}
