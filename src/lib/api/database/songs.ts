import { supabase } from '@/integrations/supabase/client'; // Import the exported client instance
import { Song } from '@/lib/types'; // Assuming Song type is defined here or imported

// Remove the local client creation, use the imported instance
// const supabase = createClient(); 

/**
 * Fetches all songs for a given artist ID from the database.
 * @param artistId - The Supabase UUID of the artist.
 * @returns A promise that resolves to an array of songs or null if an error occurs.
 */
export async function getSongsByArtist(artistId: string): Promise<Song[] | null> {
  if (!artistId) {
    console.error('getSongsByArtist: artistId is required.');
    return null;
  }

  try {
    const { data: songs, error } = await supabase
      .from('songs')
      .select('*') // Select all song fields
      .eq('artist_id', artistId)
      .order('name', { ascending: true }); // Order songs alphabetically by name

    if (error) {
      console.error(`Error fetching songs for artist ${artistId}:`, error);
      return null;
    }

    return songs as Song[]; // Cast might be needed depending on Supabase client version/types
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error(`Exception fetching songs for artist ${artistId}:`, errorMsg);
    return null;
  }
}

// Add other song-related database functions here if needed...
