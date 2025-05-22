import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { artistId: string } }) {
  try {
    const { artistId } = params;
    if (!artistId) {
      return NextResponse.json({ error: "Artist ID is required" }, { status: 400 });
    }
    // Simulate fetching setlist data for the given artist.
    const setlists = [
      {
        id: "set1",
        date: "2025-06-01",
        venue: "Venue A",
        songs: ["Song 1", "Song 2", "Song 3"]
      },
      {
        id: "set2",
        date: "2025-07-15",
        venue: "Venue B",
        songs: ["Song 4", "Song 5", "Song 6"]
      }
    ];
    return NextResponse.json({ setlists });
  } catch (error) {
    console.error("Error in GET /api/setlist/[artistId]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}