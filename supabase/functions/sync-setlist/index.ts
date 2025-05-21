/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Define expected request body structure
interface SyncSetlistPayload {
  setlistId: string; // The setlist.fm ID
  // Add other options if needed, e.g., force sync
  // force?: boolean;
}

// Define the structure for a song within the setlist
// Align with how you store songs in the 'songs' JSONB column of 'setlists' table
interface SetlistSong {
  id?: string; // Consider if you need a unique ID per song instance
  name: string;
  artist_mbid?: string | null; // MusicBrainz ID from setlist.fm artist
  encore?: number; // 0 or 1
  position?: number;
  // Add other fields like 'cover', 'tape', 'info' if needed
}

// Define the structure returned by the fetch function
interface FetchedSetlistData {
  setlistId: string;
  artistMbid?: string | null;
  venueName?: string | null; // Added for show matching
  venueCity?: string | null; // Added for show matching
  showId?: string | null; // UUID of the show in your DB
  artistId?: string | null; // UUID of the artist in your DB
  songs: SetlistSong[];
  sfmData: any; // Add the raw setlist.fm data to the return type
}

// Helper function to parse DD-MM-YYYY date to ISO string (UTC)
function parseSetlistDate(dateStr: string): string | null {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      try {
        // Create date in UTC to avoid timezone offset issues during conversion
        const date = new Date(Date.UTC(year, month, day));
        // Check if the constructed date is valid (e.g., handles invalid day/month numbers)
        if (
          date.getUTCFullYear() === year &&
          date.getUTCMonth() === month &&
          date.getUTCDate() === day
        ) {
          return date.toISOString();
        }
      } catch {
        /* ignore date parsing errors */
      }
    }
  }
  console.warn(`Could not parse setlist.fm date: ${dateStr}`);
  return null;
}

// Removed SetlistTableRow interface definition entirely

/**
 * Fetch setlist data from setlist.fm and find related show
 */

async function fetchAndTransformSetlistData(
  supabaseAdmin: any,
  setlistId: string,
): Promise<FetchedSetlistData | null> {
  console.log(`Fetching data for setlist ${setlistId}`);

  const apiKey = Deno.env.get("SETLISTFM_API_KEY");
  if (!apiKey) {
    console.error("[sync-setlist] SETLISTFM_API_KEY not set.");
    return null;
  }

  try {
    const apiUrl = `https://api.setlist.fm/rest/1.0/setlist/${setlistId}`;
    console.log(`Fetching from setlist.fm: ${apiUrl}`);
    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[sync-setlist] Setlist.fm API error for ${setlistId}: ${response.status} ${errorText}`,
      );
      return null;
    }

    const sfmData = await response.json(); // sfmData = setlist.fm data
    console.log(`[sync-setlist] Received setlist.fm data for ${setlistId}`);

    // --- Parse Songs ---
    const songs: SetlistSong[] = [];
    let songPositionCounter = 0;
    if (sfmData.sets?.set) {
      sfmData.sets.set.forEach((set: any) => {
        const isEncore = set.encore ? 1 : 0;
        if (set.song) {
          set.song.forEach((song: any) => {
            if (song.name) {
              songPositionCounter++;
              songs.push({
                // Generate a simple position-based ID or use song MBID if available
                // id: `${setlistId}-${songPositionCounter}`,
                name: song.name,
                artist_mbid: sfmData.artist?.mbid || null, // Artist MBID for context
                encore: isEncore,
                position: songPositionCounter,
                // Add other fields like cover status, tape status, info if needed
                // info: song.info,
                // tape: song.tape,
                // cover: song.cover ? { mbid: song.cover.mbid, name: song.cover.name, url: song.cover.url } : undefined
              });
            }
          });
        }
      });
    }

    // --- Find Matching Show in DB ---
    let showUUID: string | null = null;
    let artistUUID: string | null = null;
    const artistMbid = sfmData.artist?.mbid;
    const eventDateStr = sfmData.eventDate; // Format: DD-MM-YYYY
    const venueName = sfmData.venue?.name;
    const venueCity = sfmData.venue?.city?.name;

    if (artistMbid && eventDateStr) {
      const parsedDate = parseSetlistDate(eventDateStr); // Use helper for consistency

      if (parsedDate) {
        const eventDate = new Date(parsedDate);

        // Find artist UUID using MBID
        const { data: artistData, error: artistError } = await supabaseAdmin
          .from("artists")
          .select("id")
          .eq("setlist_fm_mbid", artistMbid)
          .maybeSingle();

        if (artistError) {
          console.warn(
            `[sync-setlist] Error fetching artist by MBID ${artistMbid}: ${artistError.message}`,
          );
        }

        if (artistData?.id) {
          artistUUID = artistData.id;
          console.log(
            `[sync-setlist] Found artist UUID ${artistUUID} for MBID ${artistMbid}`,
          );

          // --- Improved Show Search ---
          const startDate = new Date(eventDate);
          startDate.setUTCHours(0, 0, 0, 0);
          const endDate = new Date(eventDate);
          endDate.setUTCHours(23, 59, 59, 999);

          console.log(
            `[sync-setlist] Searching for show with artist_id ${artistUUID} between ${startDate.toISOString()} and ${endDate.toISOString()}`,
          );

          // Base query
          let showQuery = supabaseAdmin
            .from("shows")
            .select("id, venue_id") // Select venue_id too
            .eq("artist_id", artistUUID)
            .gte("date", startDate.toISOString())
            .lte("date", endDate.toISOString());

          // Try to find matching venue UUID first for better accuracy
          let venueUUID: string | null = null;
          if (venueName) {
            // Query venues table - might need fuzzy matching or ILIKE
            // Simple exact match for now, might need refinement
            const { data: venueData, error: venueError } = await supabaseAdmin
              .from("venues")
              .select("id")
              .eq("name", venueName)
              // Optionally add city/state match if available and reliable
              // .eq('city', venueCity)
              .limit(1) // Take the first match
              .maybeSingle();
            if (venueError)
              console.warn(
                `[sync-setlist] Error searching venue "${venueName}": ${venueError.message}`,
              );
            if (venueData) venueUUID = venueData.id;
          }

          // Add venue filter if found
          if (venueUUID) {
            console.log(
              `[sync-setlist] Found potential venue UUID ${venueUUID}, adding to show query.`,
            );
            showQuery = showQuery.eq("venue_id", venueUUID);
          } else {
            console.log(
              `[sync-setlist] Could not find exact venue match for "${venueName}", searching show by artist/date only.`,
            );
          }

          const { data: shows, error: showsError } = await showQuery.limit(1); // Limit to 1 show

          if (showsError) {
            console.warn(
              `[sync-setlist] Error searching for show for artist ${artistUUID} on ${eventDateStr}: ${showsError.message}`,
            );
          }

          if (shows && shows.length > 0) {
            showUUID = shows[0].id;
            console.log(`[sync-setlist] Found matching show ID: ${showUUID}`);
          } else {
            console.log(
              `[sync-setlist] No matching show found for artist ${artistUUID} on ${eventDateStr}` +
                (venueUUID ? ` at venue ${venueUUID}` : ""),
            );
          }
          // --- End Improved Show Search ---
        } else {
          console.log(
            `[sync-setlist] Artist with MBID ${artistMbid} not found in DB.`,
          );
        }
      } else {
        console.warn(
          `[sync-setlist] Could not parse event date: ${eventDateStr}`,
        );
      }
    } else {
      console.log(
        `[sync-setlist] Missing artist MBID (${artistMbid}) or event date (${eventDateStr}) in setlist.fm data.`,
      );
    }

    // Return processed data AND the raw sfmData
    return {
      setlistId: setlistId,
      artistMbid: artistMbid || null,
      venueName: venueName || null, // Added
      venueCity: venueCity || null, // Added
      showId: showUUID,
      artistId: artistUUID,
      songs: songs,
      sfmData: sfmData,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[sync-setlist] Error fetching or processing setlist ${setlistId}:`,
      errorMsg,
    );
    return null;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: SyncSetlistPayload = await req.json();
    const { setlistId } = payload;

    if (!setlistId) {
      return new Response(
        JSON.stringify({ error: "Missing setlistId in request body" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    console.log(`Sync request received for setlist: ${setlistId}`);

    // Initialize Supabase client with SERVICE_ROLE key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch and transform data
    const fetchedData = await fetchAndTransformSetlistData(
      supabaseAdmin,
      setlistId,
    );

    if (!fetchedData) {
      console.error(
        `[sync-setlist] Failed to fetch or transform data for setlist ${setlistId}`,
      );
      return new Response(
        JSON.stringify({
          error: "Failed to fetch setlist data from external API or process it",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    // Prepare data for setlists table upsert
    // Use the artist and show UUIDs returned from fetchAndTransformSetlistData
    const artistUUID = fetchedData.artistId; // Use the returned artist UUID
    const showUUID = fetchedData.showId; // Use the returned show UUID

    // Log if IDs are missing, as this might prevent upsert or song linking
    if (!artistUUID) {
      console.warn(
        `[sync-setlist] Artist UUID is missing for setlist ${setlistId} (MBID: ${fetchedData.artistMbid}). Setlist might not link correctly.`,
      );
    }
    if (!showUUID) {
      console.warn(
        `[sync-setlist] Show UUID is missing for setlist ${setlistId}. Setlist might not link correctly.`,
      );
    }

    // Extract additional data from the raw sfmData returned by the fetch function
    const sfmData = fetchedData.sfmData;

    const setlistRow = {
      // Use inferred type based on assignment
      setlist_fm_id: fetchedData.setlistId, // Use setlist.fm ID here
      artist_id: artistUUID,
      show_id: showUUID, // Use the resolved show UUID
      // Populate fields from schema using sfmData
      date: sfmData?.eventDate ? parseSetlistDate(sfmData.eventDate) : null,
      venue: sfmData?.venue?.name || null,
      venue_city: sfmData?.venue?.city?.name || null,
      tour_name: sfmData?.tour?.name || null,
      // songs array is handled separately via setlist_songs table (logic not implemented here)
      updated_at: new Date().toISOString(), // Keep updated_at
      // id (UUID PK) will be generated by DB
      // artist_mbid is not in the table
    };

    // Upsert data into setlists table
    console.log(
      `[sync-setlist] Upserting setlist ${setlistId} into database... Data:`,
      JSON.stringify(setlistRow),
    );
    const { data: upsertedSetlist, error: upsertError } = await supabaseAdmin
      .from("setlists")
      .upsert(setlistRow, { onConflict: "setlist_fm_id" }) // Use setlist_fm_id for conflict
      .select()
      .single();

    if (upsertError) {
      console.error(
        `[sync-setlist] Supabase setlist upsert error for ${setlistId}:`,
        upsertError,
      );
      return new Response(
        JSON.stringify({
          error: "Database error during setlist upsert",
          details: upsertError.message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }
    console.log(
      `[sync-setlist] Successfully upserted setlist ${setlistId} (UUID: ${upsertedSetlist.id})`,
    );

    // --- Insert/Update Songs and Link to Setlist ---
    if (upsertedSetlist.id && fetchedData.songs.length > 0 && artistUUID) {
      console.log(
        `[sync-setlist] Processing ${fetchedData.songs.length} songs for setlist ${upsertedSetlist.id}...`,
      );

      // --- Corrected Song Linking ---
      // 1. Delete existing songs for this setlist to handle updates/removals
      const { error: deleteError } = await supabaseAdmin
        .from("played_setlist_songs") // Use correct table name
        .delete()
        .eq("setlist_id", upsertedSetlist.id);

      if (deleteError) {
        console.error(
          `[sync-setlist] Error deleting existing songs for setlist ${upsertedSetlist.id}: ${deleteError.message}`,
        );
        // Decide if this is fatal or if we should try inserting anyway
      } else {
        console.log(
          `[sync-setlist] Deleted existing songs for setlist ${upsertedSetlist.id} before inserting new ones.`,
        );
      }

      // 2. Find song UUIDs and prepare links
      const songLinkPromises = fetchedData.songs.map(async (setlistSong) => {
        // Find song by name with improved fuzzy matching and artist_id
        // First try exact match with case-insensitive search
        const songQuery = supabaseAdmin
          .from("songs")
          .select("id, name")
          .eq("artist_id", artistUUID);

        // Try exact match first (case-insensitive)
        const { data: exactMatch, error: exactMatchError } = await songQuery
          .ilike("name", setlistSong.name)
          .maybeSingle();

        if (exactMatchError) {
          console.warn(
            `[sync-setlist] Error finding exact song match "${setlistSong.name}" for artist ${artistUUID}: ${exactMatchError.message}`,
          );
        }

        if (exactMatch) {
          return {
            setlist_id: upsertedSetlist.id,
            song_id: exactMatch.id,
            position: setlistSong.position,
            encore: setlistSong.encore,
            name: setlistSong.name, // Denormalized name
            artist_id: artistUUID,
          };
        }

        // If no exact match, try removing special characters and normalizing
        const normalizedSetlistName = setlistSong.name
          .toLowerCase()
          .replace(/[^\w\s]/g, "") // Remove special characters
          .replace(/\s+/g, " ") // Normalize whitespace
          .trim();

        if (normalizedSetlistName.length < 3) {
          console.warn(
            `[sync-setlist] Normalized song name "${normalizedSetlistName}" is too short for fuzzy matching. Skipping.`,
          );
          return null;
        }

        // Get all songs for this artist to do manual comparison
        const { data: artistSongs, error: findError } = await supabaseAdmin
          .from("songs")
          .select("id, name")
          .eq("artist_id", artistUUID);

        if (findError) {
          console.warn(
            `[sync-setlist] Error finding artist songs for "${setlistSong.name}": ${findError.message}`,
          );
          return null;
        }

        // Find best match by normalizing and comparing song names
        let bestMatch = null;
        let highestSimilarity = 0;

        if (artistSongs && artistSongs.length > 0) {
          for (const song of artistSongs) {
            const normalizedSongName = song.name
              .toLowerCase()
              .replace(/[^\w\s]/g, "")
              .replace(/\s+/g, " ")
              .trim();

            // Check if one is contained within the other
            if (
              normalizedSongName.includes(normalizedSetlistName) ||
              normalizedSetlistName.includes(normalizedSongName)
            ) {
              // Longer contained strings are better matches
              const similarity =
                Math.min(
                  normalizedSongName.length,
                  normalizedSetlistName.length,
                ) /
                Math.max(
                  normalizedSongName.length,
                  normalizedSetlistName.length,
                );

              if (similarity > highestSimilarity) {
                highestSimilarity = similarity;
                bestMatch = song;
              }
            }
          }
        }

        // Use a threshold to ensure quality matches (e.g., 0.6 or 60% similar)
        if (bestMatch && highestSimilarity > 0.6) {
          console.log(
            `[sync-setlist] Found fuzzy match for "${setlistSong.name}" → "${bestMatch.name}" (${highestSimilarity.toFixed(2)} similarity)`,
          );
          return {
            setlist_id: upsertedSetlist.id,
            song_id: bestMatch.id,
            position: setlistSong.position,
            encore: setlistSong.encore,
            name: setlistSong.name, // Keep original setlist name for reference
            artist_id: artistUUID,
          };
        }

        // No match found (already logged warning above)
        return null;
      });

      // Wait for all song lookups
      const songLinksToInsert = (await Promise.all(songLinkPromises)).filter(
        (link) => link !== null,
      );

      // 3. Bulk insert into 'played_setlist_songs'
      if (songLinksToInsert.length > 0) {
        console.log(
          `[sync-setlist] Inserting ${songLinksToInsert.length} song links for setlist ${upsertedSetlist.id}...`,
        );
        const { error: insertLinksError } = await supabaseAdmin
          .from("played_setlist_songs") // Use correct table name
          .insert(songLinksToInsert); // No conflict handling needed after delete

        if (insertLinksError) {
          console.error(
            `[sync-setlist] Error inserting song links for setlist ${upsertedSetlist.id}: ${insertLinksError.message}`,
          );
        } else {
          console.log(
            `[sync-setlist] Successfully inserted ${songLinksToInsert.length} song links.`,
          );
        }
      } else {
        console.log(
          `[sync-setlist] No valid song links to insert for setlist ${upsertedSetlist.id}.`,
        );
      }
      // --- End Corrected Song Linking ---
    } else if (fetchedData.songs.length === 0) {
      console.log(
        `[sync-setlist] No songs found in fetched data for setlist ${setlistId}.`,
      );
    } else {
      console.warn(
        `[sync-setlist] Cannot process songs for setlist ${setlistId} due to missing setlist UUID or artist UUID.`,
      );
    }
    // --- End Song Processing ---

    return new Response(
      JSON.stringify({ success: true, data: upsertedSetlist }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Unhandled error:", errorMessage, error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
