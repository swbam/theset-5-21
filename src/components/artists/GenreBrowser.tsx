
import React from 'react';
import { Badge } from '@/components/ui/badge';
import ShowsByGenre from '@/components/artists/ShowsByGenre';
import { popularMusicGenres } from '@/lib/ticketmaster';

interface GenreBrowserProps {
  activeGenre: string | null;
  setActiveGenre: (genre: string | null) => void;
}

const GenreBrowser = ({ activeGenre, setActiveGenre }: GenreBrowserProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Popular Genres</h2>
      <div className="flex flex-wrap gap-2">
        {popularMusicGenres.map((genre) => (
          <Badge 
            key={genre.id}
            variant={activeGenre === genre.id ? "default" : "outline"}
            className="cursor-pointer text-sm py-1.5 px-3"
            onClick={() => setActiveGenre(activeGenre === genre.id ? null : genre.id)}
          >
            {genre.name}
          </Badge>
        ))}
      </div>
      
      {activeGenre && (
        <ShowsByGenre 
          genreId={activeGenre} 
          genreName={popularMusicGenres.find(g => g.id === activeGenre)?.name || ''}
        />
      )}
    </div>
  );
};

export default GenreBrowser;
