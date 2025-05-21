import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, MusicIcon } from 'lucide-react';
// Import the specific function and its return type
import { searchArtistsWithEvents, ArtistWithEvents } from '@/lib/api/artist';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SearchBar from '@/components/ui/SearchBar';
import ArtistSearchResults from '@/components/search/ArtistSearchResults';
import { useDocumentTitle } from '@/hooks/use-document-title';
// Base Artist type might still be needed for the payload, keep it for now
import type { Artist as BaseArtist } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client
import { toast } from 'sonner'; // Import toast for feedback
const Search = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const queryParam = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [debouncedQuery, setDebouncedQuery] = useState(queryParam);
  
  // Set document title
  useDocumentTitle(
    queryParam ? `Search: ${queryParam}` : 'Search',
    queryParam ? `Find artists, shows and venues matching "${queryParam}"` : 'Search for artists with upcoming shows'
  );

  // Update search query when URL parameter changes
  useEffect(() => {
    if (queryParam !== searchQuery) {
      setSearchQuery(queryParam);
      setDebouncedQuery(queryParam);
    }
  }, [queryParam]);

  // Debounce the search query to avoid making too many API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      
      // Update URL if query changes and is different from URL param
      if (searchQuery && searchQuery !== queryParam) {
        navigate(`/search?q=${encodeURIComponent(searchQuery)}`, { replace: true });
      } else if (!searchQuery && queryParam) {
        // Clear URL param if search is cleared
        navigate('/search', { replace: true });
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, navigate, queryParam]);
  
  // Fetch artists with upcoming shows from Ticketmaster
  // Use the correct return type from the query function
  const { data: artists = [], isLoading, error } = useQuery<ArtistWithEvents[]>({
    queryKey: ['artistsWithEvents', debouncedQuery],
    queryFn: () => searchArtistsWithEvents(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleArtistSelect = async (artist: ArtistWithEvents) => { // Use ArtistWithEvents type
    // Trigger the backend import process (fire-and-forget)
    console.log(`[Search Page] Triggering import for artist: ${artist.name} (ID: ${artist.id})`);
    try {
      // Ensure the artist object has the necessary fields (id, name)
      if (!artist || !artist.id || !artist.name) {
        console.error("[Search Page] Invalid artist data for import:", artist);
        // Navigate anyway, but log the error
        navigate(`/artists/${artist.id}`);
        // Navigate anyway, but show a toast
        toast.error("Cannot import artist: Invalid data.");
        navigate(`/artists/${artist.id}`);
        return;
      }

      // Prepare the data payload for the Edge Function
      // Map available fields from ArtistWithEvents to the BaseArtist type
      // Use Partial<BaseArtist> because we only have a subset of fields
      const artistPayload: Partial<BaseArtist> = {
        id: artist.id,       // Ticketmaster ID
        name: artist.name,
        image_url: artist.image, // Map from ArtistWithEvents.image
        genres: artist.genres,   // Map from ArtistWithEvents.genres
        // NOTE: spotify_id, popularity, followers, etc., are NOT available
        // directly from the searchArtistsWithEvents result (ArtistWithEvents type).
        // The import-artist Edge Function will need to fetch these if required.
      };
      // Remove undefined keys just in case (e.g., if artist.image was undefined)
      Object.keys(artistPayload).forEach(key => {
        if (artistPayload[key as keyof typeof artistPayload] === undefined) {
            delete artistPayload[key as keyof typeof artistPayload];
        }
      });

      console.log("[Search Page] Prepared payload for import:", artistPayload);
      // The lines below were incorrect remnants and are removed.
      // The payload is correctly defined above using available fields.
      // Invoke the Supabase Edge Function 'import-artist'
      // This is fire-and-forget, but we add basic logging/toast
      // Invoke the Supabase Edge Function 'import-artist'
      supabase.functions.invoke('import-artist', {
        body: artistPayload,
      })
      .then(({ data, error }) => {
        if (error) {
          console.error(`[Search Page] Error invoking import-artist function for ${artist.name}:`, error);
          toast.error(`Failed to start import for ${artist.name}: ${error.message}`);
        } else {
          console.log(`[Search Page] Successfully invoked import-artist function for ${artist.name}.`, data);
          // Optional: Show a success toast, but maybe not needed as user navigates away
          // toast.success(`Import started for ${artist.name}.`);
        }
      })
      .catch((invokeError) => {
         // Catch potential network errors during the invoke call itself
         console.error(`[Search Page] Network error invoking import-artist function for ${artist.name}:`, invokeError);
         toast.error(`Network error starting import for ${artist.name}.`);
      });
    } catch (error) {
       console.error(`[Search Page] Error preparing artist import for ${artist.name}:`, error);
    }

    // Navigate immediately after initiating the background import
    navigate(`/artists/${artist.id}`);
  };

  const showSearchResults = searchQuery.length > 2 && artists.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow px-6 md:px-8 lg:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">Find Artists with Upcoming Shows</h1>
          
          <div className="relative max-w-2xl mx-auto mb-12">
            <SearchBar 
              placeholder="Search for artists with upcoming shows..." 
              onSearch={handleSearch}
              onChange={setSearchQuery}
              className="w-full"
              value={searchQuery}
              disableRedirect={true}
            >
              {showSearchResults && (
                <ArtistSearchResults 
                  artists={artists} // Pass ArtistWithEvents[]
                  isLoading={isLoading}
                  onSelect={handleArtistSelect}
                />
              )}
            </SearchBar>
          </div>
          
          {!searchQuery && (
            <div className="text-center p-12 border border-border rounded-xl">
              <SearchIcon className="mx-auto mb-4 text-muted-foreground h-12 w-12" />
              <h3 className="text-xl font-medium mb-2">Search for artists with upcoming shows</h3>
              <p className="text-muted-foreground">
                Find artists and discover their upcoming concerts
              </p>
            </div>
          )}
          
          {searchQuery.length > 2 && !isLoading && artists.length === 0 && (
            <div className="text-center p-12 border border-border rounded-xl">
              <MusicIcon className="mx-auto mb-4 text-muted-foreground h-12 w-12" />
              <h3 className="text-xl font-medium mb-2">No artists found</h3>
              <p className="text-muted-foreground">
                Try a different search term or check back later for more shows
              </p>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Search;
