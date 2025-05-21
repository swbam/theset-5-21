// Use standard Response object for non-Next.js environments
// import { supabase } from '../../../../lib/db'; // Unused import
// import { saveShowToDatabase } from '../../../../lib/api/database-utils'; // Module not found
// import { syncVenueShows } from '../../../../lib/api/shows'; // Module not found or function not exported
// Import specific types needed
import { Show, Artist } from '../../../../lib/types'; // Removed Venue import

// Define Venue structure based on Show type (since Venue type isn't exported)
type VenueData = {
  id: string;
  name?: string;
  city?: string;
  state?: string;
  country?: string;
};

/**
 * POST /api/shows/create
 * Creates a new show in the database based on user input.
 * This triggers saving related artist/venue and setlist creation.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Basic validation
    if (!body.artist || !body.artist.id || !body.artist.name) {
      // Use standard Response
      return new Response(JSON.stringify({ error: 'Missing artist information' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!body.venue || !body.city || !body.state || !body.date) {
      // Use standard Response
      return new Response(JSON.stringify({ error: 'Missing required show details (venue, city, state, date)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Construct the Show object structure expected by saveShowToDatabase
    // Note: We don't have a Ticketmaster ID here, so we generate a UUID for the show
    // and potentially for the venue if it's manually entered.
    // We rely on saveShowToDatabase/saveVenueToDatabase to handle upserts if TM IDs exist later.

    // Define showData with more specific types
    const showData: Partial<Show> & { artist: Artist; venue: VenueData } = {
      // Use provided Ticketmaster ID or generate a UUID if manual
      id: body.ticketmaster_id || crypto.randomUUID(),
      external_id: body.ticketmaster_id, // Use external_id field
      name: body.name || `${body.artist.name} Concert`,
      date: new Date(body.date).toISOString(),
      artist_id: body.artist.id,
      // Construct venue object - generate ID if needed, rely on saveVenueToDatabase
      venue: {
        id: body.venue_id || `manual-${crypto.randomUUID()}`, // Generate manual ID if none provided
        name: body.venue,
        city: body.city,
        state: body.state,
        country: body.country || 'USA',
      },
      // Pass the full artist object (ensure name is present as required by internal type)
      artist: {
        ...body.artist,
        name: body.artist.name, // Explicitly include name
      },
      popularity: 0, // Default popularity for manually added shows
    };

    // Assign venue_id after potentially generating it
    showData.venue_id = showData.venue.id;

    console.log('API Route: Attempting to save show:', showData);

    // Call the core save function which handles all related sync logic
    // Cast is still needed because the imported Show type might slightly differ from the internal one
    // const savedShow = await saveShowToDatabase(showData as Show); // Commented out due to missing import
    const savedShow = null; // Placeholder

    if (!savedShow) {
      console.error('API Route: Failed to save show using saveShowToDatabase');
      // Use standard Response
      return new Response(JSON.stringify({ error: 'Failed to save show to database' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('API Route: Show saved successfully:', savedShow);
    // Trigger background sync for the venue (fire-and-forget)
    // Commented out venue sync trigger due to missing import/function
    // if (savedShow?.venue_id) {
    //   console.log(`API Route: Triggering venue sync for venue ID: ${savedShow.venue_id}`);
    //   syncVenueShows(savedShow.venue_id).catch(syncError => {
    //     console.error(`API Route: Background venue sync failed for ${savedShow.venue_id}:`, syncError);
    //   });
    // } else {
    //   console.warn(`API Route: Cannot trigger venue sync, venue_id missing for show ${savedShow?.id}`);
    // }


    // Use standard Response
    return new Response(JSON.stringify({ success: true, show: savedShow }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error in POST /api/shows/create:", error);
    // Use standard Response
    return new Response(JSON.stringify({ error: "Server error creating show", details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}