
import React from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth/AuthContext';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import SetlistHeader from './SetlistHeader';
import ShowSetlist from './ShowSetlist';
import VotingStats from './VotingStats';
import HowItWorksCard from './HowItWorksCard';

interface Song {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
}

interface Track {
  id: string;
  name: string;
}

interface SetlistSectionProps {
  setlist: Song[];
  isConnected: boolean;
  isLoadingTracks: boolean;
  handleVote: (songId: string) => void;
  showId?: string;
  showName?: string;
  artistName?: string;
  availableTracks?: Track[];
  isLoadingAllTracks?: boolean;
  selectedTrack?: string;
  setSelectedTrack?: (trackId: string) => void;
  handleAddSong?: () => void;
  anonymousVoteCount?: number;
}

const SetlistSection: React.FC<SetlistSectionProps> = ({ 
  setlist, 
  isConnected, 
  isLoadingTracks, 
  handleVote,
  showId = '',
  showName = 'Concert',
  artistName = 'Artist',
  availableTracks = [],
  isLoadingAllTracks = false,
  selectedTrack = '',
  setSelectedTrack = () => {},
  handleAddSong = () => {},
  anonymousVoteCount = 0
}) => {
  const { isAuthenticated, login } = useAuth();
  
  const totalVotes = setlist.reduce((acc, song) => acc + song.votes, 0);
  const userVotedCount = setlist.filter(song => song.userVoted).length;
  
  // For debugging
  console.log("Available tracks:", availableTracks.length);
  console.log("Selected track:", selectedTrack);
  console.log("Is loading tracks:", isLoadingAllTracks);
  
  return (
    <section className="px-6 md:px-8 lg:px-12 py-12 bg-black">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-[#0A0A0A] border-white/10 shadow-lg overflow-hidden">
              <CardHeader className="pb-0">
                <SetlistHeader 
                  isConnected={isConnected}
                  totalVotes={totalVotes}
                  showId={showId}
                  showName={showName}
                  artistName={artistName}
                />
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingTracks ? (
                  <div className="p-12 space-y-8 animate-pulse">
                    <div className="h-8 bg-white/5 rounded w-full max-w-md"></div>
                    <div className="h-8 bg-white/5 rounded w-full max-w-lg"></div>
                    <div className="h-8 bg-white/5 rounded w-full max-w-sm"></div>
                    <div className="h-8 bg-white/5 rounded w-full max-w-lg"></div>
                  </div>
                ) : (
                  <>
                    <ShowSetlist 
                      setlist={setlist}
                      handleVote={handleVote}
                      availableTracks={availableTracks}
                      isLoadingAllTracks={isLoadingAllTracks}
                      selectedTrack={selectedTrack}
                      setSelectedTrack={setSelectedTrack}
                      handleAddSong={handleAddSong}
                      isAuthenticated={isAuthenticated}
                      login={login}
                      anonymousVoteCount={anonymousVoteCount}
                    />
                    
                    {!isAuthenticated && anonymousVoteCount >= 3 && (
                      <div className="p-4 mx-4 mb-4 mt-2">
                        <Alert variant="default" className="bg-white/5 border-white/10">
                          <AlertCircle className="h-4 w-4 text-white/70" />
                          <AlertDescription className="flex items-center justify-between">
                            <span className="text-white/80">You've used all your free votes. Log in with Spotify to vote more!</span>
                            <Button 
                              size="sm" 
                              onClick={login}
                              className="bg-white text-black hover:bg-white/90"
                            >
                              Log In
                            </Button>
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                    
                    <div className="p-5 border-t border-white/10 text-sm text-white/60 flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <p>
                          Last updated {formatDistanceToNow(new Date(), { addSuffix: true })}
                        </p>
                      </div>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-white/40" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-[#0A0A0A] border-white/10 text-white">
                            <p>Votes are updated automatically</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <VotingStats
              totalVotes={totalVotes}
              userVotedCount={userVotedCount}
              anonymousVoteCount={anonymousVoteCount}
              isAuthenticated={isAuthenticated}
              login={login}
            />
            
            <HowItWorksCard />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SetlistSection;
