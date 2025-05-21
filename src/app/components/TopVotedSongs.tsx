"use client"; // Add this directive

"use client"; // Add this directive

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp } from 'lucide-react';
import { getTopVotedSongs } from '@/lib/api-helpers';

interface TopVotedSongsProps {
  artistId?: string;
  limit?: number;
  showArtist?: boolean;
  title?: string;
}

const TopVotedSongs = ({ 
  artistId, 
  limit = 10, 
  showArtist = true,
  title = "Top Voted Songs" 
}: TopVotedSongsProps) => {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await getTopVotedSongs(artistId, limit);
        setSongs(data);
      } catch (error) {
        console.error('Error fetching top voted songs:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [artistId, limit]);

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-10" />
              </div>
            ))}
          </div>
        ) : songs.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No voted songs yet</p>
        ) : (
          <ul className="space-y-3">
            {songs.map((song, index) => (
              <li 
                key={song.song_id} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-medium">
                  {index + 1}
                </span>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{song.song_name}</p>
                  
                  {showArtist && (
                    <Link 
                      href={`/artists/${song.artist_id}`}
                      className="text-xs text-muted-foreground hover:text-primary truncate block"
                    >
                      {song.artist_name}
                    </Link>
                  )}
                  
                  <Link 
                    href={`/shows/${song.show_id}`}
                    className="text-xs text-muted-foreground hover:text-primary truncate block"
                  >
                    {new Date(song.show_date).toLocaleDateString()} • {song.venue_name}
                  </Link>
                </div>
                
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                  <ArrowUp size={12} />
                  <span>{song.vote_count}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default TopVotedSongs; 