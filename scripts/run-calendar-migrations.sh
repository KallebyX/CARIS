#!/bin/bash

# Script to run calendar integration migrations
# Usage: ./scripts/run-calendar-migrations.sh

set -e

echo "🚀 Starting calendar integration migrations..."

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check if POSTGRES_URL is set
if [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: POSTGRES_URL environment variable is not set"
  echo "Please set it in .env.local or export it"
  exit 1
fi

echo "📦 Database: $POSTGRES_URL"
echo ""

# Function to run migration
run_migration() {
  local migration_file=$1
  local migration_name=$(basename "$migration_file" .sql)

  echo "⚙️  Running migration: $migration_name"

  if psql "$POSTGRES_URL" -f "$migration_file"; then
    echo "✅ Migration completed: $migration_name"
  else
    echo "❌ Migration failed: $migration_name"
    exit 1
  fi

  echo ""
}

# Run migrations in order
echo "1️⃣  Updating sessions table..."
run_migration "scripts/migrations/update-sessions-calendar.sql"

echo "2️⃣  Updating user_settings table..."
run_migration "scripts/migrations/update-user-settings-calendar.sql"

echo "3️⃣  Creating calendar_sync_logs table..."
run_migration "scripts/migrations/add-calendar-sync-logs.sql"

echo "🎉 All calendar migrations completed successfully!"
echo ""
echo "Next steps:"
echo "  1. Configure Google Calendar API credentials in .env.local"
echo "  2. Configure Microsoft Graph API credentials in .env.local"
echo "  3. Restart your development server"
echo "  4. Test calendar integration in Settings > Calendar"
echo ""
