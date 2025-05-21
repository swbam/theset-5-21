
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

const AdminShows = () => {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchShows = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('shows')
        .select(`
          *,
          artist:artist_id (name),
          venue:venue_id (name, city, state)
        `)
        .order('date', { ascending: true });
        
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,artist.name.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      
      setShows(data || []);
    } catch (error) {
      console.error('Error fetching shows:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchShows();
  }, [searchQuery]);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchShows();
    setRefreshing(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Shows Management</h2>
        <Button 
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing || loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shows or artists..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Show Name</TableHead>
              <TableHead>Artist</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-9 w-[100px] ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : shows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  {searchQuery ? 'No shows found matching your search' : 'No shows found'}
                </TableCell>
              </TableRow>
            ) : (
              shows.map((show) => (
                <TableRow key={show.id}>
                  <TableCell className="font-medium">{show.name}</TableCell>
                  <TableCell>{show.artist?.name || 'Unknown Artist'}</TableCell>
                  <TableCell>
                    {show.venue ? (
                      <>
                        {show.venue.name}
                        {show.venue.city && <span className="ml-1 text-xs text-muted-foreground">
                          ({show.venue.city}{show.venue.state ? `, ${show.venue.state}` : ''})
                        </span>}
                      </>
                    ) : (
                      'Unknown Venue'
                    )}
                  </TableCell>
                  <TableCell>
                    {show.date ? new Date(show.date).toLocaleDateString() : 'TBD'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={`/shows/${show.id}`}>
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminShows;
