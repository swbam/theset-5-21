import React from 'react';
import { Link } from 'react-router-dom';
import { Music, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { searchArtistsWithEvents } from '@/lib/api/artist';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

interface Artist {
  id: string;
  name: string;
  image?: string;
  upcomingShows: number;
}

interface ArtistSearchResultsProps {
  query?: string;
  artists?: Artist[];
  isLoading?: boolean;
  onSelect?: (artist: Artist) => void;
  className?: string;
  simplified?: boolean;
}

const ArtistSearchResults = ({ 
  query,
  artists: propArtists,
  isLoading: propIsLoading,
  onSelect,
  className,
  simplified = false 
}: ArtistSearchResultsProps) => {
  // Use provided artists or fetch them based on query
  const {
    data: fetchedArtists = [],
    isLoading: isFetching
  } = useQuery({
    queryKey: ['artistSearch', query],
    queryFn: () => searchArtistsWithEvents(query || ''),
    enabled: !!query && !propArtists,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const artists = propArtists || fetchedArtists;
  const isLoading = propIsLoading || isFetching;

  if (isLoading) {
    return (
      <div className={cn("py-1 bg-background border border-border rounded-lg shadow-lg", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            {!simplified && (
              <div className="w-10 h-10 rounded-md bg-secondary animate-pulse"></div>
            )}
            <div className="flex-1">
              <div className="h-4 w-24 bg-secondary rounded animate-pulse"></div>
              <div className="h-3 w-16 bg-secondary rounded mt-1 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (artists.length === 0) {
    return null;
  }

  const handleSelect = (artist: Artist) => {
    // Save this artist to the database via the API
    console.log(`Artist selected: ${artist.name} (ID: ${artist.id})`);
    
    // Invoke the sync-artist Edge Function
    console.log(`[ArtistSearchResults] Invoking sync-artist for ${artist.name} (ID: ${artist.id})`);
    supabase.functions.invoke('sync-artist', {
      body: { artistId: artist.id } // Pass only the ID
    }).then(({ data, error }) => {
      if (error) {
        console.error(`[ArtistSearchResults] Error invoking sync-artist for ${artist.name}:`, error);
        toast.error(`Failed to sync artist ${artist.name}: ${error.message}`);
      } else if (!data?.success) {
        console.warn(`[ArtistSearchResults] sync-artist function failed for ${artist.name}:`, data?.error || data?.message);
        toast.warning(`Sync issue for artist ${artist.name}: ${data?.error || data?.message}`);
      } else {
        console.log(`[ArtistSearchResults] Successfully invoked sync-artist for ${artist.name}.`);
        // Optionally show success, but maybe redundant if user is navigating away
        // toast.success(`Synced ${artist.name}!`);
      }
    }).catch(invokeError => {
      console.error(`[ArtistSearchResults] Network exception invoking sync-artist for ${artist.name}:`, invokeError);
      toast.error(`Network error syncing artist ${artist.name}`);
    });
    
    // Call the original onSelect handler
    if (onSelect) {
      onSelect(artist);
    }
  };

  if (simplified) {
    return (
      <div className={cn("py-1 bg-background border border-border rounded-lg shadow-lg divide-y divide-border", className)}>
        {artists.map((artist) => (
          <Link
            key={artist.id}
            to={`/artists/${artist.id}`}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/80 transition-colors"
            onClick={() => handleSelect(artist)}
          >
            <div className="font-medium">{artist.name}</div>
            <div className="text-xs flex items-center text-muted-foreground">
              <CalendarDays size={12} className="mr-1" />
              {artist.upcomingShows} {artist.upcomingShows === 1 ? 'show' : 'shows'}
            </div>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("py-1 bg-background border border-border rounded-lg shadow-lg divide-y divide-border", className)}>
      {artists.map((artist) => (
        <Link
          key={artist.id}
          to={`/artists/${artist.id}`}
          className="flex items-center gap-3 px-3 py-2 hover:bg-secondary transition-colors"
          onClick={() => handleSelect(artist)}
        >
          {artist.image ? (
            <img 
              src={artist.image} 
              alt={artist.name} 
              className="w-10 h-10 rounded-md object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center">
              <Music className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          
          <div>
            <div className="font-medium">{artist.name}</div>
            <div className="text-xs text-muted-foreground">
              {artist.upcomingShows} upcoming {artist.upcomingShows === 1 ? 'show' : 'shows'}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ArtistSearchResults;
