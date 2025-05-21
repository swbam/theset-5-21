
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ShowHeader from '@/components/shows/ShowHeader';
import SetlistSection from '@/components/shows/SetlistSection';
import ShowDetailSkeleton from '@/components/shows/ShowDetailSkeleton';
import ShowNotFound from '@/components/shows/ShowNotFound';
import { useShowDetail } from '@/hooks/use-show-detail';

const ShowDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const { 
    show,
    setlist,
    loading,
    error,
    connected,
    songManagement,
    availableTracks,
    documentMetadata
  } = useShowDetail(id);

  // Set document metadata with error handling
  useEffect(() => {
    if (documentMetadata.title) {
      document.title = documentMetadata.title;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription && documentMetadata.description) {
        metaDescription.setAttribute('content', documentMetadata.description);
      }
    }
  }, [documentMetadata]);
  
  // Handle navigation on error
  useEffect(() => {
    if (!loading.show && error.show) {
      console.error("Show detail error:", error.show);
      
      // Add a small delay before navigating to allow the toast to be seen
      const timer = setTimeout(() => {
        navigate('/shows', { replace: true });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [show, loading.show, error.show, navigate]);
  
  // Show loading state while fetching show details
  if (loading.show && !show) {
    return <ShowDetailSkeleton />;
  }
  
  // Handle error states with fallback UI
  if (error.show || !show) {
    return <ShowNotFound />;
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      
      <main className="flex-grow">
        <ShowHeader show={show} />
        <SetlistSection 
          setlist={setlist || []}
          isConnected={connected}
          isLoadingTracks={loading.tracks}
          handleVote={songManagement.handleVote}
          showId={id || ''}
          showName={show.name || ''}
          artistName={show.artist?.name || 'Artist'}
          availableTracks={availableTracks || []}
          isLoadingAllTracks={loading.allTracks}
          selectedTrack={songManagement.selectedTrack}
          setSelectedTrack={songManagement.setSelectedTrack}
          handleAddSong={songManagement.handleAddSong}
          anonymousVoteCount={songManagement.anonymousVoteCount}
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default ShowDetail;
