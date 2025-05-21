# Testing Database Integration

This document provides a step-by-step guide to verify that the application correctly integrates with Supabase and persists data.

## Prerequisites

1. Ensure you have access to your Supabase project dashboard
2. Make sure the application is running locally with `npm run dev` or deployed
3. Verify that the Supabase Row Level Security (RLS) policies allow the operations you need to test

## Test Flow

### 1. Navigate to the Admin Dashboard

1. Open your browser and go to: `http://localhost:5173/admin` (or your deployed URL + `/admin`)
2. You should see the Admin Dashboard without needing to log in (authentication is temporarily bypassed for testing)
3. Click on the "Test DB" tab in the top navigation

### 2. Test Database Connection

1. Click the "Test Database Connection" button
2. You should see a "Success" message if the connection works
3. Table status indicators should appear, showing which tables are accessible

### 3. Test Creating an Artist

1. In the "Artists" tab, enter a name for a test artist (e.g., "Test Artist")
2. Optionally, add an image URL
3. Click "Create Test Artist"
4. Verify that:
   - A success message appears
   - The artist appears in the table below
   - The artist has a valid UUID

### 4. Test Creating a Show with a Setlist

1. Switch to the "Shows" tab
2. Enter a name for a test show (e.g., "Test Show")
3. For the Artist ID, copy and paste an artist ID from the Artists tab
4. Optionally, set a date
5. Click "Create Test Show with Setlist"
6. Verify that:
   - A success message appears
   - The show appears in the table below

### 5. Verify Setlist Creation

1. Switch to the "Setlists" tab
2. Verify that a setlist appears with the show ID you just created

### 6. Verify in Supabase Dashboard

1. Open your Supabase dashboard in another tab: https://app.supabase.com/
2. Navigate to the Table Editor
3. Check each of the following tables and verify your test records exist:
   - artists
   - shows
   - setlists

## Troubleshooting

If you encounter any errors, check:

1. **Connection Issues**:
   - Verify your Supabase URL and API key in the application configuration
   - Check your internet connection

2. **Permission Errors**:
   - Review Row Level Security (RLS) policies in Supabase
   - Ensure the `anon` role has appropriate permissions for testing

3. **Data Validation Errors**:
   - Check the browser console for detailed error messages
   - Verify that all required fields are being provided

## Next Steps

After confirming the basic CRUD operations work:

1. Test the artist search functionality from the main application
2. Verify the show detail page creates setlists properly
3. Test voting on setlist songs to confirm vote counts update in real-time 