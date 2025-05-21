"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Music } from "lucide-react"; // Removed unused Plus, Save
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createSetlistForShow } from "@/lib/api/database/setlists"; // Corrected import name

interface Show {
  id: string;
  name: string;
  date: string;
  artist_id?: string;
  artist?: {
    id: string;
    name: string;
  };
}

interface Artist {
  id: string;
  name: string;
  spotify_id?: string;
}

export function SetlistCreator() {
  const router = useRouter();
  const [shows, setShows] = useState<Show[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedShowId, setSelectedShowId] = useState<string>("");
  const [selectedArtistId, setSelectedArtistId] = useState<string>("");
  const [loadingShows, setLoadingShows] = useState(true);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isShowMode, setIsShowMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchShows();
    fetchArtists();
  }, []);

  useEffect(() => {
    // When show is selected, auto-select its artist if it has one
    if (selectedShowId) {
      const show = shows.find(s => s.id === selectedShowId);
      if (show?.artist_id) {
        setSelectedArtistId(show.artist_id);
      }
    }
  }, [selectedShowId, shows]);

  const fetchShows = async () => {
    try {
      setLoadingShows(true);
      
      const { data, error } = await supabase
        .from('shows')
        .select(`
          id,
          name,
          date,
          artist_id,
          artist:artist_id (
            id, 
            name
          )
        `)
        .order('date', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Filter out shows that already have setlists
      const { data: existingSetlists, error: setlistError } = await supabase
        .from('setlists')
        .select('show_id');
      
      if (setlistError) {
        throw setlistError;
      }
      
      const showsWithoutSetlists = data.filter(show => 
        !existingSetlists.some(setlist => setlist.show_id === show.id)
      );
      
      setShows(showsWithoutSetlists);
    } catch (error) {
      console.error('Error fetching shows:', error);
      toast.error('Failed to load shows');
    } finally {
      setLoadingShows(false);
    }
  };

  const fetchArtists = async () => {
    try {
      setLoadingArtists(true);
      
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, spotify_id')
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
      toast.error('Failed to load artists');
    } finally {
      setLoadingArtists(false);
    }
  };

  const handleCreateSetlist = async () => {
    if (isShowMode && !selectedShowId) {
      toast.error('Please select a show');
      return;
    }
    
    if (!selectedArtistId) {
      toast.error('Please select an artist');
      return;
    }
    
    try {
      setCreating(true);
      let showId = selectedShowId;
      
      // If we're not in show mode, we need to create a dummy show
      if (!isShowMode) {
        const { data: newShow, error: showError } = await supabase
          .from('shows')
          .insert({
            name: `Custom setlist for ${artists.find(a => a.id === selectedArtistId)?.name || 'Unknown artist'}`,
            artist_id: selectedArtistId,
            date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (showError) {
          throw showError;
        }
        
        showId = newShow.id;
      }
      
      const setlistId = await createSetlistForShow(showId, selectedArtistId); // Corrected function call
      
      if (!setlistId) {
        throw new Error('Failed to create setlist');
      }
      
      toast.success('Setlist created successfully');
      
      // Navigate to the edit page for the new setlist
      router.push(`/admin/setlists/${setlistId}`);
      
    } catch (error) {
      console.error('Error creating setlist:', error);
      toast.error('Failed to create setlist');
    } finally {
      setCreating(false);
    }
  };

  const filteredArtists = artists.filter(artist => 
    artist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Setlist</CardTitle>
        <CardDescription>
          Create a setlist for a show or an artist
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="flex items-center space-x-2 mb-2">
              <input 
                type="radio" 
                checked={isShowMode} 
                onChange={() => setIsShowMode(true)} 
                className="h-4 w-4"
              />
              <span>Create for a Show</span>
            </label>
            <label className="flex items-center space-x-2">
              <input 
                type="radio" 
                checked={!isShowMode} 
                onChange={() => setIsShowMode(false)} 
                className="h-4 w-4"
              />
              <span>Create for an Artist Only</span>
            </label>
          </div>
        </div>

        {isShowMode && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Select Show</h3>
            <Select
              disabled={loadingShows || shows.length === 0}
              value={selectedShowId}
              onValueChange={setSelectedShowId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a show">
                  {loadingShows ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading shows...
                    </div>
                  ) : (
                    selectedShowId 
                      ? shows.find(s => s.id === selectedShowId)?.name || "Select a show"
                      : "Select a show"
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {shows.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    No shows without setlists found
                  </div>
                ) : (
                  shows.map(show => (
                    <SelectItem key={show.id} value={show.id}>
                      <div className="flex flex-col">
                        <span>{show.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {show.artist?.name || "Unknown artist"}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Select Artist</h3>
          
          {!isShowMode && (
            <div className="mb-2">
              <Input
                type="search"
                placeholder="Search artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
          
          <Select
            disabled={loadingArtists || (isShowMode && !selectedShowId)}
            value={selectedArtistId}
            onValueChange={setSelectedArtistId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an artist">
                {loadingArtists ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading artists...
                  </div>
                ) : (
                  selectedArtistId 
                    ? artists.find(a => a.id === selectedArtistId)?.name || "Select an artist"
                    : "Select an artist"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {isShowMode ? (
                // In show mode, only show the show's artist
                selectedShowId && shows.find(s => s.id === selectedShowId)?.artist?.id ? (
                  <SelectItem 
                    value={shows.find(s => s.id === selectedShowId)?.artist?.id || ""}
                  >
                    {shows.find(s => s.id === selectedShowId)?.artist?.name || "Unknown artist"}
                  </SelectItem>
                ) : (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    Select a show first
                  </div>
                )
              ) : (
                // In artist-only mode, show all artists
                filteredArtists.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    No artists found matching "{searchQuery}"
                  </div>
                ) : (
                  filteredArtists.map(artist => (
                    <SelectItem key={artist.id} value={artist.id}>
                      {artist.name}
                    </SelectItem>
                  ))
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreateSetlist}
          disabled={
            creating || 
            (isShowMode && !selectedShowId) || 
            !selectedArtistId
          }
        >
          {creating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Music className="mr-2 h-4 w-4" />
              Create Setlist
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 