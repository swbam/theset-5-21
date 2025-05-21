
import React from 'react';
import { Users, Info } from 'lucide-react';
import { CardTitle, CardDescription } from '@/components/ui/card';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import ShareSetlistButton from '@/components/setlist/ShareSetlistButton';

interface SetlistHeaderProps {
  isConnected: boolean;
  totalVotes: number;
  showId: string;
  showName: string;
  artistName: string;
}

const SetlistHeader = ({ isConnected, totalVotes, showId, showName, artistName }: SetlistHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/10">
      <div>
        <CardTitle className="text-2xl font-bold flex items-center gap-2 text-white">
          What do you want to hear?
        </CardTitle>
        <CardDescription className="mt-1.5 text-white/70">
          Vote for songs you want to hear at this show
        </CardDescription>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs bg-white/10 text-white px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                <Users size={14} />
                <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-[#0A0A0A] border-white/10 text-white">
              <p>Total votes across all songs</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <ShareSetlistButton 
          showId={showId}
          showName={showName}
          artistName={artistName}
        />
      </div>
    </div>
  );
};

export default SetlistHeader;
