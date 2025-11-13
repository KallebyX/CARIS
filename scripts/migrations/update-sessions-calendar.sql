-- Migration: Update Sessions Table for Calendar Integration
-- Description: Add calendar event ID fields to sessions table
-- Date: 2024-01-15

-- Add calendar event ID fields (if they don't exist)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS outlook_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo';

-- Add indexes for calendar event lookups
CREATE INDEX IF NOT EXISTS idx_sessions_google_event ON sessions(google_calendar_event_id) WHERE google_calendar_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_outlook_event ON sessions(outlook_calendar_event_id) WHERE outlook_calendar_event_id IS NOT NULL;

-- Add index for upcoming sessions (used by sync process)
CREATE INDEX IF NOT EXISTS idx_sessions_upcoming ON sessions(scheduled_at) WHERE status IN ('scheduled', 'confirmed') AND scheduled_at > NOW();

-- Add composite index for user's upcoming sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_upcoming ON sessions(psychologist_id, scheduled_at) WHERE status IN ('scheduled', 'confirmed');
CREATE INDEX IF NOT EXISTS idx_sessions_patient_upcoming ON sessions(patient_id, scheduled_at) WHERE status IN ('scheduled', 'confirmed');

-- Add comments
COMMENT ON COLUMN sessions.google_calendar_event_id IS 'Google Calendar event ID for this session';
COMMENT ON COLUMN sessions.outlook_calendar_event_id IS 'Outlook Calendar event ID for this session';
COMMENT ON COLUMN sessions.timezone IS 'Timezone for the session (IANA timezone identifier)';

-- Ensure timezone has valid values (update existing NULL values)
UPDATE sessions
SET timezone = 'America/Sao_Paulo'
WHERE timezone IS NULL;

-- Add constraint to ensure timezone is not null
ALTER TABLE sessions
  ALTER COLUMN timezone SET NOT NULL;

-- Rollback instructions (if needed):
-- DROP INDEX IF EXISTS idx_sessions_patient_upcoming;
-- DROP INDEX IF EXISTS idx_sessions_user_upcoming;
-- DROP INDEX IF EXISTS idx_sessions_upcoming;
-- DROP INDEX IF EXISTS idx_sessions_outlook_event;
-- DROP INDEX IF EXISTS idx_sessions_google_event;
-- ALTER TABLE sessions DROP COLUMN IF EXISTS timezone;
-- ALTER TABLE sessions DROP COLUMN IF EXISTS outlook_calendar_event_id;
-- ALTER TABLE sessions DROP COLUMN IF EXISTS google_calendar_event_id;
