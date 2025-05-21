import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import ArtistHeader from '@/components/artist/ArtistHeader';
import UpcomingShows from '@/components/artist/UpcomingShows';
import ArtistStats from '@/app/components/ArtistStats';
import { Separator } from '@/components/ui/separator';
import PastSetlists from '@/components/artist/PastSetlists';

interface ArtistPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata(
  { params }: ArtistPageProps
): Promise<Metadata> {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: artist } = await supabase
    .from('artists')
    .select('name')
    .eq('id', params.id)
    .single();
    
  if (!artist) {
    return {
      title: 'Artist Not Found',
      description: 'The requested artist could not be found.'
    };
  }
  
  return {
    title: `${artist.name} | TheSet`,
    description: `View upcoming shows, past setlists, and statistics for ${artist.name}.`,
    openGraph: {
      title: `${artist.name} | TheSet`,
      description: `View upcoming shows, past setlists, and statistics for ${artist.name}.`,
      type: 'website',
    },
  };
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: artist } = await supabase
    .from('artists')
    .select('*')
    .eq('id', params.id)
    .single();
    
  if (!artist) {
    notFound();
  }
  
  // Fetch upcoming shows for this artist
  const { data: upcomingShows } = await supabase
    .from('shows')
    .select('*')
    .eq('artist_id', artist.id)
    .gte('date', new Date().toISOString())
    .order('date', { ascending: true })
    .limit(5);

  // Fetch past setlists
  const { data: pastSetlists } = await supabase
    .from('setlists')
    .select(`
      id,
      date,
      venue,
      venue_city,
      tour_name,
      songs:setlist_songs(*)
    `)
    .eq('artist_id', artist.id)
    .order('date', { ascending: false })
    .limit(10);

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <ArtistHeader artistName={artist.name} artistImage={artist.image_url || undefined} upcomingShowsCount={upcomingShows?.length || 0} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
        {/* Left sidebar */}
        <div className="md:col-span-2 lg:col-span-3 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">Upcoming Shows</h2>
            <UpcomingShows 
              shows={upcomingShows || []} 
              artistName={artist.name} 
              isLoading={false} 
            />
          </section>

          <Separator className="my-8" />
          
          <section>
            <h2 className="text-2xl font-bold mb-4">Past Setlists</h2>
            <PastSetlists 
              setlists={pastSetlists || []} 
              artistId={artist.id} 
              artistName={artist.name} 
            />
          </section>
        </div>
        
        {/* Right sidebar */}
        <div className="md:col-span-1 space-y-6">
          <ArtistStats artistId={artist.id} />
          
          {/* Additional sidebar components can be added here */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-medium mb-2">About TheSet</h3>
            <p className="text-sm text-muted-foreground">
              Vote on songs you want to hear at upcoming shows and see what others are voting for!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 