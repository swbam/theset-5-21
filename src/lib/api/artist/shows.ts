
import { supabase } from "@/integrations/supabase/client";
import { callTicketmasterApi } from "../ticketmaster-config";
import { saveVenueToDatabase, saveShowToDatabase } from "../database";

/**
 * Fetch and save shows for an artist
 */
export async function fetchAndSaveArtistShows(artistId: string): Promise<void> {
  try {
    console.log(`Fetching shows for artist ID: ${artistId}`);
    
    // Call Ticketmaster API to get events for this artist
    const data = await callTicketmasterApi('events.json', {
      attractionId: artistId,
      sort: 'date,asc',
      size: '50'  // Get up to 50 shows
    });
    
    if (!data._embedded?.events) {
      console.log(`No upcoming shows found for artist ID: ${artistId}`);
      return;
    }
    
    console.log(`Found ${data._embedded.events.length} shows for artist ID: ${artistId}`);
    let upcomingShowsCount = 0;
    
    // Process and save each show
    for (const event of data._embedded.events) {
      try {
        const venueName = event._embedded?.venues?.[0]?.name || 'Unknown Venue';
        const venueId = event._embedded?.venues?.[0]?.id || `venue-${encodeURIComponent(venueName.toLowerCase().replace(/\s+/g, '-'))}`;
        
        // Save venue first
        const venueData = {
          id: venueId,
          name: venueName,
          city: event._embedded?.venues?.[0]?.city?.name,
          state: event._embedded?.venues?.[0]?.state?.name,
          country: event._embedded?.venues?.[0]?.country?.name,
          address: event._embedded?.venues?.[0]?.address?.line1,
          postal_code: event._embedded?.venues?.[0]?.postalCode,
          location: event._embedded?.venues?.[0]?.location
            ? { 
                latitude: event._embedded.venues[0].location.latitude, 
                longitude: event._embedded.venues[0].location.longitude 
              }
            : null
        };
        
        await saveVenueToDatabase(venueData);
        
        // Now save the show
        const showData = {
          id: event.id,
          name: event.name,
          date: event.dates?.start?.dateTime,
          artist_id: artistId,
          venue_id: venueId,
          ticket_url: event.url,
          image_url: event.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
          genre_ids: event.classifications?.map((c: any) => c.genre?.id).filter(Boolean) || []
        };
        
        await saveShowToDatabase(showData);
        upcomingShowsCount++;
      } catch (showError) {
        console.error(`Error saving show ${event.id}:`, showError);
      }
    }
    
    // Update the artist with the count of upcoming shows
    if (upcomingShowsCount > 0) {
      await supabase
        .from('artists')
        .update({ upcoming_shows: upcomingShowsCount, updated_at: new Date().toISOString() })
        .eq('id', artistId);
      
      console.log(`Updated artist ${artistId} with ${upcomingShowsCount} upcoming shows`);
    }
  } catch (error) {
    console.error(`Error fetching shows for artist ${artistId}:`, error);
  }
}
