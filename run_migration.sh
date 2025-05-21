#!/bin/bash

# Run the SQL migration for external IDs

echo "Running SQL migration to add external_id columns to database tables..."

# Check for environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "Loading environment variables from .env file..."
  if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
  elif [ -f ".env.local" ]; then
    export $(grep -v '^#' .env.local | xargs)
  else
    echo "Error: No .env or .env.local file found."
    exit 1
  fi
fi

# Check again after loading from file
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not found in environment variables or .env file."
  exit 1
fi

# Run migration using curl to Supabase's REST API
echo "Applying migration to Supabase..."

# Get SQL content from file
SQL_CONTENT=$(cat add_external_ids.sql)

# Make API request to run SQL
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/sql" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"${SQL_CONTENT}\"}")

# Check if there was an error
if [[ $RESPONSE == *"error"* ]]; then
  echo "Error executing SQL migration:"
  echo $RESPONSE
  exit 1
else
  echo "Migration completed successfully!"
  echo "External ID columns have been added to all relevant tables."
  echo ""
  echo "Next steps:"
  echo "1. Use the updated artist-service.ts file to sync data"
  echo "2. Test the sync functionality to ensure data is correctly stored"
  echo ""
fi 