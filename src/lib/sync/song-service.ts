import { retry } from "@/lib/retry";

export async function syncSongData(songId: string): Promise<any> {
  return retry(async () => {
    const response = await fetch(`https://api.example.com/songs/${songId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch song data: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  }, { retries: 3, delay: 1000 }).catch((error: unknown) => {
    console.error(`syncSongData failed for songId ${songId}:`, error);
    throw error;
  });
}