import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId, isAdmin } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }
    // TODO: Implement actual admin update logic (e.g., update database)
    console.log(`Setting admin status for user ${userId} to ${isAdmin}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in set-admin endpoint:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
