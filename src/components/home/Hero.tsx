import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Music, PlusCircle, Users, Award } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchArtistsWithEvents } from '@/lib/api/artist';
import ArtistSearchResults from '@/components/artists/ArtistSearchResults';

const Hero = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();

  // Debounce search query
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleArtistSelect = (artist: any) => {
    navigate(`/artists/${artist.id}`);
  };

  // Only query when we have at least 2 characters
  const shouldFetch = debouncedQuery.length > 1;

  const { 
    data: artists = [], 
    isLoading 
  } = useQuery({
    queryKey: ['artistSearch', debouncedQuery],
    queryFn: () => searchArtistsWithEvents(debouncedQuery),
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return (
    <section className="relative bg-gradient-to-b from-black via-black/70 to-[#0A0A10] text-white py-20 md:py-24 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-64 -left-64 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 md:px-6 max-w-6xl relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <div className="inline-block px-3 py-1 mb-6 bg-white/10 text-white/90 rounded-full text-sm font-medium backdrop-blur-sm">
              ✨ TheSet - Where Music Meets Community
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Shape the Concert <span className="text-white">Experience</span> You Want
            </h1>
            
            <p className="text-lg text-white/80 mb-8 max-w-lg">
              Discover upcoming shows and vote on setlists for your favorite artists. 
              Join a community of fans influencing what songs get played live.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button 
                size="lg" 
                className="btn-twitter"
                onClick={() => navigate('/shows')}
              >
                Explore Shows
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/20 hover:bg-white/10"
                onClick={() => navigate('/how-it-works')}
              >
                How It Works
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5 text-primary" />
                <span className="text-sm text-white/80">Vote on Songs</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm text-white/80">Join Community</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span className="text-sm text-white/80">Discover Artists</span>
              </div>
            </div>
          </div>
          
          <div className="bg-black/30 p-6 rounded-xl border border-white/10 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-4">Find Your Next Show</h2>
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-white/60" />
              </div>
              <Input
                type="text"
                placeholder="Search for artists, venues, or cities..."
                value={searchQuery}
                onChange={handleChange}
                className="pl-10 py-6 h-12 bg-white/10 border-white/10 text-white placeholder:text-white/60 rounded-md w-full focus-visible:ring-primary/30"
              />
            </div>
            
            {/* Display search results */}
            {shouldFetch && searchQuery ? (
              <div className="bg-black/70 border border-white/10 rounded-md shadow-lg max-h-[300px] overflow-auto">
                <ArtistSearchResults 
                  query={debouncedQuery}
                  onSelect={handleArtistSelect}
                  simplified={true}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-white/60">Popular searches:</p>
                <div className="flex flex-wrap gap-2">
                  {['Taylor Swift', 'Drake', 'Billie Eilish', 'The Weeknd', 'Bad Bunny'].map(name => (
                    <Button 
                      key={name} 
                      variant="outline" 
                      size="sm" 
                      className="bg-white/5 border-white/10 hover:bg-white/10 text-sm"
                      onClick={() => setSearchQuery(name)}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
