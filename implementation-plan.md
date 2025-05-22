# Implementation Plan for Production Readiness

This document details the step-by-step actions required to bring the concert setlist voting web app to production readiness. It is based on the previously approved production-readiness plan.

---

## 1. Database Layer Improvements

### A. Schema Audit
- **Review Migration Files:**
  - **001_create_exec_sql.sql:**  
    - Confirm table definitions for core tables (Artists, Shows, Setlists/Votes).
    - Verify constraints, foreign keys, and primary keys.

  - **002_sync_tables.sql & sync-system-tables.sql:**  
    - Ensure sync/task log tables have proper indexes and constraints.
    - Validate that any stored procedures or triggers (e.g., vote functions) include error handling.

### B. Optimization Recommendations
- Add indexes on columns commonly used in WHERE clauses (e.g., foreign keys, `artist_id`).
- Audit and optimize stored procedures for performance.

---

## 2. API & Sync System Enhancements

### A. API Endpoints
- **Admin APIs:**
  - Ensure endpoints like `/api/admin/set-admin.ts` are wrapped in robust error handling (try/catch blocks).
  - Enforce authentication and authorization for admin routes.
  
- **Shows & Artists APIs:**
  - Verify endpoints (e.g., `/api/setlist/[artistId]/route.ts`, `/api/shows/[id]/route.ts`) have proper input validation and error logging.
  - Optimize database queries (e.g., use pagination for large datasets).

### B. Sync System
- **Client Libraries (src/lib/sync/):**
  - Review modules like `artist-service.ts`, `show-service.ts`, `setlist-service.ts`, etc.
  - Implement retry logic and error handling for external API calls.
  
- **Supabase Functions (supabase/functions/):**
  - Audit deployed sync functions (`sync-artist`, `sync-setlist`, `sync-show`, `sync-song`, `sync-venue`).
  - Ensure logging mechanisms are in place to capture failures.
  - Consider decoupling heavy data operations as background jobs if needed.

---

## 3. Admin & Main UI Improvements

### A. Admin Section

- **Dashboard & Management Pages:**
  - Update the AdminArtists component to resolve TypeScript errors and improve data typing.
  - Enhance the AdminArtistImport page for smoother artist data import.

### B. Main Pages (Shows & Artists)

- **Shows:**
  - Optimize pages like `Shows.tsx`, `ShowDetail.tsx`, and `CreateShow.tsx` for clarity and performance.
  - Refine and standardize UI components such as `ShowCard.tsx`, `ShowHeader.tsx`, and `ShowSetlist.tsx`.

- **Artists:**
  - Improve `Artists.tsx` and `ArtistDetail.tsx` with accurate type definitions and better error handling.
  - Update components (e.g., `ArtistSetlists.tsx`, `ArtistStats.tsx`) to ensure consistent and responsive design following Shadcn UI and TailwindCSS guidelines.

### C. Routing & Security
- Leverage Next.js file-based routing to ensure proper SSR.
- Secure sensitive routes (admin and sync) with authentication middleware and role-based access control.

---

## 4. Testing & Documentation

### A. Testing Strategy
- **Unit Tests:**
  - Write tests for API endpoints, sync functions, and utility modules.
  
- **Integration Tests:**
  - Create tests for core flows such as artist management, show creation, and data synchronization.

### B. Documentation
- Update the project's README and add dedicated documentation for:
  - Database schema details.
  - API endpoints and their expected inputs/outputs.
  - Sync process workflows.
- Maintain the implementation plan and production-readiness guide for future reference.

---

## 5. High-Level Implementation Timeline

1. **Phase 1: Audit & Review**
   - Audit database migration scripts and table schemas.
   - Review API endpoints and sync modules for error handling and security.

2. **Phase 2: Code Enhancements**
   - Implement database optimizations (indexes, constraints).
   - Update API endpoints with robust error handling and security.
   - Fix TypeScript issues and UI inconsistencies in admin and main pages.

3. **Phase 3: Testing & Documentation**
   - Write comprehensive unit and integration tests.
   - Update documentation and internal guides.

---

## High-Level Architecture Diagram

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

---

## Next Steps

1. **Code Reviews & Refactoring:**
   - Start with addressing TypeScript and UI refinements in admin components.
   - Audit API endpoints and apply consistent error handling patterns.

2. **Database Optimizations:**
   - Adjust migration scripts if necessary and add documentation for schema changes.

3. **Sync System Enhancements:**
   - Integrate retry logic and logging in sync functions.

4. **Testing & Documentation:**
   - Develop unit/integration tests.
   - Finalize documentation and update the README with production readiness guidelines.

This plan serves as a roadmap to systematically bring the app to production quality. Once reviewed, we can switch modes to implementation and start applying these changes.



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