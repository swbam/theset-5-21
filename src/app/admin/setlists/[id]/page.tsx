import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { adminPageAuth } from "@/lib/auth/admin-auth";
import { SetlistCreator } from "@/components/admin/setlists/setlist-creator";
// Removed import for non-existent getSetlistById
// import { getSetlistById } from "@/lib/api/database/setlists";

interface SetlistPageProps {
  params: {
    id: string;
  };
}

export const metadata = {
  title: "Edit Setlist | Admin",
  description: "Edit setlist songs and details",
};

export default async function EditSetlistPage({ params }: SetlistPageProps) {
  // Check admin authentication
  await adminPageAuth();
  
  const setlistId = params.id;
  
  // Removed logic to fetch setlist by ID as function doesn't exist
  // const setlist = await getSetlistById(setlistId);
  // if (!setlist) {
  //   notFound();
  // }
  // TODO: Implement fetching setlist by ID and editing functionality later
  
  return (
    <Container className="py-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Setlist</h1>
          <p className="text-muted-foreground mt-1">
            Manage songs for this setlist
          </p>
        </div>
        
        {/* Render creator without props for now, as editing isn't implemented */}
        <SetlistCreator />
      </div>
    </Container>
  );
} 