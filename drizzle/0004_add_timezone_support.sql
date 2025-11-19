-- Migration: Add timezone support to critical timestamp fields
-- MEDIUM-11: Standardize timezone usage across database schema

-- This migration converts timestamp fields to timestamptz (timestamp with time zone)
-- for fields that need timezone awareness (scheduling, activity tracking, etc.)

BEGIN;

-- ============================================================================
-- PHASE 1: SESSIONS TABLE (Critical for scheduling)
-- ============================================================================

-- Add new column with timezone support
ALTER TABLE sessions
ADD COLUMN scheduled_at_tz timestamptz;

-- Migrate data: Combine scheduled_at + timezone field
-- If timezone exists, use it; otherwise default to America/Sao_Paulo
UPDATE sessions
SET scheduled_at_tz = (
  CASE
    -- If timezone field has a value, use it
    WHEN timezone IS NOT NULL AND timezone != '' THEN
      (scheduled_at AT TIME ZONE 'UTC') AT TIME ZONE timezone
    -- Default to São Paulo timezone (Brazil)
    ELSE
      scheduled_at AT TIME ZONE 'America/Sao_Paulo'
  END
)
WHERE scheduled_at IS NOT NULL;

-- Set NOT NULL constraint after data migration
ALTER TABLE sessions
ALTER COLUMN scheduled_at_tz SET NOT NULL;

-- Create index for timezone-aware queries
CREATE INDEX idx_sessions_scheduled_at_tz ON sessions (scheduled_at_tz);

-- ============================================================================
-- PHASE 2: ACTIVITY TIMESTAMPS (created_at, updated_at, etc.)
-- ============================================================================

-- SESSIONS
ALTER TABLE sessions
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- USERS
ALTER TABLE users
ALTER COLUMN last_login_at TYPE timestamptz USING last_login_at AT TIME ZONE 'UTC',
ALTER COLUMN password_changed_at TYPE timestamptz USING password_changed_at AT TIME ZONE 'UTC',
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- DIARY ENTRIES
ALTER TABLE diary_entries
ALTER COLUMN entry_date TYPE timestamptz USING entry_date AT TIME ZONE 'UTC',
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- MEDITATION SESSIONS
ALTER TABLE meditation_sessions
ALTER COLUMN started_at TYPE timestamptz USING started_at AT TIME ZONE 'UTC',
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- Convert completed_at (can be NULL)
ALTER TABLE meditation_sessions
ALTER COLUMN completed_at TYPE timestamptz USING completed_at AT TIME ZONE 'UTC';

-- CHAT MESSAGES
ALTER TABLE chat_messages
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- Convert nullable timestamp fields
ALTER TABLE chat_messages
ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC',
ALTER COLUMN edited_at TYPE timestamptz USING edited_at AT TIME ZONE 'UTC',
ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC';

-- NOTIFICATIONS
ALTER TABLE notifications
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- Convert nullable fields
ALTER TABLE notifications
ALTER COLUMN read_at TYPE timestamptz USING read_at AT TIME ZONE 'UTC',
ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

-- MOOD TRACKING
ALTER TABLE mood_tracking
ALTER COLUMN date TYPE timestamptz USING date AT TIME ZONE 'UTC',
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- AUDIT LOGS
ALTER TABLE audit_logs
ALTER COLUMN timestamp TYPE timestamptz USING timestamp AT TIME ZONE 'UTC',
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- ACHIEVEMENTS & GAMIFICATION
ALTER TABLE user_achievements
ALTER COLUMN unlocked_at TYPE timestamptz USING unlocked_at AT TIME ZONE 'UTC';

ALTER TABLE weekly_challenges
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE user_challenge_progress
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- Convert completed_at (can be NULL)
ALTER TABLE user_challenge_progress
ALTER COLUMN completed_at TYPE timestamptz USING completed_at AT TIME ZONE 'UTC';

ALTER TABLE point_activities
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- TASKS
ALTER TABLE tasks
ALTER COLUMN assigned_at TYPE timestamptz USING assigned_at AT TIME ZONE 'UTC',
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- Convert nullable fields
ALTER TABLE tasks
ALTER COLUMN due_date TYPE timestamptz USING due_date AT TIME ZONE 'UTC',
ALTER COLUMN completed_at TYPE timestamptz USING completed_at AT TIME ZONE 'UTC';

-- SOS ALERTS
ALTER TABLE sos_alerts
ALTER COLUMN timestamp TYPE timestamptz USING timestamp AT TIME ZONE 'UTC',
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- Convert resolved_at (can be NULL)
ALTER TABLE sos_alerts
ALTER COLUMN resolved_at TYPE timestamptz USING resolved_at AT TIME ZONE 'UTC';

-- CONSENTS
ALTER TABLE consents
ALTER COLUMN consent_date TYPE timestamptz USING consent_date AT TIME ZONE 'UTC',
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- Convert revoked_at (can be NULL)
ALTER TABLE consents
ALTER COLUMN revoked_at TYPE timestamptz USING revoked_at AT TIME ZONE 'UTC';

-- USER PRIVACY SETTINGS
ALTER TABLE user_privacy_settings
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- CLINICAL INSIGHTS
ALTER TABLE clinical_insights
ALTER COLUMN generated_at TYPE timestamptz USING generated_at AT TIME ZONE 'UTC';

-- Convert reviewed_at (can be NULL)
ALTER TABLE clinical_insights
ALTER COLUMN reviewed_at TYPE timestamptz USING reviewed_at AT TIME ZONE 'UTC';

-- RISK ASSESSMENTS
ALTER TABLE risk_assessments
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- Convert acknowledged_at and resolved_at (can be NULL)
ALTER TABLE risk_assessments
ALTER COLUMN acknowledged_at TYPE timestamptz USING acknowledged_at AT TIME ZONE 'UTC',
ALTER COLUMN resolved_at TYPE timestamptz USING resolved_at AT TIME ZONE 'UTC';

-- PROGRESS REPORTS
ALTER TABLE progress_reports
ALTER COLUMN generated_at TYPE timestamptz USING generated_at AT TIME ZONE 'UTC';

-- Convert shared_at (can be NULL)
ALTER TABLE progress_reports
ALTER COLUMN shared_at TYPE timestamptz USING shared_at AT TIME ZONE 'UTC';

-- CLINIC TABLES
ALTER TABLE clinics
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE clinic_users
ALTER COLUMN joined_at TYPE timestamptz USING joined_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE invitations
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- Convert expires_at (can be NULL)
ALTER TABLE invitations
ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

-- BACKUP & FILE OPERATIONS
ALTER TABLE backup_operations
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- Convert completed_at (can be NULL)
ALTER TABLE backup_operations
ALTER COLUMN requested_at TYPE timestamptz USING requested_at AT TIME ZONE 'UTC',
ALTER COLUMN completed_at TYPE timestamptz USING completed_at AT TIME ZONE 'UTC';

ALTER TABLE file_operations
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- Convert expires_at (can be NULL)
ALTER TABLE file_operations
ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

-- EDUCATION & ONBOARDING
ALTER TABLE education_progress
ALTER COLUMN started_at TYPE timestamptz USING started_at AT TIME ZONE 'UTC',
ALTER COLUMN last_accessed_at TYPE timestamptz USING last_accessed_at AT TIME ZONE 'UTC',
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- Convert completed_at (can be NULL)
ALTER TABLE education_progress
ALTER COLUMN completed_at TYPE timestamptz USING completed_at AT TIME ZONE 'UTC';

-- SUBSCRIPTIONS
ALTER TABLE subscriptions
ALTER COLUMN current_period_start TYPE timestamptz USING current_period_start AT TIME ZONE 'UTC',
ALTER COLUMN current_period_end TYPE timestamptz USING current_period_end AT TIME ZONE 'UTC',
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- Convert canceled_at (can be NULL)
ALTER TABLE subscriptions
ALTER COLUMN canceled_at TYPE timestamptz USING canceled_at AT TIME ZONE 'UTC';

-- GAMIFICATION CONFIG
ALTER TABLE gamification_config
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- CHAT FILES
ALTER TABLE chat_files
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- REMINDER TEMPLATES (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reminder_templates') THEN
    EXECUTE 'ALTER TABLE reminder_templates
      ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE ''UTC'',
      ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE ''UTC''';
  END IF;
END $$;

-- ============================================================================
-- PHASE 3: KEEP WITHOUT TIMEZONE (dates, not times)
-- ============================================================================

-- Note: The following fields intentionally keep 'timestamp' (without timezone):
--
-- 1. patient_profiles.birth_date
--    Reason: Birth date is a calendar date, not a moment in time
--
-- 2. email_verifications.verified_at
--    Reason: Simple verification flag, timezone not critical
--
-- These remain as 'timestamp' to indicate they don't need timezone context

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check timezone types after migration:
-- SELECT
--   table_name,
--   column_name,
--   data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND data_type LIKE 'timestamp%'
-- ORDER BY
--   CASE
--     WHEN data_type = 'timestamp with time zone' THEN 1
--     ELSE 2
--   END,
--   table_name,
--   column_name;
