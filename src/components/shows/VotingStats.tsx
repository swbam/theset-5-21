
import React from 'react';
import { Trophy, Users, Info, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface VotingStatsProps {
  totalVotes: number;
  userVotedCount: number;
  anonymousVoteCount: number;
  isAuthenticated: boolean;
  login: () => void;
}

const VotingStats = ({
  totalVotes,
  userVotedCount,
  anonymousVoteCount,
  isAuthenticated,
  login
}: VotingStatsProps) => {
  return (
    <Card className="bg-[#0A0A0A] border-white/10 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
          <Trophy className="h-5 w-5 text-white/70" />
          Voting Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-white/70 mb-1">Total Votes</p>
          <div className="text-2xl font-bold text-white">{totalVotes}</div>
          <div className="w-full h-2 bg-white/10 rounded-full mt-1">
            <div className="h-full bg-white/30 rounded-full" style={{ width: `${Math.min(100, totalVotes / 10)}%` }}></div>
          </div>
        </div>
        
        {(isAuthenticated || userVotedCount > 0) && (
          <div>
            <p className="text-sm text-white/70 mb-1">Your Votes</p>
            <div className="text-2xl font-bold text-white">{userVotedCount}</div>
            <div className="w-full h-2 bg-white/10 rounded-full mt-1">
              <div className="h-full bg-white/30 rounded-full" style={{ width: `${Math.min(100, (userVotedCount / 10) * 100)}%` }}></div>
            </div>
          </div>
        )}
        
        {!isAuthenticated && anonymousVoteCount > 0 && (
          <div>
            <p className="text-sm text-white/70 mb-1">Free Votes Used</p>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-white">{anonymousVoteCount}/3</div>
              <Button 
                size="sm" 
                onClick={login}
                variant="outline"
                className="text-xs h-7 mt-1 border-white/20 hover:bg-white/10"
              >
                Log in for more
              </Button>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full mt-1">
              <div className="h-full bg-amber-500/50 rounded-full" style={{ width: `${(anonymousVoteCount / 3) * 100}%` }}></div>
            </div>
          </div>
        )}
        
        <div>
          <p className="text-sm text-white/70 mb-1">Voting Closes In</p>
          <div className="text-xl font-bold text-white">2d 14h</div>
        </div>
        
        <div className="pt-2 mt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-white/70" />
            <p className="text-sm text-white/70"><span className="font-bold text-white">127</span> fans have voted</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VotingStats;
