"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Edit, Trash2, Plus, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Setlist {
  id: string;
  show_id: string;
  artist_id: string;
  created_at: string;
  updated_at: string;
  song_count?: number;
  show?: {
    id: string;
    name: string;
    date: string;
  };
  artist?: {
    id: string;
    name: string;
  };
}

export function SetlistsTable() {
  const router = useRouter();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [setlistToDelete, setSetlistToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchSetlists();
  }, []);

  const fetchSetlists = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('setlists')
        .select(`
          id,
          show_id,
          artist_id,
          created_at,
          updated_at,
          show:show_id (
            id,
            name,
            date
          ),
          artist:artist_id (
            id,
            name
          )
        `)
        .order('updated_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Get song count for each setlist
      const setlistsWithSongCount = await Promise.all(
        data.map(async (setlist) => {
          const { count, error: countError } = await supabase
            .from('setlist_songs')
            .select('id', { count: 'exact', head: true })
            .eq('setlist_id', setlist.id);
          
          return {
            ...setlist,
            song_count: countError ? 0 : count || 0
          };
        })
      );
      
      setSetlists(setlistsWithSongCount);
    } catch (error) {
      console.error('Error fetching setlists:', error);
      toast.error('Failed to load setlists');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredSetlists = setlists.filter((setlist) => {
    const query = searchQuery.toLowerCase();
    return (
      setlist.show?.name?.toLowerCase().includes(query) ||
      setlist.artist?.name?.toLowerCase().includes(query) ||
      setlist.id.toLowerCase().includes(query)
    );
  });

  const confirmDelete = (setlistId: string) => {
    setSetlistToDelete(setlistId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!setlistToDelete) return;
    
    try {
      setDeleteLoading(true);
      
      // First delete all songs in the setlist
      const { error: songsError } = await supabase
        .from('setlist_songs')
        .delete()
        .eq('setlist_id', setlistToDelete);
      
      if (songsError) {
        throw songsError;
      }
      
      // Then delete the setlist itself
      const { error: setlistError } = await supabase
        .from('setlists')
        .delete()
        .eq('id', setlistToDelete);
      
      if (setlistError) {
        throw setlistError;
      }
      
      // Remove from local state
      setSetlists(setlists.filter(s => s.id !== setlistToDelete));
      toast.success('Setlist deleted successfully');
      router.refresh();
    } catch (error) {
      console.error('Error deleting setlist:', error);
      toast.error('Failed to delete setlist');
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
      setSetlistToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search setlists..."
            className="w-full pl-8"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        <Button onClick={fetchSetlists} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="px-6 py-4">
          <CardTitle>All Setlists</CardTitle>
          <CardDescription>
            View and manage setlists for all shows
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSetlists.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No setlists found</p>
              <Button 
                className="mt-4" 
                onClick={() => router.push('/admin/setlists?tab=create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create a Setlist
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Show</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead>Songs</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSetlists.map((setlist) => (
                    <TableRow key={setlist.id}>
                      <TableCell>
                        {setlist.show ? (
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {setlist.show.name}
                            </span>
                            {setlist.show.date && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(setlist.show.date), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unknown show</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {setlist.artist?.name || (
                          <span className="text-muted-foreground">Unknown artist</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {setlist.song_count || 0} songs
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {setlist.created_at ? (
                          format(new Date(setlist.created_at), 'MMM d, yyyy')
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {setlist.updated_at ? (
                          format(new Date(setlist.updated_at), 'MMM d, yyyy')
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link href={`/admin/setlists/${setlist.id}`}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Link>
                          </Button>
                          {setlist.show_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <Link href={`/show/${setlist.show_id}`} target="_blank">
                                <ExternalLink className="h-4 w-4" />
                                <span className="sr-only">View</span>
                              </Link>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDelete(setlist.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              setlist and all its songs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 