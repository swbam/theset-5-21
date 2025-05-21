import { Suspense } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/components/ui/link'; // Using our custom Link component
import { Button } from '@/components/ui/button';
import TopVotedSongs from '@/app/components/TopVotedSongs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPopularArtists, getTrendingShows } from '@/lib/api-helpers';
import { Show } from '@/lib/types';

export const revalidate = 3600; // Revalidate every hour

export default async function Home() {
  // Fetch both popular artists and trending shows
  const [popularArtists, trendingShows] = await Promise.all([
    getPopularArtists(),
    getTrendingShows(10) // Fetch top 10 trending shows
  ]);

  return (
    <main className="container max-w-screen-xl mx-auto py-8 px-4">
      {/* Hero Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Vote for your favorite concert songs
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Help your favorite artists know which songs you want to hear live.
            Browse upcoming shows, vote on setlists, and see what others are excited to hear.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="/artists">
                Browse Artists
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/shows">View Upcoming Shows</Link>
            </Button>
          </div>
        </div>
        
        <div className="hidden md:block">
          <Suspense fallback={<div className="animate-pulse bg-gray-200 rounded-xl h-full"></div>}>
            <img 
              src="/images/concert.jpg" 
              alt="Concert crowd" 
              className="w-full h-full object-cover rounded-xl shadow-lg"
            />
          </Suspense>
        </div>
      </section>
      
      {/* Top Songs & Popular Artists */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2">
          <TopVotedSongs limit={10} />
        </div>
        
        <div>
          <Card className="w-full shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Popular Artists</CardTitle>
            </CardHeader>
            <CardContent>
              {popularArtists.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No artists yet</p>
              ) : (
                <ul className="space-y-3">
                  {popularArtists.map((artist, index) => (
                    <li key={artist.artist_id} className="group">
                      <Link
                        href={`/artists/${artist.artist_id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-medium">
                          {index + 1}
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-primary transition-colors">
                            {artist.artist_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {artist.total_votes} votes • {artist.unique_voters} fans
                          </p>
                        </div>
                        
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
      
      {/* Trending Shows Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Trending Shows</h2>
        {trendingShows.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No trending shows available right now.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingShows.map((show: Show) => (
              <Link key={show.id} href={`/show/${show.id}`} className="block group">
                <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
                  {show.image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img 
                        src={show.image_url} 
                        alt={show.name || 'Show image'} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <CardHeader className="flex-grow">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {show.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {show.artist?.name || 'Unknown Artist'}
                    </p>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>{show.venue?.name || 'Unknown Venue'}</p>
                    <p>{show.venue?.city}{show.venue?.state ? `, ${show.venue.state}` : ''}</p>
                    <p>{show.date ? new Date(show.date).toLocaleDateString() : 'Date TBD'}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
      
      {/* How It Works Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 bg-primary/10 text-primary rounded-full mb-4">
              1
            </div>
            <h3 className="text-lg font-medium mb-2">Find Your Artist</h3>
            <p className="text-gray-600">
              Search for your favorite artists to see their upcoming concerts and shows.
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 bg-primary/10 text-primary rounded-full mb-4">
              2
            </div>
            <h3 className="text-lg font-medium mb-2">Vote on Songs</h3>
            <p className="text-gray-600">
              Browse the artist's catalog and vote for the songs you want to hear live.
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 bg-primary/10 text-primary rounded-full mb-4">
              3
            </div>
            <h3 className="text-lg font-medium mb-2">Discover New Music</h3>
            <p className="text-gray-600">
              See what songs other fans are voting for and discover new music.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
} 