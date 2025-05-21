
import { testArtistHasTracks } from './tests/journey/steps/artistTracks';
import { supabase } from '@/integrations/supabase/client';
import { TestContext } from './tests/journey/types';
import { TEST_ARTIST_ID } from './tests/journey/config';

// Import types
import type { TestResults } from './tests/journey/types';

/**
 * Runs the complete user journey test
 */
export async function runUserJourneyTest(customArtistId?: string): Promise<TestResults> {
  const artistId = customArtistId || TEST_ARTIST_ID;
  console.log('Starting user journey test for artist ID:', artistId);
  
  // Create test context
  const testContext: TestContext = {
    artistId: artistId,
    spotifyArtistId: null,
    supabase,
    errors: [],
    successes: [],
  };
  
  const results: TestResults = {
    startTime: new Date(),
    endTime: null,
    errors: [],
    successes: [],
    completed: false,
    artistId: artistId,
    supabase
  };
  
  try {
    // Run the test steps
    
    // For now, just check the artist tracks
    // This is a placeholder for the actual step-by-step test process
    const tracksResult = await testArtistHasTracks(testContext);
    
    // Update test results from context
    results.errors = testContext.errors;
    results.successes = testContext.successes;
    results.success = tracksResult.success;
    results.message = tracksResult.message;
    
    if (tracksResult.success) {
      console.log("Artist tracks test succeeded:", tracksResult.message);
    } else {
      console.error("Artist tracks test failed:", tracksResult.message);
    }
    
    results.completed = true;
  } catch (error) {
    console.error("Error running user journey test:", error);
    
    results.errors.push({
      step: "Global",
      source: "Client",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
      details: error
    });
  } finally {
    results.endTime = new Date();
    results.completed = true;
    
    console.log(`Test completed with ${results.errors.length} errors and ${results.successes.length} successes`);
    return results;
  }
}

// Export types correctly using 'export type' syntax
export type { TestResults, TestContext } from './tests/journey/types';
