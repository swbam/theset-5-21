import React, { useState } from 'react';
import { Search, MapPin, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Venue } from '@/lib/types';
import { toast } from 'sonner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useDocumentTitle } from '@/hooks/use-document-title';

export default function Import() {
  // Set document title
  useDocumentTitle('Import Venues & Shows', 'Search and import venues and upcoming shows into the database');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Venue[]>([]);
  const [importing, setImporting] = useState<string | null>(null);

  // Function to search for venues
  const searchVenues = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const params = new URLSearchParams();
      params.append('type', 'venue');
      params.append('query', searchQuery);
      
      if (city.trim()) params.append('city', city);
      if (state.trim()) params.append('state', state);
      
      const response = await fetch(`/api/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Error searching venues:', error);
      toast.error('Failed to search venues');
    } finally {
      setIsSearching(false);
    }
  };

  // Function to import a venue and its upcoming shows
  const importVenue = async (venue: Venue) => {
    if (!venue.id) return;
    
    setImporting(venue.id);
    
    try {
      // Use cascade_sync to import venue and shows in one operation
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'venue',
          operation: 'cascade_sync',
          id: venue.id,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to import venue');
      }
      
      // Success
      toast.success(`Imported ${venue.name} and upcoming shows`);
    } catch (error) {
      console.error('Error importing venue:', error);
      toast.error('Failed to import venue');
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A10]">
      <Navbar />
      
      <main className="flex-grow container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Import Venues & Shows</h1>
          <p className="text-muted-foreground">
            Search for venues and import their upcoming shows into the database.
          </p>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Search for Venues</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={searchVenues} className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="search">Venue Name</Label>
                  <Input
                    id="search"
                    placeholder="Enter venue name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City (Optional)</Label>
                    <Input
                      id="city"
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State (Optional)</Label>
                    <Input
                      id="state"
                      placeholder="State code (e.g. CA, NY)"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={isSearching}>
                {isSearching ? (
                  <>Searching...</>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search Venues
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {searchResults.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Search Results</h2>
            <div className="grid gap-4">
              {searchResults.map((venue) => (
                <Card key={venue.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      {venue.image_url && (
                        <div className="w-full md:w-1/4">
                          <img
                            src={venue.image_url}
                            alt={venue.name}
                            className="rounded-md w-full object-cover aspect-video"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-bold">{venue.name}</h3>
                        
                        <div className="flex items-center text-muted-foreground mt-2">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>
                            {[venue.city, venue.state, venue.country].filter(Boolean).join(', ')}
                          </span>
                        </div>
                        
                        <div className="mt-4 flex space-x-4">
                          <Button
                            onClick={() => importVenue(venue)}
                            disabled={importing === venue.id}
                            className="flex-1"
                          >
                            {importing === venue.id ? (
                              'Importing...'
                            ) : (
                              <>
                                <CalendarCheck className="mr-2 h-4 w-4" />
                                Import Venue & Shows
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {searchResults.length === 0 && !isSearching && searchQuery && (
          <div className="text-center p-8 border rounded-lg">
            <h3 className="text-lg font-medium">No venues found</h3>
            <p className="text-muted-foreground mt-2">
              Try a different search term or location
            </p>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
} 