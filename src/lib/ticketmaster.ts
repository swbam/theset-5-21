// Re-export all functions from the different modules
export { popularMusicGenres } from './api/ticketmaster-config';

// Artist related functions
export { 
  searchArtistsWithEvents, 
  fetchFeaturedArtists,
  fetchArtistById
} from './api/artist';

// Show related functions (Client-side safe subset)
export {
  fetchShowDetails,
  fetchShowsByGenre
} from './api/shows';

// Import and re-export from the shows directory
export { fetchArtistEvents } from './api/shows/artist-events';
export { fetchFeaturedShows } from './api/shows/featured-shows';

// Removed export for './api/shows' as the file was deleted (logic moved to Edge Functions)
// Removed export for database-utils as the file was deleted (logic moved to Edge Functions)
// Setlist.fm related functions
export const fetchPastSetlists = async (artistId: string, artistName: string) => {
  try {
    // Directly return hardcoded past setlists data as fallback
    return [];
  } catch (error) {
    console.error("Error in fetchPastSetlists:", error);
    return [];
  }
};
