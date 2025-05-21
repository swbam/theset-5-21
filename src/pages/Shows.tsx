
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, PlusCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import TrendingShows from '@/components/shows/TrendingShows';
import FeaturedArtistsSection from '@/components/shows/FeaturedArtistsSection';
import UpcomingShowsSection from '@/components/shows/UpcomingShowsSection';

const Shows = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const genreParam = searchParams.get('genre');
  const artistParam = searchParams.get('artist');
  
  const [selectedGenre, setSelectedGenre] = useState(genreParam || '');
  
  // When URL params change, update state
  React.useEffect(() => {
    if (genreParam) {
      setSelectedGenre(genreParam);
    }
  }, [genreParam]);
  
  const handleGenreChange = (value: string) => {
    setSelectedGenre(value);
    const newParams = new URLSearchParams(searchParams);
    
    if (value) {
      newParams.set('genre', value);
      // Remove artist param if genre is selected
      newParams.delete('artist');
    } else {
      newParams.delete('genre');
    }
    
    setSearchParams(newParams);
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter shows client-side based on search
    if (searchQuery.trim()) {
      toast.info(`Searching for "${searchQuery}"...`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navbar />
      
      <main className="flex-grow">
        {/* Header section */}
        <section className="px-4 md:px-8 lg:px-12 py-12 bg-gradient-to-b from-[#111111] to-black">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="md:w-1/2">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">Discover Live Shows</h1>
                <p className="text-white/70 md:text-lg mb-6">
                  Find concerts and vote on setlists for your favorite artists
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <Link to="/shows/create">
                    <Button size="lg" className="gap-2 bg-white text-black hover:bg-white/90">
                      <PlusCircle size={18} />
                      Create Show
                    </Button>
                  </Link>
                  
                  <Link to="/artists">
                    <Button variant="outline" size="lg" className="gap-2 border-white/20 hover:bg-white/10">
                      <Search size={18} />
                      Find Artists
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="md:w-1/2 max-w-sm mx-auto md:mx-0">
                <form onSubmit={handleSearch} className="relative">
                  <Input
                    type="text"
                    placeholder="Search shows, artists or venues..."
                    className="w-full pl-10 pr-4 py-6 bg-white/10 border-white/20 placeholder:text-white/50 text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
                </form>
              </div>
            </div>
          </div>
        </section>
        
        {/* Trending Shows Section */}
        <TrendingShows />
        
        {/* Featured Artists section */}
        <FeaturedArtistsSection />
        
        {/* Upcoming Shows section */}
        <UpcomingShowsSection
          searchQuery={searchQuery}
          selectedGenre={selectedGenre}
          handleGenreChange={handleGenreChange}
          artistParam={artistParam}
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default Shows;
