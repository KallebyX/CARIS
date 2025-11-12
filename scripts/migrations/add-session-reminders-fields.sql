-- Migration: Add Session Reminders and Recurring Sessions Fields
-- Date: 2024-11-12
-- Description: Adds fields for session reminders, recurring sessions, and SMS functionality

-- Step 1: Add phone field to users table for SMS reminders
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Step 2: Add recurring session fields to sessions table
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS recurring_series_id TEXT,
ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_session_id INTEGER;

-- Step 3: Add reminder tracking fields to sessions table
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS reminder_sent_24h BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_sent_1h BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_sent_15min BOOLEAN DEFAULT FALSE;

-- Step 4: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_recurring_series_id ON sessions(recurring_series_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_at ON sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sessions_psychologist_scheduled ON sessions(psychologist_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_reminders ON sessions(reminder_sent_24h, reminder_sent_1h, reminder_sent_15min);

-- Step 5: Add comment to document the migration
COMMENT ON COLUMN users.phone IS 'Phone number for SMS reminders (E.164 format recommended)';
COMMENT ON COLUMN sessions.recurring_series_id IS 'Unique identifier linking sessions in a recurring series';
COMMENT ON COLUMN sessions.recurrence_pattern IS 'Pattern type: weekly, biweekly, monthly, or null for one-time sessions';
COMMENT ON COLUMN sessions.is_recurring IS 'Flag indicating if this session is part of a recurring series';
COMMENT ON COLUMN sessions.parent_session_id IS 'Reference to the original session in a recurring series';
COMMENT ON COLUMN sessions.reminder_sent_24h IS 'Flag tracking if 24-hour reminder was sent';
COMMENT ON COLUMN sessions.reminder_sent_1h IS 'Flag tracking if 1-hour reminder was sent';
COMMENT ON COLUMN sessions.reminder_sent_15min IS 'Flag tracking if 15-minute reminder was sent';

-- Step 6: Verify the migration
SELECT
    'users.phone' as field,
    COUNT(*) FILTER (WHERE phone IS NOT NULL) as populated_count,
    COUNT(*) as total_count
FROM users
UNION ALL
SELECT
    'sessions.recurring_series_id' as field,
    COUNT(*) FILTER (WHERE recurring_series_id IS NOT NULL) as populated_count,
    COUNT(*) as total_count
FROM sessions
UNION ALL
SELECT
    'sessions.is_recurring' as field,
    COUNT(*) FILTER (WHERE is_recurring = TRUE) as populated_count,
    COUNT(*) as total_count
FROM sessions;

-- Migration complete!
-- Next steps:
-- 1. Run `pnpm db:generate` to update Drizzle schema types
-- 2. Restart your application to initialize cron jobs
-- 3. Test reminder functionality with a test session
