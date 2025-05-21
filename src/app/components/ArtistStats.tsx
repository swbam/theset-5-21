"use client"; // Add this directive

import { useState, useEffect } from 'react';
// import Image from 'next/image'; // Unused
import Link from 'next/link';
import {
  Users, CalendarDays, ThumbsUp, TrendingUp, // Removed Music
  ListMusic, Disc3, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface ArtistStats {
  id: string;
  name: string;
  spotify_id: string | null;
  image_url: string | null;
  followers: number;
  popularity: number;
  genres: string[];
  track_count: number;
  upcoming_shows_count: number;
  total_votes: number;
  last_updated: string;
  spotify_url: string | null;
}

interface ArtistStatsProps {
  artistId: string;
}

export default function ArtistStats({ artistId }: ArtistStatsProps) {
  const [stats, setStats] = useState<ArtistStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/artist-stats?id=${artistId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch artist stats');
        }
        
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching artist stats:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, [artistId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Artist Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-6 w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-red-700">Artist Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 text-sm">Could not load artist statistics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Artist Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Followers</p>
            <p className="text-muted-foreground text-sm">
              {stats.followers.toLocaleString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Popularity</p>
            <Progress 
              className="h-2 mt-1" 
              value={stats.popularity} 
            />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.popularity}/100
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Disc3 className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Genres</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {stats.genres && stats.genres.length > 0 ? (
                stats.genres.slice(0, 3).map((genre) => (
                  <Badge key={genre} variant="secondary" className="text-xs">
                    {genre}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No genres available</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Upcoming Shows</p>
            <p className="text-muted-foreground text-sm">
              {stats.upcoming_shows_count > 0
                ? `${stats.upcoming_shows_count} upcoming ${stats.upcoming_shows_count === 1 ? 'show' : 'shows'}`
                : 'No upcoming shows'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <ListMusic className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Tracks</p>
            <p className="text-muted-foreground text-sm">
              {stats.track_count.toLocaleString()} tracks
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <ThumbsUp className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Total Votes</p>
            <p className="text-muted-foreground text-sm">
              {stats.total_votes.toLocaleString()} votes
            </p>
          </div>
        </div>
        
        {stats.spotify_url && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2" 
            asChild
          >
            <Link 
              href={stats.spotify_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <span>Open in Spotify</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        )}
        
        <p className="text-xs text-muted-foreground text-center mt-2">
          Last updated: {new Date(stats.last_updated).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
} 