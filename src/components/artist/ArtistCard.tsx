
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Music2, CalendarDays, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ArtistCardProps {
  artist: {
    id: string;
    name: string;
    image?: string;
    genres?: string[];
    upcoming_shows?: number;
    popularity?: number;
  };
  className?: string;
  showPopularity?: boolean;
}

const ArtistCard = ({ 
  artist, 
  className,
  showPopularity = false
}: ArtistCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const renderPopularityStars = () => {
    if (!showPopularity || typeof artist.popularity !== 'number') return null;
    
    // Calculate number of full stars (out of 5)
    const starCount = Math.round((artist.popularity / 100) * 5);
    
    return (
      <div className="flex items-center mt-2 space-x-1">
        {Array(5).fill(0).map((_, i) => (
          <Star 
            key={i} 
            size={14} 
            className={cn(
              i < starCount ? "fill-primary text-primary" : "text-muted-foreground",
              "transition-colors duration-300"
            )}
          />
        ))}
      </div>
    );
  };
  
  return (
    <Link 
      to={`/artists/${artist.id}`} 
      className={cn(
        "group block overflow-hidden rounded-xl transition-all hover:scale-[1.02]",
        "border border-white/10 bg-black/40 hover:border-white/30",
        className
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-secondary/20">
        {/* Blurred placeholder */}
        <div className={cn(
          "absolute inset-0 bg-secondary/20 animate-pulse", 
          imageLoaded ? "opacity-0" : "opacity-100"
        )} />
        
        {artist.image ? (
          <img
            src={artist.image}
            alt={artist.name}
            className={cn(
              "object-cover w-full h-full transition-all duration-500 group-hover:scale-105",
              imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-110"
            )}
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Music2 size={48} className="text-white/20" />
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-lg transition-colors group-hover:text-primary truncate">
          {artist.name}
        </h3>
        
        {artist.genres && artist.genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {artist.genres.slice(0, 2).map((genre, idx) => (
              <Badge 
                key={idx} 
                variant="outline" 
                className="text-xs bg-white/5 hover:bg-white/10 transition-colors"
              >
                {genre}
              </Badge>
            ))}
          </div>
        )}
        
        {renderPopularityStars()}
        
        {typeof artist.upcoming_shows === 'number' && (
          <div className="flex items-center mt-4 text-sm text-white/60">
            <CalendarDays size={14} className="mr-2 opacity-70" />
            {artist.upcoming_shows > 0 
              ? `${artist.upcoming_shows} upcoming ${artist.upcoming_shows === 1 ? 'show' : 'shows'}`
              : "No upcoming shows"
            }
          </div>
        )}
      </div>
    </Link>
  );
};

export default ArtistCard;
