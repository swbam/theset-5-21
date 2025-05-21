import { Artist, Show, Venue, Song } from '@/lib/types';

export type EntityType = 'artist' | 'venue' | 'show' | 'setlist' | 'song';
export type PriorityLevel = 'high' | 'medium' | 'low';
export type SyncOperation = 'create' | 'refresh' | 'expand_relations' | 'cascade_sync';

export interface SyncTask {
  type: EntityType;
  id: string;
  priority: PriorityLevel;
  operation: SyncOperation;
  attempts?: number;
  payload?: any;
}

export interface SyncState {
  entityId: string;
  entityType: EntityType;
  lastSynced: string;
  syncVersion: number;
}

export interface SetlistData {
  showId: string;
  artistId: string;
  songs?: Song[];
}

export interface ApiRateLimit {
  max: number;
  window: number;
  current: number;
  lastReset: number;
}

export interface CacheEntry<T> {
  data: T;
  expires: number;
}

// Current sync version - increment when sync logic changes significantly
export const CURRENT_SYNC_VERSION = 1;

export interface SyncOptions {
  force?: boolean;
  refreshInterval?: number;
}

export interface EntityRef {
  type: EntityType;
  id: string;
}

export interface SyncResult<T> {
  success: boolean;
  updated: boolean;
  data?: T;
  error?: string;
}

export interface SyncStatus {
  needsSync: boolean;
  reason?: string;
  lastSynced?: number;
}

export const DEFAULT_REFRESH_INTERVALS = {
  artist: 7 * 24 * 60 * 60 * 1000, // 1 week
  venue: 14 * 24 * 60 * 60 * 1000, // 2 weeks
  show: 24 * 60 * 60 * 1000, // 1 day
  setlist: 24 * 60 * 60 * 1000, // 1 day
  song: 30 * 24 * 60 * 60 * 1000, // 30 days
}; 