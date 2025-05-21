/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure Next.js to only handle API routes
  // The actual pages are handled by the Vite app
  reactStrictMode: true,
  distDir: 'dist-api',

  // Use app directory for API routes
  experimental: {
    appDir: true,
  },

  // Only build the API routes
  output: 'standalone',

  // Configure environment variables
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL || "https://kzjnkqeosrycfpxjwhil.supabase.co",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6am5rcWVvc3J5Y2ZweGp3aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2ODM3ODMsImV4cCI6MjA1ODI1OTc4M30.KOriVTUxlnfiBpWmVrlO4xHM7nniizLgXQ49f2K22UM",
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  },

  // Configure headers for API routes
  async headers() {
    return [
      {
        // All API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ]
  },
};

module.exports = nextConfig;