import React, { useState, useCallback, useMemo } from 'react'; // Added useMemo
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VenueSyncService } from '@/lib/sync/venue-service';
import { ArtistSyncService } from '@/lib/sync/artist-service';
import { Venue } from '@/lib/types'; // Show import removed
import { toast } from 'sonner'; // Using Sonner for notifications as per rules

const AdminVenueImport = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<Record<string, string>>({}); // venueId: status message

  // Memoize service instances
  const venueSyncService = useMemo(() => new VenueSyncService(), []);
  const artistSyncService = useMemo(() => new ArtistSyncService(), []);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a venue name to search.');
      return;
    }
    setIsLoading(true);
    setSearchResults([]);
    try {
      // TODO: Add city/state filters if desired
      const results = await venueSyncService.searchVenues(searchTerm.trim());
      setSearchResults(results);
      if (results.length === 0) {
        toast.info('No venues found matching your search.');
      }
    } catch (error) {
      console.error('Error searching venues:', error);
      toast.error('Failed to search venues. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, venueSyncService]); // Dependencies are now stable

  const handleImport = useCallback(async (venue: Venue) => {
    if (!venue.external_id) {
      toast.error('Selected venue is missing an external ID.');
      return;
    }
    const venueId = venue.external_id;
    setImportStatus(prev => ({ ...prev, [venueId]: 'Fetching shows...' }));
    setIsLoading(true);

    try {
      const shows = await venueSyncService.getVenueUpcomingShows(venueId);
      if (shows.length === 0) {
        setImportStatus(prev => ({ ...prev, [venueId]: 'No upcoming shows found.' }));
        toast.info(`No upcoming shows found for ${venue.name}.`);
        setIsLoading(false);
        return;
      }

      setImportStatus(prev => ({ ...prev, [venueId]: `Found ${shows.length} shows. Extracting artists...` }));

      // Extract unique artist external IDs
      const artistIds = new Set<string>();
      shows.forEach(show => {
        // IMPORTANT: Assumes Show type from types.ts has artist_external_id
        // If not, the data structure from getVenueUpcomingShows needs adjustment
        if (show.artist_external_id) {
          artistIds.add(show.artist_external_id);
        }
      });

      const uniqueArtistIds = Array.from(artistIds);
      if (uniqueArtistIds.length === 0) {
        setImportStatus(prev => ({ ...prev, [venueId]: 'No artists found in upcoming shows.' }));
        toast.info('Could not extract artist information from the shows.');
        setIsLoading(false);
        return;
      }

      setImportStatus(prev => ({ ...prev, [venueId]: `Importing ${uniqueArtistIds.length} unique artists...` }));
      toast.info(`Starting import for ${uniqueArtistIds.length} artists from ${venue.name}. This may take a while...`);

      let successCount = 0;
      let errorCount = 0;

      // Import artists sequentially with a delay to mitigate rate limiting
      for (const artistId of uniqueArtistIds) {
        try {
          setImportStatus(prev => ({ ...prev, [venueId]: `Importing artist ${artistId}... (${successCount + errorCount + 1}/${uniqueArtistIds.length})` }));
          // Consider adding { force: true } if needed, but be mindful of rate limits
          const result = await artistSyncService.syncArtist(artistId);
          if (result.success) {
            successCount++;
            console.log(`Successfully synced artist ${artistId}`);
            // Optionally sync shows/setlists for this artist immediately?
            // await artistSyncService.getArtistUpcomingShows(artistId); // Be very careful with rate limits!
          } else {
            errorCount++;
            console.error(`Failed to sync artist ${artistId}: ${result.error}`);
          }
        } catch (err) {
          errorCount++;
          console.error(`Error during sync for artist ${artistId}:`, err);
        }
        // Add a delay between artist syncs
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }

      const finalMessage = `Import complete for ${venue.name}. Synced: ${successCount}, Failed: ${errorCount}.`;
      setImportStatus(prev => ({ ...prev, [venueId]: finalMessage }));
      toast.success(finalMessage);

    } catch (error) {
      console.error(`Error importing artists for venue ${venueId}:`, error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setImportStatus(prev => ({ ...prev, [venueId]: `Error: ${message}` }));
      toast.error(`Failed to import artists for ${venue.name}. Check console.`);
    } finally {
      setIsLoading(false);
    }
  }, [venueSyncService, artistSyncService]); // Dependencies are now stable

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Artists by Venue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Search for a venue name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            disabled={isLoading}
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold">Search Results:</h3>
            {searchResults.map((venue) => (
              <div key={venue.external_id || venue.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <p className="font-medium">{venue.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {venue.city}{venue.state ? `, ${venue.state}` : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleImport(venue)}
                  disabled={isLoading || !!importStatus[venue.external_id!]}
                >
                  {isLoading && importStatus[venue.external_id!] ? importStatus[venue.external_id!] : 'Import Artists'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminVenueImport;