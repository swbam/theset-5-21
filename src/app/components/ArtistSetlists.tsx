import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SetlistDisplay from './SetlistDisplay';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ArtistSetlistsProps {
  artistId: string;
  artistName: string;
}

export default function ArtistSetlists({ artistId, artistName }: ArtistSetlistsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Check when setlists were last updated
    const checkLastUpdate = async () => {
      const { data } = await supabase
        .from('shows')
        .select('last_updated')
        .eq('artist_id', artistId)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();
        
      if (data) {
        setLastRefreshed(new Date(data.last_updated));
      }
    };
    
    checkLastUpdate();
  }, [artistId, supabase]);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the setlist API endpoint
      const response = await fetch(`/api/setlist/${artistId}`);
      
      if (!response.ok) {
        throw new Error('Failed to refresh setlists');
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Update last refreshed timestamp
      setLastRefreshed(new Date());
      
      // Reload the page to show updated data
      window.location.reload();
    } catch (err) {
      console.error('Error refreshing setlists:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{artistName} Setlists</h1>
        
        <div className="flex items-center gap-2">
          {lastRefreshed && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastRefreshed.toLocaleDateString()}
            </span>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error ? (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex gap-2 items-center text-red-600">
            <AlertTriangle size={18} />
            <p>{error}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4" 
            onClick={handleRefresh}
          >
            Try Again
          </Button>
        </Card>
      ) : (
        <SetlistDisplay artistId={artistId} />
      )}
    </div>
  );
} 