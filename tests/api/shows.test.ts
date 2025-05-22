import { GET } from "@/app/api/shows/[id]/route";
import { NextRequest } from "next/server";

describe("GET /api/shows/[id]", () => {
  it("should return show details when a valid id is provided", async () => {
    const request = new NextRequest("http://localhost/api/shows/123");
    const params = { id: "123" };
    const response = await GET(request, { params });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.show).toHaveProperty("id", "123");
    expect(data.show).toHaveProperty("title");
  });

  it("should return error when no id is provided", async () => {
    const request = new NextRequest("http://localhost/api/shows/");
    const params = { id: "" };
    const response = await GET(request, { params });
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe("Show ID is required");
  });
});