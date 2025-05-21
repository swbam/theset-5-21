import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Show } from '@/lib/types'; // Assuming Show type includes nested artist/venue

// Allow show.name to be potentially null/undefined as data might arrive that way
// The component itself handles the display fallback.
interface ShowCardProps {
  show: Omit<Show, 'name'> & { name?: string | null };
}

// Date formatting helper (consider moving to a utils file if used elsewhere)
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Date TBA';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) throw new Error("Invalid date");
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      // year: 'numeric', // Optionally add year
    });
  } catch (error) {
    console.warn("Date formatting error:", error, dateString);
    return 'Date TBA';
  }
};

const ShowCard = ({ show }: ShowCardProps) => {
  const formattedDate = formatDate(show.date);

  return (
    <Card className="overflow-hidden bg-card border border-border transition-all hover:border-primary/30 group">
      <Link to={`/shows/${show.id}`} className="block">
        <div className="relative aspect-[16/9] overflow-hidden">
          {show.image_url ? (
            <img
              src={show.image_url}
              alt={show.name || 'Show'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="bg-secondary/20 w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No image</span>
            </div>
          )}
           {/* Optional: Add overlay or elements like genre badge here if needed later */}
        </div>
      </Link>
      <CardContent className="p-4">
        <Link to={`/shows/${show.id}`} className="block mb-2">
          <h3 className="font-semibold text-lg text-foreground hover:text-primary transition-colors line-clamp-1" title={show.name || 'Untitled Show'}> {/* Add fallback for title */}
            {show.name || 'Untitled Show'}
          </h3>
          {/* Optionally show artist name if needed */}
          {show.artist?.name && (
             <p className="text-sm text-muted-foreground line-clamp-1" title={show.artist.name}>
               {show.artist.name}
             </p>
          )}
        </Link>
        <div className="text-sm text-muted-foreground space-y-1.5 mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="flex-shrink-0" />
            <span>{formattedDate}</span>
          </div>
          {show.venue && (
            <div className="flex items-center gap-2">
              <MapPin size={15} className="flex-shrink-0" />
              <span className="line-clamp-1" title={`${show.venue.name}, ${show.venue.city}, ${show.venue.state}`}>
                {show.venue.name}
                {show.venue.city ? `, ${show.venue.city}` : ''}
              </span>
            </div>
          )}
        </div>
        <Link to={`/shows/${show.id}`}>
          <Button variant="outline" className="w-full">
            Vote On Setlist
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default ShowCard;
