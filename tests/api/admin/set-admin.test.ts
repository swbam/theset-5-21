import { POST } from "@/app/api/admin/set-admin";
import { NextRequest } from "next/server";

describe("POST /api/admin/set-admin", () => {
  it("should return an error when userId is not provided", async () => {
    const request = new NextRequest("http://localhost/api/admin/set-admin", {
      method: "POST",
      body: JSON.stringify({ isAdmin: true })
    });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe("User ID is required.");
  });

  it("should return success when valid data is provided", async () => {
    const request = new NextRequest("http://localhost/api/admin/set-admin", {
      method: "POST",
      body: JSON.stringify({ userId: "123", isAdmin: true })
    });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});