import Image from "next/image";
import { format } from "date-fns";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { formatVenue } from "@/lib/format";

interface Show {
  id: string;
  name: string;
  date: string;
  cover_image?: string;
  venue_id?: string;
  venue?: {
    id: string;
    name: string;
    city?: string;
    state?: string;
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

export function ShowHero({ show }: Props) {
  // Format date if available
  const formattedDate = show.date 
    ? format(new Date(show.date), 'EEE, MMMM d, yyyy')
    : null;
    
  // Venue display with optional city/state
  const venueDisplay = show.venue 
    ? formatVenue(show.venue)
    : 'Venue TBA';
  
  return (
    <div className="relative">
      {/* Hero image or gradient background */}
      <div className="relative h-[30vh] min-h-[250px] w-full bg-gradient-to-b from-primary/80 to-background/95 overflow-hidden">
        {show.cover_image ? (
          <Image
            src={show.cover_image}
            alt={show.name}
            fill
            className="object-cover opacity-40"
            priority
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background"></div>
      </div>
      
      {/* Content overlay */}
      <Container className="relative -mt-24 z-10">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Show image/artwork */}
          <div className="w-32 h-32 md:w-48 md:h-48 bg-muted rounded-md overflow-hidden shadow-lg flex-shrink-0">
            {show.cover_image ? (
              <Image
                src={show.cover_image}
                alt={show.name}
                width={192}
                height={192}
                className="w-full h-full object-cover"
              />
            ) : show.artist?.image ? (
              <Image
                src={show.artist.image}
                alt={show.artist.name}
                width={192}
                height={192}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">
                🎵
              </div>
            )}
          </div>
          
          {/* Show details */}
          <div className="flex-1 pt-4">
            <div className="space-y-1.5">
              {formattedDate && (
                <Badge variant="outline" className="mb-2">
                  {formattedDate}
                </Badge>
              )}
              <h1 className="text-3xl md:text-4xl font-bold">{show.name}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                {show.artist?.name && (
                  <p className="text-lg font-medium">{show.artist.name}</p>
                )}
                {show.artist && venueDisplay && (
                  <span className="hidden sm:inline text-muted-foreground">•</span>
                )}
                {venueDisplay && (
                  <p className="text-muted-foreground">{venueDisplay}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
} 