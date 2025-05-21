# TheSet - Setup Instructions

This document provides step-by-step instructions for setting up, configuring, and running TheSet concert setlist voting web application.

## Overview

TheSet is a web application that allows fans to vote on what songs they want to hear at upcoming concerts. It integrates with:

- **Ticketmaster API** for artist, venue, and show data
- **Spotify API** for artist images and song catalogs
- **Setlist.fm API** for historical setlist data

The application uses Supabase for database, authentication, and edge functions.

## Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase project (free or paid)
- API keys for Ticketmaster, Spotify, and Setlist.fm (optional)

## Setup Process

### 1. Clone and Configure the Repository

```bash
# Clone the repository
git clone <your-repository-url>
cd theset-lastedit

# Install dependencies
npm install
# or if using pnpm
pnpm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

# API Keys
TICKETMASTER_API_KEY=<your-ticketmaster-api-key>
SPOTIFY_CLIENT_ID=<your-spotify-client-id>
SPOTIFY_CLIENT_SECRET=<your-spotify-client-secret>
SETLISTFM_API_KEY=<your-setlist-fm-api-key>
```

Also create a `.env` file in the `supabase` directory with the same variables for the edge functions.

### 3. Database Migration

Run the migration script to set up your database schema:

```bash
node migrate.js
```

This script will:
- Create all required tables with correct column names
- Set up foreign key relationships
- Create necessary indexes
- Add required database functions
- Fix any existing data inconsistencies

### 4. Deploy Edge Functions

Deploy the edge functions to Supabase:

```bash
# Login to Supabase if not already logged in
npx supabase login

# Link to your Supabase project
npx supabase link --project-ref <your-project-ref>

# Set secrets for the edge functions
npx supabase secrets set --env-file ./.env

# Deploy the unified-sync function
npx supabase functions deploy unified-sync --no-verify-jwt

# Deploy other functions if needed
npx supabase functions deploy import-spotify-catalog --no-verify-jwt
```

### 5. Initialize Data Sync

Initialize the data synchronization by running the unified-sync function:

```bash
# Trigger trending shows sync
curl -X POST \
  "https://<your-project-ref>.supabase.co/functions/v1/unified-sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-anon-key>" \
  -d '{"entity_type":"trending_shows", "entity_id":"initial", "process_queue":false}'

# Process the sync queue
curl -X POST \
  "https://<your-project-ref>.supabase.co/functions/v1/unified-sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-anon-key>" \
  -d '{"process_queue":true, "batch_size":5}'
```

### 6. Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

## API Configuration Details

### Ticketmaster API

1. Sign up for a Ticketmaster Developer account: https://developer.ticketmaster.com/
2. Create an application to get your API key
3. Set the key in your environment variables

### Spotify API

1. Go to the Spotify Developer Dashboard: https://developer.spotify.com/dashboard/
2. Create a new application
3. Get your Client ID and Client Secret
4. Set them in your environment variables

### Setlist.fm API (Optional)

1. Register for a Setlist.fm account: https://www.setlist.fm/
2. Apply for API access: https://www.setlist.fm/settings/api
3. Once approved, set the key in your environment variables

## Data Flow

1. **Artists** are synced from Ticketmaster and enriched with Spotify data
2. **Shows** are synced from Ticketmaster for each artist
3. **Venues** are synced from Ticketmaster for each show
4. **Songs** are synced from Spotify for each artist
5. **Setlists** are created for each show and populated with the artist's top songs

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Verify your Supabase URL and keys
2. Check that RLS policies are not blocking access
3. Ensure your service role key has the necessary permissions

### API Integration Issues

If external APIs are not syncing correctly:

1. Verify API keys in environment variables
2. Check API rate limits (especially for Ticketmaster and Setlist.fm)
3. Run the unified-sync function manually with logging enabled
4. Check the Supabase Edge Function logs

### Missing Song Data

If artist songs are not being populated:

1. Ensure the artist has a valid `spotify_id` in the database
2. Manually trigger song sync for the artist:

```bash
curl -X POST \
  "https://<your-project-ref>.supabase.co/functions/v1/unified-sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-anon-key>" \
  -d '{"entity_type":"artist", "entity_id":"<artist-id>", "force_refresh":true}'
```

## Maintenance

To keep data fresh, set up a scheduled task to run the sync process:

1. Create a cron job or use Supabase scheduled functions
2. Call the `unified-sync` function with `{"process_queue":true}` every hour
3. Trigger a trending shows sync once a day

You can use the Supabase dashboard to manually review the database tables and make adjustments as needed.
