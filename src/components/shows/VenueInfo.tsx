import { MapPinIcon } from '@heroicons/react/24/outline';

interface VenueProps {
  venue: {
    name: string;
    city?: string;
    state?: string;
    country?: string;
    address?: string;
  };
}

export default function VenueInfo({ venue }: VenueProps) {
  const hasLocation = venue.city || venue.state || venue.country;
  const locationStr = [venue.city, venue.state, venue.country]
    .filter(Boolean)
    .join(', ');
  
  if (!venue.name) return null;
  
  return (
    <div className="flex items-start mt-3">
      <MapPinIcon className="h-5 w-5 text-muted-foreground mr-2 mt-0.5" />
      <div>
        <p className="font-medium">{venue.name}</p>
        {hasLocation && (
          <p className="text-muted-foreground">{locationStr}</p>
        )}
        {venue.address && (
          <p className="text-xs text-muted-foreground mt-1">{venue.address}</p>
        )}
      </div>
    </div>
  );
} 