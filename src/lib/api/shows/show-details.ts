
import { toast } from "sonner";
import { callTicketmasterApi } from "../ticketmaster-config";
import { supabase } from "@/integrations/supabase/client";
import { saveArtistToDatabase, saveShowToDatabase, saveVenueToDatabase } from "../database-utils";

/**
 * Fetch details for a specific show
 */
export async function fetchShowDetails(eventId: string): Promise<any> {
  try {
    console.log(`Fetching details for show ID: ${eventId}`);
    
    // First check if we have this show in the database
    const { data: dbShow, error: dbError } = await supabase
      .from('shows')
      .select(`
        id, 
        name, 
        date, 
        artist_id,
        venue_id,
        ticket_url,
        image_url
      `)
      .eq('id', eventId)
      .maybeSingle();
    
    if (dbError) {
      console.error("Error fetching show from database:", dbError);
    }
    
    if (dbShow) {
      console.log(`Found show in database: ${dbShow.name}`);
      
      // Fetch related artist and venue
      const [artistResult, venueResult] = await Promise.all([
        dbShow.artist_id ? supabase
          .from('artists')
          .select('*')
          .eq('id', dbShow.artist_id)
          .maybeSingle() : null,
        dbShow.venue_id ? supabase
          .from('venues')
          .select('*')
          .eq('id', dbShow.venue_id)
          .maybeSingle() : null
      ]);
      
      const enrichedShow = {
        id: dbShow.id,
        name: dbShow.name,
        date: dbShow.date,
        artist: artistResult?.data || null,
        venue: venueResult?.data || null,
        ticket_url: dbShow.ticket_url,
        image_url: dbShow.image_url,
        artist_id: dbShow.artist_id,
        venue_id: dbShow.venue_id
      };
      
      console.log("Returning enriched show from database:", enrichedShow);
      return enrichedShow;
    }
    
    // If not in database, fetch from Ticketmaster
    console.log(`Show not found in database, fetching from Ticketmaster API...`);
    const event = await callTicketmasterApi(`events/${eventId}.json`);
    
    if (!event) {
      console.error(`No event found with ID: ${eventId}`);
      throw new Error("Show not found");
    }
    
    console.log(`Fetched show from Ticketmaster: ${event.name}`);
    
    // Get artist from attractions if available
    let artistName = '';
    let artistId = '';
    let artistData = null;
    
    if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
      const attraction = event._embedded.attractions[0];
      artistName = attraction.name;
      artistId = attraction.id;
      
      // Create artist object
      artistData = {
        id: artistId,
        name: artistName,
        image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
        upcoming_shows: 1
      };
      
      // Save artist to database
      const savedArtist = await saveArtistToDatabase(artistData);
      console.log(`Saved artist from show details: ${artistName}`, savedArtist ? "Success" : "Failed");
    } else {
      // Fallback to extracting from event name
      artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
      artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
      
      // Create minimal artist data
      artistData = {
        id: artistId,
        name: artistName
      };
      
      // Save this minimal artist too
      await saveArtistToDatabase(artistData);
    }
    
    // Process venue
    let venue = null;
    let venueId = null;
    if (event._embedded?.venues?.[0]) {
      const venueData = event._embedded.venues[0];
      venue = {
        id: venueData.id,
        name: venueData.name,
        city: venueData.city?.name,
        state: venueData.state?.name,
        country: venueData.country?.name,
        address: venueData.address?.line1
      };
      venueId = venueData.id;
      
      // Save venue to database
      const savedVenue = await saveVenueToDatabase(venue);
      console.log(`Saved venue from show details: ${venue.name}`, savedVenue ? "Success" : "Failed");
    }
    
    // Process and validate date
    let formattedDate = null;
    if (event.dates?.start?.dateTime) {
      try {
        // Validate the date string from Ticketmaster
        const dateObject = new Date(event.dates.start.dateTime);
        if (!isNaN(dateObject.getTime())) {
          formattedDate = dateObject.toISOString();
        } else {
          console.error('Invalid date from Ticketmaster:', event.dates.start.dateTime);
          // Fallback to localDate if available
          if (event.dates.start.localDate) {
            const localDate = new Date(event.dates.start.localDate);
            if (!isNaN(localDate.getTime())) {
              formattedDate = localDate.toISOString();
            }
          }
        }
      } catch (dateError) {
        console.error('Error processing show date:', dateError);
      }
    }
    
    // Create show object
    const show = {
      id: event.id,
      name: event.name,
      date: formattedDate,
      artist: artistData,
      venue: venue,
      ticket_url: event.url,
      image_url: event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
      artist_id: artistId,
      venue_id: venueId
    };
    
    // Save show to database
    const savedShow = await saveShowToDatabase(show);
    console.log(`Saved show from show details: ${show.name}`, savedShow ? "Success" : "Failed");
    
    return show;
  } catch (error) {
    console.error("Show details error:", error);
    toast.error("Failed to load show details");
    throw error;
  }
}
