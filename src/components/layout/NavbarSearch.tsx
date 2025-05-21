
import React from 'react';
import SearchBar from '@/components/ui/SearchBar';
import ArtistSearchResults from '@/components/search/ArtistSearchResults';

interface NavbarSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  artists: any[];
  isLoading: boolean;
  handleFullSearch: (query: string) => void;
  handleNavigation: (artistId: string) => void;
  isSearchPage?: boolean;
}

const NavbarSearch = ({
  searchQuery,
  setSearchQuery,
  artists,
  isLoading,
  handleFullSearch,
  handleNavigation,
  isSearchPage = false
}: NavbarSearchProps) => {
  return (
    <div className="w-64 md:flex mx-4 relative">
      <SearchBar
        placeholder="Search artists..."
        onChange={(query) => setSearchQuery(query)}
        onSearch={handleFullSearch}
        value={searchQuery}
        className="w-full"
        disableRedirect={isSearchPage}
      >
        {searchQuery.length > 2 && (
          <ArtistSearchResults
            artists={artists}
            isLoading={isLoading}
            onSelect={(artist) => {
              handleNavigation(artist.id);
              setSearchQuery('');
            }}
          />
        )}
      </SearchBar>
    </div>
  );
};

export default NavbarSearch;
