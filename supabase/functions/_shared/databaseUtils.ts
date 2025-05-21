// Import shared Supabase client and types
import { supabaseAdmin } from './supabaseClient.ts';
import type { Artist, Venue, Show, SetlistSong, Song } from './types.ts'; // Use shared types
// Import song utilities from the shared location
import { fetchAndStoreArtistTracks } from './songDbUtils.ts';

// NOTE: The automatic background sync trigger using fetch('/api/sync/venue', ...)
// needs to be replaced with supabase.functions.invoke('sync-venue', ...) later.
// For now, it's commented out as it won't work inside an Edge Function directly.

/**
 * Save an artist to the database
 */
export async function saveArtistToDatabase(artist: Artist): Promise<Artist | null> {
  try {
    if (!artist || !artist.id || !artist.name) {
      console.error("[EF saveArtist] Invalid artist object:", artist);
      return null;
    }
    console.log(`[EF saveArtist] Processing artist: ${artist?.name} (ID: ${artist?.id})`);

    // Check if artist already exists (using Ticketmaster ID as the primary key initially)
    // Ensure your 'artists' table uses the Ticketmaster ID as 'id' or has a unique constraint on it.
    try {
      const { data: existingArtist, error: checkError } = await supabaseAdmin
        .from('artists')
        .select('id, updated_at, spotify_id') // Select DB ID
        .or(`id.eq.${artist.id},spotify_id.eq.${artist.spotify_id}`) // Check by TM ID or Spotify ID
        .maybeSingle();

      if (checkError) {
        console.error(`[EF saveArtist] Error checking artist ${artist.name}:`, checkError);
        throw new Error(`Failed to check artist ${artist.name} in database. Code: ${checkError.code}, Message: ${checkError.message}`);
      }

      if (existingArtist?.updated_at) {
        const lastUpdated = new Date(existingArtist.updated_at);
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceUpdate < 7) {
          console.log(`[EF saveArtist] Artist ${artist.name} was updated ${daysSinceUpdate.toFixed(1)} days ago, skipping update.`);
          // If artist has Spotify ID but no tracks fetch them in background (if needed)
          if (existingArtist.spotify_id && artist.spotify_id) {
             fetchAndStoreArtistTracks(existingArtist.id, existingArtist.spotify_id, artist.name)
               .catch(err => console.error(`[EF saveArtist] Background track fetch error:`, err));
          }
          return existingArtist as Artist; // Return existing DB record
        }
        console.log(`[EF saveArtist] Artist ${artist.name} needs update (last updated ${daysSinceUpdate.toFixed(1)} days ago)`);
      } else {
        console.log(`[EF saveArtist] Artist ${artist.name} is new.`);
      }
    } catch (checkError) {
      console.error("[EF saveArtist] Unexpected error during artist existence check:", checkError);
      throw new Error(`Unexpected error checking if artist ${artist.name} exists: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
    }

    // Prepare artist data for upsert
    const artistData = {
      id: artist.id, // Use Ticketmaster ID as primary key for upsert
      name: artist.name,
      image_url: artist.image_url,
      spotify_id: artist.spotify_id,
      spotify_url: artist.spotify_url,
      popularity: artist.popularity || 0,
      followers: artist.followers || 0,
      updated_at: new Date().toISOString()
      // Add other fields like setlist_fm_mbid if available
    };

    try {
      console.log(`[EF saveArtist] Attempting upsert for artist: ${artistData.name}`);
      const { data, error } = await supabaseAdmin
        .from('artists')
        .upsert(artistData, { onConflict: 'id' }) // Upsert based on 'id' (Ticketmaster ID)
        .select()
        .single(); // Expecting a single record back

      if (error) {
        console.error(`[EF saveArtist] FAILED upsert for artist ${artist.name}:`, error);
        throw new Error(`Failed to save artist ${artist.name} to database. Code: ${error.code}, Message: ${error.message}`);
      }

      console.log(`[EF saveArtist] Successfully saved/updated artist ${artist.name}`);
      const savedDbArtist = data as Artist;

      // If artist has Spotify ID, fetch their tracks in the background
      if (savedDbArtist?.id && savedDbArtist?.spotify_id) {
        fetchAndStoreArtistTracks(savedDbArtist.id, savedDbArtist.spotify_id, savedDbArtist.name)
          .catch(err => console.error(`[EF saveArtist] Error fetching tracks for artist ${artist.name}:`, err));
      }

      return savedDbArtist; // Return the saved DB record
    } catch (saveError) {
      console.error("[EF saveArtist] Error during upsert attempt:", saveError);
      throw saveError;
    }
  } catch (error) {
    console.error("[EF saveArtist] Unexpected top-level error:", error);
    throw new Error(`Unexpected error processing artist ${artist?.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Save a venue to the database
 */
export async function saveVenueToDatabase(venue: Venue): Promise<Venue | null> {
  try {
    if (!venue || !venue.id || !venue.name) {
      console.error("[EF saveVenue] Invalid venue object:", venue);
      return null;
    }
    console.log(`[EF saveVenue] Processing venue: ${venue.name} (ID: ${venue.id})`);

    // Check if venue already exists (using Ticketmaster ID)
    try {
      const { data: existingVenue, error: checkError } = await supabaseAdmin
        .from('venues')
        .select('id, updated_at') // Select DB ID
        .or(`id.eq.${venue.id},ticketmaster_id.eq.${venue.ticketmaster_id || venue.id}`) // Check by TM ID
        .maybeSingle();

      if (checkError) {
        console.error(`[EF saveVenue] Error checking venue ${venue.name}:`, checkError);
        throw new Error(`Failed to check venue ${venue.name} in database. Code: ${checkError.code}, Message: ${checkError.message}`);
      }

      if (existingVenue?.updated_at) {
        const lastUpdated = new Date(existingVenue.updated_at);
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceUpdate < 30) {
          console.log(`[EF saveVenue] Venue ${venue.name} was updated ${daysSinceUpdate.toFixed(1)} days ago, skipping update.`);
          return existingVenue as Venue;
        }
        console.log(`[EF saveVenue] Venue ${venue.name} needs update (last updated ${daysSinceUpdate.toFixed(1)} days ago)`);
      } else {
        console.log(`[EF saveVenue] Venue ${venue.name} is new.`);
      }
    } catch (checkError) {
      console.error("[EF saveVenue] Unexpected error during venue existence check:", checkError);
      throw new Error(`Unexpected error checking if venue ${venue.name} exists: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
    }

    // Prepare venue data for upsert
    const venueData = {
      id: venue.id, // Use Ticketmaster ID as primary key for upsert
      ticketmaster_id: venue.ticketmaster_id || venue.id, // Ensure TM ID is stored
      name: venue.name,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      address: venue.address,
      postal_code: venue.postal_code,
      image_url: venue.image_url,
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabaseAdmin
        .from('venues')
        .upsert(venueData, { onConflict: 'id' }) // Upsert based on 'id' (Ticketmaster ID)
        .select()
        .single();

      if (error) {
        console.error(`[EF saveVenue] FAILED upsert for venue ${venue.name}:`, error);
        throw new Error(`Failed to save venue ${venue.name} to database. Code: ${error.code}, Message: ${error.message}`);
      }

      console.log(`[EF saveVenue] Successfully saved venue ${venue.name} to database`);
      return data as Venue; // Return saved DB data
    } catch (saveError) {
      console.error("[EF saveVenue] Error during upsert attempt:", saveError);
      throw saveError;
    }
  } catch (error) {
    console.error("[EF saveVenue] Unexpected top-level error:", error);
    throw new Error(`Unexpected error processing venue ${venue?.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Save a show to the database, ensuring artist and venue exist first.
 * Also triggers setlist creation.
 */
export async function saveShowToDatabase(show: Show, options: { triggeredBySync?: boolean } = {}): Promise<Show | null> {
  const { triggeredBySync = false } = options;
  try {
    if (!show || !show.id) {
      console.error("[EF saveShow] Invalid show object:", show);
      return null;
    }
    console.log(`[EF saveShow] Processing show: ${show.name} (ID: ${show.id})${triggeredBySync ? ' [Sync Triggered]' : ''}`);

    // Check if show already exists (using Ticketmaster ID)
    try {
      const { data: existingShow, error: checkError } = await supabaseAdmin
        .from('shows')
        .select('id, updated_at, artist_id, venue_id') // Select DB ID
        .or(`id.eq.${show.id},ticketmaster_id.eq.${show.ticketmaster_id || show.id}`) // Check by TM ID
        .maybeSingle();

      if (checkError) {
        console.error(`[EF saveShow] Error checking show ${show.name}:`, checkError);
        throw new Error(`Failed to check show ${show.name} in database. Code: ${checkError.code}, Message: ${checkError.message}`);
      }

      if (existingShow?.updated_at) {
        const lastUpdated = new Date(existingShow.updated_at);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

        if (hoursSinceUpdate < 24) {
          console.log(`[EF saveShow] Show ${show.name} was updated ${hoursSinceUpdate.toFixed(1)} hours ago, skipping update.`);
          return existingShow as Show;
        }
        console.log(`[EF saveShow] Show ${show.name} needs update (last updated ${hoursSinceUpdate.toFixed(1)} hours ago)`);
      } else {
        console.log(`[EF saveShow] Show ${show.name} is new.`);
      }
    } catch (checkError) {
      console.error("[EF saveShow] Unexpected error during show existence check:", checkError);
      throw new Error(`Unexpected error checking if show ${show.name} exists: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
    }

    // Ensure artist and venue exist in DB first, get their DB IDs
    let dbArtistId: string | undefined;
    let dbVenueId: string | undefined;

    if (show.artist && typeof show.artist === 'object') {
      const savedArtist = await saveArtistToDatabase(show.artist);
      dbArtistId = savedArtist?.id; // This is now the DB ID (which might be the TM ID if used as PK)
    } else if (show.artist_id) {
       // If only artist_id (TM ID) is provided, try saving a minimal artist object
       const minimalArtist: Artist = { id: show.artist_id, name: "Unknown Artist (from Show)" }; // Need a name
       const savedArtist = await saveArtistToDatabase(minimalArtist);
       dbArtistId = savedArtist?.id;
    }


    if (show.venue && typeof show.venue === 'object') {
      const savedVenue = await saveVenueToDatabase(show.venue);
      dbVenueId = savedVenue?.id; // This is now the DB ID (which might be the TM ID if used as PK)
    } else if (show.venue_id) {
       // If only venue_id (TM ID) is provided, try saving a minimal venue object
       const minimalVenue: Venue = { id: show.venue_id, name: "Unknown Venue (from Show)" }; // Need a name
       const savedVenue = await saveVenueToDatabase(minimalVenue);
       dbVenueId = savedVenue?.id;
    }


    if (!dbArtistId || !dbVenueId) {
      console.error(`[EF saveShow] Cannot save show ${show.name}, missing DB artistId (${dbArtistId}) or DB venueId (${dbVenueId}) after saving dependencies.`);
      throw new Error(`Cannot save show ${show.name}, missing required DB artistId or DB venueId.`);
    }

    // Prepare show data for upsert using DB IDs for foreign keys
    const showData = {
      id: show.id, // Use Ticketmaster ID as primary key for upsert
      ticketmaster_id: show.ticketmaster_id || show.id, // Ensure TM ID is stored
      name: show.name,
      date: show.date,
      ticket_url: show.ticket_url,
      image_url: show.image_url,
      artist_id: dbArtistId, // Use the DB artist ID
      venue_id: dbVenueId, // Use the DB venue ID
      popularity: show.popularity || 0,
      updated_at: new Date().toISOString()
    };

    // Upsert the show
    const { data, error } = await supabaseAdmin
      .from('shows')
      .upsert(showData, { onConflict: 'id' }) // Upsert based on 'id' (Ticketmaster ID)
      .select()
      .single();

    if (error) {
      console.error(`[EF saveShow] FAILED upsert for show ${show.name}:`, error);
      throw new Error(`Failed to save show ${show.name} to database. Code: ${error.code}, Message: ${error.message}`);
    }

    const savedDbShow = data as Show; // This is the show record from the DB
    console.log(`[EF saveShow] Successfully saved show ${show.name} to database`);

    // --- Automatic Venue Sync Trigger ---
    if (!triggeredBySync && dbVenueId) { // Ensure we have the DB venue ID
      console.log(`[EF saveShow] Considering background sync for venue ID: ${dbVenueId} (Show: ${savedDbShow.name})`);
      // Get the Ticketmaster ID for the venue (needed by the sync-venue function)
      // Use the explicit ticketmaster_id if available on the input 'show' object, otherwise fallback to the venue's 'id' (which should be the TM ID)
      const venueTmId = show.venue?.ticketmaster_id || show.venue?.id || show.venue_id;

      if (venueTmId) {
         console.log(`[EF saveShow] Invoking 'sync-venue' function for TM Venue ID: ${venueTmId}`);
         // Invoke the 'sync-venue' function asynchronously (fire-and-forget)
         // Use the admin client as this utility might be called server-side
         supabaseAdmin.functions.invoke('sync-venue', {
           // Pass the Ticketmaster Venue ID as the primary identifier
           body: { ticketmasterVenueId: venueTmId }
         })
         // Explicitly type the error from invoke result (can be FunctionError or null)
         .then(({ error: invokeError }: { error: Error | null }) => {
           if (invokeError) {
             console.error(`[EF saveShow] Error invoking 'sync-venue' for TM ID ${venueTmId}:`, invokeError);
           } else {
             console.log(`[EF saveShow] Successfully invoked 'sync-venue' for TM ID ${venueTmId}.`);
           }
         })
         .catch((catchError: unknown) => { // Type catch parameter as unknown
            // Catch potential network errors during the invoke call itself
            console.error(`[EF saveShow] Network error invoking 'sync-venue' for TM ID ${venueTmId}:`, catchError);
         });
      } else {
          console.warn(`[EF saveShow] Cannot trigger background sync for venue associated with show ${savedDbShow.name}: Missing Ticketmaster Venue ID.`);
      }
    }

    // Create a setlist for *this specific* show if it doesn't exist
    if (dbArtistId && savedDbShow.id) { // Use DB IDs
        try {
            const setlistId = await createSetlistDirectly(savedDbShow.id, dbArtistId);
            if (setlistId) {
                console.log(`[EF saveShow] Ensured setlist exists for show ${savedDbShow.id}: ${setlistId}`);
                savedDbShow.setlist_id = setlistId; // Add to returned object
            }
        } catch (setlistError) {
            console.error(`[EF saveShow] Error ensuring setlist for show ${savedDbShow.id}:`, setlistError);
        }
    } else {
        console.warn(`[EF saveShow] Cannot create setlist for show ${savedDbShow.id}: Missing DB artistId or DB showId.`);
    }

    return savedDbShow; // Return the saved show object from DB

  } catch (error) {
    console.error("[EF saveShow] Unexpected top-level error:", error);
    throw new Error(`Unexpected error processing show ${show?.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}


/**
 * Create a setlist for a show and populate it with songs
 */
export async function createSetlistDirectly(dbShowId: string, dbArtistId: string): Promise<string | null> {
  try {
    console.log(`[EF createSetlist] Creating setlist for DB show ${dbShowId}`);

    // Check if setlist already exists using DB show ID
    const { data: existingSetlist, error: checkError } = await supabaseAdmin
      .from('setlists')
      .select('id')
      .eq('show_id', dbShowId)
      .maybeSingle();

    if (checkError) {
      console.error(`[EF createSetlist] Error checking for existing setlist for show ${dbShowId}:`, checkError);
      throw new Error(`Failed to check for existing setlist for show ${dbShowId}. Code: ${checkError.code}, Message: ${checkError.message}`);
    }

    if (existingSetlist) {
      console.log(`[EF createSetlist] Setlist already exists for show ${dbShowId}: ${existingSetlist.id}`);
      return existingSetlist.id;
    }

    // Get show details for date and venue information using DB show ID
    const { data: show, error: showError } = await supabaseAdmin
      .from('shows')
      .select('date, venue_id, venues(name, city)') // Join with venues using venue_id FK
      .eq('id', dbShowId) // Filter by DB show ID
      .single();

    if (showError || !show) {
      console.error(`[EF createSetlist] Error getting show details for show ${dbShowId}:`, showError);
      // If the show doesn't exist in the DB (shouldn't happen if called from saveShowToDatabase), throw error
      throw new Error(`Failed to get details for show ${dbShowId}. Code: ${showError?.code}, Message: ${showError?.message}`);
    }

    // Create new setlist using DB IDs
    const { data: newSetlist, error: createError } = await supabaseAdmin
      .from('setlists')
      .insert({
        artist_id: dbArtistId, // Use DB artist ID
        show_id: dbShowId, // Use DB show ID
        date: show.date,
        // Access joined venue data correctly (Supabase returns it as an object if relationship exists)
        venue: show.venues?.name || null,
        venue_city: show.venues?.city || null,
      })
      .select('id') // Only select the ID
      .single();

    if (createError || !newSetlist) {
      console.error(`[EF createSetlist] Error creating setlist for show ${dbShowId}:`, createError);
      throw new Error(`Failed to create setlist for show ${dbShowId}. Code: ${createError?.code}, Message: ${createError?.message}`);
    }

    console.log(`[EF createSetlist] Created setlist ${newSetlist.id} for show ${dbShowId}`);

    // Populate setlist with songs using DB artist ID
    await populateSetlistSongs(newSetlist.id, dbArtistId);

    return newSetlist.id;
  } catch (error) {
    console.error(`[EF createSetlist] Unexpected error for show ${dbShowId}:`, error);
    throw new Error(`Unexpected error creating setlist for show ${dbShowId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Populate setlist with songs from the artist's catalog using DB IDs
 */
async function populateSetlistSongs(setlistId: string, dbArtistId: string): Promise<boolean> {
  try {
    // Get artist's songs from the database using DB artist ID
    const { data: songs, error: songsError } = await supabaseAdmin
      .from('songs')
      .select('id, name, spotify_id, duration_ms, preview_url, popularity') // Select DB song ID
      .eq('artist_id', dbArtistId) // Filter by DB artist ID
      .order('popularity', { ascending: false })
      .limit(50);

    if (songsError) {
      console.error(`[EF populateSongs] Error fetching songs for artist ${dbArtistId}:`, songsError);
      throw new Error(`Failed to fetch songs for artist ${dbArtistId}. Code: ${songsError.code}, Message: ${songsError.message}`);
    }

    let songsToUse: Pick<Song, 'id' | 'name' | 'spotify_id' | 'duration_ms' | 'preview_url' | 'popularity'>[] = songs || [];

    // If we don't have songs, fetch them from Spotify
    if (songsToUse.length === 0) {
      // Get the artist's Spotify ID using DB artist ID
      const { data: artist, error: artistError } = await supabaseAdmin
        .from('artists')
        .select('spotify_id')
        .eq('id', dbArtistId) // Filter by DB artist ID
        .maybeSingle();

      if (artistError || !artist?.spotify_id) {
        console.error(`[EF populateSongs] Error getting Spotify ID for artist ${dbArtistId}:`, artistError);
        // Don't throw, just return false as we can't populate without songs
        return false;
      }

      // Fetch songs from Spotify and store them (this uses DB artist ID internally)
      const fetched = await fetchAndStoreArtistTracks(dbArtistId, artist.spotify_id, "Artist");
      if (!fetched) {
          console.warn(`[EF populateSongs] Failed to fetch/store Spotify tracks for artist ${dbArtistId}. Cannot populate setlist.`);
          return false;
      }

      // Try again to get songs from DB
      const { data: refreshedSongs, error: refreshError } = await supabaseAdmin
        .from('songs')
        .select('id, name, spotify_id, duration_ms, preview_url, popularity')
        .eq('artist_id', dbArtistId)
        .order('popularity', { ascending: false })
        .limit(50);

      if (refreshError || !refreshedSongs || refreshedSongs.length === 0) {
        console.error(`[EF populateSongs] Still couldn't get songs for artist ${dbArtistId} after fetching from Spotify:`, refreshError);
        // Don't throw, just return false
        return false;
      }
      songsToUse = refreshedSongs;
    }

    // Add songs to setlist using DB song IDs
    return await addSongsToSetlistInternal(setlistId, dbArtistId, songsToUse);

  } catch (error) {
    console.error(`[EF populateSongs] Unexpected error for setlist ${setlistId}:`, error);
    // Don't throw, just return false as population failure isn't critical for show saving
    return false;
  }
}

/**
 * Add songs to a setlist - internal implementation using DB IDs
 */
async function addSongsToSetlistInternal(setlistId: string, dbArtistId: string, songs: Pick<Song, 'id' | 'name'>[]) {
  try {
    // Select 5 random songs from the available songs
    const selectedSongs = songs
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);

    if (selectedSongs.length === 0) {
      console.warn(`[EF addSongs] No songs available to add to setlist ${setlistId}`);
      return false; // Not an error, just nothing to add
    }

    // Prepare setlist songs data using DB song IDs
    const setlistSongsData: Omit<SetlistSong, 'id' | 'created_at' | 'updated_at'>[] = selectedSongs.map((song, index) => ({
      setlist_id: setlistId,
      song_id: song.id, // Use DB song ID
      name: song.name, // Denormalized name
      position: index + 1,
      artist_id: dbArtistId, // Use DB artist ID
      vote_count: 0
      // track_id might be spotify_id? Clarify requirement.
    }));

    // Insert setlist songs
    const { error } = await supabaseAdmin
      .from('setlist_songs')
      .insert(setlistSongsData);

    if (error) {
      // Handle potential duplicate errors gracefully if needed (e.g., if retrying)
      if (error.code === '23505') { // unique_violation
          console.warn(`[EF addSongs] Songs likely already added to setlist ${setlistId}. Error: ${error.message}`);
          return true; // Consider it success if they already exist
      }
      console.error(`[EF addSongs] Error adding songs to setlist ${setlistId}:`, error);
      throw new Error(`Failed to add songs to setlist ${setlistId}. Code: ${error.code}, Message: ${error.message}`);
    }

    console.log(`[EF addSongs] Added ${setlistSongsData.length} songs to setlist ${setlistId}`);
    return true;
  } catch (error) {
    console.error(`[EF addSongs] Unexpected error for setlist ${setlistId}:`, error);
    throw new Error(`Unexpected error adding songs to setlist ${setlistId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}