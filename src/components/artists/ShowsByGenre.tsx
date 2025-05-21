
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchShowsByGenre } from '@/lib/ticketmaster';
import { ChevronRight, CalendarDays, MapPin, Music } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface ShowsByGenreProps {
  genreId: string;
  genreName: string;
  limit?: number;
}

const ShowsByGenre: React.FC<ShowsByGenreProps> = ({ 
  genreId, 
  genreName,
  limit = 8
}) => {
  const { data: shows = [], isLoading } = useQuery({
    queryKey: ['showsByGenre', genreId],
    queryFn: () => fetchShowsByGenre(genreId, limit * 2), // Fetch extra to ensure we have enough after deduplication
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Deduplicate shows by ID
  const uniqueShows = React.useMemo(() => {
    const uniqueMap = new Map();
    shows.forEach(show => {
      if (!uniqueMap.has(show.id)) {
        uniqueMap.set(show.id, show);
      }
    });
    return Array.from(uniqueMap.values()).slice(0, limit); // Limit to requested number
  }, [shows, limit]);

  // Format date function
  const formatDate = (dateString?: string) => {
    if (!dateString) return "TBA";
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "TBA";
      }
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return "TBA";
    }
  };

  return (
    <section className="px-6 md:px-8 lg:px-12 py-16 bg-gradient-to-b from-[#0A0A16] to-[#10101E]">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-semibold">Shows by {genreName}</h3>
          <Link to={`/shows?genre=${encodeURIComponent(genreName)}`} className="text-white text-sm hover:underline flex items-center group">
            View all <ChevronRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="border border-white/10 rounded-lg overflow-hidden bg-black/20">
                <Skeleton className="h-32 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : uniqueShows.length === 0 ? (
          <div className="text-center py-8 border border-white/10 rounded-lg bg-black/20">
            <Music className="h-10 w-10 mx-auto text-white/40 mb-3" />
            <p className="text-white/60 mb-4">No upcoming shows found for this genre</p>
            <Button asChild variant="default" size="sm">
              <Link to="/shows">Browse all shows</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uniqueShows.map((show) => (
              <Link
                key={show.id}
                to={`/shows/${show.id}`}
                className="group rounded-lg border border-white/10 overflow-hidden hover:shadow-md transition-all hover:border-white/30 bg-black/20"
              >
                <div className="relative h-32 overflow-hidden">
                  {show.image_url ? (
                    <img
                      src={show.image_url}
                      alt={show.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary">
                      <Music className="h-8 w-8 text-white/40" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h4 className="font-medium text-sm line-clamp-1 group-hover:text-white transition-colors">
                    {show.name}
                  </h4>
                  <p className="text-white/90 text-xs mt-1 line-clamp-1">
                    {show.artist?.name || "Various Artists"}
                  </p>
                  <div className="mt-2 flex items-center text-xs text-white/60">
                    <CalendarDays size={14} className="mr-1" />
                    <span>{formatDate(show.date)}</span>
                  </div>
                  <div className="mt-1 flex items-center text-xs text-white/60">
                    <MapPin size={14} className="mr-1" />
                    <span className="line-clamp-1">
                      {show.venue?.name}, {show.venue?.city || "Location TBA"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ShowsByGenre;
