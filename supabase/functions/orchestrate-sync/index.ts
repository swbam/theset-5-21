/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Define types for our sync tasks
interface SyncTask {
  task:
    | "sync-show"
    | "sync-artist"
    | "sync-venue"
    | "sync-setlist"
    | "import-spotify-catalog";
  entityType: "show" | "artist" | "venue" | "setlist" | "catalog";
  entityId: string;
  parentTask?: string;
  priority?: "high" | "medium" | "low";
}

// Database entity types
interface Artist {
  id?: string;
  external_id: string;
  name: string;
  image_url?: string | null;
  url?: string | null;
  spotify_id?: string | null;
  spotify_url?: string | null;
  genres?: string[] | null;
  popularity?: number | null;
}

interface Venue {
  id?: string;
  external_id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  url?: string | null;
  image_url?: string | null;
}

interface Show {
  id?: string;
  external_id: string;
  name: string;
  date?: string | null;
  artist_id: string;
  venue_id: string;
  ticket_url?: string | null;
  image_url?: string | null;
  popularity?: number | null;
}

interface Setlist {
  id?: string;
  setlist_fm_id: string;
  artist_id: string;
  show_id?: string | null;
  // songs field removed, data is now in played_setlist_songs
}

interface Song {
  id?: string;
  name: string;
  artist_id: string;
  spotify_id?: string | null;
  duration_ms?: number | null;
  popularity?: number | null;
  preview_url?: string | null;
}

// Handle various sync tasks with a central orchestrator
serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as SyncTask;
    const {
      task,
      entityType,
      entityId,
      parentTask,
      priority = "medium",
    } = payload;

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    console.log(
      `[orchestrate-sync] Starting task: ${task} for ${entityType} ${entityId} (priority: ${priority})`,
    );

    // Track this sync operation in the database
    const { error: trackError } = await supabase
      .from("sync_operations")
      .insert({
        task,
        entity_type: entityType,
        entity_id: entityId,
        parent_task: parentTask,
        priority,
        status: "started",
        started_at: new Date().toISOString(),
      });

    if (trackError) {
      console.warn(
        `[orchestrate-sync] Failed to track sync operation: ${trackError.message}`,
      );
    }

    // Main task switch - handles different sync scenarios
    let result;
    switch (task) {
      case "sync-show":
        result = await orchestrateShowSync(supabase, entityId);
        break;
      case "sync-artist":
        result = await orchestrateArtistSync(supabase, entityId);
        break;
      case "sync-venue":
        result = await orchestrateVenueSync(supabase, entityId);
        break;
      case "sync-setlist":
        result = await orchestrateSetlistSync(supabase, entityId);
        break;
      case "import-spotify-catalog":
        result = await orchestrateSpotifyCatalogImport(supabase, entityId);
        break;
      default:
        throw new Error(`Unknown task: ${task}`);
    }

    // Update sync operation status
    await supabase
      .from("sync_operations")
      .update({
        status: result.success ? "completed" : "failed",
        completed_at: new Date().toISOString(),
        error: result.success ? null : result.error,
      })
      .eq("task", task)
      .eq("entity_id", entityId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error(`[orchestrate-sync] Error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

// Implementation of show sync orchestration
async function orchestrateShowSync(
  supabase: SupabaseClient,
  showExternalId: string,
) {
  console.log(
    `[orchestrate-show] Syncing show with external ID: ${showExternalId}`,
  );

  try {
    // 1. Fetch raw show data from Ticketmaster
    const showData = await fetchShowData(showExternalId);
    if (!showData) {
      return {
        success: false,
        error: `Failed to fetch show data for ID: ${showExternalId}`,
      };
    }

    // 2. Extract artist and venue IDs from the show data
    const tmArtistId = showData._embedded?.attractions?.[0]?.id;
    const tmVenueId = showData._embedded?.venues?.[0]?.id;

    if (!tmArtistId || !tmVenueId) {
      return {
        success: false,
        error: `Show ${showExternalId} missing required relationships: ${!tmArtistId ? "artist" : ""} ${!tmVenueId ? "venue" : ""}`,
      };
    }

    // 3. Check if we already have these entities in our database
    let artistUUID = await getEntityUUID(
      supabase,
      "artists",
      "external_id",
      tmArtistId,
    );
    let venueUUID = await getEntityUUID(
      supabase,
      "venues",
      "external_id",
      tmVenueId,
    );

    // 4. Sync missing dependencies if needed
    if (!artistUUID) {
      console.log(
        `[orchestrate-show] Artist ${tmArtistId} not found, syncing...`,
      );
      const artistResult = await orchestrateArtistSync(supabase, tmArtistId);

      if (artistResult.success && artistResult.data) {
        artistUUID = artistResult.data.id;
      } else {
        return {
          success: false,
          error: `Failed to sync required artist: ${artistResult.error || "Unknown error"}`,
        };
      }
    }

    if (!venueUUID) {
      console.log(
        `[orchestrate-show] Venue ${tmVenueId} not found, syncing...`,
      );
      const venueResult = await orchestrateVenueSync(supabase, tmVenueId);

      if (venueResult.success && venueResult.data) {
        venueUUID = venueResult.data.id;
      } else {
        return {
          success: false,
          error: `Failed to sync required venue: ${venueResult.error || "Unknown error"}`,
        };
      }
    }

    // 5. Ensure we have valid UUIDs before proceeding
    if (!artistUUID || !venueUUID) {
      // This check ensures artistUUID and venueUUID are strings, satisfying the Show interface.
      return {
        success: false,
        error: `Failed to obtain valid artistUUID (${artistUUID}) or venueUUID (${venueUUID}) after sync attempts.`,
      };
    }

    // 6. Now save the show with the correct references
    const showToSave: Show = {
      external_id: showExternalId,
      name: showData.name || "Unknown Show",
      date: showData.dates?.start?.dateTime || null,
      artist_id: artistUUID, // Type is string due to the check above
      venue_id: venueUUID, // Type is string due to the check above
      ticket_url: showData.url || null,
      image_url: getBestImage(showData.images),
      popularity: 0, // Default value, can be updated later
    };

    // 7. Upsert the show
    const { data: savedShow, error } = await supabase
      .from("shows")
      .upsert(showToSave, { onConflict: "external_id" })
      .select()
      .single();

    if (error) {
      return { success: false, error: `Failed to save show: ${error.message}` };
    }

    // 8. Optionally trigger setlist sync for past shows
    const eventDate = showData.dates?.start?.dateTime
      ? new Date(showData.dates.start.dateTime)
      : null;
    if (eventDate && eventDate < new Date()) {
      // Only look for setlists for past shows
      console.log(
        `[orchestrate-show] Show date is in the past, checking for setlist...`,
      );

      // Instead of just doing this immediately, we're queueing it as a separate task
      await supabase.functions.invoke("orchestrate-sync", {
        body: {
          task: "sync-setlist",
          entityType: "setlist",
          entityId: `show:${savedShow.id}`, // We're using a special format to indicate we're searching by show
          parentTask: `sync-show:${showExternalId}`,
          priority: "low", // Lower priority than the main sync
        },
      });
    }

    return { success: true, data: savedShow };
  } catch (error) {
    console.error(`[orchestrate-show] Error:`, error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error in show sync",
    };
  }
}

// Implementation of artist sync orchestration
async function orchestrateArtistSync(
  supabase: SupabaseClient,
  artistExternalId: string,
) {
  console.log(
    `[orchestrate-artist] Syncing artist with external ID: ${artistExternalId}`,
  );

  try {
    // 1. Check if the artist already exists
    const { data: existingArtist } = await supabase
      .from("artists")
      .select("*")
      .eq("external_id", artistExternalId)
      .maybeSingle();

    if (existingArtist) {
      console.log(
        `[orchestrate-artist] Artist ${artistExternalId} already exists, skipping fetch`,
      );
      return { success: true, data: existingArtist, updated: false };
    }

    // 2. Fetch artist data from Ticketmaster
    const artistData = await fetchArtistData(artistExternalId);
    if (!artistData) {
      return {
        success: false,
        error: `Failed to fetch artist data for ID: ${artistExternalId}`,
      };
    }

    // 3. Get Spotify data to enrich the artist
    let spotifyData = null;
    if (artistData.name) {
      spotifyData = await searchSpotifyArtist(artistData.name);
    }

    // 4. Save the artist with combined data
    const artistToSave: Artist = {
      external_id: artistExternalId,
      name: artistData.name || "Unknown Artist",
      image_url: getBestImage(artistData.images),
      url: artistData.url || null,
      // Add Spotify data if available
      spotify_id: spotifyData?.id || null,
      spotify_url: spotifyData?.external_urls?.spotify || null,
      genres: spotifyData?.genres || [],
      popularity: spotifyData?.popularity || null,
    };

    const { data: savedArtist, error } = await supabase
      .from("artists")
      .upsert(artistToSave, { onConflict: "external_id" })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Failed to save artist: ${error.message}`,
      };
    }

    // 5. If we have a Spotify ID, trigger catalog import in the background
    if (savedArtist.spotify_id) {
      console.log(
        `[orchestrate-artist] Artist has Spotify ID, queueing catalog import...`,
      );

      await supabase.functions.invoke("orchestrate-sync", {
        body: {
          task: "import-spotify-catalog",
          entityType: "catalog",
          entityId: savedArtist.id, // Using Supabase UUID
          parentTask: `sync-artist:${artistExternalId}`,
          priority: "low", // Lower priority than the main sync
        },
      });
    }

    return { success: true, data: savedArtist, updated: true };
  } catch (error) {
    console.error(`[orchestrate-artist] Error:`, error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error in artist sync",
    };
  }
}

// Implementation of venue sync orchestration
async function orchestrateVenueSync(
  supabase: SupabaseClient,
  venueExternalId: string,
) {
  console.log(
    `[orchestrate-venue] Syncing venue with external ID: ${venueExternalId}`,
  );

  try {
    // 1. Check if the venue already exists
    const { data: existingVenue } = await supabase
      .from("venues")
      .select("*")
      .eq("external_id", venueExternalId)
      .maybeSingle();

    if (existingVenue) {
      console.log(
        `[orchestrate-venue] Venue ${venueExternalId} already exists, skipping fetch`,
      );
      return { success: true, data: existingVenue, updated: false };
    }

    // 2. Fetch venue data from Ticketmaster
    const venueData = await fetchVenueData(venueExternalId);
    if (!venueData) {
      return {
        success: false,
        error: `Failed to fetch venue data for ID: ${venueExternalId}`,
      };
    }

    // 3. Save the venue
    const venueToSave: Venue = {
      external_id: venueExternalId,
      name: venueData.name || "Unknown Venue",
      city: venueData.city?.name || null,
      state: venueData.state?.name || null,
      country: venueData.country?.name || null,
      address: venueData.address?.line1 || null,
      latitude: venueData.location?.latitude
        ? parseFloat(venueData.location.latitude)
        : null,
      longitude: venueData.location?.longitude
        ? parseFloat(venueData.location.longitude)
        : null,
      url: venueData.url || null,
      image_url: getBestImage(venueData.images),
    };

    const { data: savedVenue, error } = await supabase
      .from("venues")
      .upsert(venueToSave, { onConflict: "external_id" })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Failed to save venue: ${error.message}`,
      };
    }

    return { success: true, data: savedVenue, updated: true };
  } catch (error) {
    console.error(`[orchestrate-venue] Error:`, error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error in venue sync",
    };
  }
}

// Implementation of setlist sync orchestration
async function orchestrateSetlistSync(
  supabase: SupabaseClient,
  setlistIdOrShowId: string,
) {
  console.log(`[orchestrate-setlist] Syncing setlist: ${setlistIdOrShowId}`);

  try {
    // Handle different input formats
    let setlistId = setlistIdOrShowId;
    let showId = null;
    let artistId = null;

    // If the format is "show:UUID", we need to search for a setlist by show
    if (setlistIdOrShowId.startsWith("show:")) {
      showId = setlistIdOrShowId.substring(5);
      console.log(
        `[orchestrate-setlist] Searching for setlist by show ID: ${showId}`,
      );

      // Get show details to find artist and date
      const { data: show } = await supabase
        .from("shows")
        .select("*, artists(name)")
        .eq("id", showId)
        .single();

      if (!show) {
        return { success: false, error: `Show not found: ${showId}` };
      }

      artistId = show.artist_id;

      // We need artist name and show date to search setlist.fm
      const artistName = show.artists?.name;
      const showDate = show.date;

      if (!artistName || !showDate) {
        return {
          success: false,
          error: `Missing artist name or show date for setlist search`,
        };
      }

      // Search setlist.fm for this show
      const setlistData = await searchSetlistByArtistAndDate(
        artistName,
        new Date(showDate),
      );

      if (
        !setlistData ||
        !setlistData.setlist ||
        setlistData.setlist.length === 0
      ) {
        console.log(
          `[orchestrate-setlist] No setlist found for show on ${showDate}`,
        );
        // Not finding a setlist isn't an error - just means none exists yet
        return {
          success: true,
          data: null,
          message: `No setlist found for ${artistName} on ${new Date(showDate).toISOString().split("T")[0]}`,
        };
      }

      // Use the first setlist found
      setlistId = setlistData.setlist[0].id;
      console.log(
        `[orchestrate-setlist] Found setlist ID: ${setlistId} for show`,
      );
    }

    // Now that we have a setlist ID, fetch the full setlist data
    const setlistData = await fetchSetlistData(setlistId);
    if (!setlistData) {
      return {
        success: false,
        error: `Failed to fetch setlist data for ID: ${setlistId}`,
      };
    }

    // If we didn't get artist ID earlier, look up by MBID from setlist data
    if (!artistId && setlistData.artist?.mbid) {
      const { data: artist } = await supabase
        .from("artists")
        .select("id")
        .eq("mbid", setlistData.artist.mbid)
        .maybeSingle();

      if (artist) {
        artistId = artist.id;
      } else {
        // If we still don't have an artist, try to find by name
        const { data: artistByName } = await supabase
          .from("artists")
          .select("id")
          .ilike("name", setlistData.artist.name)
          .maybeSingle();

        if (artistByName) {
          artistId = artistByName.id;
        } else {
          return { success: false, error: `Could not find artist for setlist` };
        }
      }
    }

    // Extract songs from the setlist
    const songs = extractSongsFromSetlist(setlistData);

    // Ensure artistId is valid before proceeding
    if (!artistId) {
      // This should ideally not happen if the previous lookups worked, but safeguard anyway.
      return {
        success: false,
        error: `Cannot save setlist without a valid artistId.`,
      };
    }

    // Save the main setlist record (metadata only)
    const setlistToSave: Omit<Setlist, "songs"> = {
      setlist_fm_id: setlistId,
      artist_id: artistId, // artistId is confirmed string type here
      show_id: showId,
    };

    const { data: savedSetlist, error } = await supabase
      .from("setlists")
      .upsert(setlistToSave, { onConflict: "setlist_fm_id" })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Failed to save setlist: ${error.message}`,
      };
    }

    // --- Logic to link songs using played_setlist_songs ---

    // 1. Clear existing song links for this setlist to handle re-syncs
    const { error: deleteError } = await supabase
      .from("played_setlist_songs")
      .delete()
      .eq("setlist_id", savedSetlist.id);

    if (deleteError) {
      // Log warning but proceed, as the table might not have existed on first sync
      console.warn(
        `[orchestrate-setlist] Failed to clear old song links for setlist ${savedSetlist.id}: ${deleteError.message}`,
      );
    }

    // 2. Define structure for inserting into played_setlist_songs
    interface PlayedSetlistSongInsert {
      setlist_id: string;
      song_id: string;
      position: number;
      is_encore: boolean;
      info: string | null;
    }

    // 3. Prepare entries by matching extracted songs to catalog
    const playedSongsToInsert: PlayedSetlistSongInsert[] = [];
    for (const songInfo of songs) {
      // 'songs' is the ExtractedSongInfo[] array
      if (!songInfo.name) continue;

      // Find the corresponding song in our 'songs' table
      // Using ilike for case-insensitive matching. Consider adding fuzzy matching or normalization later for robustness.
      const { data: matchedSong, error: matchError } = await supabase
        .from("songs")
        .select("id")
        .eq("artist_id", artistId) // Filter by the correct artist
        .ilike("name", songInfo.name)
        .maybeSingle();

      if (matchError) {
        console.error(
          `[orchestrate-setlist] DB error matching song "${songInfo.name}" for artist ${artistId}: ${matchError.message}`,
        );
        continue; // Skip this song on error
      }

      if (matchedSong) {
        playedSongsToInsert.push({
          setlist_id: savedSetlist.id,
          song_id: matchedSong.id,
          position: songInfo.position,
          is_encore: songInfo.encore > 0, // Convert Setlist.fm encore count to boolean
          info: songInfo.info || null,
        });
      } else {
        // Log songs from Setlist.fm that weren't found in our Spotify catalog
        console.warn(
          `[orchestrate-setlist] Song "${songInfo.name}" from Setlist.fm ID ${setlistId} not found in Spotify catalog for artist ${artistId}. Skipping link.`,
        );
        // TODO: Consider creating placeholder entries or adding to a review queue?
      }
    }

    // 4. Batch insert/upsert the linked songs
    if (playedSongsToInsert.length > 0) {
      // Using upsert with the unique constraint handles re-runs and potential duplicates gracefully.
      const { error: insertLinksError } = await supabase
        .from("played_setlist_songs")
        .upsert(playedSongsToInsert, { onConflict: "setlist_id, position" }); // Constraint ensures position uniqueness per setlist

      if (insertLinksError) {
        // This is a more critical error, as the setlist links failed to save.
        console.error(
          `[orchestrate-setlist] Failed to save played setlist song links for setlist ${savedSetlist.id}: ${insertLinksError.message}`,
        );
        // Return failure, as the setlist data is incomplete in the DB.
        return {
          success: false,
          error: `Failed to save played setlist song links: ${insertLinksError.message}`,
        };
      }
      console.log(
        `[orchestrate-setlist] Successfully linked/upserted ${playedSongsToInsert.length} songs for setlist ${savedSetlist.id}`,
      );
    } else if (songs.length > 0) {
      // Log if Setlist.fm had songs, but none were matched in our catalog
      console.log(
        `[orchestrate-setlist] No songs from Setlist.fm ID ${setlistId} were found in the Spotify catalog for artist ${artistId}.`,
      );
    } else {
      // Log if Setlist.fm itself had no songs
      console.log(
        `[orchestrate-setlist] No songs found in Setlist.fm data for ID ${setlistId}.`,
      );
    }

    // 5. Update the associated show with the setlist reference (if applicable)
    if (showId) {
      const { error: updateShowError } = await supabase
        .from("shows")
        .update({ setlist_id: savedSetlist.id }) // Link the show to this setlist
        .eq("id", showId);
      if (updateShowError) {
        // Log as warning, the main setlist sync succeeded, but the show link failed.
        console.warn(
          `[orchestrate-setlist] Failed to update show ${showId} with setlist_id ${savedSetlist.id}: ${updateShowError.message}`,
        );
      }
    }
    // --- End new logic ---

    return { success: true, data: savedSetlist };
  } catch (error) {
    console.error(`[orchestrate-setlist] Error:`, error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error in setlist sync",
    };
  }
}

// Implementation of Spotify catalog import
async function orchestrateSpotifyCatalogImport(
  supabase: SupabaseClient,
  artistId: string,
) {
  console.log(
    `[orchestrate-spotify-catalog] Importing catalog for artist ID: ${artistId}`,
  );

  try {
    // Get the artist's Spotify ID
    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select("spotify_id")
      .eq("id", artistId)
      .single();

    if (artistError || !artist?.spotify_id) {
      return {
        success: false,
        error: `Artist ${artistId} does not have a Spotify ID`,
      };
    }

    // Call Spotify API to get artist's albums
    const albums = await fetchSpotifyArtistAlbums(artist.spotify_id);
    if (!albums || albums.length === 0) {
      return {
        success: true,
        message: `No albums found for artist ${artistId}`,
        data: { songs_imported: 0 },
      };
    }

    // Fetch tracks for each album
    const allTracks = new Map<string, any>();
    for (const album of albums) {
      if (!album.id) continue;

      const tracks = await fetchSpotifyAlbumTracks(album.id);

      for (const track of tracks) {
        if (track.id && !allTracks.has(track.id)) {
          // Ensure the track is by our artist
          const isPrimaryArtist = track.artists?.some(
            (a: { id: string }) => a.id === artist.spotify_id,
          ); // Add type for 'a'
          if (isPrimaryArtist) {
            allTracks.set(track.id, track);
          }
        }
      }
    }

    if (allTracks.size === 0) {
      return {
        success: true,
        message: `No tracks found for artist ${artistId}`,
        data: { songs_imported: 0 },
      };
    }

    // Map tracks to our songs schema
    const songsToUpsert: Song[] = Array.from(allTracks.values()).map(
      (track) => ({
        name: track.name,
        artist_id: artistId,
        spotify_id: track.id,
        duration_ms: track.duration_ms || null,
        popularity: track.popularity || 0,
        preview_url: track.preview_url || null,
      }),
    );

    // Batch insert songs
    const BATCH_SIZE = 500;
    let upsertedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < songsToUpsert.length; i += BATCH_SIZE) {
      const batch = songsToUpsert.slice(i, i + BATCH_SIZE);

      const { data, error: upsertError } = await supabase
        .from("songs")
        .upsert(batch, {
          onConflict: "spotify_id",
          ignoreDuplicates: false,
        })
        .select("id");

      if (upsertError) {
        console.error(
          `[orchestrate-spotify-catalog] Upsert error:`,
          upsertError,
        );
        failedCount += batch.length;
      } else {
        upsertedCount += data?.length || 0;
      }
    }

    return {
      success: true,
      data: {
        songs_imported: upsertedCount,
        songs_failed: failedCount,
        total_tracks: allTracks.size,
      },
    };
  } catch (error) {
    console.error(`[orchestrate-spotify-catalog] Error:`, error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error in Spotify catalog import",
    };
  }
}

// Utility functions

// Get entity UUID by external ID
async function getEntityUUID(
  supabase: SupabaseClient,
  table: string,
  externalIdField: string,
  externalId: string,
): Promise<string | null> {
  if (!externalId) return null;

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq(externalIdField, externalId)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

// Get best quality image from an array
function getBestImage(
  images: { url: string; width?: number }[] | null,
): string | null {
  if (!images || !Array.isArray(images) || images.length === 0) return null;

  // Sort by width (or height) to get highest resolution
  const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0].url;
}

// Define an interface for the song structure extracted from Setlist.fm data
interface ExtractedSongInfo {
  name: string;
  encore: number; // Setlist.fm uses number (0 or >0)
  position: number; // Absolute position in the setlist
  info: string | null; // Additional info like "acoustic", "cover"
}

// Extract songs from setlist data structure (needs specific typing based on Setlist.fm API response)

function extractSongsFromSetlist(setlistData: any): ExtractedSongInfo[] {
  const extractedSongs: ExtractedSongInfo[] = [];
  let currentPosition = 0; // Track the absolute position across all sets

  // Check if the basic structure exists
  if (!setlistData || !setlistData.sets || !setlistData.sets.set) {
    console.warn(
      "[extractSongsFromSetlist] Setlist data missing sets.set structure.",
    );
    return extractedSongs;
  }

  // Setlist.fm sometimes returns a single set object or an array of sets. Normalize to always use an array.
  const sets = Array.isArray(setlistData.sets.set)
    ? setlistData.sets.set
    : [setlistData.sets.set];

  for (const set of sets) {
    // Check if the set has songs
    if (!set || !set.song) {
      continue; // Skip this set if it has no songs
    }

    // Similar normalization for songs within a set
    const songsInSet = Array.isArray(set.song) ? set.song : [set.song];

    for (const song of songsInSet) {
      // Check if the song object and its name exist
      if (song && song.name) {
        currentPosition++; // Increment position for each valid song found
        extractedSongs.push({
          name: song.name,
          encore: set.encore || 0, // Encore status is usually per-set
          position: currentPosition, // Assign the calculated absolute position
          info: song.info || null, // Capture any additional info (e.g., "acoustic", "medley")
        });
      } else {
        console.warn(
          "[extractSongsFromSetlist] Skipping invalid song entry in set:",
          song,
        );
      }
    }
  }

  return extractedSongs;
}

// API fetch functions

// Fetch show data from Ticketmaster
async function fetchShowData(showId: string): Promise<any | null> {
  // Add return type hint
  console.log(`[fetch] Getting show data from Ticketmaster: ${showId}`);
  try {
    const apiKey = Deno.env.get("TICKETMASTER_API_KEY");
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events/${showId}?apikey=${apiKey}&include=attractions,venues`,
      { headers: { Accept: "application/json" } },
    );

    if (!response.ok) {
      console.error(`[fetch] Ticketmaster API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[fetch] Error fetching show data:`, error);
    return null;
  }
}

// Fetch artist data from Ticketmaster
async function fetchArtistData(artistId: string): Promise<any | null> {
  // Add return type hint
  console.log(`[fetch] Getting artist data from Ticketmaster: ${artistId}`);
  try {
    const apiKey = Deno.env.get("TICKETMASTER_API_KEY");
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/attractions/${artistId}?apikey=${apiKey}`,
      { headers: { Accept: "application/json" } },
    );

    if (!response.ok) {
      console.error(`[fetch] Ticketmaster API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[fetch] Error fetching artist data:`, error);
    return null;
  }
}

// Fetch venue data from Ticketmaster
async function fetchVenueData(venueId: string): Promise<any | null> {
  // Add return type hint
  console.log(`[fetch] Getting venue data from Ticketmaster: ${venueId}`);
  try {
    const apiKey = Deno.env.get("TICKETMASTER_API_KEY");
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/venues/${venueId}?apikey=${apiKey}`,
      { headers: { Accept: "application/json" } },
    );

    if (!response.ok) {
      console.error(`[fetch] Ticketmaster API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[fetch] Error fetching venue data:`, error);
    return null;
  }
}

// Search for an artist on Spotify
async function searchSpotifyArtist(artistName: string): Promise<any | null> {
  // Add return type hint
  console.log(`[fetch] Searching Spotify for artist: ${artistName}`);
  try {
    const token = await getSpotifyToken();
    if (!token) return null;

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!response.ok) {
      console.error(`[fetch] Spotify API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.artists?.items?.[0]) return null;

    return data.artists.items[0];
  } catch (error) {
    console.error(`[fetch] Error searching Spotify:`, error);
    return null;
  }
}

// Get Spotify OAuth token
async function getSpotifyToken() {
  try {
    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("[fetch] Spotify credentials not configured");
      return null;
    }

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(clientId + ":" + clientSecret),
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      console.error(`[fetch] Failed to get Spotify token: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error(`[fetch] Error getting Spotify token:`, error);
    return null;
  }
}

// Fetch artist albums from Spotify
async function fetchSpotifyArtistAlbums(
  spotifyArtistId: string,
): Promise<any[]> {
  // Add return type hint
  console.log(`[fetch] Getting albums for Spotify artist: ${spotifyArtistId}`);
  try {
    const token = await getSpotifyToken();
    if (!token) return [];

    const albums = [];
    let url = `https://api.spotify.com/v1/artists/${spotifyArtistId}/albums?include_groups=album,single&limit=50`;

    while (url) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        console.error(`[fetch] Spotify API error: ${response.status}`);
        break;
      }

      const data = await response.json();
      if (data.items) albums.push(...data.items);

      url = data.next;
    }

    return albums;
  } catch (error) {
    console.error(`[fetch] Error fetching Spotify albums:`, error);
    return [];
  }
}

// Fetch album tracks from Spotify
async function fetchSpotifyAlbumTracks(albumId: string): Promise<any[]> {
  // Add return type hint
  console.log(`[fetch] Getting tracks for Spotify album: ${albumId}`);
  try {
    const token = await getSpotifyToken();
    if (!token) return [];

    const tracks = [];
    let url = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;

    while (url) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        console.error(`[fetch] Spotify API error: ${response.status}`);
        break;
      }

      const data = await response.json();
      if (data.items) tracks.push(...data.items);

      url = data.next;
    }

    return tracks;
  } catch (error) {
    console.error(`[fetch] Error fetching Spotify tracks:`, error);
    return [];
  }
}

// Search for a setlist by artist and date
async function searchSetlistByArtistAndDate(
  artistName: string,
  showDate: Date,
): Promise<any | null> {
  // Add return type hint
  console.log(
    `[fetch] Searching setlist.fm for artist: ${artistName} on date: ${showDate.toISOString().split("T")[0]}`,
  );
  try {
    const apiKey = Deno.env.get("SETLISTFM_API_KEY");
    if (!apiKey) {
      console.error("[fetch] Setlist.fm API key not configured");
      return null;
    }

    // Format date as DD-MM-YYYY
    const day = showDate.getDate().toString().padStart(2, "0");
    const month = (showDate.getMonth() + 1).toString().padStart(2, "0");
    const year = showDate.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    const response = await fetch(
      `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${encodeURIComponent(artistName)}&date=${formattedDate}`,
      {
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error(`[fetch] Setlist.fm API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[fetch] Error searching setlist.fm:`, error);
    return null;
  }
}

// Fetch setlist data by ID
async function fetchSetlistData(setlistId: string): Promise<any | null> {
  // Add return type hint
  console.log(`[fetch] Getting setlist from setlist.fm: ${setlistId}`);
  try {
    const apiKey = Deno.env.get("SETLISTFM_API_KEY");
    if (!apiKey) {
      console.error("[fetch] Setlist.fm API key not configured");
      return null;
    }

    const response = await fetch(
      `https://api.setlist.fm/rest/1.0/setlist/${setlistId}`,
      {
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error(`[fetch] Setlist.fm API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[fetch] Error fetching setlist:`, error);
    return null;
  }
}
