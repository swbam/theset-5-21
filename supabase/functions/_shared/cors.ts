/**
 * CORS headers for Supabase Edge Functions
 * These headers allow cross-origin requests from any origin
 * In production, you may want to restrict this to specific origins
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, Content-Type',
};