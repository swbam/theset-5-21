
import { supabase } from "@/integrations/supabase/client";
import { callTicketmasterApi } from "../ticketmaster-config";
import { fetchAndSaveArtistShows } from "./shows";

/**
 * Refresh artist data in the background
 */
export async function refreshArtistData(artistId: string, artistName: string): Promise<void> {
  try {
    console.log(`Refreshing data for artist ${artistName} (${artistId})`);
    
    // Fetch fresh data from Ticketmaster
    if (!artistId.startsWith('tm-')) {
      const data = await callTicketmasterApi(`attractions/${artistId}.json`);
      if (data) {
        const artistData = {
          id: data.id,
          name: data.name,
          image: data.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
          genres: data.classifications?.map((c: any) => c.genre?.name).filter(Boolean) || [],
          updated_at: new Date().toISOString()
        };
        
        await supabase
          .from('artists')
          .update(artistData)
          .eq('id', artistId);
      }
    }
    
    // Always fetch and update the shows
    await fetchAndSaveArtistShows(artistId);
    
    console.log(`Finished refreshing data for artist ${artistName}`);
  } catch (error) {
    console.error(`Error refreshing data for artist ${artistId}:`, error);
  }
}
