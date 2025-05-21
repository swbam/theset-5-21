
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ArtistHeader from '@/components/artist/ArtistHeader';
import UpcomingShows from '@/components/artist/UpcomingShows';
import ArtistDetailSkeleton from '@/components/artist/ArtistDetailSkeleton';
import ArtistNotFound from '@/components/artist/ArtistNotFound';
import PastSetlists from '@/components/artists/PastSetlists';
import { useArtistDetail } from '@/hooks/use-artist-detail';

const ArtistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { artist, shows, loading, error } = useArtistDetail(id);
  
  // Removed the useEffect hook that was showing error toasts
  
  // Show skeleton immediately during initial load
  if (loading.artist && !artist) {
    return <ArtistDetailSkeleton />;
  }

  if (error.artist || !id || !artist) {
    console.error("Artist detail error:", error.artist);
    return <ArtistNotFound />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <ArtistHeader 
          artistName={artist.name} 
          artistImage={artist.image}
          upcomingShowsCount={shows.length}
        />
        
        <UpcomingShows 
          shows={shows}
          artistName={artist.name}
          isLoading={loading.shows}
        />
        
        <PastSetlists 
          artistId={id}
          artistName={artist.name}
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default ArtistDetail;
