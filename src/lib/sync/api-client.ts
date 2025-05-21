import { ApiRateLimit } from "./types";

/**
 * Rate-limit aware API client manager
 * Prevents rate limit issues with external APIs
 */
export class APIClientManager {
  private rateLimits: Record<string, ApiRateLimit> = {
    ticketmaster: {
      max: 5, // 5 requests per second
      window: 1000, // 1 second
      current: 0,
      lastReset: Date.now(),
    },
    spotify: {
      max: 30, // 30 requests per minute
      window: 60000, // 1 minute
      current: 0,
      lastReset: Date.now(),
    },
    setlistfm: {
      max: 2, // 2 requests per second
      window: 1000, // 1 second
      current: 0,
      lastReset: Date.now(),
    },
  };

  /**
   * Make an API call with rate limiting
   */
  async callAPI<T>(
    api: "ticketmaster" | "spotify" | "setlistfm",
    endpoint: string,
    params?: Record<string, any>,
    apiCallFn?: (endpoint: string, params?: any) => Promise<T>,
  ): Promise<T> {
    await this.waitForRateLimit(api);

    // Use provided function if available, otherwise use default API clients
    if (apiCallFn) {
      return apiCallFn(endpoint, params);
    }

    // Default API clients
    switch (api) {
      case "ticketmaster":
        return this.callTicketmasterAPI(endpoint, params) as T;
      case "spotify":
        return this.callSpotifyAPI(endpoint, params) as T;
      case "setlistfm":
        return this.callSetlistFmAPI(endpoint, params) as T;
      default:
        throw new Error(`Unknown API: ${api}`);
    }
  }

  /**
   * Wait for rate limit if needed
   */
  private async waitForRateLimit(api: string): Promise<void> {
    // Check if we need to reset counters
    const now = Date.now();
    const limit = this.rateLimits[api];

    if (!limit) {
      console.warn(`No rate limit configuration for API: ${api}`);
      return;
    }

    if (now - limit.lastReset > limit.window) {
      limit.current = 0;
      limit.lastReset = now;
    }

    // Check if we would exceed rate limit
    if (limit.current >= limit.max) {
      // Calculate wait time until next window
      const waitTime = limit.window - (now - limit.lastReset) + 50; // Add 50ms buffer
      console.log(`Rate limit reached for ${api}, waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      // Reset counter after waiting
      limit.current = 0;
      limit.lastReset = Date.now();
    }

    // Increment counter
    limit.current++;
  }

  /**
   * Call Ticketmaster API with proper configuration
   */
  private async callTicketmasterAPI(
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<any> {
    const apiKey = import.meta.env.VITE_TICKETMASTER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing Ticketmaster API key");
    }

    const baseUrl = "https://app.ticketmaster.com/discovery/v2/";
    const url = new URL(endpoint, baseUrl);

    // Add API key and other params
    url.searchParams.append("apikey", apiKey);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Ticketmaster API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Call Spotify API with proper configuration
   */
  private async callSpotifyAPI(
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<any> {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Missing Spotify API credentials");
    }

    // Get access token
    const token = await this.getSpotifyToken(clientId, clientSecret);

    const baseUrl = "https://api.spotify.com/v1/";
    const url = new URL(endpoint, baseUrl);

    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Spotify API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Call Setlist.fm API with proper configuration
   */
  private async callSetlistFmAPI(
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<any> {
    const apiKey = import.meta.env.VITE_SETLISTFM_API_KEY;

    if (!apiKey) {
      throw new Error("Missing Setlist.fm API key");
    }

    const baseUrl = "https://api.setlist.fm/rest/1.0/";
    const url = new URL(endpoint, baseUrl);

    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Setlist.fm API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Get Spotify access token
   */
  private tokenCache: { token: string; expiryTime: number } | null = null;

  private async getSpotifyToken(
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
    // Check if we have a cached token in memory
    if (this.tokenCache && this.tokenCache.expiryTime > Date.now()) {
      return this.tokenCache.token;
    }

    // Try localStorage if we're in a browser context
    if (typeof window !== "undefined") {
      const cachedToken = localStorage.getItem("spotify_token");
      const cachedExpiry = localStorage.getItem("spotify_token_expiry");

      if (cachedToken && cachedExpiry) {
        const expiryTime = parseInt(cachedExpiry, 10);
        if (expiryTime > Date.now()) {
          return cachedToken;
        }
      }
    }

    // Get a new token
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new Error("Failed to get Spotify access token");
    }

    const data = await response.json();
    const token = data.access_token;
    const expiresIn = data.expires_in;
    const expiryTime = Date.now() + (expiresIn - 60) * 1000;

    // Store in memory
    this.tokenCache = { token, expiryTime };

    // Cache the token in localStorage if in browser
    if (typeof window !== "undefined") {
      localStorage.setItem("spotify_token", token);
      localStorage.setItem("spotify_token_expiry", String(expiryTime));
    }

    return token;
  }
}
