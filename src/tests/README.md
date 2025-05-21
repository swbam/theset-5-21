# Database Integration Testing

This directory contains testing utilities and documentation for verifying the Supabase database integration in TheSet app.

## Contents

- `testDBIntegration.md` - Step-by-step guide for manual testing
- `supabase_helper_functions.sql` - SQL functions to help with debugging

## Setup Instructions

1. **Install SQL Helper Functions:**
   - Log in to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase_helper_functions.sql`
   - Run the SQL script
   - This will install functions that help the TestDatabaseIntegration component debug permissions

2. **Verify RLS Policies:**
   - Make sure your tables have appropriate RLS policies
   - For testing purposes, you can use the following permissions:

```sql
-- Enable RLS on all tables
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_tracks ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all operations
CREATE POLICY "Allow public read and write for artists" ON artists
    USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read and write for shows" ON shows
    USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read and write for setlists" ON setlists
    USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read and write for setlist_songs" ON setlist_songs
    USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read and write for top_tracks" ON top_tracks
    USING (true) WITH CHECK (true);
```

3. **Access Testing Interface:**
   - Run the app locally with `npm run dev`
   - Navigate to `http://localhost:5173/admin`
   - Click the "Test DB" tab
   - Use the testing interface to verify database connection and operations

## Common Issues and Solutions

### 1. Permission Errors

If you see errors like "Permission denied for relation...", it means your RLS policies are too restrictive.

**Solution:**
- Check the RLS policies for the affected table
- Make sure the policy `USING` and `WITH CHECK` expressions allow the operations you need
- For testing, you can use the permissive policies shown above

### 2. Connection Issues

If the app can't connect to Supabase, check:

**Solution:**
- Verify your Supabase URL and API key in the `.env` file
- Make sure the Supabase project is active
- Check for network connectivity issues

### 3. Missing RPC Functions

If the "Fetch DB Info" functionality doesn't work:

**Solution:**
- Make sure you've installed the SQL helper functions from `supabase_helper_functions.sql`
- Check the browser console for detailed error messages

## Post-Testing Consideration

After testing is complete and you're ready for production, consider:

1. **Replacing Permissive Policies:**
   - Remove the permissive "true/true" policies
   - Implement more restrictive policies based on user roles and authentication
   - Example: Allow reads for everyone but restrict writes to authenticated users

2. **Adding Service Role Access:**
   - For server-side operations, use a service role key instead of the anon key
   - This bypasses RLS for administrative operations

3. **Implementing Data Validation:**
   - Add database triggers or application-level validation
   - Prevent invalid data from being inserted 