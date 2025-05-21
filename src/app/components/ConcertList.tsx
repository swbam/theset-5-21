import { useEffect, useMemo, Suspense } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import ConcertSkeleton from './ConcertSkeleton';
import ConcertData from './ConcertData';
import { ConcertData as ConcertDataType } from '@/lib/types';

const ConcertList = ({ artistId }: { artistId: string }) => {
  const supabase = createClientComponentClient();

  const fetchConcerts = useMemo(() => async (): Promise<ConcertDataType[]> => {
    const { data, error } = await supabase
      .from('concerts')
      .select(`
        id,
        date,
        venue,
        last_updated,
        setlist:songs!setlist_id(
          id,
          title,
          vote_count
        ),
        artist:artists!artist_id(id,name)
      `)
      .eq('artist_id', artistId)
      .order('date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Concert load error:', error);
      return [];
    }

    const transformedData = data?.map(item => ({
      id: item.id,
      date: item.date,
      venue: item.venue,
      last_updated: item.last_updated,
      setlist: Array.isArray(item.setlist) ? item.setlist : [],
      artist: {
        id: Array.isArray(item.artist) && item.artist.length > 0 
          ? String(item.artist[0].id) 
          : (typeof item.artist === 'object' && item.artist && 'id' in item.artist ? String(item.artist.id) : ''),
        name: Array.isArray(item.artist) && item.artist.length > 0 
          ? String(item.artist[0].name) 
          : (typeof item.artist === 'object' && item.artist && 'name' in item.artist ? String(item.artist.name) : '')
      }
    })) || [];

    return transformedData;
  }, [artistId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel('concert-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'concerts',
        filter: `artist_id=eq.${artistId}`
      }, () => fetchConcerts())
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [artistId, supabase, fetchConcerts]);

  return (
    <Suspense fallback={<ConcertSkeleton />}>
      <ConcertData fetchFn={fetchConcerts} />
    </Suspense>
  );
};

export default ConcertList; 