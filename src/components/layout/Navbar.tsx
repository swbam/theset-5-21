import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';
import { searchArtistsWithEvents } from '@/lib/ticketmaster';
import MobileMenu from './MobileMenu';
import DesktopNav from './DesktopNav';
import NavbarSearch from './NavbarSearch';

const Navbar = ({ showSearch = true }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';
  const isSearchPage = location.pathname === '/search';

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: artists = [], isLoading } = useQuery({
    queryKey: ['navSearch', debouncedQuery],
    queryFn: () => searchArtistsWithEvents(debouncedQuery, 5),
    enabled: debouncedQuery.length > 2,
  });

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleFullSearch = (query: string) => {
    if (query.trim() && !isSearchPage) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setSearchQuery('');
    }
  };

  const handleNavigation = async (artistId: string) => {
    const artistData = artists.find(a => a.id === artistId);
    if (artistData) {
      try {
        await fetch('/api/artists/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(artistData)
        });
      } catch (error) {
        console.error('Error importing artist:', error);
      }
    }

    navigate(`/artists/${artistId}`);
    setSearchQuery('');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center" onClick={closeMenu}>
          <span className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">TheSet</span>
        </Link>

        {!isHomePage && showSearch && !isMobile && (
          <NavbarSearch 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            artists={artists}
            isLoading={isLoading}
            handleFullSearch={handleFullSearch}
            handleNavigation={handleNavigation}
            isSearchPage={isSearchPage}
          />
        )}

        {isMobile ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>

            <MobileMenu 
              isOpen={isMenuOpen}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              artists={artists}
              isLoading={isLoading}
              handleFullSearch={handleFullSearch}
              handleNavigation={handleNavigation}
              closeMenu={closeMenu}
              isSearchPage={isSearchPage}
            />
          </>
        ) : (
          <DesktopNav />
        )}
      </div>
    </header>
  );
};

export default Navbar;
