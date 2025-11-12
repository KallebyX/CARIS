-- Migration: Add Calendar Sync Logs Table
-- Description: Create table to track calendar synchronization operations
-- Date: 2024-01-15

-- Create calendar_sync_logs table
CREATE TABLE IF NOT EXISTS calendar_sync_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('to_calendar', 'from_calendar', 'bidirectional')),
  provider TEXT CHECK (provider IN ('google', 'outlook', 'both')),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  synced_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  conflict_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB,
  duration INTEGER, -- milliseconds
  synced_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_counts CHECK (
    synced_count >= 0 AND
    failed_count >= 0 AND
    conflict_count >= 0
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_user_id ON calendar_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_synced_at ON calendar_sync_logs(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_success ON calendar_sync_logs(success);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_user_date ON calendar_sync_logs(user_id, synced_at DESC);

-- Add comment to table
COMMENT ON TABLE calendar_sync_logs IS 'Tracks calendar synchronization operations for audit and monitoring';

-- Add comments to columns
COMMENT ON COLUMN calendar_sync_logs.user_id IS 'User who triggered or owns the sync operation';
COMMENT ON COLUMN calendar_sync_logs.direction IS 'Direction of sync: to_calendar, from_calendar, or bidirectional';
COMMENT ON COLUMN calendar_sync_logs.provider IS 'Calendar provider: google, outlook, or both';
COMMENT ON COLUMN calendar_sync_logs.success IS 'Whether the sync operation completed successfully';
COMMENT ON COLUMN calendar_sync_logs.synced_count IS 'Number of sessions successfully synced';
COMMENT ON COLUMN calendar_sync_logs.failed_count IS 'Number of sessions that failed to sync';
COMMENT ON COLUMN calendar_sync_logs.conflict_count IS 'Number of conflicts detected during sync';
COMMENT ON COLUMN calendar_sync_logs.errors IS 'JSON array of error messages and details';
COMMENT ON COLUMN calendar_sync_logs.duration IS 'Duration of sync operation in milliseconds';
COMMENT ON COLUMN calendar_sync_logs.synced_at IS 'Timestamp when sync operation occurred';

-- Grant permissions (adjust as needed for your setup)
GRANT SELECT, INSERT ON calendar_sync_logs TO caris_app;
GRANT SELECT ON calendar_sync_logs TO caris_readonly;

-- Rollback instructions (if needed):
-- DROP INDEX IF EXISTS idx_calendar_sync_logs_user_date;
-- DROP INDEX IF EXISTS idx_calendar_sync_logs_success;
-- DROP INDEX IF EXISTS idx_calendar_sync_logs_synced_at;
-- DROP INDEX IF EXISTS idx_calendar_sync_logs_user_id;
-- DROP TABLE IF EXISTS calendar_sync_logs;
