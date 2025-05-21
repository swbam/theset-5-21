
// Re-export all Spotify API functions and types
// Removed export for './auth' as the file was deleted (logic moved to Edge Functions)
export * from './artist-search'; // Restore export (remove .ts)
export * from './artist-tracks';
export * from './all-tracks'; // Restore export (remove .ts)
export * from './top-tracks';
export * from './user-recommendations';
export * from './types';
export * from './utils';

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Improved function for fetching user's top artists with enhanced error handling
export const getMyTopArtists = async () => {
  try {
    console.log("Fetching top artists from Spotify...");
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error("No active session");
      toast.error("Please sign in to access your top artists");
      return [];
    }
    
    if (!session.provider_token) {
      console.error("No Spotify provider token available");
      toast.error("Unable to access Spotify. Please reconnect your account.");
      return [];
    }
    
    console.log("Using provider token to fetch artists from Spotify");
    const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=20', {
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
      },
    });
    
    if (!response.ok) {
      // Handle common errors
      if (response.status === 401) {
        console.error("Spotify token expired or invalid:", response.status);
        toast.error("Spotify access expired. Please sign in again.");
        // Force sign out on token expiration to trigger a fresh login
        await supabase.auth.signOut();
      } else if (response.status === 403) {
        console.error("Spotify permission denied:", response.status);
        toast.error("Missing permission to access your Spotify data");
      } else {
        console.error("Spotify API error:", response.status, await response.text());
        toast.error(`Spotify API error (${response.status})`);
      }
      return [];
    }
    
    const data = await response.json();
    console.log(`Found ${data.items?.length || 0} top artists from Spotify`);
    
    // Save artists to database in the background
    if (data.items && data.items.length > 0) {
      saveTopArtistsToDatabase(data.items);
    }
    
    // Define a type for the raw artist object from Spotify API
    type SpotifyApiArtist = { id: string; name: string; images?: { url: string }[]; genres?: string[]; popularity?: number; external_urls?: { spotify?: string }; followers?: { total?: number }; [key: string]: unknown };

    return data.items.map((artist: SpotifyApiArtist) => ({
      id: artist.id,
      name: artist.name,
      image: artist.images?.[0]?.url || '/placeholder.svg',
      genres: artist.genres || [],
      popularity: artist.popularity,
      spotifyUrl: artist.external_urls?.spotify,
      followers: artist.followers?.total
    }));
  } catch (error) {
    console.error("Error fetching top artists:", error);
    toast.error("Failed to load artists from Spotify");
    return [];
  }
};

// Helper function to save top artists to database
// Define a type for the artist data used in this function
type TopArtistData = { id: string; name: string; images?: { url: string }[]; genres?: string[]; popularity?: number; external_urls?: { spotify?: string }; followers?: { total?: number }; [key: string]: unknown };

async function saveTopArtistsToDatabase(artists: TopArtistData[]) {
  try {
    for (const artist of artists) {
      const artistData = {
        id: artist.id,  // Use Spotify ID as the ID
        name: artist.name,
        image_url: artist.images?.[0]?.url,
        genres: artist.genres || [],
        popularity: artist.popularity,
        spotify_id: artist.id,
        spotify_url: artist.external_urls?.spotify,
        followers: artist.followers?.total,
        updated_at: new Date().toISOString()
      };
      
      try {
        // Check if artist exists
        const { data: existingArtist, error: checkError } = await supabase
          .from('artists')
          .select('id')
          .eq('spotify_id', artist.id)
          .maybeSingle();
        
        if (checkError) {
          console.error("Error checking artist in database:", checkError);
          continue;
        }
        
        if (existingArtist) {
          // Update existing artist
          const { error: updateError } = await supabase
            .from('artists')
            .update(artistData)
            .eq('spotify_id', artist.id);
          
          if (updateError) {
            console.error("Error updating artist:", updateError);
          }
        } else {
          // Insert new artist
          const { error: insertError } = await supabase
            .from('artists')
            .insert(artistData);
          
          if (insertError) {
            console.error("Error inserting artist:", insertError);
          }
        }
      } catch (dbError) {
        console.error("Database error saving artist:", dbError);
      }
    }
  } catch (error) {
    console.error("Error saving top artists to database:", error);
  }
}
