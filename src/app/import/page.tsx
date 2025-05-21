"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// Removed VenueSyncService import, will use fetch API
import { Venue } from '@/lib/types';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function ImportPage() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchState, setSearchState] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [importingVenueId, setImportingVenueId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is logged in
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          toast.error('Please log in to access this page');
          window.location.href = '/';
          return;
        }
        
        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        
        if (profileError || !profile || !profile.is_admin) {
          setIsAdmin(false);
        } else {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const searchVenues = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchKeyword) {
      toast.error('Please enter a search keyword');
      return;
    }
    
    setIsSearching(true);
    try {
      // Call the GET /api/search endpoint
      const params = new URLSearchParams({
        type: 'venue',
        query: searchKeyword,
      });
      if (searchCity) params.set('city', searchCity);
      if (searchState) params.set('state', searchState);

      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to fetch search results');
      }

      // Assuming the API returns { results: Venue[] }
      const results: Venue[] = data.results || [];
      setVenues(results);
      if (results.length === 0) {
        toast.info('No venues found matching your criteria.');
      }
    } catch (error) {
      console.error('Error searching venues:', error);
      toast.error('Failed to search venues. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const importVenue = async (venueId: string) => {
    setImportingVenueId(venueId);
    try {
      // Call the sync API to import the venue and its shows
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'venue',
          operation: 'cascade_sync',
          id: venueId
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Venue imported successfully with upcoming shows');
      } else {
        toast.error(`Failed to import venue: ${result.error}`);
      }
    } catch (error) {
      console.error('Error importing venue:', error);
      toast.error('Failed to import venue. Please try again.');
    } finally {
      setImportingVenueId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-20 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="container py-20 max-w-lg mx-auto text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-destructive/10 p-3 rounded-full">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You need administrator privileges to access this page.
          </p>
          <Button asChild>
            <a href="/" className="w-full">Return to Home</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-5xl">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Import Venues &amp; Shows</h1>
          <p className="text-muted-foreground">
            Search for venues and import them along with their upcoming shows into the database.
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Search Venues</CardTitle>
            <CardDescription>
              Search by venue name, artist, or event. You can narrow results by adding city or state.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={searchVenues} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label htmlFor="keyword" className="block text-sm font-medium mb-1">
                    Venue Name / Keyword *
                  </label>
                  <Input
                    id="keyword"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Enter venue name or keyword"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium mb-1">
                    City (Optional)
                  </label>
                  <Input
                    id="city"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium mb-1">
                    State Code (Optional)
                  </label>
                  <Input
                    id="state"
                    value={searchState}
                    onChange={(e) => setSearchState(e.target.value)}
                    placeholder="State code (e.g. CA)"
                    maxLength={2}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={isSearching} className="w-full">
                    {isSearching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      'Search Venues'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {venues.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Search Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venues.map((venue) => (
                <Card key={venue.id} className="overflow-hidden">
                  <div className="aspect-video relative bg-muted">
                    {venue.image_url ? (
                      <img 
                        src={venue.image_url} 
                        alt={venue.name} 
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-muted">
                        <span className="text-muted-foreground">No image available</span>
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle>{venue.name}</CardTitle>
                    <CardDescription>
                      {[venue.address, venue.city, venue.state].filter(Boolean).join(', ')}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-between">
                    {!venue.external_id ? (
                      <Button
                        onClick={() => venue.id && importVenue(venue.id)}
                        disabled={importingVenueId === venue.id || !venue.id}
                      >
                        {importingVenueId === venue.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          'Import Venue & Shows'
                        )}
                      </Button>
                    ) : (
                      <Button variant="outline" disabled>
                        Already Imported
                      </Button>
                    )}
                    {venue.url && (
                      <Button variant="outline" asChild>
                        <a href={venue.url} target="_blank" rel="noopener noreferrer">
                          View Website
                        </a>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 