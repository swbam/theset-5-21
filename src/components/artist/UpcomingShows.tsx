
import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Show {
  id: string;
  name: string;
  date: string;
  venue: {
    name: string;
    city?: string;
    state?: string;
  } | null;
  ticket_url?: string;
  image_url?: string;
}

interface UpcomingShowsProps {
  shows: Show[];
  artistName: string;
  isLoading?: boolean;
}

const UpcomingShows = ({ shows, artistName, isLoading = false }: UpcomingShowsProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderLoadingCards = () => (
    <>
      {Array(3).fill(0).map((_, i) => (
        <Card key={`loading-${i}`} className="overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-muted-foreground" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-muted-foreground" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-9 rounded-md w-full mt-2" />
          </CardContent>
        </Card>
      ))}
    </>
  );

  return (
    <section className="px-6 md:px-8 lg:px-12 py-12">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">
          {shows.length > 0 || isLoading
            ? `${artistName}'s Upcoming Shows`
            : `No Upcoming Shows for ${artistName}`}
        </h2>

        {shows.length === 0 && !isLoading ? (
          <p className="text-muted-foreground">
            There are currently no upcoming shows scheduled for this artist.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              renderLoadingCards()
            ) : (
              shows.map((show) => (
                <Card key={show.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <h3 className="font-medium text-lg mb-2 line-clamp-1">{show.name}</h3>
                    <div className="text-sm text-muted-foreground space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={16} />
                        <span>{formatDate(show.date)}</span>
                      </div>
                      {show.venue && (
                        <div className="flex items-center gap-2">
                          <MapPin size={16} />
                          <span>
                            {show.venue.name}
                            {show.venue.city && show.venue.state
                              ? ` · ${show.venue.city}, ${show.venue.state}`
                              : show.venue.city
                              ? ` · ${show.venue.city}`
                              : show.venue.state
                              ? ` · ${show.venue.state}`
                              : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    <Link to={`/shows/${show.id}`}>
                      <Button className="w-full">Vote On Setlist</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default UpcomingShows;
