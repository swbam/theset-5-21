
import { toast } from "sonner";
import { callTicketmasterApi } from "../ticketmaster-config";
import { supabase } from "@/integrations/supabase/client";
import { saveVenueToDatabase } from "../database-utils";

/**
 * Fetch venue details
 */
export async function fetchVenueDetails(venueId: string): Promise<any> {
  try {
    // First check if we have this venue in the database
    const { data: venue, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching venue from database:", error);
    }
    
    if (venue) {
      return venue;
    }
    
    // If not in database, fetch from Ticketmaster
    const venueData = await callTicketmasterApi(`venues/${venueId}.json`);
    
    // Create venue object
    const venueObject = {
      id: venueData.id,
      name: venueData.name,
      city: venueData.city?.name,
      state: venueData.state?.name,
      country: venueData.country?.name,
      address: venueData.address?.line1,
      postal_code: venueData.postalCode,
      location: {
        latitude: venueData.location?.latitude,
        longitude: venueData.location?.longitude
      }
    };
    
    // Save venue to database
    await saveVenueToDatabase(venueObject);
    
    return venueObject;
  } catch (error) {
    console.error("Venue details error:", error);
    toast.error("Failed to load venue details");
    throw error;
  }
}
