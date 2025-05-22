// @ts-nocheck
/// <reference path="../supabase-js.d.ts" />

declare const Deno: any;
// @ts-ignore
// @deno-types="https://deno.land/std@0.168.0/http/server.d.ts"
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
// @deno-types="https://esm.sh/@supabase/supabase-js@2/types"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
// Exported function to calculate SHA-256 hash of given data
export async function calculateSourceHash(data: any): Promise<string> {
  const encoder = new TextEncoder();
  const dataStr = JSON.stringify(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(dataStr));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}
// Note: APIClientManager logic is replaced with direct fetch calls below
// import { APIClientManager } from '../../src/lib/sync/api-client.ts';

// Define expected request body structure
interface SyncArtistPayload {
  tm_id?: string;
  spotify_id?: string;
  setlist_fm_mbid?: string;
  setlist_fm_id?: string; // Added
  name?: string; // Allow syncing just by name as fallback
  forceRefresh?: boolean; // Option to force re-fetching external data
}

// Define the structure of your Artist data (align with your DB schema and types)
interface Artist {
  id: string; // Supabase UUID
  name: string;
  tm_id?: string | null; // Renamed from external_id
  spotify_id?: string | null;
  setlist_fm_mbid?: string | null;
  setlist_fm_id?: string | null; // Added
  image_url?: string | null;
  url?: string | null; // Likely TM URL
  spotify_url?: string | null;
  genres?: string[];
  popularity?: number | null;
  created_at?: string;
  updated_at?: string;
  source_hash?: string;
}

// Helper to get Spotify Access Token (Client Credentials Flow)
async function getSpotifyToken(): Promise<string | null> {
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    console.error(
      "Spotify client ID or secret not configured in environment variables.",
    );
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
    console.error(
      "Failed to get Spotify token:",
      response.status,
      await response.text(),
    );
    return null;
  }

  const data = await response.json();
  return data.access_token;
  // Removed extra closing brace that was here
}

// --- Setlist.fm API Helper ---
// Define expected response structure (simplified)
interface SetlistFmArtist {
  mbid: string;
  name: string;
  id?: string; // Setlist.fm's own ID if available
  // other fields...
}
interface SetlistFmSearchResponse {
  artist?: SetlistFmArtist[];
  // other fields...
}

// Define structure for setlist.fm setlist response
interface SetlistFmSetlist {
  id: string; // setlist.fm ID
  // Add other fields if needed later
}
interface SetlistFmSetlistsResponse {
  setlist?: SetlistFmSetlist[];
  // other pagination fields if needed
}

// Returns MBID and Setlist.fm ID if found
async function searchSetlistFmArtist(
  artistName: string,
): Promise<{ mbid: string | null; fmId: string | null }> {
  const apiKey = Deno.env.get("SETLISTFM_API_KEY");
  if (!apiKey) {
    console.warn("SETLISTFM_API_KEY not set, skipping Setlist.fm search.");
    return { mbid: null, fmId: null };
  }

  try {
    // Use v1.0 endpoint which seems more stable for search
    const searchUrl = `https://api.setlist.fm/rest/1.0/search/artists?artistName=${encodeURIComponent(artistName)}&p=1&sort=relevance`;
    console.log(`[sync-artist] Searching Setlist.fm: ${searchUrl}`);
    const response = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      console.warn(
        `[sync-artist] Setlist.fm API error searching for ${artistName}: ${response.status} ${await response.text()}`,
      );
      return { mbid: null, fmId: null };
    }

    const data: SetlistFmSearchResponse = await response.json();
    // Find the best match (often the first result if sorted by relevance)
    if (data.artist && data.artist.length > 0) {
      const foundArtist = data.artist[0];
      const mbid = foundArtist.mbid || null;
      // Assuming Setlist.fm might return its own ID in the future or via a different field
      const fmId = foundArtist.id || null; // Adjust if the field name is different
      console.log(
        `[sync-artist] Found Setlist.fm match for ${artistName}: MBID=${mbid}, fmId=${fmId}`,
      );
      return { mbid, fmId };
    } else {
      console.log(
        `[sync-artist] No Setlist.fm artist found for query: ${artistName}`,
      );
      return { mbid: null, fmId: null };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[sync-artist] Error fetching/processing Setlist.fm search for ${artistName}:`,
      errorMsg,
    );
    return { mbid: null, fmId: null };
  }
}
// --- End Setlist.fm Helper ---

// --- Helper to fetch recent setlists using MBID ---
async function fetchRecentSetlistsByMbid(
  mbid: string,
  page = 1,
  limit = 20,
): Promise<string[]> {
  const apiKey = Deno.env.get("SETLISTFM_API_KEY");
  if (!apiKey) {
    console.warn(
      "[sync-artist] SETLISTFM_API_KEY not set, skipping recent setlist fetch.",
    );
    return [];
  }
  if (!mbid) {
    console.warn(
      "[sync-artist] MBID is missing, cannot fetch recent setlists by MBID.",
    );
    return [];
  }

  try {
    const apiUrl = `https://api.setlist.fm/rest/1.0/artist/${mbid}/setlists?p=${page}`;
    console.log(
      `[sync-artist] Fetching recent setlists by MBID from: ${apiUrl}`,
    );
    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      console.warn(
        `[sync-artist] Setlist.fm API error fetching setlists for MBID ${mbid}: ${response.status} ${await response.text()}`,
      );
      return [];
    }

    const data: SetlistFmSetlistsResponse = await response.json();
    const setlistIds = data.setlist?.map((s) => s.id).slice(0, limit) || [];
    console.log(
      `[sync-artist] Found ${setlistIds.length} recent setlist IDs for MBID ${mbid}.`,
    );
    return setlistIds;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[sync-artist] Error fetching recent setlists for MBID ${mbid}:`,
      errorMsg,
    );
    return [];
  }
}
// --- End Recent Setlists Helper ---

/**
 * Fetches and combines artist data from various sources.
 * Prioritizes data based on source reliability (e.g., Spotify ID > Name Search).
 */
async function fetchAndCombineArtistData(
  supabaseAdmin: any,
  existingArtist: Artist | null,
  payload: SyncArtistPayload,
): Promise<Partial<Artist>> {
  // Use const as combinedData properties are modified, but the object itself isn't reassigned
  const combinedData: Partial<Artist> = { ...existingArtist }; // Start with existing data
  const forceRefresh = payload.forceRefresh ?? false;

  // --- Ticketmaster ---
  const tmIdToFetch = payload.tm_id || existingArtist?.tm_id;
  if (tmIdToFetch && (!existingArtist?.tm_id || forceRefresh)) {
    const tmApiKey = Deno.env.get("TICKETMASTER_API_KEY");
    if (tmApiKey) {
      try {
        const tmUrl = `https://app.ticketmaster.com/discovery/v2/attractions/${tmIdToFetch}.json?apikey=${tmApiKey}`;
        console.log(`[sync-artist] Fetching from Ticketmaster: ${tmUrl}`);
        const tmResponse = await fetch(tmUrl);
        if (tmResponse.ok) {
          const tmData = await tmResponse.json();
          console.log(
            `[sync-artist] Received Ticketmaster data for ${tmIdToFetch}`,
          );
          combinedData.tm_id = tmIdToFetch; // Ensure it's set
          combinedData.name = tmData.name || combinedData.name;
          combinedData.image_url =
            getBestImage(tmData.images) || combinedData.image_url;
          combinedData.url = tmData.url || combinedData.url; // TM specific URL
        } else {
          console.warn(
            `[sync-artist] Ticketmaster API error for ${tmIdToFetch}: ${tmResponse.status} ${await tmResponse.text()}`,
          );
        }
      } catch (tmError) {
        const errorMsg =
          tmError instanceof Error ? tmError.message : String(tmError);
        console.error(
          `[sync-artist] Error fetching TM data for ${tmIdToFetch}:`,
          errorMsg,
        );
      }
    } else {
      console.warn("[sync-artist] TICKETMASTER_API_KEY not set.");
    }
  }

  // --- Spotify ---
  let spotifyIdToFetch = payload.spotify_id || existingArtist?.spotify_id;
  const artistNameForSearch = combinedData.name || payload.name; // Use name from TM/existing first

  if (
    !spotifyIdToFetch &&
    artistNameForSearch &&
    (!existingArtist?.spotify_id || forceRefresh)
  ) {
    // Search Spotify by name if ID is missing
    console.log(
      `[sync-artist] No Spotify ID, searching by name: ${artistNameForSearch}`,
    );
    const spotifyToken = await getSpotifyToken();
    if (spotifyToken) {
      try {
        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistNameForSearch)}&type=artist&limit=1`;
        console.log(`[sync-artist] Searching Spotify: ${searchUrl}`);
        const spotifySearchResponse = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${spotifyToken}` },
        });
        if (spotifySearchResponse.ok) {
          const spotifySearchData = await spotifySearchResponse.json();
          if (spotifySearchData?.artists?.items?.length > 0) {
            spotifyIdToFetch = spotifySearchData.artists.items[0].id;
            console.log(
              `[sync-artist] Found Spotify ID via search: ${spotifyIdToFetch}`,
            );
          } else {
            console.log(
              `[sync-artist] No Spotify artist found via search for: ${artistNameForSearch}`,
            );
          }
        } else {
          console.warn(
            `[sync-artist] Spotify search API error for ${artistNameForSearch}: ${spotifySearchResponse.status} ${await spotifySearchResponse.text()}`,
          );
        }
      } catch (searchError) {
        const errorMsg =
          searchError instanceof Error
            ? searchError.message
            : String(searchError);
        console.error(
          `[sync-artist] Error searching Spotify for ${artistNameForSearch}:`,
          errorMsg,
        );
      }
    } else {
      console.warn(
        `[sync-artist] Skipping Spotify search for ${artistNameForSearch} due to missing token.`,
      );
    }
  }

  // Fetch Spotify data if we have an ID (either from payload, existing, or search)
  if (
    spotifyIdToFetch &&
    (!existingArtist?.spotify_id ||
      forceRefresh ||
      payload.spotify_id !== existingArtist?.spotify_id)
  ) {
    const spotifyToken = await getSpotifyToken();
    if (spotifyToken) {
      try {
        const artistUrl = `https://api.spotify.com/v1/artists/${spotifyIdToFetch}`;
        console.log(`[sync-artist] Fetching from Spotify: ${artistUrl}`);
        const spotifyResponse = await fetch(artistUrl, {
          headers: { Authorization: `Bearer ${spotifyToken}` },
        });
        if (spotifyResponse.ok) {
          const spotifyArtist = await spotifyResponse.json();
          console.log(
            `[sync-artist] Received Spotify data for ${spotifyIdToFetch}`,
          );
          combinedData.spotify_id = spotifyIdToFetch; // Ensure it's set
          combinedData.name = spotifyArtist.name || combinedData.name; // Use Spotify name if TM missing
          combinedData.spotify_url =
            spotifyArtist.external_urls?.spotify || combinedData.spotify_url;
          combinedData.genres =
            spotifyArtist.genres || combinedData.genres || [];
          combinedData.popularity =
            spotifyArtist.popularity ?? combinedData.popularity;
          // Use Spotify image only if TM/existing didn't provide one
          if (!combinedData.image_url && spotifyArtist.images?.length > 0) {
            combinedData.image_url = spotifyArtist.images[0].url;
          }
        } else {
          console.warn(
            `[sync-artist] Spotify API error for ${spotifyIdToFetch}: ${spotifyResponse.status} ${await spotifyResponse.text()}`,
          );
        }
      } catch (spotifyError) {
        const errorMsg =
          spotifyError instanceof Error
            ? spotifyError.message
            : String(spotifyError);
        console.error(
          `[sync-artist] Error fetching Spotify data for ${spotifyIdToFetch}:`,
          errorMsg,
        );
      }
    } else {
      console.warn(
        `[sync-artist] Skipping Spotify fetch for ${spotifyIdToFetch} due to missing token.`,
      );
    }
  }

  // --- Setlist.fm ---
  let mbidToFetch = payload.setlist_fm_mbid || existingArtist?.setlist_fm_mbid;
  let fmIdToFetch = payload.setlist_fm_id || existingArtist?.setlist_fm_id;
  const nameForSetlistSearch = combinedData.name || payload.name;

  // Search if IDs are missing but name is present
  if (
    (!mbidToFetch || !fmIdToFetch) &&
    nameForSetlistSearch &&
    (!existingArtist?.setlist_fm_mbid ||
      !existingArtist?.setlist_fm_id ||
      forceRefresh)
  ) {
    console.log(
      `[sync-artist] Missing Setlist.fm IDs, searching by name: ${nameForSetlistSearch}`,
    );
    const { mbid, fmId } = await searchSetlistFmArtist(nameForSetlistSearch);
    if (mbid) mbidToFetch = mbid;
    if (fmId) fmIdToFetch = fmId; // Assuming search returns fmId too
  }

  // Update combined data if IDs were found/provided
  if (mbidToFetch) combinedData.setlist_fm_mbid = mbidToFetch;
  if (fmIdToFetch) combinedData.setlist_fm_id = fmIdToFetch;

  // Ensure name is present
  if (!combinedData.name) {
    console.error(
      `[sync-artist] Failed to resolve artist name from any source.`,
    );
    // Throw or return an indicator of failure? Returning partial for now.
  }

  // Add updated_at timestamp
  combinedData.updated_at = new Date().toISOString();

  return combinedData;
}

// --- Helper function to get best image ---
function getBestImage(
  images?: Array<{ url: string; width: number; height: number }>
): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort(
    (a: { width: number }, b: { width: number }) => (b.width || 0) - (a.width || 0)
  );
  return sorted[0].url;
}

serve(async (req: Request) => {
  console.log("--- sync-artist function handler started ---");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: SyncArtistPayload = await req.json();
    console.log("[sync-artist] Received payload:", payload);

    // Validate payload: Need at least one identifier or a name
    if (
      !payload.tm_id &&
      !payload.spotify_id &&
      !payload.setlist_fm_mbid &&
      !payload.setlist_fm_id &&
      !payload.name
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Missing artist identifier (tm_id, spotify_id, setlist_fm_mbid, setlist_fm_id) or name in request body",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Find Existing Artist by any provided external ID
    let existingArtist: Artist | null = null;
    const query = supabaseAdmin.from("artists").select("*");
    const filters: string[] = [];
    if (payload.tm_id) filters.push(`tm_id.eq.${payload.tm_id}`);
    if (payload.spotify_id) filters.push(`spotify_id.eq.${payload.spotify_id}`);
    if (payload.setlist_fm_mbid)
      filters.push(`setlist_fm_mbid.eq.${payload.setlist_fm_mbid}`);
    if (payload.setlist_fm_id)
      filters.push(`setlist_fm_id.eq.${payload.setlist_fm_id}`);

    if (filters.length > 0) {
      query.or(filters.join(","));
      try {
        const { data: foundArtists, error: findError } = await query;
        if (findError) throw findError;

        if (foundArtists && foundArtists.length > 1) {
          // Handle potential duplicates - maybe log and pick the first?
          console.warn(
            `[sync-artist] Found multiple artists matching payload IDs:`,
            foundArtists.map((a: any) => a.id),
          );
          existingArtist = foundArtists[0] as Artist;
        } else if (foundArtists && foundArtists.length === 1) {
          existingArtist = foundArtists[0] as Artist;
          console.log(
            `[sync-artist] Found existing artist by ID: ${existingArtist.id}`,
          );
        } else {
          console.log(
            `[sync-artist] No existing artist found by provided IDs.`,
          );
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error(`[sync-artist] Error finding existing artist:`, errorMsg);
        // Decide if we should stop or try to continue/insert
      }
    } else {
      console.log(
        `[sync-artist] No external IDs provided in payload to search for existing artist.`,
      );
      // Could potentially search by name here if needed, but upsert handles it later
    }

    // 2. Fetch and Combine Data
    const combinedData = await fetchAndCombineArtistData(
      supabaseAdmin,
      existingArtist,
      payload,
    );

    if (!combinedData.name) {
      console.error(
        `[sync-artist] Could not determine artist name. Aborting sync.`,
      );
      return new Response(
        JSON.stringify({ error: "Failed to determine artist name" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    // 3. Upsert (Insert or Update)
    let finalArtistData: Artist | null = null;
    let operationType: "INSERT" | "UPDATE" | "NONE" = "NONE";

    // Prepare data for upsert, removing the UUID if it's an insert
    const dataToUpsert = { ...combinedData };
    (dataToUpsert as any).source_hash = await calculateSourceHash(dataToUpsert);
    if (!existingArtist) {
      delete dataToUpsert.id; // Let Supabase generate UUID on insert
      dataToUpsert.created_at = new Date().toISOString(); // Set created_at for new record
    } else {
      dataToUpsert.id = existingArtist.id; // Ensure ID is present for update
    }

    try {
      if (existingArtist) {
        // UPDATE existing record
        operationType = "UPDATE";
        console.log(
          `[sync-artist] Updating existing artist: ${existingArtist.id}`,
        );
        const { data, error } = await supabaseAdmin
          .from("artists")
          .update(dataToUpsert)
          .eq("id", existingArtist.id)
          .select()
          .single();
        if (error) throw error;
        finalArtistData = data as Artist;
      } else {
        // INSERT new record
        operationType = "INSERT";
        console.log(
          `[sync-artist] Inserting new artist with name: ${dataToUpsert.name}`,
        );
        const { data, error } = await supabaseAdmin
          .from("artists")
          .insert(dataToUpsert)
          .select()
          .single();
        if (error) throw error;
        finalArtistData = data as Artist;
      }

      if (!finalArtistData?.id) {
        throw new Error(
          "Upsert operation did not return valid artist data with ID.",
        );
      }

      console.log(
        `[sync-artist] Successfully performed ${operationType} for artist ${finalArtistData.name} (UUID: ${finalArtistData.id})`,
      );
    } catch (upsertError) {
      const errorMsg =
        upsertError instanceof Error
          ? upsertError.message
          : String(upsertError);
      console.error(`[sync-artist] Supabase ${operationType} error:`, errorMsg);
      return new Response(
        JSON.stringify({
          error: `Database error during ${operationType}`,
          details: errorMsg,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    // 4. Trigger Downstream Functions Asynchronously
    const artistUUID = finalArtistData.id;
    const artistMbid = finalArtistData.setlist_fm_mbid;

    console.log(
      `[sync-artist] Triggering import-spotify-catalog for artist UUID ${artistUUID}`,
    );
    supabaseAdmin.functions
      .invoke("import-spotify-catalog", {
        body: { artistId: artistUUID }, // Pass Supabase UUID
      })
      .then(({ error: invokeError }: { error: any }) => {
        // Add explicit type for destructured error
        if (invokeError)
          console.error(
            `[sync-artist] Error invoking import-spotify-catalog for ${artistUUID}:`,
            invokeError.message,
          );
        else
          console.log(
            `[sync-artist] Successfully invoked import-spotify-catalog for ${artistUUID}.`,
          );
      })
      .catch((err: unknown) =>
        console.error(
          `[sync-artist] Exception invoking import-spotify-catalog for ${artistUUID}:`,
          err instanceof Error ? err.message : String(err),
        ),
      ); // Type catch param as unknown

    // Trigger setlist sync if MBID exists
    if (artistMbid) {
      console.log(
        `[sync-artist] Artist has MBID ${artistMbid}, fetching recent setlists...`,
      );
      fetchRecentSetlistsByMbid(artistMbid, 1, 10) // Fetch first page, limit to 10 recent setlists
        .then((setlistIds) => {
          if (setlistIds.length > 0) {
            console.log(
              `[sync-artist] Triggering sync-setlist for ${setlistIds.length} setlists...`,
            );
            setlistIds.forEach((setlistId) => {
              supabaseAdmin.functions
                .invoke("sync-setlist", {
                  body: { setlistId: setlistId }, // Pass Setlist.fm ID
                })
                .then(({ error: invokeSetlistError }: { error: any }) => {
                  // Add explicit type for destructured error
                  if (invokeSetlistError)
                    console.error(
                      `[sync-artist] Error invoking sync-setlist for ${setlistId}:`,
                      invokeSetlistError.message,
                    );
                })
                .catch((setlistErr: unknown) =>
                  console.error(
                    `[sync-artist] Exception invoking sync-setlist for ${setlistId}:`,
                    setlistErr instanceof Error
                      ? setlistErr.message
                      : String(setlistErr),
                  ),
                ); // Type catch param as unknown
            });
          } else {
            console.log(
              `[sync-artist] No recent setlists found to trigger sync for MBID ${artistMbid}.`,
            );
          }
        })
        .catch((fetchErr: unknown) =>
          console.error(
            `[sync-artist] Error fetching recent setlists for MBID ${artistMbid}:`,
            fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
          ),
        ); // Type catch param as unknown
    } else {
      console.log(
        `[sync-artist] Artist ${artistUUID} has no MBID, skipping setlist sync trigger.`,
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: finalArtistData }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[sync-artist] Unhandled error:", errorMessage, error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
