import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Music, Star, Vote } from 'lucide-react';
import { useAuth } from '@/contexts/auth/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock data for user activity
const recentVotes = [
  {
    id: 'vote1',
    songName: 'Anti-Hero',
    artistName: 'Taylor Swift',
    showName: 'The Eras Tour',
    date: '2023-07-15T14:30:00',
  },
  {
    id: 'vote2',
    songName: 'Blinding Lights',
    artistName: 'The Weeknd',
    showName: 'After Hours Tour',
    date: '2023-07-10T18:45:00',
  },
];

const favoriteArtists = [
  {
    id: 'artist1',
    name: 'Taylor Swift',
    image: 'https://i.scdn.co/image/ab6761610000e5eb5a00969a4698c3132a15fbb0',
  },
  {
    id: 'artist2',
    name: 'The Weeknd',
    image: 'https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb',
  },
];

const Profile = () => {
  const { user, profile, logout } = useAuth();

  // Get display name from profile or user email
  const displayName = profile?.username || profile?.full_name || (user?.email ? user.email.split('@')[0] : 'User');
  
  // Get avatar URL from profile
  const avatarUrl = profile?.avatar_url || null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow px-6 md:px-8 lg:px-12 py-12">
        <div className="max-w-7xl mx-auto">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft size={16} className="mr-2" />
            Back to home
          </Link>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* User profile sidebar */}
            <div className="md:col-span-1">
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h1 className="text-2xl font-bold mb-1">{displayName}</h1>
                  {user?.email && (
                    <p className="text-muted-foreground mb-4">{user.email}</p>
                  )}
                  
                  <div className="flex gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-lg font-semibold">{recentVotes.length}</p>
                      <p className="text-xs text-muted-foreground">Votes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{favoriteArtists.length}</p>
                      <p className="text-xs text-muted-foreground">Favorites</p>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={logout}
                  >
                    Log out
                  </Button>
                </div>
              </div>
            </div>
            
            {/* User activity */}
            <div className="md:col-span-2">
              <Tabs defaultValue="votes">
                <TabsList className="mb-6">
                  <TabsTrigger value="votes">
                    <Vote className="h-4 w-4 mr-2" />
                    Recent Votes
                  </TabsTrigger>
                  <TabsTrigger value="artists">
                    <Star className="h-4 w-4 mr-2" />
                    Favorite Artists
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="votes">
                  <div className="border border-border rounded-xl overflow-hidden">
                    {recentVotes.length > 0 ? (
                      <div className="divide-y divide-border">
                        {recentVotes.map((vote) => (
                          <div key={vote.id} className="p-4 bg-card hover:bg-accent/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{vote.songName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {vote.artistName} - {vote.showName}
                                </p>
                              </div>
                              <div className="text-right text-sm text-muted-foreground">
                                {new Date(vote.date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <Vote className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No votes yet</h3>
                        <p className="text-muted-foreground mb-4">
                          You haven't voted on any setlists yet.
                        </p>
                        <Button asChild>
                          <Link to="/shows">Explore Shows</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="artists">
                  {favoriteArtists.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {favoriteArtists.map((artist) => (
                        <Link
                          key={artist.id}
                          to={`/artists/${artist.id}`}
                          className="flex items-center p-4 bg-card border border-border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <Avatar className="h-12 w-12 mr-4">
                            <AvatarImage src={artist.image} alt={artist.name} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {artist.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{artist.name}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-border rounded-xl">
                      <Music className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No favorite artists</h3>
                      <p className="text-muted-foreground mb-4">
                        You haven't added any artists to your favorites yet.
                      </p>
                      <Button asChild>
                        <Link to="/search">Find Artists</Link>
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Profile;
