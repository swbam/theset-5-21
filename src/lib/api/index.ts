/**
 * Main API module for TheSet application
 * Re-exports all API functionality in a way that avoids naming conflicts
 */

// Artist related
export * from './artist';

// Show related
export * from './shows';

// Database related
export * from './database';

// API services with more selective exports to avoid naming conflicts
export { getArtist, getArtistTopTracksFromDb } from './getArtist';

// Re-export mock service with a namespace to avoid conflicts
import * as MockService from './mock-service';
export { MockService };

// Re-export other services
export * from './realtime-service';
export * from './ticketmaster-config';
export * from './venue-sync-service';

// Import utility functions that might have naming conflicts
import { formatDate as mockFormatDate } from './mock-service';

// Re-export with renamed exports to avoid conflicts
export {
  mockFormatDate
};
