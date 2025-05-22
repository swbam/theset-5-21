'use client';

import React, { useState, useEffect } from 'react';
// Import client-side safe functions only
import { searchArtistsWithEvents } from '@/lib/api/artist'; // Assuming this was restored/exists
// Removed imports for server-side logic (save*, fetchAndStore*)
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  RefreshCw, 
  Plus, 
  Calendar, 
  Music, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  MapPin, 
  Building,
  Download,
  AlertTriangle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EntityType, SyncOperation } from '@/lib/sync/types';

// Define interfaces
// Use the shared Artist type if possible, or define locally if needed
// Assuming ArtistWithEvents is the type returned by searchArtistsWithEvents
interface ArtistSearchResult extends ArtistWithEvents {
  imported?: boolean; // Keep local state flags if needed
  savedShowsCount?: number;
  updated_at?: string; // Likely from DB check, might not be needed here anymore
}
// Use BaseArtist for the payload to the Edge Function
import type { Artist as BaseArtist } from '@/lib/types';
import type { ArtistWithEvents } from '@/lib/api/artist'; // Import the search result type

interface Venue {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  image_url?: string;
  updated_at?: string;
  imported?: boolean;
  savedShowsCount?: number;
}

interface Show {
  id: string;
  name: string;
  date: string;
  ticket_url?: string;
  image_url?: string;
  artist_id: string;
  venue?: Venue;
  venue_id?: string;
  updated_at?: string;
  _embedded?: {
    venues?: Array<{
      id: string;
      name: string;
      city?: { name: string };
      state?: { name: string };
      country?: { name: string };
    }>;
  };
  dates?: {
    start?: {
      dateTime: string;
    };
  };
  images?: Array<{
    url: string;
    ratio?: string;
    width?: number;
  }>;
  url?: string;
}

interface ImportStatusItem {
  type: 'artist' | 'catalog' | 'shows' | 'setlists' | 'sync' | 'complete' | 'error';
  message: string;
  success?: boolean;
  timestamp?: string;
}

const AdminArtistImport = () => {
  const [artistName, setArtistName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<any | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncResult, setSyncResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [artistResults, setArtistResults] = useState<ArtistSearchResult[]>([]); // Use updated type
  const [importing, setImporting] = useState<Record<string, boolean>>({});
  const [importStatus, setImportStatus] = useState<Record<string, ImportStatusItem>>({});
  const [generalStatus, setGeneralStatus] = useState<{ message: string; success: boolean } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [recentImports, setRecentImports] = useState<string[]>([]);
  const [syncActivity, setSyncActivity] = useState<any[]>([]);

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // For development mode, always set authenticated to true
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: bypassing auth check for admin functionality');
          setIsAuthenticated(true);
          return;
        }
        
        // For production, check actual auth status
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error fetching session:', error);
        }
        setIsAuthenticated(!!data?.session);

        // Subscribe to auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          setIsAuthenticated(!!session);
        });

        return () => {
          authListener?.subscription?.unsubscribe();
        };
      } catch (error) {
        console.error('Error checking auth status:', error);
        // Fallback to authenticated in development
        if (process.env.NODE_ENV === 'development') {
          setIsAuthenticated(true);
        }
      }
    };

    checkAuth();
  }, []);

  // Search for artists
  const handleSearch = async () => {
    if (!artistName.trim()) {
      setError('Please enter an artist name');
      return;
    }
    
    try {
      setError(null);
      setIsSearching(true);
      setSyncResult(null);
      setSelectedArtist(null);
      
      // Call the Ticketmaster search API
      const response = await fetch(`/api/search/artists?name=${encodeURIComponent(artistName)}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      setSearchResults(data.artists || []);
      
      if (data.artists?.length === 0) {
        setError('No artists found matching that name');
      }
    } catch (err) {
      console.error('Artist search error:', err);
      setError(err instanceof Error ? err.message : 'Failed to search for artists');
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle selecting an artist
  const handleSelectArtist = (artist: any) => {
    setSelectedArtist(artist);
    setSyncResult(null);
  };
  
  // Start sync operation for the selected artist
  const handleSyncArtist = async () => {
    if (!selectedArtist) {
      return;
    }
    
    try {
      setSyncInProgress(true);
      setSyncResult(null);
      setError(null);
      
      // Call our orchestrator API to start the sync
      const response = await fetch('/api/sync/orchestrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: {
            type: 'artist' as EntityType,
            id: selectedArtist.id || selectedArtist.name,
            operation: 'cascade_sync' as SyncOperation,
            priority: 'high',
          },
          dependencyCheck: true,
          retryFailed: true
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      
      const result = await response.json();
      setSyncResult(result);
    } catch (err) {
      console.error('Failed to sync artist:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync artist');
    } finally {
      setSyncInProgress(false);
    }
  };

  // Function to search for artists using Ticketmaster API
  const handleArtistSearch = async () => {
    if (!artistSearchQuery.trim()) return;

    setIsSearching(true);
    setArtistResults([]);
    setGeneralStatus(null);
    setImportStatus({});
    setSearchError('');
    setSearchResults([]);

    try {
      // searchArtistsWithEvents should return ArtistWithEvents[]
      const results: ArtistWithEvents[] = await searchArtistsWithEvents(artistSearchQuery);
      console.log('Artist search results:', results);

      // Map results to local state type if needed (e.g., adding 'imported' flag)
      // For now, assume ArtistSearchResult is compatible enough or adjust mapping
      const formattedResults: ArtistSearchResult[] = results.map(result => ({
        ...result, // Spread properties from ArtistWithEvents
        // Add any additional local state flags if necessary
        // imported: false, // Example
      }));
      
      setArtistResults(formattedResults);

      if (formattedResults.length === 0) {
        setGeneralStatus({
          message: `No artists found matching "${artistSearchQuery}"`,
          success: false
        });
      }
    } catch (error: unknown) {
      console.error('Error searching artists:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGeneralStatus({
        message: `Error searching for artists: ${errorMessage}`,
        success: false
      });
      setSearchError('Failed to search for artists. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Function to handle key press in search input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleArtistSearch();
    }
  };

  // Function to import an artist and their upcoming shows using the new data flow
  // Refactored to invoke the 'import-artist' Edge Function
  const handleImportArtist = async (artist: ArtistSearchResult) => {
    const artistId = artist.id; // Use TM ID as the key for status/loading
    if (!artistId || !artist.name) {
      console.error("Invalid artist data for import:", artist);
      setImportStatus(prev => ({ 
        ...prev, 
        [artistId]: { 
          type: 'error', 
          message: 'Invalid artist data provided.', 
          success: false,
          timestamp: new Date().toISOString()
        } 
      }));
      return;
    }

    console.log(`[Admin Import] Triggering orchestrated import for artist: ${artist.name} (ID: ${artistId})`);
    setImporting(prev => ({ ...prev, [artistId]: true }));
    setImportStatus(prev => ({ 
      ...prev, 
      [artistId]: { 
        type: 'sync', 
        message: 'Initiating artist sync...',
        timestamp: new Date().toISOString()
      } 
    }));

    try {
      // Use the orchestrator to sync the artist
      const { data, error } = await supabase.functions.invoke('orchestrate-sync', {
        body: { 
          task: 'sync-artist',
          entityType: 'artist',
          entityId: artistId,
          priority: 'high'
        }
      });
      
      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error during sync');
      }
      
      // Update status to show artist was imported
      setImportStatus(prev => ({ 
        ...prev, 
        [artistId]: { 
          type: 'artist', 
          message: `Artist "${artist.name}" imported successfully!`,
          success: true,
          timestamp: new Date().toISOString()
        } 
      }));
      
      // Add to recent imports
      setRecentImports(prev => [artistId, ...prev.filter(id => id !== artistId)].slice(0, 5));
      
      // Fetch upcoming shows automatically
      if ((artist.upcomingEvents != null ? (typeof artist.upcomingEvents === 'object' ? (artist.upcomingEvents._total ?? 0) : (artist.upcomingEvents ?? 0)) : 0) > 0) {
        await importArtistShows(artistId, data.data.id, artist.name);
      }
      
      // Import Spotify catalog if available
      if (data.data?.spotify_id) {
        await importSpotifyCatalog(data.data.id, artist.name);
      }
      
      // Refresh sync activity
      setTimeout(loadSyncActivity, 1000);
    } catch (error) {
      console.error(`[Admin Import] Error importing artist ${artistId}:`, error);
      setImportStatus(prev => ({ 
        ...prev, 
        [artistId]: { 
          type: 'error', 
          message: `Failed to import artist: ${error instanceof Error ? error.message : 'Unknown error'}`,
          success: false,
          timestamp: new Date().toISOString()
        } 
      }));
    } finally {
      setImporting(prev => ({ ...prev, [artistId]: false }));
    }
  };

  // Import upcoming shows for the artist
  const importArtistShows = async (artistExternalId: string, artistDbId: string, artistName: string) => {
    try {
      setImportStatus(prev => ({ 
        ...prev, 
        [artistExternalId]: { 
          type: 'shows', 
          message: `Importing upcoming shows for ${artistName}...`,
          timestamp: new Date().toISOString()
        } 
      }));
      
      // Search for upcoming shows
      const { data: showsData, error: showsError } = await supabase.functions.invoke('search-shows', {
        body: { 
          artistId: artistExternalId,
          limit: 10
        }
      });
      
      if (showsError) throw showsError;
      
      if (!showsData?.shows || !Array.isArray(showsData.shows) || showsData.shows.length === 0) {
        setImportStatus(prev => ({ 
          ...prev, 
          [artistExternalId]: { 
            type: 'shows', 
            message: 'No upcoming shows found.',
            success: true,
            timestamp: new Date().toISOString()
          } 
        }));
        return;
      }
      
      // Sync each show using the orchestrator
      let syncedCount = 0;
      for (const show of showsData.shows) {
        if (!show.id) continue;
        
        const { data: syncResult } = await supabase.functions.invoke('orchestrate-sync', {
          body: { 
            task: 'sync-show',
            entityType: 'show',
            entityId: show.id,
            priority: 'medium'
          }
        });
        
        if (syncResult?.success) {
          syncedCount++;
        }
      }
      
      setImportStatus(prev => ({ 
        ...prev, 
        [artistExternalId]: { 
          type: 'shows', 
          message: `Successfully imported ${syncedCount} shows for ${artistName}.`,
          success: true,
          timestamp: new Date().toISOString()
        } 
      }));
    } catch (error) {
      console.error(`[Admin Import] Error importing shows for artist ${artistExternalId}:`, error);
      setImportStatus(prev => ({ 
        ...prev, 
        [artistExternalId]: { 
          type: 'shows', 
          message: `Error importing shows: ${error instanceof Error ? error.message : 'Unknown error'}`,
          success: false,
          timestamp: new Date().toISOString()
        } 
      }));
    }
  };
  
  // Import Spotify catalog for the artist
  const importSpotifyCatalog = async (artistDbId: string, artistName: string) => {
    try {
      setImportStatus(prev => ({ 
        ...prev, 
        [artistDbId]: { 
          type: 'catalog', 
          message: `Importing Spotify catalog for ${artistName}...`,
          timestamp: new Date().toISOString()
        } 
      }));
      
      // Use the orchestrator to import the Spotify catalog
      const { data, error } = await supabase.functions.invoke('orchestrate-sync', {
        body: { 
          task: 'import-spotify-catalog',
          entityType: 'catalog',
          entityId: artistDbId,
          priority: 'low'
        }
      });
      
      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error during catalog import');
      }
      
      const songsImported = data.data?.songs_imported || 0;
      
      setImportStatus(prev => ({ 
        ...prev, 
        [artistDbId]: { 
          type: 'catalog', 
          message: `Imported ${songsImported} songs from Spotify for ${artistName}.`,
          success: true,
          timestamp: new Date().toISOString()
        } 
      }));
    } catch (error) {
      console.error(`[Admin Import] Error importing Spotify catalog for artist ${artistDbId}:`, error);
      setImportStatus(prev => ({ 
        ...prev, 
        [artistDbId]: { 
          type: 'catalog', 
          message: `Error importing catalog: ${error instanceof Error ? error.message : 'Unknown error'}`,
          success: false,
          timestamp: new Date().toISOString()
        } 
      }));
    }
  };
  
  // Load recent sync activity on mount
  useEffect(() => {
    loadSyncActivity();
  }, []);
  
  // Load recent sync activity from the database
  const loadSyncActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_operations')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
        
      if (error) throw error;
      
      setSyncActivity(data || []);
    } catch (error) {
      console.error('Error loading sync activity:', error);
    }
  };

  // --- Render Logic ---
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You must be logged in to access the admin dashboard.
            {process.env.NODE_ENV === 'development' && " (Dev mode: Auth bypassed, check console for errors if this message persists unexpectedly)"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            Artist Search & Import
          </CardTitle>
          <CardDescription>
            Search for artists and import their data into our system
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {syncResult && (
              <Alert variant={syncResult.success ? "default" : "destructive"} className={syncResult.success ? "bg-green-50 border-green-200" : undefined}>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>{syncResult.success ? "Success" : "Sync Completed with Issues"}</AlertTitle>
                <AlertDescription>
                  {syncResult.message}
                  {syncResult.completedTasks && (
                    <div className="text-sm mt-1">
                      Completed {syncResult.completedTasks} tasks
                      {syncResult.failedTasks > 0 && ` with ${syncResult.failedTasks} failures`}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-2">
              <Input
                placeholder="Enter artist name"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                disabled={isSearching}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !artistName.trim()}
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Search Results</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {searchResults.map((artist, index) => (
                    <div 
                      key={artist.id || index}
                      className={`p-3 rounded-md cursor-pointer border ${selectedArtist === artist ? 'border-primary bg-muted' : 'border-border hover:bg-muted/50'}`}
                      onClick={() => handleSelectArtist(artist)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{artist.name}</div>
                          {artist.genres && artist.genres.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              {artist.genres.join(', ')}
                            </div>
                          )}
                        </div>
                        {artist.popularity && (
                          <div className="text-xs bg-muted px-2 py-1 rounded-full">
                            Popularity: {artist.popularity}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handleSyncArtist} 
            disabled={!selectedArtist || syncInProgress}
            variant={selectedArtist ? "default" : "outline"}
          >
            {syncInProgress ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing Artist Data...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {selectedArtist ? `Sync ${selectedArtist.name}` : 'Select an Artist to Sync'}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      <Tabs defaultValue="activity" className="w-full">
        <TabsList>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="imports">Recent Imports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Sync Activity</CardTitle>
              <CardDescription>Recent sync operations performed by the system</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {syncActivity.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4">
                      No recent sync activity
                    </div>
                  ) : (
                    syncActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-4 py-2">
                        <div className={`w-2 h-2 mt-2 rounded-full ${activity.status === 'completed' ? 'bg-green-500' : activity.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium">{activity.task}</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(activity.started_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm">
                            {activity.entity_type}: {activity.entity_id}
                          </div>
                          {activity.error && (
                            <div className="text-sm text-destructive mt-1">
                              Error: {activity.error}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" onClick={loadSyncActivity} className="ml-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="imports">
          <Card>
            <CardHeader>
              <CardTitle>Recent Imports</CardTitle>
              <CardDescription>Recently imported artists and their sync status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentImports.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    No recent imports
                  </div>
                ) : (
                  recentImports.map((artistId) => {
                    const status = importStatus[artistId];
                    
                    return (
                      <div key={artistId} className="p-4 border rounded-lg">
                        <div className="flex items-start gap-4">
                          {status && (
                            <div className="flex items-center gap-2">
                              {status.success === false ? (
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                              ) : (
                                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                              )}
                              <div>
                                <div className="font-medium">{status.message}</div>
                                {status.timestamp && (
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(status.timestamp).toLocaleTimeString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminArtistImport;
