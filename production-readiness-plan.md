# Production Readiness Plan for Concert Setlist Voting Web App

## 1. Database Overview

### Core Tables
- **Artists Table**
  - Fields: `id`, `name`, `spotify_id`, `image_url`, `upcoming_shows`, `popularity`, `updated_at`
- **Shows Table**
  - Fields: `id`, `name`, `date`, `venue`, `artist_id` (foreign key), `updated_at`
- **Setlists/Votes Table**
  - Fields: `id`, details about setlist items, vote counts, etc.
- **Sync/Task Logs**
  - Tables created by migration scripts such as `002_sync_tables.sql` and `sync-system-tables.sql`
- **Stored Procedures/Functions**
  - Procedures for voting (e.g., defined in `add_vote_function.sql`)
  - Triggers/functions for sync operations

## 2. API & Sync Architecture

### API Endpoints
- **Admin APIs:**  
  - e.g., `/api/admin/set-admin.ts` for setting admin access
- **Shows & Artists APIs:**  
  - e.g., `/api/setlist/[artistId]/route.ts`, `/api/shows/[id]/route.ts`, `/api/search/artists/route.ts`
- **Sync APIs:**  
  - e.g., `/api/cron/sync-trending/route.ts`, `/api/sync/orchestrator/route.ts`

### Sync System
- **Client Libraries:**  
  - Located in `src/lib/sync/` (e.g., `artist-service.ts`, `show-service.ts`, etc.) for processing and updating data
- **Supabase Functions:**  
  - Deployed functions in `supabase/functions/` including:
    - `sync-artist`
    - `sync-setlist`
    - `sync-show`
    - `sync-song`
    - `sync-venue`
  - Additional functions such as `fetch-past-setlists`, `import-artist`, and `update-trending-shows`

## 3. Admin & Main Pages Overview

### Admin Section
- **Dashboard & Management Pages:**
  - Admin dashboard (e.g., `src/pages/Admin.tsx` or `src/app/admin/page.tsx`)
  - Artist management pages such as:
    - `src/pages/Artists.tsx`
    - `AdminArtists` component
    - `AdminArtistImport.tsx`
  - Setlist management pages under `src/app/admin/setlists/`

### Main Pages
- **Shows:**
  - Listing, detail, and create pages:
    - `src/pages/Shows.tsx`
    - `src/pages/ShowDetail.tsx`
    - `src/pages/CreateShow.tsx`
  - Key UI components: `ShowCard.tsx`, `ShowHeader.tsx`, `ShowSetlist.tsx`
- **Artists:**
  - Listing and detail pages:
    - `src/pages/Artists.tsx`
    - `src/pages/ArtistDetail.tsx`
  - Components for artist stats, setlists, and headers

### Routing
- Utilizes Next.js file-based routing to define URLs such as `/artist/[id]` and `/shows`, ensuring SSR and seamless navigation.

## 4. Proposed Improvements for Production

### Database Layer
- Audit and optimize table definitions.
- Add or migrate missing indexes and review constraint definitions.
- Ensure stored procedures and triggers are performant and include robust error handling.

### API & Sync System
- Enhance error and exception handling in API endpoints and sync functions.
- Secure critical endpoints (e.g., admin and sync task routes) with proper authentication.
- Decouple heavy operations into background jobs when necessary and implement retry logic.

### UI and Admin Pages
- Resolve TypeScript issues (e.g., proper typing in AdminArtists component).
- Improve UI consistency with Shadcn UI and TailwindCSS design guidelines.
- Enhance error/loading state display and enforce access control on admin pages.

### Testing & Documentation
- Strengthen linting and code formatting; add comprehensive unit and integration tests.
- Optimize data fetching strategies (such as batch queries and caching) for better scalability.
- Update documentation to clearly describe API endpoints, sync processes, and admin operations.

## 5. High-Level Architecture Diagram

```mermaid
graph TD
  A[Database]
  B[Artists Table]
  C[Shows Table]
  D[Setlists/Votes Table]
  E[Sync Tasks & Logs]
  F[API Endpoints]
  G[Sync Functions (Supabase)]
  H[Admin Pages]
  I[Main Pages (Shows/Artists)]

  A --> B
  A --> C
  A --> D
  A --> E

  F -->|Admin APIs| H
  F -->|Data APIs| I
  F -->|Sync APIs| G

  G -->|Update Data| A
  H -->|UI & Management| I
```

## Next Steps
1. **Review Recommendations:** Finalize any design modifications.
2. **Plan Implementation:** Transition to production-level code improvements.
3. **Documentation:** Use this plan as a reference during development for testing, optimization, and final deployment.

This plan outlines the current architecture and proposed improvements to ensure the app is production-ready.