# TheSet Application: New Sync and Frontend Update Plan

**Date:** May 21, 2025

## 1. Objective

This document outlines a comprehensive plan to implement a new synchronization and import system for TheSet application. It also includes updates to frontend components and necessary database changes to ensure the application operates seamlessly.

## 2. Key Goals

1. **Backend Synchronization**:
   - Build a robust sync/import system for artists, shows, venues, and songs.
   - Ensure data integrity, error handling, and operational reliability.

2. **Frontend Updates**:
   - Update frontend components to align with the new sync system.
   - Improve user experience with better loading states, error handling, and responsiveness.

3. **Database Enhancements**:
   - Modify the schema to support the new sync system.
   - Ensure scalability and maintainability.

---

## 3. Backend Synchronization Plan

### 3.1. New Sync System Architecture
- **Task Queuing**:
  - Implement a task queue for syncing artists, shows, venues, and songs.
  - Use a retry mechanism with exponential backoff for failed tasks.
  - Delete all previous functions, migrations, types and start fresh so we have a clean slate
  - Use a more robust and scalable approach for handling large datasets and importing/creating/syncing shows, artists, venues and songs
  - SHows, venues, and artists need to be synced in a way that we can handle multiple sources and multiple syncs without data duplication across ticketmaster, spotify, and setlistfm apis. 
  - Use SUpabase mcp always for direct commands to update the db tables, fields and functions
- **API Integration**:
  - Create dedicated modules for Ticketmaster and Spotify API interactions if not already done. If alredy created, review and make sure they are correct
  - Handle rate limits and errors gracefully.
- **Data Transformation**:
  - Map API responses to the database schema with validation.
  - Use a shared utility for consistent data transformation.

### 3.2. Key Features
1. **Idempotency**:
   - Ensure all sync operations are idempotent to avoid duplicate entries.
2. **Logging and Monitoring**:
   - Use structured logging for better traceability.
   - Implement monitoring for sync tasks and API calls.
3. **Atomic Updates**:
   - Use transactions to ensure atomic updates to the database.

---

## 4. Frontend Update Plan

### 4.1. Component Updates
1. **Artist Page**:
   - Display upcoming shows fetched from the backend.
   - Add loading skeletons and error messages.
2. **Show Page**:
   - Show detailed information about shows, including setlists and venues.
   - Use Next.js Suspense for data fetching.
3. **Upcoming Shows Page**:
   - Fix the "Beyonce only" issue by ensuring backend reliability.
   - Add pagination and filtering options.

### 4.2. UI/UX Enhancements
- **Accessibility**:
  - Ensure all components are keyboard navigable and screen-reader friendly.
- **Design Consistency**:
  - Use a unified design system with reusable components.

---

## 5. Database Changes

### 5.1. Schema Updates
1. **Unique Constraints**:
   - Add unique constraints to prevent duplicate entries.
2. **Indexes**:
   - Optimize indexes for frequent queries.
3. **Foreign Keys**:
   - Define cascade actions for foreign keys.

### 5.2. Migration Plan
- Write migration scripts for schema changes.
- Test migrations in a staging environment before production deployment.

---

## 6. Testing and Deployment

### 6.1. Testing
- Write unit tests for backend sync functions.
- Add integration tests for API interactions.
- Perform end-to-end testing for frontend components.

### 6.2. Deployment
- Use a CI/CD pipeline for automated testing and deployment.
- Deploy changes incrementally to minimize downtime.

---

## 7. Conclusion

This plan provides a clear roadmap to implement a new sync system, update frontend components, and enhance the database schema. By following this plan, TheSet application will achieve improved reliability, scalability, and user experience.