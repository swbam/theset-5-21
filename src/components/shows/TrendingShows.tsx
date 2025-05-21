
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { fetchFeaturedShows } from '@/lib/ticketmaster';

const TrendingShows = () => {
  // Fetch trending shows
  const { 
    data: trendingShows = [], 
    isLoading: isTrendingLoading,
  } = useQuery({
    queryKey: ['trendingShows'],
    queryFn: () => fetchFeaturedShows(4),
  });

  // Generate genre badges for trending shows
  const getShowGenre = (show: any) => {
    if (show.genre) return show.genre;
    if (show.artist?.genres?.[0]) return show.artist.genres[0];
    
    // Assign a random genre for demo purposes if none exists
    const genres = ['Pop', 'Rock', 'Hip-hop', 'Latin', 'R&B', 'Country', 'Electronic'];
    return genres[Math.floor(Math.random() * genres.length)];
  };

  return (
    <section className="px-4 md:px-8 lg:px-12 py-16 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Trending Shows</h2>
            <p className="text-sm text-white/70 mt-1">Shows with the most active voting right now</p>
          </div>
          <Link to="/shows" className="flex items-center text-sm text-white hover:text-white/80">
            View all <ChevronRight size={16} />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isTrendingLoading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="bg-[#111111]/80 border-white/10 overflow-hidden">
                <div className="aspect-[4/3] bg-[#222]"></div>
                <CardContent className="p-4">
                  <div className="h-5 bg-[#333] rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-[#333] rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="h-4 w-4 rounded-full bg-[#333] mr-2"></div>
                      <div className="h-3 bg-[#333] rounded w-1/3"></div>
                    </div>
                    <div className="flex items-center">
                      <div className="h-4 w-4 rounded-full bg-[#333] mr-2"></div>
                      <div className="h-3 bg-[#333] rounded w-2/3"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            trendingShows.map((show: any) => {
              const genre = getShowGenre(show);
              const formattedDate = new Date(show.date).toLocaleDateString('en-US', {
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              });
              
              return (
                <Link key={show.id} to={`/shows/${show.id}`}>
                  <Card className="bg-[#111111]/80 border-white/10 overflow-hidden hover:border-white/30 transition duration-300 hover:scale-[1.02]">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {show.image_url ? (
                        <img 
                          src={show.image_url} 
                          alt={show.name}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#222]">
                          <Calendar className="h-8 w-8 text-white/40" />
                        </div>
                      )}
                      <Badge 
                        className="absolute top-3 right-3 bg-black/60 hover:bg-black/60 text-white"
                      >
                        {genre}
                      </Badge>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent pt-10">
                        <div className="flex items-center justify-end p-3">
                          <div className="flex items-center bg-white/10 rounded-full px-2 py-0.5">
                            <span className="text-white text-xs font-medium">
                              {Math.floor(Math.random() * 5000) + 1000}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg mb-1 line-clamp-1">
                        {show.name.split(' - ')[0]}
                      </h3>
                      <p className="text-white/70 text-sm mb-3 line-clamp-1">
                        {show.artist?.name || 'Unknown Artist'}
                      </p>
                      <div className="flex flex-col space-y-2 text-sm text-white/60">
                        <div className="flex items-center">
                          <Calendar size={16} className="mr-2" />
                          <span>{formattedDate}</span>
                        </div>
                        {show.venue && (
                          <div className="flex items-start">
                            <span className="min-w-[16px] mr-2 mt-1">📍</span>
                            <span className="line-clamp-1">
                              {`${show.venue.name}, ${show.venue.city || ''}`}
                              {show.venue.state ? `, ${show.venue.state}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};

export default TrendingShows;
