
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const AdminArtists = () => {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchArtists = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('artists')
        .select('*')
        .order('name', { ascending: true });
        
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchArtists();
  }, [searchQuery]);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchArtists();
    setRefreshing(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Artists Management</h2>
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
            placeholder="Search artists..."
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
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Spotify ID</TableHead>
              <TableHead>Upcoming Shows</TableHead>
              <TableHead>Popularity</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[50px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[50px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-9 w-[100px] ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : artists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                  {searchQuery ? 'No artists found matching your search' : 'No artists found'}
                </TableCell>
              </TableRow>
            ) : (
              artists.map((artist) => (
                <TableRow key={artist.id}>
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={artist.image_url || ''} alt={artist.name} />
                      <AvatarFallback>{artist.name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{artist.name}</TableCell>
                  <TableCell>{artist.spotify_id || 'N/A'}</TableCell>
                  <TableCell>{artist.upcoming_shows || 0}</TableCell>
                  <TableCell>{artist.popularity || 'N/A'}</TableCell>
                  <TableCell>{new Date(artist.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={`/artists/${artist.id}`}>
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

export default AdminArtists;
