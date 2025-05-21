
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callTicketmasterApi } from "../ticketmaster-config";
import { getArtistByName } from "@/lib/spotify";

/**
 * Fetch artist details by ID
 */
export async function fetchArtistById(artistId: string): Promise<any> {
  try {
    console.log(`Fetching artist details for ID: ${artistId}`);
    
    // Since we're getting database permission errors, 
    // let's skip the database check and fetch directly from Ticketmaster API
    
    // If not in database, fetch from Ticketmaster for non-tm- prefixed IDs
    if (!artistId.startsWith('tm-')) {
      // For actual TM IDs, fetch using attraction endpoint
      try {
        const data = await callTicketmasterApi(`attractions/${artistId}.json`);
        
        if (!data) {
          throw new Error("Artist not found");
        }
        
        const artistData: any = {
          id: data.id,
          name: data.name,
          image: data.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
          genres: [],
          upcomingShows: 0,  // We'll count these when we fetch shows
          spotify_id: null,
          stored_tracks: null
        };
        
        if (data.classifications && data.classifications.length > 0) {
          if (data.classifications[0].genre?.name) {
            artistData.genres.push(data.classifications[0].genre.name);
          }
          if (data.classifications[0].subGenre?.name) {
            artistData.genres.push(data.classifications[0].subGenre.name);
          }
        }
        
        // Look up Spotify ID by artist name
        try {
          const spotifyArtist = await getArtistByName(artistData.name);
          if (spotifyArtist && spotifyArtist.id) {
            console.log(`Found Spotify ID ${spotifyArtist.id} for artist ${artistData.name}`);
            artistData.spotify_id = spotifyArtist.id;
          }
        } catch (spotifyError) {
          console.error(`Error fetching Spotify details for ${artistData.name}:`, spotifyError);
        }
        
        return artistData;
      } catch (fetchError) {
        console.error("Error fetching artist by ID:", fetchError);
        // Fall back to keyword search
      }
    }
    
    // For tm- prefixed IDs or if attraction endpoint failed, extract name and search
    const searchTerm = artistId.startsWith('tm-') 
      ? decodeURIComponent(artistId.replace('tm-', '')).replace(/-/g, ' ')
      : artistId;
    
    console.log(`Searching for artist by name: ${searchTerm}`);
    
    // Search for artist using Ticketmaster API
    const data = await callTicketmasterApi('attractions.json', {
      keyword: searchTerm
    });
    
    if (data._embedded?.attractions && data._embedded.attractions.length > 0) {
      const attraction = data._embedded.attractions[0];
      
      const artistData = {
        id: attraction.id,
        name: attraction.name,
        image: attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
        genres: [],
        upcomingShows: 0,
        spotify_id: null
      };
      
      if (attraction.classifications && attraction.classifications.length > 0) {
        if (attraction.classifications[0].genre?.name) {
          artistData.genres.push(attraction.classifications[0].genre.name);
        }
        if (attraction.classifications[0].subGenre?.name) {
          artistData.genres.push(attraction.classifications[0].subGenre.name);
        }
      }
      
      // Look up Spotify ID by artist name
      try {
        const spotifyArtist = await getArtistByName(artistData.name);
        if (spotifyArtist && spotifyArtist.id) {
          console.log(`Found Spotify ID ${spotifyArtist.id} for artist ${artistData.name}`);
          artistData.spotify_id = spotifyArtist.id;
        }
      } catch (spotifyError) {
        console.error(`Error fetching Spotify details for ${artistData.name}:`, spotifyError);
      }
      
      return artistData;
    }
    
    throw new Error("Artist not found");
  } catch (error) {
    console.error("Error in fetchArtistById:", error);
    throw error;
  }
}
