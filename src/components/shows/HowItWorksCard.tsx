
import React from 'react';
import { Info, Clock, Music, ThumbsUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const HowItWorksCard = () => {
  return (
    <Card className="bg-[#0A0A0A] border-white/10 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
          <Info className="h-5 w-5 text-white/70" />
          How It Works
        </CardTitle>
      </CardHeader>
      <CardContent className="text-white/70 text-sm space-y-4">
        <div className="flex items-start gap-3">
          <ThumbsUp size={18} className="text-white/60 mt-0.5" />
          <p>
            Vote for songs you want to hear at this show. The most voted songs rise to the top of the list.
          </p>
        </div>
        
        <div className="flex items-start gap-3">
          <Music size={18} className="text-white/60 mt-0.5" />
          <p>
            Anyone can add songs to the setlist! Select from the dropdown above to help build the perfect concert.
          </p>
        </div>
        
        <div className="flex items-start gap-3">
          <Clock size={18} className="text-white/60 mt-0.5" />
          <p>
            Non-logged in users can vote for up to 3 songs. Create an account to vote for unlimited songs!
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-white/50 mt-2 pt-2 border-t border-white/10">
          <Clock size={14} />
          <p className="text-xs">Voting closes 2 hours before the show</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HowItWorksCard;
