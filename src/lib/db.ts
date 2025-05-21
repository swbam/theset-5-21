import { createClient } from '@supabase/supabase-js';

// Type for global usage of Supabase client
const globalForSupabase = globalThis as unknown as {
  supabase: ReturnType<typeof createClient> | undefined;
};

// Get environment variables - using VITE_ prefix for Vite compatibility
// Get environment variables
// VITE_ prefix exposes them client-side (needed for URL and Anon Key)
// Determine if running in server (Node.js) or client (Vite/Browser) context
const isServer = typeof process !== 'undefined' && process.env;
const isClient = typeof import.meta !== 'undefined' && import.meta.env;

// Get Supabase URL and Anon Key based on environment
const SUPABASE_URL = isServer
  ? process.env.NEXT_PUBLIC_SUPABASE_URL // Use NEXT_PUBLIC_ for server-side access if needed by Next.js build
  : isClient
  ? import.meta.env.VITE_SUPABASE_URL
  : undefined;

const SUPABASE_ANON_KEY = isServer
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Use NEXT_PUBLIC_ for server-side access if needed by Next.js build
  : isClient
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : undefined;

// Validate essential client-side environment variables
if (!SUPABASE_URL) {
  // Throw error during module load if essential client vars are missing
  throw new Error("Missing environment variable: VITE_SUPABASE_URL (client) or NEXT_PUBLIC_SUPABASE_URL (server)");
}
if (!SUPABASE_ANON_KEY) {
  // Throw error during module load if essential client vars are missing
  throw new Error("Missing environment variable: VITE_SUPABASE_ANON_KEY (client) or NEXT_PUBLIC_SUPABASE_ANON_KEY (server)");
}

// Service Role Key will be accessed inside adminClient function from process.env

// Log the Supabase configuration for debugging
console.log('[Server] Supabase URL:', SUPABASE_URL);
console.log('[Server] Supabase Anon Key available:', SUPABASE_ANON_KEY ? 'Yes' : 'No');
// Removed log for Service Role Key as it's only accessed within adminClient now

// Create client with connection pooling and optimized settings
let supabaseClient;
try {
  supabaseClient = globalForSupabase.supabase ?? createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'x-connection-pool': 'vite-pool',
        },
      }
    }
  );
  console.log('[Server] Supabase client created successfully');
} catch (error) {
  console.error('[Server] Error creating Supabase client:', error);
  // Create a fallback client with minimal configuration
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = supabaseClient;

// Cache the connection in development
// Use process.env.NODE_ENV to check for development mode on the server
if (process.env.NODE_ENV === 'development') {
  globalForSupabase.supabase = supabase;
}

// Service role client for admin operations (use with caution)
// Service role client for admin operations (intended for server-side use ONLY)
export const adminClient = () => {
  // Access the Service Role Key *inside* the function from process.env
  // This avoids referencing 'process' at the module level in the client bundle.
  // Ensure SUPABASE_SERVICE_ROLE_KEY is set in your server environment (NOT prefixed with VITE_)
  const serviceKey = typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined;

  if (!serviceKey) {
    console.error('[adminClient] Missing environment variable: SUPABASE_SERVICE_ROLE_KEY. Ensure it is set in the server environment.');
    throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY required for admin client.");
  }

  try {
    // Use the serviceKey fetched within this function scope
    return createClient(
      SUPABASE_URL, // Already validated at module level
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    );
  } catch (error) {
    console.error('[Server] Error creating admin client:', error);
    // Re-throw or handle appropriately - avoid returning a potentially broken client
    throw new Error(`Failed to create admin client: ${error instanceof Error ? error.message : String(error)}`);
  }
};