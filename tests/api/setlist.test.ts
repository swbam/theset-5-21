import { GET } from "@/app/api/setlist/[artistId]/route";
import { NextRequest } from "next/server";

describe("GET /api/setlist/[artistId]", () => {
  it("should return setlists when a valid artistId is provided", async () => {
    const request = new NextRequest("http://localhost/api/setlist/artist123");
    const params = { artistId: "artist123" };
    const response = await GET(request, { params });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.setlists).toBeDefined();
    expect(Array.isArray(data.setlists)).toBe(true);
  });

  it("should return error when artistId is missing", async () => {
    const request = new NextRequest("http://localhost/api/setlist/");
    const params = { artistId: "" };
    const response = await GET(request, { params });
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe("Artist ID is required");
  });
});