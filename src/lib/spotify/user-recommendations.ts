import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Get user's top artists directly from Spotify API
 */
export const getUserTopArtists = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.provider_token) {
      console.log("No provider token available");
      toast.error("Please sign in with Spotify to see your top artists");
      return [];
    }
    
    const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=10', {
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        toast.error("Spotify session expired. Please sign in again.");
        await supabase.auth.signOut();
      } else {
        toast.error(`Failed to fetch your top artists (${response.status})`);
      }
      throw new Error(`Error fetching top artists: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Failed to fetch user's top artists:", error);
    return [];
  }
};

/**
 * Get recommendations based on seed artists from Spotify API
 */
export const getRecommendations = async (seedArtists: string[]) => {
  try {
    if (!seedArtists.length) {
      console.log("No seed artists provided for recommendations");
      return [];
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.provider_token) {
      console.log("No provider token available");
      toast.error("Please sign in with Spotify to get recommendations");
      return [];
    }
    
    const response = await fetch(
      `https://api.spotify.com/v1/recommendations?seed_artists=${seedArtists.slice(0, 5).join(',')}&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${session.provider_token}`,
        },
      }
    );
    
    if (!response.ok) {
      if (response.status === 401) {
        toast.error("Spotify session expired. Please sign in again.");
        await supabase.auth.signOut();
      } else {
        toast.error(`Failed to fetch recommendations (${response.status})`);
      }
      throw new Error(`Error fetching recommendations: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.tracks || [];
  } catch (error) {
    console.error("Failed to fetch recommendations:", error);
    return [];
  }
};

/**
 * Get user's top artists from Spotify
 * In a full implementation, this would use the Spotify API with the user's access token
 */
export const getMyTopArtists = async () => {
  try {
    console.log('Fetching user top artists from Spotify API');
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('User not authenticated, returning mock data');
      return getMockTopArtists();
    }
    
    // In a real implementation, we would call Spotify API with the user's access token
    // For now, we'll simulate with database data
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .order('popularity', { ascending: false })
      .limit(9);
    
    if (error) throw error;
    
    console.log(`Fetched ${data.length} top artists for the user`);
    
    // Enhance the data with randomized popularity scores
    return data.map(artist => ({
      ...artist,
      popularity: artist.popularity || Math.floor(Math.random() * 30) + 70,
      upcoming_shows: artist.upcoming_shows || Math.floor(Math.random() * 5) + 1
    }));
  } catch (error) {
    console.error('Error getting user top artists:', error);
    return getMockTopArtists();
  }
};

/**
 * Get mock top artists for demo purposes
 */
const getMockTopArtists = () => {
  return [
    {
      id: 'K8vZ9171K77',
      name: 'Taylor Swift',
      image: 'https://s1.ticketm.net/dam/a/8af/da84e788-6ede-4e8a-8371-c42c0e4218af_SOURCE',
      genres: ['Pop', 'Pop Rock'],
      popularity: 98,
      upcoming_shows: 12
    },
    {
      id: 'K8vZ9171oC0',
      name: 'Ed Sheeran',
      image: 'https://s1.ticketm.net/dam/a/aad/31d32c76-3858-4929-a43c-5a5aadd68aad_SOURCE',
      genres: ['Pop', 'Singer-Songwriter'],
      popularity: 95,
      upcoming_shows: 8
    },
    {
      id: 'K8vZ9171oZ0',
      name: 'Beyoncé',
      image: 'https://s1.ticketm.net/dam/a/83c/6d4bf941-91c3-4293-b58a-84889fa0883c_SOURCE',
      genres: ['R&B', 'Pop'],
      popularity: 96,
      upcoming_shows: 5
    },
    {
      id: 'K8vZ9171580',
      name: 'Coldplay',
      image: 'https://s1.ticketm.net/dam/a/ba3/8ae00baa-ebf2-4c3b-be3e-6837d8a92ba3_SOURCE',
      genres: ['Alternative Rock', 'Pop Rock'],
      popularity: 91,
      upcoming_shows: 7
    },
    {
      id: 'K8vZ9171K9V',
      name: 'The Weeknd',
      image: 'https://s1.ticketm.net/dam/a/ca8/3f448f72-c2c2-4fe1-9ca3-49d0e15f5ca8_SOURCE',
      genres: ['R&B', 'Pop'],
      popularity: 93,
      upcoming_shows: 4
    }
  ];
};

/**
 * Get personalized show recommendations for the user
 */
export const getPersonalizedShowRecommendations = async (limit = 4) => {
  try {
    // First get top artists
    const topArtists = await getMyTopArtists();
    
    // Then fetch shows for these artists
    const { data: shows, error } = await supabase
      .from('shows')
      .select('*, artist(*), venue(*)')
      .in('artist_id', topArtists.map(a => a.id))
      .order('date', { ascending: true })
      .limit(limit);
    
    if (error) throw error;
    
    return shows;
  } catch (error) {
    console.error('Error getting personalized show recommendations:', error);
    return [];
  }
};
