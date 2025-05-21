// server.cjs - CommonJS wrapper for Next.js API server
// This allows us to use ESM in our project while still supporting Next.js

// Load environment variables from .env and .env.local
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Log environment for debugging
console.log('Starting server with:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- SUPABASE_URL configured:', !!process.env.SUPABASE_URL);
console.log('- TICKETMASTER_API_KEY configured:', !!process.env.TICKETMASTER_API_KEY);

// Create a Next.js app instance for the API server only
// We set the directory to "src" since that contains our Next.js app structure
const apiApp = next({ dev, dir: './', hostname, port });
const apiHandle = apiApp.getRequestHandler();

apiApp.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // Add CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
      
      // Handle OPTIONS
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      
      // Parse the URL
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      // Handle API routes only, redirect other requests to the Vite frontend
      if (pathname.startsWith('/api')) {
        await apiHandle(req, res, parsedUrl);
      } else {
        // For non-API routes, redirect to Vite dev server
        res.writeHead(302, { Location: `http://localhost:8080${pathname}` });
        res.end();
      }
    } catch (err) {
      console.error('Error occurred handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> API Server ready on http://${hostname}:${port}`);
  });
}); 