import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ArtistCard from '@/components/artist/ArtistCard';
import { useQuery } from '@tanstack/react-query';
import { fetchFeaturedArtists } from '@/lib/api/artist';

interface ArtistGridProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  queryKey?: string;
  artistsFn?: () => Promise<any[]>;
  showViewAll?: boolean;
  viewAllLink?: string;
  viewAllText?: string;
}

const ArtistGrid = ({
  title = "Popular Artists",
  subtitle = "Artists with upcoming shows",
  limit = 6,
  queryKey = "featuredArtists",
  artistsFn = () => fetchFeaturedArtists(6),
  showViewAll = true,
  viewAllLink = "/artists",
  viewAllText = "View all artists"
}: ArtistGridProps) => {
  const { data: artists = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: artistsFn,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        </div>
        
        {showViewAll && (
          <Button variant="link" asChild className="group">
            <Link to={viewAllLink} className="flex items-center text-primary">
              {viewAllText}
              <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        )}
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array(limit).fill(0).map((_, index) => (
            <div key={index} className="aspect-square rounded-lg bg-secondary animate-pulse"></div>
          ))}
        </div>
      ) : artists.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-lg">
          <p className="text-muted-foreground">No artists found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {artists.slice(0, limit).map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ArtistGrid;
