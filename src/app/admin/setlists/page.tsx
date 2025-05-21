import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Container } from "@/components/ui/container";
import { adminPageAuth } from "@/lib/auth/admin-auth";
import { SetlistsTable } from "@/components/admin/setlists/setlists-table";
import { SetlistCreator } from "@/components/admin/setlists/setlist-creator";

export const metadata = {
  title: "Setlist Management | Admin",
  description: "Manage setlists for shows",
};

export default async function SetlistsAdminPage() {
  // Check admin authentication
  await adminPageAuth();
  
  return (
    <Container className="py-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Setlist Management</h1>
          <p className="text-muted-foreground mt-1">
            Create, view, and edit setlists for shows
          </p>
        </div>
        
        <Tabs defaultValue="browse" className="w-full mt-6">
          <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:inline-flex mb-6">
            <TabsTrigger value="browse">Browse Setlists</TabsTrigger>
            <TabsTrigger value="create">Create Setlist</TabsTrigger>
          </TabsList>
          
          <TabsContent value="browse" className="space-y-6">
            <SetlistsTable />
          </TabsContent>
          
          <TabsContent value="create" className="space-y-6">
            <SetlistCreator />
          </TabsContent>
        </Tabs>
      </div>
    </Container>
  );
} 