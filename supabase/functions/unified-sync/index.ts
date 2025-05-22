/**
 * @file supabase/functions/unified-sync/index.ts
 * Note: This file is intended to run on Deno. When compiling locally (e.g. in Node),
 * ensure that a global Deno variable is available by declaring it.
 */
declare const Deno: any;

import { createClient } from "@supabase/supabase-js";

export async function handler(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { syncRunId } = body;
    if (!syncRunId) {
      return new Response(
        JSON.stringify({ error: "syncRunId is required" }),
        { status: 400 }
      );
    }

    // Use Deno.env if available, otherwise fallback to process.env for local testing.
    const supabaseUrl = (typeof Deno !== "undefined" && Deno.env.get("SUPABASE_URL")) || process.env.SUPABASE_URL;
    const supabaseKey = (typeof Deno !== "undefined" && Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if this syncRunId has already been processed.
    const { data: existingSyncRun, error: fetchError } = await supabase
      .from("sync_runs")
      .select("*")
      .eq("sync_run_id", syncRunId)
      .single();

    if (existingSyncRun) {
      return new Response(
        JSON.stringify({ message: "Sync run already processed" }),
        { status: 200 }
      );
    }

    // Optional: Acquire advisory lock here to prevent concurrent syncs.
    // Example (uncomment and implement if you have defined this PostgreSQL function):
    // const { error: lockError } = await supabase.rpc('acquire_lock', { key: 123 });
    // if (lockError) {
    //   return new Response(JSON.stringify({ error: "Could not acquire lock" }), { status: 500 });
    // }

    // Insert record into sync_runs table to mark the sync run as started.
    const { error: insertError } = await supabase
      .from("sync_runs")
      .insert([
        {
          sync_run_id: syncRunId,
          status: "in_progress",
          created_at: new Date().toISOString()
        }
      ]);

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500 }
      );
    }

    // Execute the core sync logic.
    // Simulate core sync operation (replace with actual sync logic).
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update the sync_runs table to mark the sync as completed.
    const { error: updateError } = await supabase
      .from("sync_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString()
      })
      .eq("sync_run_id", syncRunId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ message: "Sync completed successfully" }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Unexpected error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500 }
    );
  }
}
