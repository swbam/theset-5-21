
import React, { useEffect, useMemo } from 'react';
import { PlusCircle, RefreshCw, Music } from 'lucide-react';
import { toast } from 'sonner';
import VotableSetlistTable from '@/components/setlist/VotableSetlistTable';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
} from '@/components/ui/select';

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

interface ShowSetlistProps {
  setlist: Song[];
  handleVote: (songId: string) => void;
  availableTracks: Track[];
  isLoadingAllTracks: boolean;
  selectedTrack: string;
  setSelectedTrack: (trackId: string) => void;
  handleAddSong: () => void;
  isAuthenticated: boolean;
  login: () => void;
  anonymousVoteCount?: number;
}

const ShowSetlist = ({
  setlist,
  handleVote,
  availableTracks,
  isLoadingAllTracks,
  selectedTrack,
  setSelectedTrack,
  handleAddSong,
  isAuthenticated,
  login,
  anonymousVoteCount = 0
}: ShowSetlistProps) => {
  // Optimize rendering with proper memoization
  useEffect(() => {
    console.log("ShowSetlist component mounted with setlist size:", setlist?.length || 0);
  }, []);
  
  const handleTrackSelect = (value: string) => {
    setSelectedTrack(value);
  };
  
  const handleAddTrack = () => {
    if (!selectedTrack) {
      toast.error("Please select a song first", {
        style: { background: "#14141F", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }
      });
      return;
    }
    
    // Call the handleAddSong function from the parent component
    handleAddSong();
  };
  
  // Truncate long song names - memoized
  const truncateSongName = useMemo(() => {
    return (name: string, maxLength = 50) => {
      return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
    };
  }, []);
  
  // Sort tracks alphabetically by name and filter duplicates - memoized
  const sortedTracks = useMemo(() => {
    if (!availableTracks || !Array.isArray(availableTracks)) return [];
    
    // Filter out duplicates by name (case-insensitive)
    const uniqueNames = new Set();
    const uniqueTracks = availableTracks.filter(track => {
      if (!track || !track.name) return false;
      const lowercaseName = track.name.toLowerCase();
      if (uniqueNames.has(lowercaseName)) return false;
      uniqueNames.add(lowercaseName);
      return true;
    });
    
    // Sort alphabetically by name
    return [...uniqueTracks].sort((a, b) => a.name.localeCompare(b.name));
  }, [availableTracks]);

  // If no tracks are available but not loading, show a message
  const noTracksAvailable = !isLoadingAllTracks && (!sortedTracks || sortedTracks.length === 0);
  
  return (
    <div className="flex flex-col">
      {/* Song selection dropdown at the top */}
      <div className="p-4 border-b border-white/10 mb-2">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-white/80">Add a song to this setlist:</p>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-grow w-full sm:w-auto relative">
              <Select
                value={selectedTrack}
                onValueChange={handleTrackSelect}
                disabled={isLoadingAllTracks}
              >
                <SelectTrigger className="w-full bg-black border-white/10 text-white">
                  <SelectValue placeholder="Select a song" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border-white/10 text-white z-50 max-h-80">
                  {isLoadingAllTracks ? (
                    <div className="flex items-center justify-center py-4 text-white/60">
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      <span>Loading songs...</span>
                    </div>
                  ) : noTracksAvailable ? (
                    <div className="flex flex-col items-center justify-center py-6 px-4">
                      <Music className="h-8 w-8 text-white/20 mb-2" />
                      <p className="text-center text-white/60">
                        No songs available yet. We'll add some default tracks soon!
                      </p>
                    </div>
                  ) : (
                    sortedTracks.map((track) => (
                      <SelectItem 
                        key={track.id} 
                        value={track.id} 
                        className="focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white"
                      >
                        {truncateSongName(track.name)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleAddTrack}
              disabled={isLoadingAllTracks || !availableTracks.length || !selectedTrack}
              className="mt-2 sm:mt-0 flex-shrink-0 bg-white text-[#0A0A16] hover:bg-white/90" 
              size="sm"
            >
              <PlusCircle size={16} className="mr-1.5" />
              Add to Setlist
            </Button>
          </div>
          {availableTracks && availableTracks.length > 0 && (
            <p className="text-xs text-white/40 mt-1">
              {availableTracks.length} songs available in the catalog
            </p>
          )}
        </div>
      </div>
      
      <VotableSetlistTable 
        songs={setlist} 
        onVote={handleVote} 
        className="animate-fade-in"
        anonymousVoteCount={anonymousVoteCount}
      />
    </div>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default React.memo(ShowSetlist);
