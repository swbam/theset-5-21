import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fetchFeaturedArtists } from '@/lib/api/artist';

const FeaturedArtistsSection = () => {
  // Fetch featured artists
  const { 
    data: featuredArtists = [], 
    isLoading: isArtistsLoading,
  } = useQuery({
    queryKey: ['featuredArtists'],
    queryFn: () => fetchFeaturedArtists(6),
  });

  return (
    <section className="px-4 md:px-8 lg:px-12 py-16 bg-[#0A0A12]">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Featured Artists</h2>
            <p className="text-sm text-white/70 mt-1">Top artists with upcoming shows to vote on</p>
          </div>
          <Link to="/artists" className="flex items-center text-sm text-white hover:text-white/80">
            View all <ChevronRight size={16} />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {isArtistsLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-black/40 border border-white/10 rounded-lg overflow-hidden">
                <div className="aspect-square bg-[#222]"></div>
                <div className="p-3">
                  <div className="h-4 bg-[#333] rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-[#333] rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : (
            featuredArtists.slice(0, 6).map((artist: any) => (
              <Link 
                key={artist.id} 
                to={`/artists/${artist.id}`}
                className="bg-black/40 border border-white/10 rounded-lg overflow-hidden hover:border-white/30 transition-all hover:scale-[1.02]"
              >
                <div className="aspect-square overflow-hidden relative">
                  {artist.image ? (
                    <img 
                      src={artist.image} 
                      alt={artist.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#222] flex items-center justify-center">
                      <span className="text-white/40">🎵</span>
                    </div>
                  )}
                  <Badge 
                    className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/60 text-white"
                  >
                    {artist.genres?.[0] || 'Pop'}
                  </Badge>
                </div>
                <div className="p-3 text-left">
                  <h3 className="font-medium text-sm line-clamp-1">{artist.name}</h3>
                  <div className="flex items-center mt-1 text-xs text-white/60">
                    <span>{artist.upcoming_shows || Math.floor(Math.random() * 15) + 1} shows</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturedArtistsSection;
