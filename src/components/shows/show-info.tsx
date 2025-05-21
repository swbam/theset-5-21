import { Calendar, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatVenue } from "@/lib/format";

interface Show {
  id: string;
  name: string;
  date: string;
  time?: string;
  cover_image?: string;
  description?: string;
  venue_id?: string;
  venue?: {
    id: string;
    name: string;
    city?: string;
    state?: string;
    address?: string;
    maps_url?: string;
    image?: string;
  };
  artist?: {
    id: string;
    name: string;
    image?: string;
  };
}

interface Props {
  show: Show;
}

export function ShowInfo({ show }: Props) {
  // Format date
  const formattedDate = show.date 
    ? format(new Date(show.date), 'EEEE, MMMM d, yyyy')
    : 'Date TBA';
  
  // Format time
  const formattedTime = show.time || 'Time TBA';
  
  return (
    <div className="space-y-6">
      {/* Show description */}
      {show.description && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-2">About this show</h3>
            <div className="prose prose-sm dark:prose-invert">
              <p>{show.description}</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Show details */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-4">Show Details</h3>
          
          <div className="space-y-4">
            {/* Date */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{formattedDate}</p>
              </div>
            </div>
            
            {/* Time */}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{formattedTime}</p>
              </div>
            </div>
            
            {/* Venue */}
            {show.venue && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="font-medium">{show.venue.name}</p>
                  {show.venue.address && (
                    <p className="text-sm text-muted-foreground">{show.venue.address}</p>
                  )}
                  {(show.venue.city || show.venue.state) && (
                    <p className="text-sm text-muted-foreground">
                      {show.venue.city}{show.venue.city && show.venue.state ? ', ' : ''}{show.venue.state}
                    </p>
                  )}
                  {show.venue.maps_url && (
                    <Button variant="link" className="h-auto p-0 text-primary" asChild>
                      <Link href={show.venue.maps_url} target="_blank" rel="noopener noreferrer">
                        View on map
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Venue card if there's an image */}
      {show.venue?.image && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-full sm:w-24 h-24 bg-muted rounded-md overflow-hidden flex-shrink-0">
                <Image
                  src={show.venue.image}
                  alt={show.venue.name}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{show.venue.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {formatVenue(show.venue)}
                </p>
                {show.venue.id && (
                  <Button variant="link" className="h-auto p-0 text-primary" asChild>
                    <Link href={`/venue/${show.venue.id}`}>
                      View venue details
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Artist card */}
      {show.artist?.image && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-full sm:w-24 h-24 bg-muted rounded-md overflow-hidden flex-shrink-0">
                <Image
                  src={show.artist.image}
                  alt={show.artist.name}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{show.artist.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Performing artist
                </p>
                {show.artist.id && (
                  <Button variant="link" className="h-auto p-0 text-primary" asChild>
                    <Link href={`/artist/${show.artist.id}`}>
                      View artist details
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 