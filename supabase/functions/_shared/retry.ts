/**
 * Utility function to retry failed API calls with exponential backoff.
 * Suitable for use in Edge Functions.
 */
export async function retryableFetch<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delay?: number } = {}
): Promise<T> {
  const { retries = 3, delay = 1000 } = options;

  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying failed request... ${retries} attempts left`);
      // Use Deno's setTimeout equivalent if needed, but standard Promise/setTimeout works
      await new Promise(resolve => setTimeout(resolve, delay));
      // Recurse with decremented retries and increased delay
      return retryableFetch(fn, { retries: retries - 1, delay: delay * 2 });
    }
    // If no retries left, throw the last encountered error
    console.error("Request failed after multiple retries:", error);
    throw error;
  }
}

// Note: In-memory cache (`withCache`) is not suitable for stateless Edge Functions
// and has been omitted from this shared utility file. Caching should be handled
// at a different layer if needed (e.g., Supabase database, external cache service).