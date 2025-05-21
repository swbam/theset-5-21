
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Music, Calendar, ListMusic, VoteIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const StatCard = ({ title, value, icon, loading = false }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
    </CardContent>
  </Card>
);

const AdminOverview = () => {
  const [counts, setCounts] = useState({
    artists: 0,
    shows: 0,
    setlists: 0,
    users: 0,
    votes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoading(true);
        
        // Fetch artists count
        const { count: artistsCount, error: artistsError } = await supabase
          .from('artists')
          .select('*', { count: 'exact', head: true });
          
        if (artistsError) throw artistsError;
        
        // Fetch shows count
        const { count: showsCount, error: showsError } = await supabase
          .from('shows')
          .select('*', { count: 'exact', head: true });
          
        if (showsError) throw showsError;
        
        // Fetch setlists count
        const { count: setlistsCount, error: setlistsError } = await supabase
          .from('setlists')
          .select('*', { count: 'exact', head: true });
          
        if (setlistsError) throw setlistsError;
        
        // Fetch users count
        const { count: usersCount, error: usersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
          
        if (usersError) throw usersError;
        
        // Fetch votes count
        const { count: votesCount, error: votesError } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true });
          
        if (votesError) throw votesError;
        
        setCounts({
          artists: artistsCount || 0,
          shows: showsCount || 0,
          setlists: setlistsCount || 0,
          users: usersCount || 0,
          votes: votesCount || 0
        });
      } catch (error) {
        console.error('Error fetching counts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCounts();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard Overview</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard 
          title="Total Artists" 
          value={counts.artists} 
          icon={<Music className="h-4 w-4 text-muted-foreground" />} 
          loading={loading} 
        />
        <StatCard 
          title="Total Shows" 
          value={counts.shows} 
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />} 
          loading={loading} 
        />
        <StatCard 
          title="Active Setlists" 
          value={counts.setlists} 
          icon={<ListMusic className="h-4 w-4 text-muted-foreground" />} 
          loading={loading} 
        />
        <StatCard 
          title="Registered Users" 
          value={counts.users} 
          icon={<Users className="h-4 w-4 text-muted-foreground" />} 
          loading={loading} 
        />
        <StatCard 
          title="Total Votes" 
          value={counts.votes} 
          icon={<VoteIcon className="h-4 w-4 text-muted-foreground" />} 
          loading={loading} 
        />
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Admin Actions</h3>
        <p className="text-sm text-muted-foreground mb-4">
          As an admin, you can manage all aspects of the application from this dashboard.
          Select a tab above to manage specific sections.
        </p>
      </div>
    </div>
  );
};

export default AdminOverview;
