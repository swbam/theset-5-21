# The Set - Music Event App

A web application for discovering music events, artists, and shows built with Vite, React, and Supabase.

## Overview

The Set is a full-featured application that allows users to:
- Discover upcoming shows and events
- Browse artists and their setlists
- Import venues and shows from Ticketmaster
- Create customized setlist recommendations
- Vote on songs for upcoming shows

## Tech Stack

- **Frontend**: React with TypeScript and Vite
- **Styling**: Tailwind CSS, Radix UI Components
- **State Management**: React Query
- **Routing**: React Router
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Forms**: React Hook Form + Zod
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **UI Components**: Radix UI
- **Notifications**: Sonner
- **API Integration**:
  - Ticketmaster API
  - Spotify API
  - Setlist.fm API

## Prerequisites

- Node.js 18+ and npm/pnpm/yarn
- Supabase account and project
- API keys for:
  - Ticketmaster
  - Spotify
  - Setlist.fm (optional)

## Getting Started

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your environment variables
3. Install dependencies:

```bash
npm install
```

### Development

The application is split into two parts:
- Vite frontend on port 8080
- Next.js API routes on port 3000

To run the development server (both frontend and API):

```bash
npm run dev
```

This will start:
- Frontend at: http://localhost:8080
- API server at: http://localhost:3000

### Database Setup

The application requires several tables in your Supabase project. You can set up the database by running:

```bash
npm run db:migration:apply
```

This will apply all migrations in the `src/db-migrations` directory.

## Key Features

### Import System

The import system allows administrators to search for and import venues and shows from external APIs. The data is synced to your database.

To access this feature, navigate to `/import`.

### Authentication

The app uses Supabase authentication. Users can sign up and log in to track their preferences, save favorite artists, and vote on setlists.

### Cache Management

API responses are cached in the `api_cache` table for better performance. You can clear the cache using:

```bash
npm run reset:cache
```

## Deployment

To build for production:

```bash
npm run build:all
```

This builds both the frontend and the API server.

To start the production server:

```bash
npm start
```

## Project Structure

```
├── src/
│   ├── app/            # Next.js API routes
│   ├── components/     # React components
│   ├── contexts/       # React context providers
│   ├── db-migrations/  # Database migration scripts
│   ├── hooks/          # Custom React hooks
│   ├── integrations/   # External API integrations
│   ├── lib/            # Utility functions and services
│   ├── pages/          # React Router pages
│   └── styles/         # Global styles
├── public/             # Static assets
├── scripts/            # Utility scripts
└── ...
```

## License

[MIT License](LICENSE)
