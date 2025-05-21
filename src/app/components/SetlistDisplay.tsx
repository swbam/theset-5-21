import { useState } from 'react';
import { format } from 'date-fns';
import DataLoader from './DataLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsUp } from 'lucide-react';
import { handleVote } from '@/app/actions/vote';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect } from 'react';

interface SetlistDisplayProps {
  artistId: string;
}

interface Setlist {
  id: string;
  date: string;
  venue: string;
  city: string;
  songs: Array<{
    id: string;
    name: string;
    vote_count: number;
  }>;
}

const SetlistDisplay = ({ artistId }: SetlistDisplayProps) => {
  const [user, setUser] = useState<any>(null);
  const supabase = createClientComponentClient();
  const [expandedSetlist, setExpandedSetlist] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  const toggleSetlist = (id: string) => {
    setExpandedSetlist(expandedSetlist === id ? null : id);
  };

  const handleSongVote = async (songId: string, increment: boolean) => {
    if (!user) return;
    
    // Optimistically update UI
    setVotes(prev => ({
      ...prev,
      [songId]: increment
    }));
    
    // Call server action
    await handleVote(songId, user.id, increment);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Past Setlists</h2>
      
      <DataLoader
        entity="past_setlists"
        filter={{ artist_id: artistId }}
        limit={10}
      >
        {(setlists: Setlist[]) => (
          setlists.length === 0 ? (
            <Card className="p-6 bg-muted/50">
              <p className="text-center text-muted-foreground">No past setlists found</p>
              <p className="text-center text-sm mt-2">Check back later or try another artist</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {setlists.map((setlist) => (
                <Card key={setlist.id} className="overflow-hidden transition-all">
                  <CardHeader 
                    className={`bg-muted/30 cursor-pointer ${expandedSetlist === setlist.id ? 'pb-3' : 'pb-4'}`}
                    onClick={() => toggleSetlist(setlist.id)}
                  >
                    <CardTitle className="flex justify-between items-center text-base">
                      <div className="flex flex-col">
                        <span className="font-medium">{format(new Date(setlist.date), 'MMM d, yyyy')}</span>
                        <span className="text-sm text-muted-foreground font-normal">{setlist.venue}</span>
                      </div>
                      <div className="text-sm text-muted-foreground font-normal">
                        {setlist.city}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  
                  {expandedSetlist === setlist.id && (
                    <CardContent className="pt-4">
                      {setlist.songs && setlist.songs.length > 0 ? (
                        <ul className="space-y-2">
                          {setlist.songs.map((song: { id: string, name: string, vote_count: number }) => (
                            <li 
                              key={song.id} 
                              className="flex justify-between items-center text-sm p-2 hover:bg-muted/30 rounded-md transition-colors"
                            >
                              <span>{song.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{(song.vote_count || 0) + (votes[song.id] ? 1 : 0)} votes</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className={`h-8 w-8 ${votes[song.id] ? 'text-primary' : ''}`}
                                  onClick={() => handleSongVote(song.id, !votes[song.id])}
                                  disabled={!user}
                                >
                                  <ThumbsUp size={16} />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">
                          No songs available for this setlist
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )
        )}
      </DataLoader>
    </div>
  );
};

export default SetlistDisplay; 