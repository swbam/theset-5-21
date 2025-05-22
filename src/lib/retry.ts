export async function retry<T>(
  fn: () => Promise<T>,
  options: { retries: number; delay: number }
): Promise<T> {
  let attempt = 0;
  while (attempt < options.retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= options.retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }
  }
  return await fn();
}