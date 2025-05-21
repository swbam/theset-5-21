import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getUserTopArtists, getRecommendations } from '@/lib/spotify';
import { fetchArtistEvents } from '@/lib/ticketmaster';

interface Artist {
  id: string;
  name: string;
  image_url?: string;
  genres?: string[];
}

interface Show {
  id: string;
  name: string;
  date: string;
  venue?: {
    name: string;
    city: string;
    state: string;
  };
  image_url?: string;
  artist?: Artist;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userTopArtists, setUserTopArtists] = useState<Artist[]>([]);
  const [recommendedShows, setRecommendedShows] = useState<Show[]>([]);
  
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          navigate('/auth');
          return;
        }
        
        fetchUserData();
      } catch (error) {
        console.error('Error checking authentication:', error);
        navigate('/auth');
      }
    }
    
    checkAuth();
  }, [navigate]);
  
  async function fetchUserData() {
    try {
      setLoading(true);
      
      // Get user's top artists from Spotify
      const topArtistsData = await getUserTopArtists();
      if (topArtistsData && Array.isArray(topArtistsData)) {
        setUserTopArtists(topArtistsData.slice(0, 10));
        
        // Get recommendations based on top artists
        const recommendations = await getRecommendations();
        if (recommendations && recommendations.shows && Array.isArray(recommendations.shows)) {
          setRecommendedShows(recommendations.shows.slice(0, 8));
        }
        
        // If we don't have enough recommendations, fetch some events for the top artists
        if (!recommendations || !recommendations.shows || recommendations.shows.length < 3) {
          const topArtistEvents = [];
          
          // Just use the first 3 artists to avoid too many API calls
          for (const artist of topArtistsData.slice(0, 3)) {
            try {
              const events = await fetchArtistEvents(artist.id);
              if (events && Array.isArray(events)) {
                topArtistEvents.push(...events);
              }
            } catch (err) {
              console.error(`Error fetching events for artist ${artist.name}:`, err);
            }
          }
          
          // Add these events to recommendations if we found any
          if (topArtistEvents.length > 0) {
            setRecommendedShows(prevShows => {
              const existingIds = new Set(prevShows.map(show => show.id));
              const newShows = topArtistEvents.filter(show => !existingIds.has(show.id));
              return [...prevShows, ...newShows].slice(0, 8);
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }
  
  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'TBD';
    }
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      
      <main className="flex-grow px-6 md:px-8 lg:px-12 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">Your Personalized Dashboard</h1>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg text-white">Loading your personalized recommendations...</p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Top Artists Section */}
              <section>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Your Top Artists</h2>
                  <Button variant="outline" onClick={() => navigate('/my-artists')}>
                    See All
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {userTopArtists.slice(0, 5).map(artist => (
                    <Card 
                      key={artist.id}
                      className="bg-[#0A0A0A] border-white/10 hover:border-white/30 transition-all cursor-pointer overflow-hidden"
                      onClick={() => navigate(`/artist/${artist.id}`)}
                    >
                      <div className="aspect-square overflow-hidden">
                        <img 
                          src={artist.image_url || 'https://placehold.co/300x300/111/333?text=Artist'} 
                          alt={artist.name}
                          className="w-full h-full object-cover transition-transform hover:scale-105"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-white truncate">{artist.name}</h3>
                        {artist.genres && artist.genres.length > 0 && (
                          <p className="text-sm text-white/60 truncate mt-1">
                            {artist.genres[0]}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
              
              {/* Recommended Shows Section */}
              <section>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Recommended Shows</h2>
                  <Button variant="outline" onClick={() => navigate('/shows')}>
                    Browse All Shows
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recommendedShows.slice(0, 4).map(show => (
                    <Card 
                      key={show.id}
                      className="bg-[#0A0A0A] border-white/10 hover:border-white/30 transition-all cursor-pointer"
                      onClick={() => navigate(`/show/${show.id}`)}
                    >
                      <div className="aspect-video overflow-hidden">
                        <img 
                          src={show.image_url || 'https://placehold.co/600x400/111/333?text=Show'} 
                          alt={show.name}
                          className="w-full h-full object-cover transition-transform hover:scale-105"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-white line-clamp-2">{show.name}</h3>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm text-white/70">{formatDate(show.date)}</p>
                          {show.venue && (
                            <p className="text-sm text-white/60 truncate">
                              {show.venue.city}, {show.venue.state}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
              
              {/* How It Works Section */}
              <section>
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-xl text-foreground">How TheSet Works</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Personalize your concert experience by voting on your favorite songs
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4 items-start">
                      <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Find Your Shows</h4>
                        <p className="text-sm text-muted-foreground">Discover upcoming concerts from your favorite artists</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-start">
                      <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Vote on Songs</h4>
                        <p className="text-sm text-muted-foreground">Help shape the setlist by voting for songs you want to hear</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-start">
                      <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Enjoy the Experience</h4>
                        <p className="text-sm text-muted-foreground">Get a more personalized concert with songs the crowd wants</p>
                      </div>
                    </div>
                    
                    <Button className="w-full mt-4 btn-twitter" onClick={() => navigate('/shows')}>
                      Browse Upcoming Shows
                    </Button>
                  </CardContent>
                </Card>
              </section>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard; 