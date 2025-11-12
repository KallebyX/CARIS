-- Migration: Update User Settings for Calendar Integration
-- Description: Add calendar integration fields to user_settings table
-- Date: 2024-01-15

-- Add Google Calendar fields
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS google_calendar_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS google_calendar_access_token TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_token_expires_at TIMESTAMP;

-- Add Outlook Calendar fields
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS outlook_calendar_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS outlook_calendar_access_token TEXT,
  ADD COLUMN IF NOT EXISTS outlook_calendar_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS outlook_calendar_token_expires_at TIMESTAMP;

-- Add sync preferences
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sync_frequency INTEGER DEFAULT 15; -- minutes

-- Reminder preferences (if not already exists)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS email_reminders_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sms_reminders_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_before_24h BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reminder_before_1h BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reminder_before_15min BOOLEAN DEFAULT FALSE;

-- Add last sync timestamp
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS last_calendar_sync TIMESTAMP;

-- Add comments
COMMENT ON COLUMN user_settings.google_calendar_enabled IS 'Whether Google Calendar sync is enabled';
COMMENT ON COLUMN user_settings.google_calendar_access_token IS 'Encrypted Google Calendar OAuth access token';
COMMENT ON COLUMN user_settings.google_calendar_refresh_token IS 'Encrypted Google Calendar OAuth refresh token';
COMMENT ON COLUMN user_settings.google_calendar_token_expires_at IS 'When the Google Calendar access token expires';

COMMENT ON COLUMN user_settings.outlook_calendar_enabled IS 'Whether Outlook Calendar sync is enabled';
COMMENT ON COLUMN user_settings.outlook_calendar_access_token IS 'Encrypted Outlook Calendar OAuth access token';
COMMENT ON COLUMN user_settings.outlook_calendar_refresh_token IS 'Encrypted Outlook Calendar OAuth refresh token';
COMMENT ON COLUMN user_settings.outlook_calendar_token_expires_at IS 'When the Outlook Calendar access token expires';

COMMENT ON COLUMN user_settings.auto_sync_enabled IS 'Whether automatic calendar sync is enabled';
COMMENT ON COLUMN user_settings.sync_frequency IS 'How often to auto-sync calendar in minutes';
COMMENT ON COLUMN user_settings.last_calendar_sync IS 'Timestamp of last successful calendar sync';

-- Create index for finding users with sync enabled
CREATE INDEX IF NOT EXISTS idx_user_settings_google_sync ON user_settings(google_calendar_enabled) WHERE google_calendar_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_settings_outlook_sync ON user_settings(outlook_calendar_enabled) WHERE outlook_calendar_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_settings_auto_sync ON user_settings(auto_sync_enabled, last_calendar_sync) WHERE auto_sync_enabled = TRUE;

-- Rollback instructions (if needed):
-- DROP INDEX IF EXISTS idx_user_settings_auto_sync;
-- DROP INDEX IF EXISTS idx_user_settings_outlook_sync;
-- DROP INDEX IF EXISTS idx_user_settings_google_sync;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS last_calendar_sync;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS reminder_before_15min;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS reminder_before_1h;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS reminder_before_24h;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS sms_reminders_enabled;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS email_reminders_enabled;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS sync_frequency;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS auto_sync_enabled;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS outlook_calendar_token_expires_at;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS outlook_calendar_refresh_token;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS outlook_calendar_access_token;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS outlook_calendar_enabled;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS google_calendar_token_expires_at;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS google_calendar_refresh_token;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS google_calendar_access_token;
-- ALTER TABLE user_settings DROP COLUMN IF EXISTS google_calendar_enabled;
