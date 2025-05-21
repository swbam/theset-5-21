// This file has been modified to support both local development and production environments
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Supabase configuration - with fallbacks for when environment variables aren't available
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 
                     "https://kzjnkqeosrycfpxjwhil.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6am5rcWVvc3J5Y2ZweGp3aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2ODM3ODMsImV4cCI6MjA1ODI1OTc4M30.KOriVTUxlnfiBpWmVrlO4xHM7nniizLgXQ49f2K22UM";

// Log the Supabase configuration for debugging
console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase Key available:', SUPABASE_PUBLISHABLE_KEY ? 'Yes' : 'No');

// Detect if we're in a local development environment
const isLocalDevelopment = 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Determine the redirect URL based on environment
const getRedirectUrl = () => {
  if (isLocalDevelopment) {
    // Use the current port (8080 or 8081) for local development
    return `${window.location.protocol}//${window.location.host}/auth/callback`;
  }
  
  // In production, use the deployed URL
  return 'https://theset-verceledit.vercel.app/auth/callback';
};

// Log the current environment and redirect URL
if (typeof window !== 'undefined') {
  console.log(`Environment: ${isLocalDevelopment ? 'Local Development' : 'Production'}`);
  console.log(`Auth redirect URL: ${getRedirectUrl()}`);
}

// Create the Supabase client with error handling
let supabaseClient;
try {
  // Import the supabase client like this:
  // import { supabase } from "@/integrations/supabase/client";
  supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce', // More secure authentication flow for mobile and SPA
      storage: {
        getItem: (key) => {
          try {
            if (typeof window === 'undefined') return null;
            const storedValue = localStorage.getItem(key);
            if (!storedValue) return null;
            return JSON.parse(storedValue);
          } catch (error) {
            console.error('Error retrieving auth from storage:', error);
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            if (typeof window === 'undefined') return;
            localStorage.setItem(key, JSON.stringify(value));
          } catch (error) {
            console.error('Error storing auth in storage:', error);
          }
        },
        removeItem: (key) => {
          try {
            if (typeof window === 'undefined') return;
            localStorage.removeItem(key);
          } catch (error) {
            console.error('Error removing auth from storage:', error);
          }
        }
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    global: {
      headers: {
        'x-application-name': isLocalDevelopment ? 'theset-local' : 'theset-client'
      },
      fetch: fetch // Explicitly provide the fetch implementation
    }
  });
  console.log('Supabase client created successfully');
} catch (error) {
  console.error('Error creating Supabase client:', error);
  // Create a fallback client with minimal configuration
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

export const supabase = supabaseClient;

/**
 * Sign in with a specific provider and use the appropriate redirect URL
 * @param provider The auth provider to use (e.g., 'spotify')
 */
export const signInWithProvider = async (provider: 'spotify' | 'google') => {
  try {
    console.log(`Signing in with ${provider}...`);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getRedirectUrl()
      }
    });
    
    if (error) {
      console.error(`Error signing in with ${provider}:`, error);
      throw error;
    }
    
    console.log(`${provider} sign-in initiated:`, data);
    return data;
  } catch (error) {
    console.error(`Error signing in with ${provider}:`, error);
    throw error;
  }
};

// Connection status tracking
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000; // 3 seconds

// Removed initial getSession call from module level.
// This check is already handled within the useEffect hook in useSupabaseAuth.ts
/**
 * Create a realtime channel subscription for a specific table
 * @param table The table to subscribe to
 * @param callback The callback to execute when data changes
 * @returns A function to unsubscribe
 */
export function subscribeToTable(
  table: string, 
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
) {
  try {
    console.log(`Subscribing to table: ${table}`);
    
    const channel = supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: table
      }, payload => {
        console.log(`Realtime change received for ${table}:`, payload);
        callback(payload);
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to ${table} changes`);
          isConnected = true;
          reconnectAttempts = 0; // Reset counter on successful connection
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.error(`Error connecting to ${table} channel:`, status);
          isConnected = false;
          handleReconnect(table, callback);
        } else if (status === 'TIMED_OUT') {
          console.error('Connection timed out');
          isConnected = false;
          handleReconnect(table, callback);
        } else {
          console.log(`Realtime channel status for ${table}:`, status);
        }
      });
    
    return () => {
      console.log(`Unsubscribing from table: ${table}`);
      channel.unsubscribe();
    };
  } catch (error) {
    console.error(`Failed to set up realtime subscription for ${table}:`, error);
    isConnected = false;
    handleReconnect(table, callback);
    return () => {}; // Return empty function as fallback
  }
}

/**
 * Create a realtime channel subscription for a specific record
 * @param table The table containing the record
 * @param column The column to filter on (usually 'id')
 * @param value The value to filter for
 * @param callback The callback to execute when data changes
 * @returns A function to unsubscribe
 */
export function subscribeToRecord(
  table: string, 
  column: string, 
  value: string, 
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
) {
  try {
    console.log(`Subscribing to record: ${table} where ${column}=${value}`);
    
    const channel = supabase
      .channel(`public:${table}:${column}:${value}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: table,
        filter: `${column}=eq.${value}`
      }, payload => {
        console.log(`Realtime change received for ${table} record:`, payload);
        callback(payload);
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to ${table} record changes`);
          isConnected = true;
          reconnectAttempts = 0;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.error(`Error connecting to ${table} record channel:`, status);
          isConnected = false;
          handleRecordReconnect(table, column, value, callback);
        } else if (status === 'TIMED_OUT') {
          console.error('Connection timed out');
          isConnected = false;
          handleRecordReconnect(table, column, value, callback);
        } else {
          console.log(`Realtime channel status for ${table} record:`, status);
        }
      });
    
    return () => {
      console.log(`Unsubscribing from record: ${table} where ${column}=${value}`);
      channel.unsubscribe();
    };
  } catch (error) {
    console.error(`Failed to set up realtime subscription for ${table} record:`, error);
    isConnected = false;
    handleRecordReconnect(table, column, value, callback);
    return () => {}; // Return empty function as fallback
  }
}

/**
 * Handle reconnection logic with exponential backoff for table subscriptions
 */
function handleReconnect(
  table: string, 
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
) {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    const delay = RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttempts);
    console.log(`Attempting to reconnect to ${table} in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    setTimeout(() => {
      subscribeToTable(table, callback);
    }, delay);
  } else {
    console.error(`Failed to reconnect to ${table} after ${MAX_RECONNECT_ATTEMPTS} attempts`);
  }
}

/**
 * Handle reconnection logic with exponential backoff for record subscriptions
 */
function handleRecordReconnect(
  table: string, 
  column: string, 
  value: string, 
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
) {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    const delay = RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttempts);
    console.log(`Attempting to reconnect to ${table} record in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    setTimeout(() => {
      subscribeToRecord(table, column, value, callback);
    }, delay);
  } else {
    console.error(`Failed to reconnect to ${table} record after ${MAX_RECONNECT_ATTEMPTS} attempts`);
  }
}

// Initialize realtime only after auth check
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);
  if (session) {
    console.log('User authenticated, realtime subscriptions will be enabled');
  } else {
    console.log('User not authenticated');
  }
});
