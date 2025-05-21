import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShowCard from '@/components/shows/ShowCard';
import { fetchShowsByGenre, popularMusicGenres } from '@/lib/ticketmaster';

interface UpcomingShowsSectionProps {
  searchQuery: string;
  selectedGenre: string;
  handleGenreChange: (value: string) => void;
  artistParam: string | null;
}

const UpcomingShowsSection = ({ 
  searchQuery, 
  selectedGenre, 
  handleGenreChange,
  artistParam 
}: UpcomingShowsSectionProps) => {
  const [activeGenreFilter, setActiveGenreFilter] = useState('All Genres');
  
  // Fetch upcoming shows based on filter criteria
  const { 
    data: upcomingShows = [], 
    isLoading: isUpcomingLoading,
    error
  } = useQuery({
    queryKey: ['upcomingShows', selectedGenre, artistParam],
    queryFn: async () => {
      try {
        if (artistParam) {
          // Fetch shows for this artist
          const { fetchArtistEvents } = await import('@/lib/ticketmaster');
          return fetchArtistEvents(artistParam);
        } else if (selectedGenre) {
          // Find the genre ID based on name
          const genreObj = popularMusicGenres.find(g => g.name === selectedGenre);
          if (genreObj) {
            return fetchShowsByGenre(genreObj.id, 6);
          } 
          return [];
        } else {
          // Default to featured shows if no filters
          return fetchShowsByGenre(popularMusicGenres[0].id, 6);
        }
      } catch (error) {
        console.error("Error fetching shows:", error);
        return [];
      }
    }
  });

  // Filter shows based on search input
  const filteredShows = upcomingShows.filter((show: any) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      show.name?.toLowerCase().includes(query) ||
      show.artist?.name?.toLowerCase().includes(query) ||
      show.venue?.name?.toLowerCase().includes(query) ||
      show.venue?.city?.toLowerCase().includes(query)
    );
  });

  return (
    <section className="px-4 md:px-8 lg:px-12 py-16 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Upcoming Shows</h2>
            <p className="text-sm text-white/70 mt-1">Browse and vote on setlists for upcoming concerts</p>
          </div>
          <Link to="/shows" className="flex items-center text-sm text-white hover:text-white/80">
            View all <ChevronRight size={16} />
          </Link>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => {
              setActiveGenreFilter('All Genres');
              handleGenreChange('');
            }}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${
              activeGenreFilter === 'All Genres'
                ? 'bg-white text-black font-medium'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            All Genres
          </button>
          
          {popularMusicGenres.slice(0, 6).map(genre => (
            <button
              key={genre.id}
              onClick={() => {
                setActiveGenreFilter(genre.name);
                handleGenreChange(genre.name);
              }}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${
                activeGenreFilter === genre.name
                  ? 'bg-white text-black font-medium'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>
        
        {isUpcomingLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-[#111111]/80 border border-white/10 rounded-lg overflow-hidden">
                <div className="aspect-[16/9] bg-[#222]"></div>
                <div className="p-4">
                  <div className="h-5 bg-[#333] rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-[#333] rounded w-1/2 mb-4"></div>
                  <div className="flex items-center mb-2">
                    <div className="h-4 w-4 rounded-full bg-[#333] mr-2"></div>
                    <div className="h-3 bg-[#333] rounded w-1/3"></div>
                  </div>
                  <div className="flex items-center">
                    <div className="h-4 w-4 rounded-full bg-[#333] mr-2"></div>
                    <div className="h-3 bg-[#333] rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 border border-white/10 rounded-lg">
            <p className="text-lg text-red-400 mb-4">Error loading shows</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        ) : filteredShows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShows.map((show: any) => (
              <ShowCard key={show.id} show={show} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-white/10 rounded-lg">
            <h3 className="text-lg font-medium mb-2">No shows found</h3>
            <p className="text-white/60">
              Try adjusting your search or browse artists to find shows
            </p>
            <Link 
              to="/artists" 
              className="inline-flex items-center text-white hover:underline mt-4"
            >
              Browse artists
              <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default UpcomingShowsSection;
