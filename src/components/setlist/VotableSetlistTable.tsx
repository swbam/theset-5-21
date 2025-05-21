
import React, { useState } from 'react';
import { ArrowBigUp, Music, Trophy, Star, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/integrations/google-analytics';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table';

interface Song {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
}

interface VotableSetlistTableProps {
  songs: Song[];
  onVote: (songId: string) => void;
  className?: string;
  anonymousVoteCount?: number;
}

const VotableSetlistTable = ({ songs, onVote, className, anonymousVoteCount = 0 }: VotableSetlistTableProps) => {
  const [animatingSongId, setAnimatingSongId] = useState<string | null>(null);
  
  const handleVote = (songId: string) => {
    setAnimatingSongId(songId);
    onVote(songId);
    
    // Track voting event in analytics
    const songName = songs.find(song => song.id === songId)?.name || 'unknown';
    trackEvent('Setlist', 'Vote', songName);
    
    // Remove animation class after animation completes
    setTimeout(() => {
      setAnimatingSongId(null);
    }, 1000);
  };
  
  // Sort songs by vote count (descending)
  const sortedSongs = [...songs].sort((a, b) => b.votes - a.votes);
  
  return (
    <div className={cn("w-full", className)}>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/10">
            <TableHead className="py-3 px-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">#</TableHead>
            <TableHead className="py-3 px-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Song</TableHead>
            <TableHead className="py-3 px-4 text-center text-xs font-medium text-white/60 uppercase tracking-wider hidden sm:table-cell">Votes</TableHead>
            <TableHead className="py-3 px-4 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
              <span className="sr-only">Vote</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSongs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-16 text-center text-white/60">
                No songs in the setlist yet. Add some songs using the dropdown above.
              </TableCell>
            </TableRow>
          ) : (
            sortedSongs.map((song, index) => (
              <TableRow 
                key={song.id} 
                className={cn(
                  "transition-colors border-b border-white/10 group",
                  animatingSongId === song.id ? "bg-white/5" : "hover:bg-white/5",
                  song.userVoted && "bg-white/10 hover:bg-white/15",
                )}
              >
                <TableCell className="py-4 px-4 w-12">
                  {index === 0 ? (
                    <div className="flex items-center text-yellow-500">
                      <Trophy size={16} className="mr-1.5" />
                      <span className="font-medium">1</span>
                    </div>
                  ) : index === 1 ? (
                    <div className="flex items-center text-gray-400">
                      <Crown size={14} className="mr-1.5" />
                      <span className="font-medium">2</span>
                    </div>
                  ) : index === 2 ? (
                    <div className="flex items-center text-amber-700">
                      <Star size={14} className="mr-1.5" />
                      <span className="font-medium">3</span>
                    </div>
                  ) : (
                    <span className="font-medium text-white/70">
                      {index + 1}
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-4 px-4">
                  <div className="flex items-center">
                    <Music size={16} className="mr-2 text-white/40" />
                    <span className={cn(
                      "font-medium truncate max-w-[150px] sm:max-w-[250px] md:max-w-full",
                      index === 0 && "text-yellow-500", 
                      index === 1 && "text-gray-400",
                      index === 2 && "text-amber-700",
                      song.userVoted && "text-white"
                    )}>
                      {song.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-4 px-4 text-center hidden sm:table-cell">
                  <span className={cn(
                    "inline-flex items-center justify-center min-w-10 text-center font-mono font-medium text-sm rounded-full py-0.5 px-2",
                    song.votes > 0 ? "bg-white/10 text-white" : "bg-white/5 text-white/60", 
                    animatingSongId === song.id && "animate-pulse"
                  )}>
                    {song.votes}
                  </span>
                </TableCell>
                <TableCell className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end">
                    {/* Vote count for mobile - moved closer to the button */}
                    <span className={cn(
                      "font-mono font-medium mr-2 text-sm",
                      song.votes > 0 ? "text-white" : "text-white/60",
                      animatingSongId === song.id && "text-primary"
                    )}>
                      {song.votes}
                    </span>
                    <button
                      onClick={() => !song.userVoted && handleVote(song.id)}
                      disabled={song.userVoted}
                      className={cn(
                        "inline-flex items-center justify-center rounded-full w-9 h-9 transition-all",
                        song.userVoted 
                          ? "bg-white text-[#0A0A16] cursor-default" 
                          : "text-white/60 hover:bg-white/10 hover:text-white",
                        animatingSongId === song.id && "scale-110"
                      )}
                      title={song.userVoted ? "You already voted for this song" : "Vote for this song"}
                      aria-label={song.userVoted ? "You already voted for this song" : "Vote for this song"}
                    >
                      <ArrowBigUp className={cn(
                        "h-5 w-5 transition-all",
                        song.userVoted && "text-[#0A0A16]",
                        animatingSongId === song.id && "animate-bounce"
                      )} />
                      <span className="sr-only">
                        {song.userVoted ? "Voted" : "Vote"}
                      </span>
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {anonymousVoteCount > 0 && anonymousVoteCount < 3 && (
        <div className="flex justify-end p-3 text-xs text-amber-400">
          <div className="flex items-center gap-1.5">
            <span>You've used {anonymousVoteCount}/3 free votes</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VotableSetlistTable;
