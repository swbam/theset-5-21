// server.js - Next.js API server
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Create a Next.js app instance for the API server only
// We set the directory to "src/app" since that contains our Next.js app structure
const apiApp = next({ dev, dir: './src', hostname, port });
const apiHandle = apiApp.getRequestHandler();

apiApp.prepare().then(() => {
  createServer(async (req, res) => {
    try {
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