import { useQuery } from '@tanstack/react-query';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { ArtistWithEvents } from '@/lib/api/artist';
import { fetchArtistById } from '@/lib/api/artist';
import { Show } from '@/lib/types'; // Import Show type from central types file
import { fetchArtistEvents } from '@/lib/ticketmaster';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

// Define the return type for the hook
interface UseArtistDetailReturn {
  artist: ArtistWithEvents | null | undefined;
  shows: Show[];
  loading: {
    artist: boolean;
    shows: boolean;
  };
  error: {
    artist: Error | null;
    shows: Error | null;
  };
}


export function useArtistDetail(id: string | undefined): UseArtistDetailReturn { // Add return type here

  // Fetch artist details with improved error handling
  const {
    data: artist,
    isLoading: artistLoading,
    error: artistError
  } = useQuery({
    queryKey: ['artist', id],
    queryFn: async () => {
      try {
        const artistData = await fetchArtistById(id as string);
        return artistData;
      } catch (error) {
        console.error("Error fetching artist:", error);
        // Removed toast.error notification
        throw error;
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 60, // 60 minutes
    retry: 2
  });
  
  // Fetch upcoming shows for this artist with better error handling
  const {
    data: shows = [],
    isLoading: showsLoading,
    error: showsError
  } = useQuery({
    queryKey: ['artistEvents', id],
    queryFn: async () => {
      try {
        console.log('Fetching shows for artist:', id);
        // Always fetch fresh show data from the API
        return await fetchArtistEvents(id as string);
      } catch (error) {
        console.error("Error fetching shows:", error);
        // Removed toast.error notification
        return [];
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes - fetch more frequently
    retry: 2
  });
  
  // Set document title
  useDocumentTitle(
    artist?.name || 'Artist',
    artist?.name ? `View upcoming concerts and vote on setlists for ${artist.name}` : undefined
  );
  
  // Effect to save artist data to database when artist detail is viewed
  useEffect(() => {
    if (artist && artist.id) {
      console.log(`[useArtistDetail] Artist loaded, saving to database: ${artist.name} (${artist.id})`);
      
      // Invoke the sync-artist Edge Function
      console.log(`[useArtistDetail] Invoking sync-artist for ${artist.name} (ID: ${artist.id})`);
      supabase.functions.invoke('sync-artist', {
        body: { artistId: artist.id } // Pass only the ID
      }).then(({ data, error }) => {
        if (error) {
          console.error(`[useArtistDetail] Error invoking sync-artist for ${artist.name}:`, error);
          // Optionally show a toast error, but avoid blocking UI
          // toast.error(`Failed to sync artist ${artist.name}: ${error.message}`);
        } else if (!data?.success) {
          console.warn(`[useArtistDetail] sync-artist function failed for ${artist.name}:`, data?.error || data?.message);
          // Optionally show a toast warning
          // toast.warning(`Sync issue for artist ${artist.name}: ${data?.error || data?.message}`);
        } else {
          console.log(`[useArtistDetail] Successfully invoked sync-artist for ${artist.name}.`);
        }
      }).catch(invokeError => {
        console.error(`[useArtistDetail] Network exception invoking sync-artist for ${artist.name}:`, invokeError);
        // Optionally show a toast error
        // toast.error(`Network error syncing artist ${artist.name}`);
      });
    }
  }, [artist]);

  // Effect to trigger server-side saving for fetched shows asynchronously
  useEffect(() => {
    if (shows && shows.length > 0) {
      console.log(`[useArtistDetail] Triggering API save for ${shows.length} shows for artist ${artist?.name}`);
      shows.forEach(show => {
        // Invoke the sync-show Edge Function for each show
        // Ensure the show object has the correct ID expected by the function (likely Ticketmaster ID)
        const showId = show.ticketmaster_id || show.id; // Adjust based on your Show type and function expectation
        if (!showId) {
           console.warn(`[useArtistDetail] Skipping sync for show without ID: ${show.name}`);
           return;
        }

        console.log(`[useArtistDetail] Invoking sync-show for ${show.name} (ID: ${showId})`);
        supabase.functions.invoke('sync-show', {
          body: { showId: showId }
        }).then(({ data, error }) => {
          if (error) {
            console.error(`[useArtistDetail] Error invoking sync-show for ${show.name} (ID: ${showId}):`, error);
          } else if (!data?.success) {
            console.warn(`[useArtistDetail] sync-show function failed for ${show.name} (ID: ${showId}):`, data?.error || data?.message);
          } else {
            // console.log(`[useArtistDetail] Successfully invoked sync-show for ${show.name}.`);
            // Optionally trigger venue/setlist sync here if needed based on show data
            // if (data.data?.venue_id) { /* invoke sync-venue */ }
            // if (data.data?.setlist_id) { /* invoke sync-setlist */ }
          }
        }).catch(invokeError => {
          console.error(`[useArtistDetail] Network exception invoking sync-show for ${show.name} (ID: ${showId}):`, invokeError);
        });
      });
    }
  }, [shows, artist?.name]); // Dependency array includes shows and artist name for logging

  return {
    artist,
    shows,
    loading: {
      artist: artistLoading,
      shows: showsLoading
    },
    error: {
      artist: artistError,
      shows: showsError
    }
  };
}
