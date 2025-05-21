import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useVenueSync } from '@/hooks/useVenueSync';

interface VenueSyncProps {
  venueId: string;
  venueName: string;
}

/**
 * VenueSync component that allows syncing all shows at a venue
 */
export default function VenueSync({ venueId, venueName }: VenueSyncProps) {
  const { syncVenue, isLoading, results, error } = useVenueSync();
  const [expanded, setExpanded] = useState(false);

  const handleSync = async () => {
    try {
      const result = await syncVenue(venueId, venueName);
      
      if (result?.success) {
        toast.success(`Successfully synced ${result.processed || 0} shows for ${venueName}`);
        setExpanded(true); // Show details on success
      } else {
        toast.error(`Failed to sync shows: ${result?.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error syncing venue:', err);
      toast.error('An unexpected error occurred while syncing venue shows');
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Venue Shows Sync</h3>
        <Button 
          onClick={handleSync} 
          variant="outline" 
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync All Shows
            </>
          )}
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-red-300 bg-red-50 text-red-800 mb-4">
          <p className="text-sm">{error}</p>
        </Card>
      )}

      {results?.success && (
        <div className="space-y-3">
          <Card className="p-4 border-green-300 bg-green-50 text-green-800">
            <p className="text-sm font-medium">
              Successfully processed {results.processed} shows at {results.venue}
            </p>
            
            <div className="mt-2 flex items-center">
              <Button 
                variant="link" 
                onClick={() => setExpanded(!expanded)} 
                className="p-0 h-auto text-green-700"
              >
                {expanded ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>
          </Card>

          {expanded && results.results && results.results.length > 0 && (
            <div className="mt-3 space-y-2 max-h-80 overflow-auto p-2 border rounded-md">
              {results.results.map((result: any, index: number) => (
                <div 
                  key={index} 
                  className={`p-2 rounded text-sm ${
                    result.success 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{result.show || result.artist || 'Unknown show'}</span>
                    <span>{result.success ? '✓' : '✗'}</span>
                  </div>
                  {!result.success && result.error && (
                    <p className="text-xs text-red-700 mt-1">{result.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 