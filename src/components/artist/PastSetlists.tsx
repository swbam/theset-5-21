import Link from 'next/link';
import { format } from 'date-fns';
import { ChevronRightIcon, CalendarIcon, MapPinIcon, MusicIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Song {
  id: string;
  name: string;
  position: number;
}

interface Setlist {
  id: string;
  date: string;
  venue: string;
  venue_city: string;
  tour_name?: string | null;
  songs: Song[];
}

interface PastSetlistsProps {
  setlists: Setlist[];
  artistId: string;
  artistName: string;
}

export default function PastSetlists({ setlists, artistId, artistName }: PastSetlistsProps) {
  if (!setlists || setlists.length === 0) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No past setlists found for {artistName}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {setlists.map((setlist) => (
        <Link 
          href={`/artist/${artistId}/setlist/${setlist.id}`} 
          key={setlist.id}
          className="block hover:no-underline"
        >
          <Card className="overflow-hidden transition-all hover:shadow-md">
            <CardContent className="p-0">
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {format(new Date(setlist.date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  
                  <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {setlist.venue}, {setlist.venue_city}
                  </span>
                </div>
                
                {setlist.tour_name && (
                  <div className="text-xs text-muted-foreground italic">
                    {setlist.tour_name}
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-1">
                  <MusicIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {setlist.songs.length} songs
                  </span>
                </div>
                
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Top songs:</span>{' '}
                    {setlist.songs.slice(0, 3).map((song, i) => (
                      <span key={song.id}>
                        {song.name}
                        {i < 2 && setlist.songs.length > i + 1 ? ', ' : ''}
                        {i === 2 && setlist.songs.length > 3 ? '...' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
      
      {setlists.length >= 10 && (
        <div className="text-center mt-8">
          <Link 
            href={`/artist/${artistId}/setlists`}
            className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
          >
            View all setlists for {artistName}
          </Link>
        </div>
      )}
    </div>
  );
} 