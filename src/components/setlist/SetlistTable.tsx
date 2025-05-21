
import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Song {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
}

interface SetlistTableProps {
  songs: Song[];
  onVote: (songId: string) => void;
  isLoading?: boolean;
  className?: string;
}

const SetlistTable = ({ songs, onVote, isLoading = false, className }: SetlistTableProps) => {
  const [animatingSongId, setAnimatingSongId] = useState<string | null>(null);
  
  // Sort songs by vote count
  const sortedSongs = [...songs].sort((a, b) => b.votes - a.votes);
  
  const handleVote = (songId: string) => {
    setAnimatingSongId(songId);
    onVote(songId);
    
    // Remove animation class after animation completes
    setTimeout(() => {
      setAnimatingSongId(null);
    }, 1000);
  };

  return (
    <div className={cn("overflow-hidden rounded-xl", className)}>
      <div className="relative overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-card">
            <tr>
              <th className="px-6 py-4 text-sm font-medium text-muted-foreground">#</th>
              <th className="px-8 py-4 text-sm font-medium text-muted-foreground">Song</th>
              <th className="px-6 py-4 text-sm font-medium text-muted-foreground text-right">Votes</th>
              <th className="px-8 py-4 text-sm font-medium text-muted-foreground text-center">Vote</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              // Loading state with skeletons
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="bg-card">
                  <td className="px-6 py-5">
                    <div className="h-4 w-4 bg-secondary rounded animate-pulse" />
                  </td>
                  <td className="px-8 py-5">
                    <div className="h-4 w-48 bg-secondary rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="h-4 w-8 ml-auto bg-secondary rounded animate-pulse" />
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="h-8 w-8 mx-auto bg-secondary rounded-full animate-pulse" />
                  </td>
                </tr>
              ))
            ) : (
              sortedSongs.map((song, index) => (
                <tr 
                  key={song.id} 
                  className={cn(
                    "bg-card transition-colors duration-300",
                    animatingSongId === song.id && "bg-primary/5"
                  )}
                >
                  <td className="px-6 py-6 font-mono text-muted-foreground">{index + 1}</td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "font-medium text-xl",
                      song.userVoted && "text-white font-semibold",
                    )}>
                      {song.name}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <span className={cn(
                      "font-mono text-xl transition-all",
                      animatingSongId === song.id && "text-primary font-medium scale-110"
                    )}>
                      {song.votes}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <button
                      onClick={() => !song.userVoted && handleVote(song.id)}
                      disabled={song.userVoted}
                      className={cn(
                        "p-2 rounded-full transition-all",
                        song.userVoted
                          ? "bg-primary/10 text-primary cursor-default"
                          : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                      aria-label={song.userVoted ? "Already voted" : "Vote for this song"}
                    >
                      <ArrowUp size={22} className={cn(
                        "transition-transform",
                        animatingSongId === song.id && "animate-ping-slow",
                        song.userVoted && "fill-primary"
                      )} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SetlistTable;
