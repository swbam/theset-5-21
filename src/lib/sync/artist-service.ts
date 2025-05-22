import { retry } from "@/lib/retry";

export async function syncArtistData(artistId: string): Promise<any> {
  return retry(async () => {
    const response = await fetch(`https://api.example.com/artists/${artistId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch artist data: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  }, { retries: 3, delay: 1000 }).catch((error: unknown) => {
    console.error(`syncArtistData failed for artistId ${artistId}:`, error);
    throw error;
  });
}