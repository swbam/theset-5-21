/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore: Cannot find module 'next/server' type declarations
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/db';
// import { saveArtistToDatabase, saveVenueToDatabase, saveShowToDatabase } from '../../../lib/api/database-utils'; // Module not found
// import { fetchAndStoreArtistTracks } from '../../../lib/api/database'; // Unused import

/**
 * Test endpoint to verify our database integration is working properly
 */
export async function GET() { // Remove unused request parameter
  // Define type for test results
  type TestResult = {
    name: string;
    success: boolean;
    error: string | null;
    details: string | null;
  };
  const tests: TestResult[] = []; // Initialize with type
  let allSuccess = true;

  // Test 1: Verify we can connect to Supabase
  try {
    const { error } = await supabase.from('artists').select('count', { count: 'exact', head: true }); // Use head query for connection test

    tests.push({
      name: 'Supabase Connection',
      success: !error,
      error: error?.message || null, // Use null if no error message
      details: error ? null : 'Successfully connected to Supabase'
    });

    if (error) allSuccess = false;
  } catch (error) {
    tests.push({
      name: 'Supabase Connection',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: null
    });
    allSuccess = false;
  }

  // --- Tests 2-5 commented out due to missing database-utils functions ---
  /*
  try {
    // Test 2: Save an artist
    const testArtist = {
      id: 'test-artist-' + new Date().getTime(),
      name: 'Test Artist',
      image: 'https://example.com/test.jpg',
      spotify_id: 'spotify:test:' + new Date().getTime()
    };
    // const savedArtist = await saveArtistToDatabase(testArtist); // Function missing
    const savedArtist = null; // Placeholder

    tests.push({
      name: 'Save Artist',
      success: !!savedArtist,
      error: !savedArtist ? 'Failed to save artist (Test Disabled)' : null,
      details: savedArtist ? `Saved artist ${savedArtist.name}` : null
    });
    if (!savedArtist) allSuccess = false;

    // Test 3: Save a venue
    if (savedArtist) {
      const testVenue = {
        id: 'test-venue-' + new Date().getTime(),
        name: 'Test Venue',
        city: 'Test City',
        state: 'TS',
        country: 'Test Country'
      };
      // const savedVenue = await saveVenueToDatabase(testVenue); // Function missing
      const savedVenue = null; // Placeholder

      tests.push({
        name: 'Save Venue',
        success: !!savedVenue,
        error: !savedVenue ? 'Failed to save venue (Test Disabled)' : null,
        details: savedVenue ? `Saved venue ${savedVenue.name}` : null
      });
      if (!savedVenue) allSuccess = false;

      // Test 4: Save a show
      if (savedVenue) {
        const testShow = {
          id: 'test-show-' + new Date().getTime(),
          name: 'Test Show',
          date: new Date().toISOString(),
          artist_id: savedArtist.id,
          venue_id: savedVenue.id,
          // artist: savedArtist, // Pass IDs, not full objects if function expects that
          // venue: savedVenue
        };
        // const savedShow = await saveShowToDatabase(testShow); // Function missing
        const savedShow = null; // Placeholder

        tests.push({
          name: 'Save Show',
          success: !!savedShow,
          error: !savedShow ? 'Failed to save show (Test Disabled)' : null,
          details: savedShow ? `Saved show ${savedShow.name}` : null
        });
        if (!savedShow) allSuccess = false;

        // Test 5: Check that a setlist was created
        if (savedShow) {
          const { data: setlist, error: setlistError } = await supabase
            .from('setlists')
            .select('id, setlist_songs(id)')
            .eq('show_id', savedShow.id)
            .maybeSingle();

          const hasSetlist = !!setlist;
          const hasSongs = hasSetlist && Array.isArray(setlist.setlist_songs) && setlist.setlist_songs.length > 0;

          tests.push({
            name: 'Setlist Creation',
            success: hasSetlist && hasSongs,
            error: setlistError?.message || (!hasSetlist ? 'No setlist created (Test Disabled)' : (!hasSongs ? 'Setlist has no songs (Test Disabled)' : null)),
            details: (hasSetlist && hasSongs) ? `Setlist created with ${setlist.setlist_songs.length} songs` : null
          });
          if (!hasSetlist || !hasSongs) allSuccess = false;
        }
      }
    }
  } catch (error) {
    tests.push({
      name: 'Database Integration Tests (2-5)', // Clarify which tests failed
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during save tests',
      details: null
    });
    allSuccess = false;
  }
  */
  // --- End of commented out tests ---

  // Add placeholder results for disabled tests
   tests.push({ name: 'Save Artist', success: false, error: 'Test disabled', details: null });
   tests.push({ name: 'Save Venue', success: false, error: 'Test disabled', details: null });
   tests.push({ name: 'Save Show', success: false, error: 'Test disabled', details: null });
   tests.push({ name: 'Setlist Creation', success: false, error: 'Test disabled', details: null });
   if (allSuccess) allSuccess = false; // Mark overall as failed due to disabled tests


  // Return overall result
  try { // Added outer try-catch for the final response generation
    return NextResponse.json({
      success: allSuccess,
      message: allSuccess ? 'All database integration tests passed' : 'Some tests failed or were disabled',
      tests
    });
  } catch (error) {
    // Fallback error response if JSON serialization fails
    console.error("Error generating final test response:", error);
    return NextResponse.json({
      success: false,
      message: 'Failed to generate test results response',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
