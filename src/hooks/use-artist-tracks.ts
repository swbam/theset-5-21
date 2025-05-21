
import { useQuery } from '@tanstack/react-query';
import { getArtistAllTracks } from '@/lib/spotify';
import { getStoredTracksForArtist, updateArtistStoredTracks, fetchAndStoreArtistTracks } from '@/lib/api/database';

export function useArtistTracks(
  artistId: string | undefined, 
  spotifyArtistId: string | undefined,
  options: { immediate?: boolean; prioritizeStored?: boolean } = { immediate: true, prioritizeStored: true }
) {
  const { 
    data,
    isLoading,
    error,
    isError,
    refetch
  } = useQuery({
    queryKey: ['artistTracks', artistId, spotifyArtistId],
    queryFn: async () => {
      if (!artistId && !spotifyArtistId) {
        throw new Error('Artist ID or Spotify Artist ID is required');
      }

      try {
        console.log(`Fetching tracks for artist: ${artistId || spotifyArtistId}`);
        
        // First check if we have stored tracks for this artist in database
        if (artistId) {
          const storedTracks = await getStoredTracksForArtist(artistId);
          
          if (storedTracks && storedTracks.length > 0) {
            console.log(`Using ${storedTracks.length} stored tracks from database for ${artistId}`);
            return { 
              tracks: storedTracks,
              initialSongs: storedTracks.slice(0, 10), // Only return top 10 for initial setlist
              storedTracksData: storedTracks,
              getAvailableTracks: (setlist: any[]) => {
                const setlistIds = new Set(setlist.map(song => song.id));
                return storedTracks.filter((track: any) => !setlistIds.has(track.id));
              }
            };
          }
        }
        
        // If no stored tracks but we have a Spotify ID and prioritizeStored is false, fetch from Spotify
        if (spotifyArtistId) {
          console.log(`Fetching from Spotify API for ${spotifyArtistId}`);
          
          if (artistId) {
            // Use the dedicated function that stores tracks and handles errors
            const tracks = await fetchAndStoreArtistTracks(artistId, spotifyArtistId, "Unknown Artist");
            if (tracks && tracks.length > 0) {
              console.log(`Successfully fetched and stored ${tracks.length} tracks from Spotify`);
              return { 
                tracks,
                initialSongs: tracks.slice(0, 10), // Only use top 10 tracks initially
                storedTracksData: tracks,
                getAvailableTracks: (setlist: any[]) => {
                  const setlistIds = new Set(setlist.map(song => song.id));
                  return tracks.filter((track: any) => !setlistIds.has(track.id));
                }
              };
            }
          }
          
          // Direct fetch as a fallback
          const result = await getArtistAllTracks(spotifyArtistId);
          
          if (result.tracks && result.tracks.length > 0) {
            console.log(`Fetched ${result.tracks.length} tracks from Spotify API`);
            
            // Store tracks in background if we have the artist ID
            if (artistId) {
              updateArtistStoredTracks(artistId, result.tracks)
                .then(() => console.log(`Successfully stored ${result.tracks.length} tracks in database`))
                .catch(err => console.error("Background track storage error:", err));
            }
            
            return {
              ...result,
              initialSongs: result.tracks.slice(0, 10),
              storedTracksData: result.tracks,
              getAvailableTracks: (setlist: any[]) => {
                const setlistIds = new Set(setlist.map(song => song.id));
                return result.tracks.filter((track: any) => !setlistIds.has(track.id));
              }
            };
          }
        }
        
        return { 
          tracks: [],
          initialSongs: [],
          storedTracksData: [],
          getAvailableTracks: () => []
        };
      } catch (error) {
        console.error("Error in useArtistTracks:", error);
        return { 
          tracks: [],
          initialSongs: [],
          storedTracksData: [],
          getAvailableTracks: () => []
        };
      }
    },
    enabled: !!(artistId || spotifyArtistId) && options.immediate !== false,
    staleTime: 1000 * 60 * 60 * 12, // 12 hours - tracks don't change often, so we can cache longer
    gcTime: 1000 * 60 * 120,   // 2 hours
  });

  return {
    ...data,
    isLoading,
    error,
    isError,
    refetch
  };
}
