
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Music, ArrowRight, Calendar, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PastSetlistsProps {
  artistId: string;
  artistName: string;
}

const PastSetlists: React.FC<PastSetlistsProps> = ({ artistId, artistName }) => {
  // Fetch past setlists from setlist.fm via our edge function
  const { data, isLoading, error } = useQuery({
    queryKey: ['pastSetlists', artistId],
    queryFn: async () => {
      try {
        // First check if we already have setlists in the database
        const { data: existingSetlists, error } = await supabase
          .from('past_setlists')
          .select('id, setlist_data')
          .eq('artist_id', artistId)
          .order('event_date', { ascending: false })
          .limit(3);
          
        if (error) {
          throw new Error(error.message);
        }
        
        if (existingSetlists && existingSetlists.length > 0) {
          return existingSetlists.map(item => ({
            id: item.id,
            // Fix the spread operator issue by parsing and accessing properties properly
            ...(typeof item.setlist_data === 'string' ? JSON.parse(item.setlist_data) : item.setlist_data)
          }));
        }
        
        // If not in database, fetch from setlist.fm API via edge function
        const response = await supabase.functions.invoke('fetch-past-setlists', {
          body: { artistId, artistName }
        });
        
        if (response.error) {
          throw new Error(response.error.message);
        }
        
        return response.data?.setlists || [];
      } catch (error) {
        console.error('Error fetching past setlists:', error);
        toast.error('Failed to load past setlists');
        return [];
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Format date in a readable way
  const formatDate = (dateString: string) => {
    if (!dateString) return "Date unknown";
    
    try {
      // Handle setlist.fm date format (DD-MM-YYYY)
      if (dateString.includes('-') && dateString.length === 10) {
        const [day, month, year] = dateString.split('-');
        const date = new Date(`${year}-${month}-${day}`);
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }).format(date);
      }
      
      // Handle ISO date format
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return "Date unknown";
    }
  };

  if (isLoading) {
    return (
      <section className="px-6 md:px-8 lg:px-12 py-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Past Setlists</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !data || data.length === 0) {
    return null; // Don't show section if no past setlists found
  }

  return (
    <section className="px-6 md:px-8 lg:px-12 py-12 bg-secondary/10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Past Setlists</h2>
            <p className="text-muted-foreground mt-1">Review what {artistName} played at previous shows</p>
          </div>
          
          <Button variant="ghost" asChild className="mt-4 md:mt-0 group">
            <Link to={`/artists/${artistId}/setlists`}>
              <div className="flex items-center">
                See all setlists
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.slice(0, 3).map((setlist) => {
            // Extract venue and songs info
            const venueName = setlist.venue?.name || 'Unknown Venue';
            const venueLocation = setlist.venue?.city 
              ? `${setlist.venue.city}${setlist.venue.country ? `, ${setlist.venue.country}` : ''}` 
              : '';
              
            // Extract songs from setlist
            const extractSongs = () => {
              const songs = [];
              if (setlist.sets && setlist.sets.set) {
                for (const set of setlist.sets.set) {
                  if (set.song) {
                    for (const song of set.song) {
                      songs.push(song.name);
                    }
                  }
                }
              }
              return songs.slice(0, 5); // Top 5 songs
            };
            
            const songs = extractSongs();
            
            return (
              <Card 
                key={setlist.id} 
                className="border border-border/50 bg-card hover:border-primary/30 hover:shadow-md transition-all"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">{venueName}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-primary" />
                    {formatDate(setlist.eventDate)}
                  </CardDescription>
                  {venueLocation && (
                    <CardDescription className="flex items-center gap-1.5 mt-1">
                      <MapPin size={14} className="text-primary" />
                      {venueLocation}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">Songs played:</p>
                    <ul className="space-y-1.5">
                      {songs.length > 0 ? (
                        songs.map((song, i) => (
                          <li key={i} className="text-sm flex items-center gap-1.5">
                            <Music size={14} className="text-muted-foreground" />
                            {song}
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-muted-foreground">No song information available</li>
                      )}
                    </ul>
                    <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                      <Link to={`/setlists/${setlist.id}`}>
                        <div className="flex items-center justify-center gap-1.5">
                          <Clock size={14} />
                          View full setlist
                        </div>
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PastSetlists;
