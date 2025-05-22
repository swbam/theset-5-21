import { retry } from "@/lib/retry";

export async function syncSetlistData(setlistId: string): Promise<any> {
  return retry(async () => {
    const response = await fetch(`https://api.example.com/setlists/${setlistId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch setlist data: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  }, { retries: 3, delay: 1000 }).catch((error: unknown) => {
    console.error(`syncSetlistData failed for setlistId ${setlistId}:`, error);
    throw error;
  });
}