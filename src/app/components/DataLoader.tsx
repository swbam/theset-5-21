import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

type Entity = 'artists' | 'shows' | 'setlists' | 'setlist_songs' | 'past_setlists';

// Define the shape of the enriched setlist data
interface EnrichedSetlistData {
  id: string;
  date: string;
  venue: string;
  city?: string | null;
  setlist?: { id: string } | null;
  songs: Array<{
    id: string;
    name: string;
    vote_count: number | null;
    song_id: string | null;
    artist_id: string | null;
    position: number | null;
  }>;
}

interface DataLoaderProps {
  entity: Entity;
  limit?: number;
  filter?: Record<string, unknown>;
  children: (data: unknown[]) => React.ReactNode;
}

const SkeletonLoader = ({ type }: { type: Entity }) => {
  return (
    <div className="space-y-3">
      {[...Array(type === 'artists' ? 4 : 5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          {type === 'artists' && <Skeleton className="h-12 w-12 rounded-full" />}
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
};

const DataErrorCard = ({ onRetry }: { onRetry?: () => void }) => (
  <Card className="p-4 border-red-200 bg-red-50">
    <div className="flex gap-2 items-center text-red-600">
      <AlertTriangle size={16} />
      <p>Failed to load data. Please try again.</p>
    </div>
    <Button 
      variant="outline" 
      size="sm" 
      className="mt-2" 
      onClick={onRetry || (() => window.location.reload())}
    >
      Retry
    </Button>
  </Card>
);

const DataLoader = ({ entity, limit = 50, filter = {}, children }: DataLoaderProps) => {
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Special handling for past_setlists (combination of shows, setlists, and songs)
        if (entity === 'past_setlists') {
          const artistId = filter.artist_id;
          if (!artistId) {
            throw new Error('Artist ID is required for past_setlists');
          }
          
          // First get shows for this artist
          const { data: shows, error: showsError } = await supabase
            .from('shows')
            .select('id, date, venue, city')
            .eq('artist_id', artistId)
            .order('date', { ascending: false })
            .limit(limit);
            
          if (showsError) throw showsError;
          
          // For each show, get the setlist and songs
          const enrichedData: EnrichedSetlistData[] = [];
          
          for (const show of shows || []) {
            // Get setlist
            const { data: setlist, error: setlistError } = await supabase
              .from('setlists')
              .select('id')
              .eq('show_id', show.id)
              .single();
              
            if (setlistError && setlistError.code !== 'PGRST116') { 
              // PGRST116 is "no rows returned" - not an error in this context
              console.warn(`No setlist for show ${show.id}`);
              continue;
            }
            
            if (setlist) {
              // Get songs for this setlist
              const { data: songs, error: songsError } = await supabase
                .from('setlist_songs')
                .select('id, name, vote_count, song_id, artist_id, position')
                .eq('setlist_id', setlist.id)
                .order('position', { ascending: true })
                .order('vote_count', { ascending: false });
                
              if (songsError) throw songsError;
              
              enrichedData.push({
                ...show,
                setlist: setlist,
                songs: songs || []
              });
            } else {
              // Show without a setlist
              enrichedData.push({
                ...show,
                songs: []
              });
            }
          }
          
          setData(enrichedData);
          setError(null);
          setLoading(false);
          return;
        }
        
        // Regular entity query
        let query = supabase
          .from(entity)
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(limit);
        
        // Apply filters
        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        
        const { data: result, error } = await query;

        if (error) throw error;
        
        setData(result || []);
        setError(null);
      } catch (err) {
        console.error(`Failed to load ${entity}:`, err);
        setError(`Failed to load ${entity}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscription for standard entities
    let channel: { unsubscribe: () => void } | null = null;
    if (entity !== 'past_setlists') {
      channel = supabase
        .channel('realtime-data')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: entity
        }, () => fetchData())
        .subscribe();
    }

    return () => {
      if (channel) channel.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, supabase, limit, JSON.stringify(filter)]);

  // Function to handle manual refresh
  const handleRetry = async () => {
    await fetchDataFromAPI(filter.artist_id);
    setLoading(true);
    window.location.reload();
  };

  // Utility function to fetch data from API
  const fetchDataFromAPI = async (artistId: unknown) => {
    if (typeof artistId !== 'string') return;
    if (!artistId) return;
    
    try {
      const artistData = await supabase
        .from('artists')
        .select('name')
        .eq('id', artistId)
        .single();
      
      if (artistData.error) throw artistData.error;
      
      // Call the sync API with artist name
      await fetch(`/api/sync?artist=${encodeURIComponent(artistData.data.name)}`);
    } catch (err) {
      console.error('Failed to sync data:', err);
    }
  };

  if (loading) {
    return <SkeletonLoader type={entity} />;
  }

  if (error) {
    return <DataErrorCard onRetry={handleRetry} />;
  }

  return children(data);
};

export default DataLoader; 