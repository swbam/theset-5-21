
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
// import { Calendar, MapPin } from 'lucide-react'; // Icons handled by ShowCard
import { Skeleton } from '@/components/ui/skeleton';
import { fetchShowsByGenre, popularMusicGenres } from '@/lib/ticketmaster';
import ShowCard from '@/components/shows/ShowCard'; // Import the new ShowCard
import { Show } from '@/lib/types'; // Import the Show type

const UpcomingShows = () => {
  const [activeGenre, setActiveGenre] = useState("all");
  
  const { data: showsData = [], isLoading, error } = useQuery({
    queryKey: ['upcomingShows', activeGenre],
    queryFn: () => {
      if (activeGenre === "all") {
        return fetchShowsByGenre(popularMusicGenres[0].id, 3); // Default to first genre
      }
      return fetchShowsByGenre(activeGenre, 3);
    },
  });

  // Ensure unique shows by ID
  const shows = React.useMemo(() => {
    const uniqueMap = new Map();
    
    showsData.forEach(show => {
      if (!uniqueMap.has(show.id)) {
        uniqueMap.set(show.id, show);
      }
    });

    return Array.from(uniqueMap.values());
  }, [showsData]);

  // Removed formatDate as it's handled within ShowCard

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="section-header">
          <div>
            <h2 className="section-title">Upcoming Shows</h2>
            <p className="section-subtitle">Browse and vote on setlists for upcoming concerts</p>
          </div>
          <Link to="/shows" className="view-all-button">
            View all →
          </Link>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveGenre("all")}
            className={`genre-pill ${activeGenre === "all" ? "bg-white/20 border-white/30" : ""}`}
          >
            All Genres
          </button>
          {popularMusicGenres.slice(0, 6).map(genre => (
            <button
              key={genre.id}
              onClick={() => setActiveGenre(genre.id)}
              className={`genre-pill ${activeGenre === genre.id ? "bg-white/20 border-white/30" : ""}`}
            >
              {genre.name}
            </button>
          ))}
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="bg-black/20 border border-white/10 rounded-lg overflow-hidden">
                <Skeleton className="aspect-[16/9] w-full" />
                <div className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <div className="flex items-center mb-2">
                    <Skeleton className="h-4 w-4 rounded-full mr-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 rounded-full mr-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-white/60">Unable to load upcoming shows</p>
          </div>
        ) : shows.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-white/60">No upcoming shows found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Use the reusable ShowCard component */}
            {/* Need to adapt the data structure from fetchShowsByGenre if it doesn't match Show type */}
            {shows.map((show: Show) => ( // Assuming fetchShowsByGenre returns data compatible with Show type
              <ShowCard key={show.id} show={show} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default UpcomingShows;
