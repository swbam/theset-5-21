import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Adjust the import path if your generated types are elsewhere or named differently
// import { Database } from './types.ts'; // Assuming Database type includes your schema

// Fetch Supabase URL and Service Role Key from environment variables
// These must be set in your Supabase project's Edge Function settings
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl) {
  console.error('--- FATAL: Missing environment variable SUPABASE_URL in Edge Function settings. ---');
  throw new Error('Missing environment variable: SUPABASE_URL');
}
if (!serviceKey) {
  console.error('--- FATAL: Missing environment variable SUPABASE_SERVICE_ROLE_KEY in Edge Function settings. ---');
  throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
}

// Create a single Supabase client instance configured for admin operations
// We use the Service Role Key, granting bypass RLS capabilities.
// Specify the Database type generic if you have generated types.
export const supabaseAdmin: SupabaseClient = createClient(
// export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>( // Use this if you have Database type
  supabaseUrl,
  serviceKey,
  {
    auth: {
      // For admin client, persisting session is not necessary and auto-refreshing tokens is handled by the service key.
      autoRefreshToken: false,
      persistSession: false,
    }
  }
);

console.log('Supabase admin client initialized for Edge Function.');