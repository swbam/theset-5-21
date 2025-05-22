import { retry } from "@/lib/retry";

// A utility function for synchronizing show data with retry logic and logging.
export async function syncShowData(showId: string): Promise<any> {
  return retry(async () => {
    // Simulated API call to fetch show data.
    const response = await fetch(`https://api.example.com/shows/${showId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch show data: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  }, { retries: 3, delay: 1000 }).catch(error => {
    console.error(`syncShowData failed for showId ${showId}:`, error);
    throw error;
  });
}