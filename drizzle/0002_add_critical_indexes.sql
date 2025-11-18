-- Migration: Add critical database indexes for performance (HIGH-01)
-- Performance improvement: 10-100x faster queries on high-traffic tables
-- Date: 2025-11-18

-- Index for diary entries queries (most common: get patient's recent entries)
CREATE INDEX IF NOT EXISTS idx_diary_patient_date
ON diary_entries(patient_id, entry_date DESC);

-- Index for chat message queries (get messages in a room by time)
CREATE INDEX IF NOT EXISTS idx_chat_room_created
ON chat_messages(room_id, created_at DESC);

-- Index for sessions queries (psychologist's scheduled sessions)
CREATE INDEX IF NOT EXISTS idx_sessions_psych_date
ON sessions(psychologist_id, session_date DESC);

-- Index for mood tracking queries (patient's mood over time)
CREATE INDEX IF NOT EXISTS idx_mood_patient_date
ON mood_tracking(patient_id, date DESC);

-- Index for audit logs queries (user activity over time)
CREATE INDEX IF NOT EXISTS idx_audit_user_timestamp
ON audit_logs(user_id, timestamp DESC);

-- Additional critical indexes for common queries

-- Index for notifications by user and read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
ON notifications(user_id, is_read, created_at DESC);

-- Index for sessions by patient
CREATE INDEX IF NOT EXISTS idx_sessions_patient_date
ON sessions(patient_id, session_date DESC);

-- Index for chat messages by sender (for read receipts)
CREATE INDEX IF NOT EXISTS idx_chat_sender
ON chat_messages(sender_id, created_at DESC);

-- Index for patient profiles by psychologist (common lookup)
CREATE INDEX IF NOT EXISTS idx_patient_profiles_psych
ON patient_profiles(psychologist_id);

-- Index for user lookups by email (login)
CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

-- Index for consents by user and type (LGPD/GDPR compliance queries)
CREATE INDEX IF NOT EXISTS idx_consents_user_type
ON consents(user_id, consent_type, consent_given);

-- Composite index for diary entries with risk level (clinical alerts)
CREATE INDEX IF NOT EXISTS idx_diary_patient_risk_date
ON diary_entries(patient_id, risk_level, entry_date DESC)
WHERE risk_level IN ('high', 'critical');

-- Index for deleted/soft-deleted records (common filter)
CREATE INDEX IF NOT EXISTS idx_chat_deleted
ON chat_messages(room_id, created_at DESC)
WHERE deleted_at IS NULL;
