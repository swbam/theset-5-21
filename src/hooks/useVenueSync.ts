import { useState } from 'react';
import { syncVenueShows } from '@/lib/api/venue-sync-service';

/**
 * Hook for syncing all shows for a venue
 * @returns Handlers and state for venue show synchronization
 */
export function useVenueSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sync all shows for a venue
   * @param venueId Venue ID to sync
   * @param venueName Venue name (for display purposes)
   */
  const syncVenue = async (venueId: string, venueName: string) => {
    if (!venueId) {
      setError('Venue ID is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Starting venue sync for ${venueName} (ID: ${venueId})`);
      const result = await syncVenueShows(venueId, venueName);
      
      setResults(result);
      
      if (!result.success) {
        setError(result.error || 'Failed to sync venue shows');
      }
      
      return result;
    } catch (err) {
      console.error('Error syncing venue shows:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return { success: false, error: err instanceof Error ? err.message : 'An unknown error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    syncVenue,
    isLoading,
    results,
    error,
    clearResults: () => setResults(null),
    clearError: () => setError(null)
  };
} 