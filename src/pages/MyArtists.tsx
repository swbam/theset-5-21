
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getMyTopArtists } from '@/lib/spotify';
import ArtistCard from '@/components/artist/ArtistCard';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const MyArtists = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, session } = useAuth();
  const [hasSpotifyToken, setHasSpotifyToken] = useState(false);

  useEffect(() => {
    // Check if the user is logged in and has a Spotify token
    const checkAuth = async () => {
      console.log("Checking auth status:", isAuthenticated ? "Authenticated" : "Not authenticated");
      
      if (!isAuthenticated) {
        console.log("User not authenticated, redirecting to login");
        navigate('/auth');
        return;
      }
      
      const { data } = await supabase.auth.getSession();
      const hasToken = !!data.session?.provider_token;
      setHasSpotifyToken(hasToken);
      
      console.log("Provider token check:", hasToken ? "Token present" : "No token");
      
      if (!hasToken) {
        toast.error("Spotify connection required", {
          description: "Please connect your Spotify account to see your top artists",
          action: {
            label: "Connect",
            onClick: () => navigate('/auth')
          }
        });
      }
    };
    
    checkAuth();
  }, [isAuthenticated, navigate, user]);
  
  const { 
    data: artists, 
    isLoading, 
    isError, 
    error,
    refetch
  } = useQuery({
    queryKey: ['myTopArtists', user?.id],
    queryFn: getMyTopArtists,
    enabled: isAuthenticated && hasSpotifyToken,
    retry: 1,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
            <p className="text-muted-foreground mb-6">Please sign in with Spotify to view your top artists</p>
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg">Loading your top artists from Spotify...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center max-w-md p-6">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-bold mb-2">Unable to load artists</h2>
            <p className="text-muted-foreground mb-6">
              {error instanceof Error 
                ? error.message 
                : "We couldn't load your Spotify artists. This may be due to an expired token or API limits."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/auth')}>
                Reconnect Spotify
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!artists || artists.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center max-w-md p-6">
            <h2 className="text-2xl font-bold mb-2">No Top Artists Found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find any top artists in your Spotify account. 
              This might happen if you're new to Spotify or haven't listened to enough music yet.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/')}>
                Browse Featured Artists
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow px-6 md:px-8 lg:px-12 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Your Top Artists</h1>
          <p className="text-muted-foreground">
            Based on your Spotify listening history
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {artists.map((artist: any) => (
            <ArtistCard 
              key={artist.id}
              artist={{
                id: artist.id,
                name: artist.name,
                image: artist.image,
                genres: artist.genres?.slice(0, 2) || [],
                upcoming_shows: null
              }}
            />
          ))}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MyArtists;
