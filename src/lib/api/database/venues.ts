
import { supabase } from "@/integrations/supabase/client";

/**
 * Save venue to database
 */
export async function saveVenueToDatabase(venue: any) {
  try {
    if (!venue || !venue.id) {
      console.error("Invalid venue object:", venue);
      return null;
    }
    
    console.log(`Processing venue: ${venue.name} (ID: ${venue.id})`);
    
    // Check if venue already exists
    try {
      const { data: dbVenue, error: checkError } = await supabase
        .from('venues')
        .select('id, updated_at')
        .eq('id', venue.id)
        .maybeSingle();
      
      if (checkError) {
        if (checkError.code === '42501') {
          console.log("Permission denied when checking venue", venue.name, "in database - continuing with API data");
        } else {
          console.error("Error checking venue in database:", checkError);
        }
        // Continue with insert/update anyway
      }
      
      // If venue exists and was updated recently, don't update it
      if (dbVenue) {
        const lastUpdated = new Date(dbVenue.updated_at || 0);
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate < 30) {
          console.log(`Venue ${venue.name} was updated ${daysSinceUpdate.toFixed(1)} days ago. No update needed.`);
          return dbVenue;
        }
        
        console.log(`Venue ${venue.name} exists but was updated ${daysSinceUpdate.toFixed(1)} days ago. Updating...`);
      } else {
        console.log(`Venue ${venue.name} is new, creating record`);
      }
    } catch (checkError) {
      console.error("Error checking if venue exists:", checkError);
      // Continue to try adding the venue anyway
    }
    
    // Prepare venue data for upsert
    const venueData = {
      id: venue.id,
      name: venue.name,
      address: venue.address,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      postal_code: venue.postal_code || venue.postalCode,
      image_url: venue.image_url || venue.imageUrl || venue.image,
      ticket_url: venue.ticket_url || venue.ticketUrl,
      website: venue.website || venue.url,
      capacity: venue.capacity || null,
      location: venue.location,
      updated_at: new Date().toISOString()
    };
    
    // Insert or update venue - wrapped in try/catch to handle permission errors
    try {
      const { data, error } = await supabase
        .from('venues')
        .upsert(venueData)
        .select();
      
      if (error) {
        if (error.code === '42501') {
          console.log("Permission denied when saving venue", venue.name, "- trying insert-only approach");
        } else {
          console.error("Error saving venue to database:", error);
        }
        
        // If it's a permission error, try an insert-only approach
        const { data: insertData, error: insertError } = await supabase
          .from('venues')
          .insert(venueData)
          .select();
          
        if (insertError) {
          console.error("Insert-only approach for venue also failed:", insertError);
          return venueData; // Return our data object as fallback
        }
        
        console.log(`Successfully inserted venue ${venue.name} using insert-only approach`);
        return insertData?.[0] || venueData;
      }
      
      console.log(`Saved venue: ${venue.name} to database: ${data ? 'Success' : 'No data returned'}`);
      return data?.[0] || venueData;
    } catch (saveError) {
      console.error("Error in saveVenueToDatabase:", saveError);
      return venueData; // Return our data object as fallback
    }
  } catch (error) {
    console.error("Error in saveVenueToDatabase:", error);
    return venue; // Return the original venue as fallback
  }
}
