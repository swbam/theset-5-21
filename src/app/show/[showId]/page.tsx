import { Loader2 } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShowHero } from "@/components/shows/show-hero"; // Corrected path
import { ShowInfo } from "@/components/shows/show-info";
import { SetlistSongRequests } from "@/components/setlist/setlist-song-requests";
import { getShow } from "@/lib/api/database/shows";
import { createSetlistForShow } from "@/lib/api/database/setlists";
import { getSongsByArtist } from "@/lib/api/database/songs"; // Import the new function

interface Props {
  params: {
    showId: string;
  };
}

export default async function ShowPage({ params }: Props) {
  const { showId } = params;
  
  const show = await getShow(showId);
  if (!show) {
    return <div className="p-8">Show not found.</div>;
  }
  
  // Get the setlist for this show, which will create one if it doesn't exist
  // Use createSetlistForShow which handles finding or creating
  const setlistId = await createSetlistForShow(showId, show.artist_id);

  // Fetch the artist's songs using the new function
  const artistSongs = show.artist_id ? await getSongsByArtist(show.artist_id) : [];

  // TODO: Fetch the actual *requested/played* setlist songs using setlistId
  // For now, we pass the full artist catalog to the request component
  const setlist = setlistId
    ? ({
        id: setlistId,
        artist_id: show.artist_id,
        show_id: showId,
        date: show.date,
        venue: show.venue?.name,
        venue_city: show.venue?.city,
        tour_name: null,
        // NOTE: This 'songs' property on the setlist object might be intended
        // for *played* songs. We are passing the full artist catalog separately.
        // If SetlistSongRequests expects played songs here, this needs adjustment.
        songs: [], // Keep placeholder for played songs for now
        show: show,
      } as any)
    : null;

  return (
    <div className="min-h-screen">
      <div className="relative w-full">
        <ShowHero show={show} />
      </div>
      
      <Container className="py-8">
        <Tabs defaultValue="request">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-full md:w-auto grid-cols-2">
              <TabsTrigger value="request">Request Songs</TabsTrigger>
              <TabsTrigger value="info">Show Info</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="request">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Request your favorites
              </h2>
              
              {/* Setlist song request section */}
              {setlist && artistSongs ? (
                // Pass the setlistId, showId, and the fetched artistSongs
                <SetlistSongRequests
                  setlistId={setlist.id}
                  showId={showId}
                  artistSongs={artistSongs} // Pass the full song catalog
                  // Pass other necessary props if SetlistSongRequests needs them
                />
              ) : (
                // Show loading state if setlist or songs are still loading/null
                <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                  <p>Loading setlist...</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="info">
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold">Show Info</h2>
              <ShowInfo show={show} />
            </div>
          </TabsContent>
        </Tabs>
      </Container>
    </div>
  );
}
