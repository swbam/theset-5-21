import { ErrorSource, handleError } from '@/lib/error-handling';

// Ticketmaster API key
const TICKETMASTER_API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;

// Determine if we're in a development environment
const isDevelopment = import.meta.env.DEV || (typeof window !== 'undefined' && window.location.hostname === 'localhost');

// API base URL - use direct API in development, proxy in production
const API_BASE_URL = isDevelopment 
  ? 'https://app.ticketmaster.com/discovery/v2/'
  : '/api/ticketmaster';

// API request configuration
const API_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  timeout: 15000, // 15 seconds
};

// Popular music genres for filtering
export const popularMusicGenres = [
  { id: 'KnvZfZ7vAeA', name: 'Rock' },
  { id: 'KnvZfZ7vAev', name: 'Pop' },
  { id: 'KnvZfZ7vAvt', name: 'Electronic' },
  { id: 'KnvZfZ7vAvd', name: 'R&B' },
  { id: 'KnvZfZ7vAee', name: 'Folk' },
  { id: 'KnvZfZ7vAe6', name: 'Country' },
  { id: 'KnvZfZ7vAeJ', name: 'Hip-Hop/Rap' },
  { id: 'KnvZfZ7vAeI', name: 'Reggae' },
  { id: 'KnvZfZ7vAv6', name: 'Blues' },
  { id: 'KnvZfZ7vAvE', name: 'Jazz' },
  { id: 'KnvZfZ7vAv1', name: 'Classical' },
  { id: 'KnvZfZ7vAde', name: 'Alternative' },
  { id: 'KnvZfZ7vAdt', name: 'World' },
  { id: 'KnvZfZ7vAda', name: 'Metal' }
];

/**
 * Implements delay with exponential backoff
 */
const delay = (retryCount: number) => {
  const delayTime = API_CONFIG.baseDelay * Math.pow(2, retryCount);
  return new Promise(resolve => setTimeout(resolve, delayTime));
};

// Custom error type with noRetry property
interface ApiErrorCause {
  noRetry?: boolean;
}

/**
 * Call Ticketmaster API with specified endpoint and parameters
 * Includes retry logic with exponential backoff
 */
export async function callTicketmasterApi(endpoint: string, params: Record<string, string> = {}) {
  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount <= API_CONFIG.maxRetries) {
    try {
      let url: URL;
      
      if (isDevelopment) {
        // In development, call Ticketmaster API directly
        url = new URL(endpoint, API_BASE_URL);
        
        // Add API key to all requests
        url.searchParams.append('apikey', TICKETMASTER_API_KEY);
        
        // Add additional parameters
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      } else {
        // In production, use our proxy API
        url = new URL(API_BASE_URL, typeof window !== 'undefined' ? window.location.origin : undefined);
        
        // Add endpoint as a query parameter
        url.searchParams.append('endpoint', endpoint);
        
        // Add additional parameters
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }
      
      console.log(`Calling Ticketmaster API: ${url.toString()} (attempt ${retryCount + 1})`);
      
      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Check if we should retry based on status code
        if ([429, 500, 502, 503, 504].includes(response.status)) {
          // These status codes are likely transient issues, so we should retry
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = `Ticketmaster API error (${response.status}): ${errorData.fault?.faultstring || response.statusText}`;
          throw new Error(errorMessage);
        }
        
        // For other status codes, we shouldn't retry
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = `Ticketmaster API error (${response.status}): ${errorData.fault?.faultstring || response.statusText}`;
        const error = new Error(errorMessage);
        // Set the noRetry property
        (error as Error & { cause: ApiErrorCause }).cause = { noRetry: true };
        throw error;
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      // Type assertion for the error
      const typedError = error as Error & { cause?: ApiErrorCause, name?: string };
      lastError = typedError;
      
      // Don't retry if:
      // 1. It's a timeout error (AbortError)
      // 2. We've explicitly marked it as no retry
      // 3. We've reached max retries
      const isAbortError = typedError.name === 'AbortError';
      const isNoRetry = typedError.cause?.noRetry === true;
      
      if (isAbortError || isNoRetry || retryCount >= API_CONFIG.maxRetries) {
        break;
      }
      
      // Wait before retrying
      retryCount++;
      console.log(`Retrying API call (${retryCount}/${API_CONFIG.maxRetries})`);
      await delay(retryCount);
    }
  }
  
  // If we got here, all retries failed
  handleError({
    message: `Error calling Ticketmaster API after ${retryCount} retries: ${lastError?.message || 'Unknown error'}`,
    source: ErrorSource.API,
    step: 'Ticketmaster API Call',
    originalError: lastError
  });
  
  return null;
}
