import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Show ID is required" }, { status: 400 });
    }
    // Simulate fetching show details from the database
    const show = {
      id,
      title: "Sample Show Title",
      venue: "Sample Venue",
      date: "2025-07-15",
      description: "This is a sample description of the show."
    };
    return NextResponse.json({ show });
  } catch (error) {
    console.error("Error in GET /api/shows/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
