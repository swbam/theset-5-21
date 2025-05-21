import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
// Removed unused icons/components for this specific file after refactor
// import { Calendar, MapPin, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
// import { Badge } from '@/components/ui/badge';
import ShowCard from '@/components/shows/ShowCard'; // Import the new ShowCard
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client

// Define the Show interface
interface Show {
  id: string;
  name?: string;
  date?: string;
  image_url?: string;
  ticket_url?: string;
  popularity?: number;
  vote_count?: number;
  artist?: {
    id: string;
    name: string;
    image_url?: string;
    genres?: string[];
  };
  venue?: {
    id: string;
    name: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

// Function to fetch trending shows from the Supabase cache table
const fetchTrendingShowsFromCache = async (): Promise<Show[]> => {
  try {
    // Query the cache table, join with shows, artists, venues
    const { data, error } = await supabase
      .from('trending_shows_cache')
      .select(`
        rank,
        show: shows (
          id,
          external_id,
          name,
          date,
          image_url,
          ticket_url,
          popularity,
          artist: artists (
            id,
            name,
            image_url,
            genres
          ),
          venue: venues (
            id,
            name,
            city,
            state,
            country
          )
        )
      `)
      .order('rank', { ascending: true })
      .limit(4); // Limit to top 4 directly in query

    if (error) {
      throw error;
    }

    // Define the expected shape of the data returned by the Supabase query
    type TrendingCacheItem = {
      rank: number;
      // Define the shape of the 'show' object returned by the query
      show: {
        id: string;
        external_id: string | null; // Ensure this matches the query
        name: string | null;
        date: string | null;
        image_url: string | null;
        ticket_url: string | null;
        popularity: number | null;
        artist: {
          id: string;
          name: string | null;
          image_url: string | null;
          genres: string[] | null;
        } | null;
        venue: {
          id: string;
          name: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
        } | null;
      } | null;
    } | null;

    // Extract and explicitly map to the imported Show type
    const shows: Show[] = data?.map((item: TrendingCacheItem) => {
      const dbShow = item?.show;
      // Construct a new object conforming strictly to the Show type
      return {
        id: dbShow?.id || '',
        name: dbShow?.name || 'Untitled Show', // Provide default here
        date: dbShow?.date || null,
        image_url: dbShow?.image_url || null,
        ticket_url: dbShow?.ticket_url || null,
        popularity: dbShow?.popularity || 0,
        artist: dbShow?.artist ? { ...dbShow.artist, name: dbShow.artist.name || 'Unknown Artist' } : null,
        venue: dbShow?.venue ? { ...dbShow.venue, name: dbShow.venue.name || 'Unknown Venue' } : null,
        // Add other fields from Show type if necessary, ensure defaults
        external_id: dbShow?.external_id || undefined, // Add if needed by ShowCard/Link
      } as Show;
    }).filter((show): show is Show => !!show?.id) || []; // Use type predicate in filter

    console.log('Fetched trending shows from cache:', shows);
    return shows;

  } catch (error) {
    console.error('Error fetching trending shows from cache:', error);
    throw error;
  }
};

const TrendingShows = () => {
  // Use the new fetch function
  const { data: showsData = [], isLoading, error } = useQuery({
    queryKey: ['trendingShowsCache'], // Use a different query key
    queryFn: fetchTrendingShowsFromCache,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes on the client
    retry: 1, // Retry once on error
  });

  // Removed formatDate and getShowGenre as they are handled within ShowCard or not needed

  // Data is already sorted and limited by the DB query
  const trendingShows = showsData;


  return (
    <section className="py-16 px-4 bg-gradient-to-b from-black/90 to-black">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">Trending Shows</h2>
            <p className="text-base text-white/70 mt-1">Shows with the most active voting right now</p>
          </div>
          <Link to="/shows" className="text-white hover:text-white/80 font-medium flex items-center group">
            View all <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="bg-black/40 rounded-xl overflow-hidden border border-white/10">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <div className="flex items-center mb-2">
                    <Skeleton className="h-4 w-4 rounded-full mr-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 rounded-full mr-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-white/60">Unable to load trending shows</p>
          </div>
        ) : trendingShows.length === 0 ? ( // Check the new variable
          <div className="text-center py-10">
            <p className="text-white/60">No trending shows found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Use the reusable ShowCard component */}
            {trendingShows.map((show) => (
              <ShowCard key={show.id} show={show} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default TrendingShows;
