import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConcertData as ConcertDataType } from '@/lib/types';

interface ConcertDataProps {
  fetchFn: () => Promise<ConcertDataType[]>;
}

const ConcertData = ({ fetchFn }: ConcertDataProps) => {
  const [concerts, setConcerts] = useState<ConcertDataType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await fetchFn();
        setConcerts(data || []);
        setError(null);
      } catch (err) {
        setError('Failed to load concerts');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [fetchFn]);

  if (isLoading) return null; // Skeleton is handled by parent
  
  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <p className="text-red-500">{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2"
          onClick={() => fetchFn()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (concerts.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No concerts found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {concerts.map((concert) => (
        <Card key={concert.id} className="overflow-hidden">
          <CardHeader className="bg-muted/50">
            <CardTitle className="flex justify-between items-center">
              <span>{format(new Date(concert.date), 'MMM d, yyyy')}</span>
              <span className="text-sm font-normal">{concert.venue}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">{concert.artist.name}</h3>
            <div className="space-y-1">
              {concert.setlist?.map((song) => (
                <div key={song.id} className="flex justify-between items-center text-sm">
                  <span>{song.title}</span>
                  <span className="text-muted-foreground">{song.vote_count} votes</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ConcertData; 