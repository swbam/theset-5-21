/**
 * Utility function to retry failed API calls with exponential backoff
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
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryableFetch(fn, { retries: retries - 1, delay: delay * 2 });
    }
    console.error("Request failed after multiple retries:", error);
    throw error;
  }
}

/**
 * Cache API responses in memory to reduce duplicate calls (Client-side only)
 * Note: This simple in-memory cache will be cleared on page refresh.
 */
const cache = new Map<string, { data: unknown; timestamp: number }>(); // Use unknown instead of any

export function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 900000 // 15 minutes
): Promise<T> {
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < ttl) {
    console.log(`[Cache] Returning cached data for key: ${key}`);
    // Assert that the cached data is of the expected type T
    return Promise.resolve(cached.data as T);
  }

  console.log(`[Cache] Fetching fresh data for key: ${key}`);
  return retryableFetch(fn).then(data => {
    cache.set(key, { data, timestamp: now });
    return data;
  });
}