-- ============================================================================
-- Performance Indexes for CÁRIS Platform
-- ============================================================================
-- This script adds missing database indexes to improve query performance
-- Run with: psql $POSTGRES_URL -f scripts/add-performance-indexes.sql
-- Or via Drizzle migration
-- ============================================================================

BEGIN;

-- ============================================================================
-- DIARY ENTRIES INDEXES
-- ============================================================================

-- Index for patient diary listing (most common query)
-- Used in: GET /api/patient/diary
CREATE INDEX IF NOT EXISTS idx_diary_patient_date
ON diary_entries(patient_id, entry_date DESC);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_diary_date
ON diary_entries(entry_date DESC);

-- Index for AI analysis filtering
CREATE INDEX IF NOT EXISTS idx_diary_ai_analyzed
ON diary_entries(ai_analyzed, patient_id);

-- Index for risk level queries (clinical alerts)
CREATE INDEX IF NOT EXISTS idx_diary_risk_level
ON diary_entries(risk_level, patient_id)
WHERE risk_level IS NOT NULL;

-- ============================================================================
-- CHAT MESSAGES INDEXES
-- ============================================================================

-- Index for room message listing (most common query)
-- Used in: GET /api/chat
CREATE INDEX IF NOT EXISTS idx_chat_room_created
ON chat_messages(room_id, created_at DESC);

-- Index for undeleted messages
CREATE INDEX IF NOT EXISTS idx_chat_room_active
ON chat_messages(room_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Index for temporary message cleanup
CREATE INDEX IF NOT EXISTS idx_chat_temporary_expires
ON chat_messages(expires_at)
WHERE is_temporary = true AND expires_at IS NOT NULL;

-- Index for sender messages
CREATE INDEX IF NOT EXISTS idx_chat_sender
ON chat_messages(sender_id, created_at DESC);

-- ============================================================================
-- SESSIONS INDEXES
-- ============================================================================

-- Index for psychologist schedule queries
-- Used in: GET /api/psychologist/sessions
CREATE INDEX IF NOT EXISTS idx_sessions_psych_scheduled
ON sessions(psychologist_id, scheduled_at DESC);

-- Index for patient sessions
CREATE INDEX IF NOT EXISTS idx_sessions_patient_scheduled
ON sessions(patient_id, scheduled_at DESC);

-- Index for session status filtering
CREATE INDEX IF NOT EXISTS idx_sessions_status_scheduled
ON sessions(status, scheduled_at);

-- Index for recurring sessions
CREATE INDEX IF NOT EXISTS idx_sessions_recurring
ON sessions(psychologist_id, is_recurring)
WHERE is_recurring = true;

-- Index for clinic sessions
CREATE INDEX IF NOT EXISTS idx_sessions_clinic_scheduled
ON sessions(clinic_id, scheduled_at DESC);

-- ============================================================================
-- MOOD TRACKING INDEXES
-- ============================================================================

-- Index for patient mood trends
-- Used in: Dashboard analytics
CREATE INDEX IF NOT EXISTS idx_mood_patient_date
ON mood_tracking(patient_id, date DESC);

-- Index for date range mood queries
CREATE INDEX IF NOT EXISTS idx_mood_date
ON mood_tracking(date DESC);

-- ============================================================================
-- AUDIT LOGS INDEXES
-- ============================================================================

-- Index for user audit trail (LGPD/HIPAA compliance)
CREATE INDEX IF NOT EXISTS idx_audit_user_timestamp
ON audit_logs(user_id, timestamp DESC);

-- Index for action type queries
CREATE INDEX IF NOT EXISTS idx_audit_action_timestamp
ON audit_logs(action, timestamp DESC);

-- Index for compliance-related audit queries
CREATE INDEX IF NOT EXISTS idx_audit_compliance
ON audit_logs(compliance_related, timestamp DESC)
WHERE compliance_related = true;

-- Index for severity filtering (security incidents)
CREATE INDEX IF NOT EXISTS idx_audit_severity
ON audit_logs(severity, timestamp DESC);

-- ============================================================================
-- USER & PROFILE INDEXES
-- ============================================================================

-- Index for email lookup (login)
CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

-- Index for psychologist profile lookup
CREATE INDEX IF NOT EXISTS idx_psych_profile_user
ON psychologist_profiles(user_id);

-- Index for patient profile lookup
CREATE INDEX IF NOT EXISTS idx_patient_profile_user
ON patient_profiles(user_id);

-- Index for patient-psychologist relationship
CREATE INDEX IF NOT EXISTS idx_patient_psychologist
ON patient_profiles(psychologist_id)
WHERE psychologist_id IS NOT NULL;

-- ============================================================================
-- NOTIFICATION INDEXES (if notifications table exists)
-- ============================================================================

-- Index for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user
ON notifications(user_id, created_at DESC)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications');

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread
ON notifications(user_id, is_read, created_at DESC)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications')
AND is_read = false;

-- ============================================================================
-- GAMIFICATION INDEXES
-- ============================================================================

-- Index for user points/XP queries
CREATE INDEX IF NOT EXISTS idx_point_activities_user
ON point_activities(user_id, created_at DESC);

-- Index for activity type filtering
CREATE INDEX IF NOT EXISTS idx_point_activities_type
ON point_activities(activity_type, created_at DESC);

-- Index for user achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user
ON user_achievements(user_id, unlocked_at DESC);

-- ============================================================================
-- SOS & EMERGENCY INDEXES
-- ============================================================================

-- Index for active SOS alerts
CREATE INDEX IF NOT EXISTS idx_sos_patient_created
ON sos_usages(patient_id, created_at DESC);

-- Index for SOS level filtering
CREATE INDEX IF NOT EXISTS idx_sos_level
ON sos_usages(level, created_at DESC);

-- Index for resolved status
CREATE INDEX IF NOT EXISTS idx_sos_resolved
ON sos_usages(resolved, created_at DESC);

-- ============================================================================
-- CONSENT & COMPLIANCE INDEXES
-- ============================================================================

-- Index for user consents (LGPD compliance)
CREATE INDEX IF NOT EXISTS idx_consents_user_type
ON data_consents(user_id, consent_type);

-- Index for active consents
CREATE INDEX IF NOT EXISTS idx_consents_active
ON data_consents(user_id, consent_given, expires_at)
WHERE consent_given = true;

-- Index for privacy settings lookup
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user
ON privacy_settings(user_id);

-- ============================================================================
-- CHAT READ RECEIPTS INDEXES
-- ============================================================================

-- Index for message read status
CREATE INDEX IF NOT EXISTS idx_read_receipts_message
ON message_read_receipts(message_id);

-- Index for user read receipts
CREATE INDEX IF NOT EXISTS idx_read_receipts_user
ON message_read_receipts(user_id, delivered_at DESC);

-- ============================================================================
-- VERIFICATION & STATISTICS
-- ============================================================================

COMMIT;

-- Show all created indexes
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Show index usage statistics (run after some usage)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

ANALYZE;
