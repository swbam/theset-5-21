import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

const AdminSeedData = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ message: string; success: boolean } | null>(null);
  
  // Function to seed artists
  async function seedArtists() {
    setLoading(true);
    setStatus(null);
    
    try {
      const artists = [
        {
          id: uuidv4(),
          name: 'Taylor Swift',
          image_url: 'https://i.scdn.co/image/ab6761610000e5eb6a224073987b930f99adc8bc',
          spotify_id: '06HL4z0CvFAxyc27GXpf02',
          tm_id: 'K8vZ917G7x0',
          spotify_followers: 95000000,
          spotify_popularity: 100,
          spotify_genres: ['pop', 'pop rock']
        },
        {
          id: uuidv4(),
          name: 'The Weeknd',
          image_url: 'https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb',
          spotify_id: '1Xyo4u8uXC1ZmMpatF05PJ',
          tm_id: 'K8vZ917pG-f',
          spotify_followers: 55000000,
          spotify_popularity: 95,
          spotify_genres: ['canadian pop', 'pop', 'r&b']
        },
        {
          id: uuidv4(),
          name: 'Drake',
          image_url: 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9',
          spotify_id: '3TVXtAsR1Inumwj472S9r4',
          tm_id: 'K8vZ917pz7V',
          spotify_followers: 75000000,
          spotify_popularity: 98,
          spotify_genres: ['canadian hip hop', 'rap']
        },
        {
          id: uuidv4(),
          name: 'Billie Eilish',
          image_url: 'https://i.scdn.co/image/ab6761610000e5eb7b9745078c6a3d3ccafebbe5',
          spotify_id: '6qqNVTkY8uBg9cP3Jd7DAH',
          tm_id: 'K8vZ917_bOf',
          spotify_followers: 50000000,
          spotify_popularity: 92,
          spotify_genres: ['pop', 'electropop']
        },
        {
          id: uuidv4(),
          name: 'Coldplay',
          image_url: 'https://i.scdn.co/image/ab6761610000e5eb989ed05e1f0570cc4726c2d3',
          spotify_id: '4gzpq5DPGxSnKTe4SA8HAU',
          tm_id: 'K8vZ9175BV7',
          spotify_followers: 45000000,
          spotify_popularity: 90,
          spotify_genres: ['permanent wave', 'pop', 'rock']
        }
      ];
      
      console.log('Seeding artists:', artists);
      let addedCount = 0;
      
      // Insert artists one by one to avoid schema validation issues
      for (const artist of artists) {
        try {
          const { error } = await supabase.from('artists').insert(artist);
          if (error) {
            console.warn(`Couldn't add artist ${artist.name}:`, error.message);
          } else {
            addedCount++;
          }
        } catch (err) {
          console.warn(`Error adding artist ${artist.name}:`, err);
        }
      }
      
      setStatus({
        message: `Successfully added ${addedCount} artists with Ticketmaster and Spotify IDs.`,
        success: addedCount > 0
      });
    } catch (error: unknown) {
      console.error('Error seeding artists:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to seed artists';
      setStatus({
        message: `Error: ${errorMessage}`,
        success: false
      });
    } finally {
      setLoading(false);
    }
  }
  
  // Function to seed shows for an artist
  async function seedShows() {
    setLoading(true);
    setStatus(null);
    
    try {
      // First get artists
      const { data: artists, error: artistsError } = await supabase.from('artists').select('id, name');
      
      if (artistsError) throw artistsError;
      if (!artists || artists.length === 0) throw new Error('No artists found. Seed artists first.');
      
      console.log('Found artists for shows:', artists);
      
      const venues = [
        'Madison Square Garden, New York, US',
        'The O2, London, UK',
        'Forum, Los Angeles, US',
        'Scotiabank Arena, Toronto, CA',
        'AccorHotels Arena, Paris, FR'
      ];
      
      let addedCount = 0;
      
      // For each artist, create 3 shows with required fields
      for (const artist of artists) {
        for (let i = 0; i < 3; i++) {
          const randomVenue = venues[Math.floor(Math.random() * venues.length)];
          const [venueName, venueLocation] = randomVenue.split(', ', 2);
          const daysToAdd = [7, 14, 30][i];
          const date = new Date();
          date.setDate(date.getDate() + daysToAdd);
          
          try {
            const showId = uuidv4();
            const { error } = await supabase.from('shows').insert({
              id: showId,
              artist_id: artist.id,
              name: `${artist.name} Live at ${venueName}`,
              date: date.toISOString(),
              ticket_url: 'https://www.ticketmaster.com'
            });
            
            if (error) {
              console.warn(`Couldn't add show for ${artist.name}:`, error.message);
            } else {
              addedCount++;
            }
          } catch (err) {
            console.warn(`Error adding show for ${artist.name}:`, err);
          }
        }
      }
      
      setStatus({
        message: `Successfully added ${addedCount} shows for ${artists.length} artists.`,
        success: addedCount > 0
      });
    } catch (error: unknown) {
      console.error('Error seeding shows:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to seed shows';
      setStatus({
        message: `Error: ${errorMessage}`,
        success: false
      });
    } finally {
      setLoading(false);
    }
  }
  
  // Function to seed setlists and songs
  async function seedSetlists() {
    setLoading(true);
    setStatus(null);
    
    try {
      // First get artists
      const { data: artists, error: artistsError } = await supabase.from('artists').select('id, name');
      
      if (artistsError) throw artistsError;
      if (!artists || artists.length === 0) throw new Error('No artists found. Seed artists first.');
      
      // Next get shows to create setlists for them
      const { data: shows, error: showsError } = await supabase.from('shows').select('id, artist_id, name');
      
      if (showsError) throw showsError;
      if (!shows || shows.length === 0) throw new Error('No shows found. Seed shows first.');
      
      // Song titles by artist name
      const songsByArtist: Record<string, string[]> = {
        'Taylor Swift': [
          'Anti-Hero', 'Cruel Summer', 'Blank Space', 'Shake It Off', 'Love Story',
          'You Belong With Me', 'Cardigan', 'Wildest Dreams', 'Delicate', 'All Too Well'
        ],
        'The Weeknd': [
          'Blinding Lights', 'Starboy', 'The Hills', 'Save Your Tears', 'Often',
          'Heartless', 'Call Out My Name', 'Die For You', 'I Feel It Coming', 'In Your Eyes'
        ],
        'Drake': [
          'God\'s Plan', 'Hotline Bling', 'One Dance', 'Started From the Bottom', 'In My Feelings',
          'Nice For What', 'Passionfruit', 'Laugh Now Cry Later', 'Hold On, We\'re Going Home', 'Money In The Grave'
        ],
        'Billie Eilish': [
          'bad guy', 'Happier Than Ever', 'Therefore I Am', 'bury a friend', 'everything i wanted',
          'when the party\'s over', 'ocean eyes', 'NDA', 'Bellyache', 'Your Power'
        ],
        'Coldplay': [
          'Yellow', 'Viva La Vida', 'The Scientist', 'Fix You', 'Paradise',
          'Hymn for the Weekend', 'Something Just Like This', 'A Sky Full of Stars', 'Clocks', 'Adventure of a Lifetime'
        ]
      };
      
      let addedSetlists = 0;
      let addedSongs = 0;
      
      // Create setlists for each show
      for (const show of shows) {
        try {
          // Find the artist for this show
          const artist = artists.find(a => a.id === show.artist_id);
          if (!artist) continue;
          
          // Insert setlist
          const setlistId = uuidv4();
          const { error: setlistError } = await supabase
            .from('setlists')
            .insert({
              id: setlistId,
              show_id: show.id,
              last_updated: new Date().toISOString()
            });
          
          if (setlistError) {
            console.warn(`Couldn't add setlist for show ${show.name}:`, setlistError.message);
            continue;
          }
          
          addedSetlists++;
          
          // Generate tracks for this artist
          const artistName = artist.name;
          const artistSongs = songsByArtist[artistName] || ['Song 1', 'Song 2', 'Song 3', 'Song 4', 'Song 5'];
          const shuffledSongs = [...artistSongs].sort(() => 0.5 - Math.random());
          
          // Get or create tracks for this artist
          for (let j = 0; j < Math.min(shuffledSongs.length, 5); j++) {
            const songName = shuffledSongs[j];
            
            // First create a track for this song
            const trackId = uuidv4();
            const { error: trackError } = await supabase
              .from('top_tracks')
              .insert({
                id: trackId,
                artist_id: artist.id,
                name: songName,
                album_name: 'Unknown Album',
                popularity: Math.floor(Math.random() * 100)
              });
            
            if (trackError) {
              console.warn(`Couldn't add track ${songName}:`, trackError.message);
              continue;
            }
            
            // Then add the track to the setlist
            const { error: songError } = await supabase
              .from('setlist_songs')
              .insert({
                setlist_id: setlistId,
                track_id: trackId,
                votes: Math.floor(Math.random() * 100) // Random vote count
              });
            
            if (songError) {
              console.warn(`Couldn't add song ${songName} to setlist:`, songError.message);
            } else {
              addedSongs++;
            }
          }
        } catch (err) {
          console.warn(`Error processing setlist:`, err);
        }
      }
      
      setStatus({
        message: `Successfully added ${addedSetlists} setlists and ${addedSongs} songs.`,
        success: addedSetlists > 0 && addedSongs > 0
      });
    } catch (error: unknown) {
      console.error('Error seeding setlists:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to seed setlists and songs';
      setStatus({
        message: `Error: ${errorMessage}`,
        success: false
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Seed Database</h2>
      </div>
      
      {status && (
        <Alert className={status.success ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 mb-6" : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 mb-6"}>
          <AlertTitle>{status.success ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Seed Artists</CardTitle>
            <CardDescription>Add sample artists to the database</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This will add 5 popular artists to the database with their IDs and images.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={seedArtists} 
              disabled={loading}
              className="w-full"
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : 'Seed Artists'}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Seed Shows</CardTitle>
            <CardDescription>Add upcoming shows for artists</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This will create future shows for all artists in the database at popular venues.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={seedShows} 
              disabled={loading}
              className="w-full"
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : 'Seed Shows'}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Seed Setlists & Songs</CardTitle>
            <CardDescription>Add setlists with songs for shows</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This will create setlists for existing shows, including popular songs with random vote counts.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={seedSetlists} 
              disabled={loading}
              className="w-full"
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : 'Seed Setlists & Songs'}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Separator className="my-6" />
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Important Notes</CardTitle>
            <CardDescription>Tips for seeding data</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>Seed the artists first, then shows, then setlists in sequential order.</li>
              <li>The seeding process adds data one record at a time to handle schema validation gracefully.</li>
              <li>If you encounter errors, check the browser console for detailed error messages.</li>
              <li>Each button creates separate entries, so you can run them multiple times to add more data.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSeedData;
