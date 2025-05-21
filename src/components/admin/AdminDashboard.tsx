import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminOverview from './AdminOverview';
import AdminArtists from './AdminArtists';
import AdminShows from './AdminShows';
import AdminSetlists from './AdminSetlists';
import AdminUsers from './AdminUsers';
import AdminArtistImport from './AdminArtistImport';
import AdminVenueImport from './AdminVenueImport';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('import-artists');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow container py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        
        <Alert className="mb-6">
          <HelpCircle className="h-4 w-4" />
          <AlertTitle>New Artist Sync System</AlertTitle>
          <AlertDescription>
            Our new centralized artist sync system is now available. Search for artists and 
            sync their data with a single click.
          </AlertDescription>
        </Alert>
        
        <Tabs defaultValue="import-artists" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="artists">Artists</TabsTrigger>
            <TabsTrigger value="import-artists" className="relative">
              Import Artists
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs px-1 rounded-full">New</span>
            </TabsTrigger>
            <TabsTrigger value="shows">Shows</TabsTrigger>
            <TabsTrigger value="setlists">Setlists</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="import-venue">Import by Venue</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <AdminOverview />
          </TabsContent>
          
          <TabsContent value="artists">
            <AdminArtists />
          </TabsContent>
          
          <TabsContent value="import-artists">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Artist Sync System</CardTitle>
                <CardDescription>
                  Our centralized orchestration system efficiently manages all aspects of artist data synchronization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Smart Dependency Management</h3>
                    <p>Automatically syncs artists, shows, venues, setlists, and songs in the correct order.</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Efficient API Usage</h3>
                    <p>Optimizes external API calls to Ticketmaster, Spotify, and Setlist.fm.</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-medium mb-2">One-Click Import</h3>
                    <p>Search for any artist and sync all their data with a single click.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <AdminArtistImport />
          </TabsContent>
          
          <TabsContent value="shows">
            <AdminShows />
          </TabsContent>
          
          <TabsContent value="setlists">
            <AdminSetlists />
          </TabsContent>
          
          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="import-venue">
            <AdminVenueImport />
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;
