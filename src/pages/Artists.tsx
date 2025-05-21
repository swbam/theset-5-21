
import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SearchBar from '@/components/ui/SearchBar';
import ArtistSearchResults from '@/components/artists/ArtistSearchResults';
import FeaturedArtists from '@/components/home/FeaturedArtists';
import GenreBrowser from '@/components/artists/GenreBrowser';
import { useDocumentTitle } from '@/hooks/use-document-title';

const Artists = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [isSearching, setIsSearching] = useState(!!queryParam);
  const [isLoading, setIsLoading] = useState(false);
  const [activeGenre, setActiveGenre] = useState<string | null>(searchParams.get('genre'));
  
  // Determine if we're on the /shows path
  const isShowsPage = location.pathname.startsWith('/shows');
  
  // Set page title based on path
  const pageTitle = isShowsPage ? "Upcoming Shows" : "Discover Artists";
  
  // Set document title
  useDocumentTitle(
    pageTitle,
    isShowsPage 
      ? 'Find upcoming concerts and vote on what songs will be played'
      : 'Discover artists with upcoming shows and influence their setlists'
  );

  // Update search query when URL parameter changes
  useEffect(() => {
    if (queryParam !== searchQuery) {
      setSearchQuery(queryParam);
      setIsSearching(!!queryParam);
    }
  }, [queryParam]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(!!query);
    setIsLoading(true);

    // Update URL with search query
    if (query) {
      setSearchParams(prev => {
        prev.set('q', query);
        if (activeGenre) prev.delete('genre');
        return prev;
      });
    } else {
      setSearchParams(prev => {
        prev.delete('q');
        return prev;
      });
    }

    // API call happens in the ArtistSearchResults component
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const handleGenreChange = (genre: string | null) => {
    setActiveGenre(genre);
    
    // Update URL with genre parameter
    setSearchParams(prev => {
      if (genre) {
        prev.set('genre', genre);
        prev.delete('q');
      } else {
        prev.delete('genre');
      }
      return prev;
    });
    
    setIsSearching(false);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <section className="px-6 py-12 md:px-8 lg:px-12 bg-gradient-to-b from-secondary/30 to-background">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-6">{pageTitle}</h1>
            
            <SearchBar 
              onSearch={handleSearch}
              onChange={handleSearch}
              placeholder={isShowsPage ? "Search for shows..." : "Search for artists..."}
              className="mb-8 max-w-2xl"
              value={searchQuery}
              disableRedirect={true}
            />
            
            {isSearching ? (
              <ArtistSearchResults 
                query={searchQuery}
              />
            ) : (
              <div className="space-y-16">
                <FeaturedArtists />
                
                <GenreBrowser 
                  activeGenre={activeGenre}
                  setActiveGenre={handleGenreChange}
                />
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Artists;
