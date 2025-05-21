import { callTicketmasterApi } from "../ticketmaster-config";
import { supabase } from "@/integrations/supabase/client";
import { saveArtistToDatabase, saveShowToDatabase, saveVenueToDatabase } from "../database-utils";

/**
 * Fetch upcoming shows by genre
 */
export async function fetchShowsByGenre(genreId: string, limit = 8): Promise<any[]> {
  try {
    // First check if we have shows in the database for this genre
    const { data: dbShows, error: dbError } = await supabase
      .from('shows')
      .select(`
        id, 
        name, 
        date, 
        artist_id,
        venue_id,
        ticket_url,
        image_url,
        genre_ids
      `)
      .contains('genre_ids', [genreId])
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(limit);
    
    if (dbError) {
      console.error("Error fetching shows by genre from database:", dbError);
    }
    
    // If we have shows in the database, enrich them with artist and venue data
    if (dbShows && dbShows.length > 0) {
      const enrichedShows = await Promise.all(dbShows.map(async (show) => {
        const [artistResult, venueResult] = await Promise.all([
          show.artist_id ? supabase
            .from('artists')
            .select('*')
            .eq('id', show.artist_id)
            .maybeSingle() : null,
          show.venue_id ? supabase
            .from('venues')
            .select('*')
            .eq('id', show.venue_id)
            .maybeSingle() : null
        ]);
        
        return {
          id: show.id,
          name: show.name,
          date: show.date,
          artist: artistResult?.data || null,
          venue: venueResult?.data || null,
          ticket_url: show.ticket_url,
          image_url: show.image_url
        };
      }));
      
      return enrichedShows;
    }
    
    // Fetch from Ticketmaster API
    const data = await callTicketmasterApi('events.json', {
      classificationId: genreId,
      segmentName: 'Music',
      sort: 'relevance,desc', // Sort by relevance to get popular shows first
      size: limit.toString()
    });

    if (!data._embedded?.events) {
      return [];
    }

    const shows = await Promise.all(data._embedded.events.map(async (event: any) => {
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
          upcoming_shows: 1,
          genres: [event.classifications?.[0]?.genre?.name].filter(Boolean)
        };
        
        // Save artist to database
        await saveArtistToDatabase(artistData);
      } else {
        // Fallback to extracting from event name
        artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
        artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
        
        // Create minimal artist data
        artistData = {
          id: artistId,
          name: artistName
        };
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
        };
        venueId = venueData.id;
        
        // Save venue to database
        await saveVenueToDatabase(venue);
      }
      
      // Create show object
      const show = {
        id: event.id,
        name: event.name,
        date: event.dates.start.dateTime,
        artist_id: artistId,
        venue_id: venueId,
        ticket_url: event.url,
        image_url: event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
        genre_ids: [genreId]
      };
      
      // Save show to database
      await saveShowToDatabase(show);
      
      return {
        ...show,
        artist: artistData,
        venue: venue
      };
    }));

    return shows;
  } catch (error) {
    console.error("Ticketmaster events by genre error:", error);
    return [];
  }
}
