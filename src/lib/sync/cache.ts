import { CacheEntry } from './types';

/**
 * Cache service for storing temporary data during sync operations
 * Handles both in-memory and localStorage caching
 */
export class CacheService {
  private memoryCache: Record<string, CacheEntry<any>> = {};
  private readonly storagePrefix = 'sync_cache:';
  private readonly defaultTTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Get an item from cache (memory or localStorage)
   */
  get<T>(key: string): T | null {
    // Try memory cache first
    const memoryItem = this.memoryCache[key];
    if (memoryItem && memoryItem.expires > Date.now()) {
      return memoryItem.data;
    }

    // Clean up expired memory cache items
    if (memoryItem && memoryItem.expires <= Date.now()) {
      delete this.memoryCache[key];
    }

    // Try localStorage
    try {
      const storedItem = localStorage.getItem(this.storagePrefix + key);
      if (storedItem) {
        const item = JSON.parse(storedItem) as CacheEntry<T>;
        if (item.expires > Date.now()) {
          // Refresh memory cache
          this.memoryCache[key] = item;
          return item.data;
        } else {
          // Clean up expired localStorage items
          localStorage.removeItem(this.storagePrefix + key);
        }
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }

    return null;
  }

  /**
   * Set an item in cache (both memory and localStorage)
   */
  set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
    const expires = Date.now() + ttl;
    const cacheEntry: CacheEntry<T> = {
      data: value,
      expires
    };

    // Update memory cache
    this.memoryCache[key] = cacheEntry;

    // Update localStorage
    try {
      localStorage.setItem(this.storagePrefix + key, JSON.stringify(cacheEntry));
    } catch (error) {
      console.warn('Error writing to localStorage cache:', error);
      // If localStorage fails (quota exceeded, etc.), we still have memory cache
    }
  }

  /**
   * Remove an item from cache
   */
  remove(key: string): void {
    delete this.memoryCache[key];
    try {
      localStorage.removeItem(this.storagePrefix + key);
    } catch (error) {
      console.error('Error removing from cache:', error);
    }
  }

  /**
   * Clear all cache entries related to an entity type
   */
  clearByPrefix(prefix: string): void {
    // Clear memory cache
    Object.keys(this.memoryCache).forEach(key => {
      if (key.startsWith(prefix)) {
        delete this.memoryCache[key];
      }
    });

    // Clear localStorage
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix + prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing cache by prefix:', error);
    }
  }

  /**
   * Clear all sync-related cache
   */
  clearAll(): void {
    // Clear memory cache
    this.memoryCache = {};

    // Clear localStorage items with our prefix
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }
} 