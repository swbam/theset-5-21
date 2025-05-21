
import { fetchArtistById } from "@/lib/api/artist/fetch";
import { TestResults } from '../types';
import { logError, logSuccess } from '../logger';

/**
 * Step 1: Get artist details
 */
export async function getArtistDetails(
  results: TestResults, 
  artistId: string, 
  artistName: string
): Promise<any> {
  console.log(`\n📍 STEP 1: Fetching details for artist: "${artistName}" with ID: ${artistId}`);
  
  try {
    // This function first checks the database, then falls back to API if needed
    const artistDetails = await fetchArtistById(artistId);
    
    if (!artistDetails) {
      logError(results, "Artist Details", "API", `Failed to fetch details for artist: ${artistName}`);
      throw new Error(`Failed to fetch details for artist: ${artistName}`);
    }
    
    logSuccess(results, "Artist Details", `Successfully fetched details for artist: ${artistDetails.name} (Database/API)`, {
      id: artistDetails.id,
      name: artistDetails.name,
      spotifyId: artistDetails.spotify_id || "Not available",
      upcomingShows: artistDetails.upcoming_shows || 0
    });
    
    return artistDetails;
  } catch (error) {
    logError(results, "Artist Details", "API", `Error fetching artist details: ${(error as Error).message}`, error);
    throw error;
  }
}
