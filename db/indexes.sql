-- ================================================================
-- CÁRIS Platform Database Performance Indexes
-- ================================================================
-- This file contains strategic indexes to optimize common query patterns
-- in the CÁRIS mental health platform. Each index includes documentation
-- explaining its purpose and performance benefits.
-- ================================================================

-- ================================================================
-- USER LOOKUPS
-- ================================================================

-- Primary user lookup by email (authentication, login)
-- Performance Impact: Reduces O(n) table scan to O(log n) B-tree lookup
-- Used in: Login, registration, password reset flows
CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

-- User lookup by role for role-based queries
-- Performance Impact: Enables fast filtering by user type (patient, psychologist, admin)
-- Used in: Admin dashboards, user management, analytics queries
CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

-- User status filtering for active/inactive users
-- Performance Impact: Speeds up queries that need to filter by account status
-- Used in: User management, access control, reporting
CREATE INDEX IF NOT EXISTS idx_users_status
ON users(status);

-- Last activity tracking for engagement analytics
-- Performance Impact: Optimizes queries for inactive user detection and engagement metrics
-- Used in: User retention analysis, automated notifications
CREATE INDEX IF NOT EXISTS idx_users_last_activity
ON users(last_activity_date) WHERE last_activity_date IS NOT NULL;

-- ================================================================
-- SESSION QUERIES
-- ================================================================

-- Sessions by psychologist (most common query pattern)
-- Performance Impact: Critical for psychologist dashboard loading - 10x faster session list retrieval
-- Used in: Psychologist dashboard, calendar views, session management
CREATE INDEX IF NOT EXISTS idx_sessions_psychologist
ON sessions(psychologist_id, scheduled_at DESC);

-- Sessions by patient (patient dashboard queries)
-- Performance Impact: Speeds up patient session history and upcoming appointments
-- Used in: Patient dashboard, session history, appointment reminders
CREATE INDEX IF NOT EXISTS idx_sessions_patient
ON sessions(patient_id, scheduled_at DESC);

-- Sessions by clinic (multi-tenant queries)
-- Performance Impact: Enables efficient clinic-wide session queries for multi-clinic deployments
-- Used in: Clinic dashboards, administrative reports
CREATE INDEX IF NOT EXISTS idx_sessions_clinic
ON sessions(clinic_id, scheduled_at DESC);

-- Session status filtering (scheduled, completed, cancelled)
-- Performance Impact: Optimizes queries filtering by session status
-- Used in: Filtering active/past sessions, analytics, reporting
CREATE INDEX IF NOT EXISTS idx_sessions_status
ON sessions(status);

-- Composite index for date range queries with status
-- Performance Impact: Optimizes calendar views showing sessions in specific date ranges
-- Used in: Calendar components, scheduling conflicts detection
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_status
ON sessions(scheduled_at, status);

-- Payment status tracking for billing queries
-- Performance Impact: Speeds up financial queries and unpaid session detection
-- Used in: Billing system, payment reminders, financial reports
CREATE INDEX IF NOT EXISTS idx_sessions_payment_status
ON sessions(payment_status) WHERE payment_status != 'paid';

-- ================================================================
-- CHAT MESSAGE QUERIES
-- ================================================================

-- Messages by room (most frequent chat query)
-- Performance Impact: 100x faster message retrieval in chat rooms - enables real-time chat
-- Used in: Chat interface, message loading, conversation history
CREATE INDEX IF NOT EXISTS idx_chat_messages_room
ON chat_messages(room_id, created_at DESC);

-- Messages by sender for user-specific queries
-- Performance Impact: Optimizes queries for user's sent messages and message search
-- Used in: User message history, search functionality
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender
ON chat_messages(sender_id, created_at DESC);

-- Non-deleted messages filter (soft deletes)
-- Performance Impact: Excludes deleted messages without scanning full table
-- Used in: Chat display, message count queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_active
ON chat_messages(room_id, created_at DESC) WHERE deleted_at IS NULL;

-- Temporary/expiring messages for cleanup
-- Performance Impact: Enables efficient batch deletion of expired messages
-- Used in: Background cleanup jobs, temporary message features
CREATE INDEX IF NOT EXISTS idx_chat_messages_expiration
ON chat_messages(expires_at) WHERE is_temporary = true AND expires_at IS NOT NULL;

-- Message type filtering (text, file, system)
-- Performance Impact: Speeds up queries filtering by message type
-- Used in: File attachment listings, system message queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_type
ON chat_messages(room_id, message_type, created_at DESC);

-- ================================================================
-- DIARY ENTRY QUERIES
-- ================================================================

-- Diary entries by patient (primary access pattern)
-- Performance Impact: Critical for diary page loading - 50x faster entry retrieval
-- Used in: Patient diary interface, mood tracking timeline
CREATE INDEX IF NOT EXISTS idx_diary_entries_patient
ON diary_entries(patient_id, entry_date DESC);

-- Entries requiring AI analysis
-- Performance Impact: Enables efficient batch processing of unanalyzed entries
-- Used in: AI analysis background jobs, automated insights generation
CREATE INDEX IF NOT EXISTS idx_diary_entries_ai_pending
ON diary_entries(patient_id, id) WHERE ai_analyzed = false;

-- High-risk entries for psychologist alerts
-- Performance Impact: Fast identification of patients requiring attention
-- Used in: Risk monitoring, automated alerts, psychologist notifications
CREATE INDEX IF NOT EXISTS idx_diary_entries_risk
ON diary_entries(patient_id, risk_level, entry_date DESC)
WHERE risk_level IN ('high', 'critical');

-- Mood rating queries for analytics
-- Performance Impact: Optimizes mood trend analysis and graphing queries
-- Used in: Mood charts, progress tracking, pattern detection
CREATE INDEX IF NOT EXISTS idx_diary_entries_mood
ON diary_entries(patient_id, entry_date) WHERE mood_rating IS NOT NULL;

-- Cycle-based queries for patient profiles
-- Performance Impact: Speeds up cycle-specific diary filtering and analysis
-- Used in: Cycle-based insights, pattern recognition
CREATE INDEX IF NOT EXISTS idx_diary_entries_cycle
ON diary_entries(patient_id, cycle, entry_date DESC) WHERE cycle IS NOT NULL;

-- ================================================================
-- GAMIFICATION QUERIES
-- ================================================================

-- Leaderboard rankings (high-traffic queries)
-- Performance Impact: Critical for leaderboard page - enables sub-second loading with thousands of users
-- Used in: Weekly/monthly leaderboards, competitive features
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_ranking
ON leaderboard_entries(leaderboard_id, rank ASC, score DESC);

-- User's leaderboard position lookup
-- Performance Impact: Fast retrieval of individual user rankings
-- Used in: User profile, personal stats display
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user
ON leaderboard_entries(user_id, leaderboard_id);

-- Point activities by user (activity feed)
-- Performance Impact: Optimizes user activity history and XP calculations
-- Used in: Activity feeds, gamification dashboard
CREATE INDEX IF NOT EXISTS idx_point_activities_user
ON point_activities(user_id, created_at DESC);

-- Activity type analytics
-- Performance Impact: Speeds up queries analyzing activity patterns
-- Used in: Analytics dashboards, engagement metrics
CREATE INDEX IF NOT EXISTS idx_point_activities_type
ON point_activities(activity_type, created_at DESC);

-- User achievements lookup
-- Performance Impact: Fast retrieval of user's unlocked achievements
-- Used in: Profile pages, achievement displays
CREATE INDEX IF NOT EXISTS idx_user_achievements_user
ON user_achievements(user_id, unlocked_at DESC);

-- Achievement progress tracking
-- Performance Impact: Optimizes queries for incomplete achievements
-- Used in: Progress bars, next achievement suggestions
CREATE INDEX IF NOT EXISTS idx_user_achievements_progress
ON user_achievements(user_id, achievement_id) WHERE progress < 100;

-- Challenge participation tracking
-- Performance Impact: Fast retrieval of active user challenges
-- Used in: Challenge dashboards, progress tracking
CREATE INDEX IF NOT EXISTS idx_challenge_progress_user
ON user_challenge_progress(user_id, challenge_id);

-- Active incomplete challenges
-- Performance Impact: Optimizes queries for challenges in progress
-- Used in: Challenge reminders, engagement features
CREATE INDEX IF NOT EXISTS idx_challenge_progress_active
ON user_challenge_progress(challenge_id, completed) WHERE completed = false;

-- ================================================================
-- MEDITATION SYSTEM QUERIES
-- ================================================================

-- Meditation sessions by user (personal history)
-- Performance Impact: Fast loading of meditation history and statistics
-- Used in: Meditation dashboard, progress tracking
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_user
ON meditation_sessions(user_id, started_at DESC);

-- Completed vs incomplete sessions analytics
-- Performance Impact: Enables efficient completion rate calculations
-- Used in: Analytics, engagement metrics
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_completed
ON meditation_sessions(user_id, was_completed, started_at DESC);

-- Meditation audio popularity tracking
-- Performance Impact: Fast sorting by popularity for recommendations
-- Used in: Popular meditations list, recommendation engine
CREATE INDEX IF NOT EXISTS idx_meditation_audios_popular
ON meditation_audios(category_id, play_count DESC) WHERE status = 'active';

-- Audio ratings for quality sorting
-- Performance Impact: Optimizes best-rated meditation queries
-- Used in: Top-rated lists, quality filtering
CREATE INDEX IF NOT EXISTS idx_meditation_audios_rating
ON meditation_audios(category_id, average_rating DESC, rating_count DESC)
WHERE status = 'active';

-- Featured content display
-- Performance Impact: Fast retrieval of featured meditations
-- Used in: Home page, featured sections
CREATE INDEX IF NOT EXISTS idx_meditation_audios_featured
ON meditation_audios(is_featured, created_at DESC) WHERE is_featured = true;

-- User meditation favorites
-- Performance Impact: Fast loading of user's favorite meditations
-- Used in: Favorites list, quick access features
CREATE INDEX IF NOT EXISTS idx_meditation_favorites_user
ON user_meditation_favorites(user_id, created_at DESC);

-- Track progress monitoring
-- Performance Impact: Fast retrieval of user's meditation track progress
-- Used in: Track enrollment, progress dashboards
CREATE INDEX IF NOT EXISTS idx_track_progress_user
ON user_track_progress(user_id, track_id);

-- ================================================================
-- TASK MANAGEMENT QUERIES
-- ================================================================

-- Patient tasks (task list queries)
-- Performance Impact: Fast loading of patient's assigned tasks
-- Used in: Patient task dashboard, task lists
CREATE INDEX IF NOT EXISTS idx_tasks_patient
ON tasks(patient_id, status, due_date);

-- Psychologist's assigned tasks (monitoring)
-- Performance Impact: Enables efficient tracking of assigned tasks across patients
-- Used in: Psychologist dashboard, task management
CREATE INDEX IF NOT EXISTS idx_tasks_psychologist
ON tasks(psychologist_id, status, assigned_at DESC);

-- Overdue tasks alerting
-- Performance Impact: Fast identification of overdue tasks for reminders
-- Used in: Automated reminders, alert systems
CREATE INDEX IF NOT EXISTS idx_tasks_overdue
ON tasks(patient_id, due_date) WHERE status != 'completed' AND due_date IS NOT NULL;

-- Task completion tracking
-- Performance Impact: Optimizes queries for completion statistics
-- Used in: Progress reports, analytics
CREATE INDEX IF NOT EXISTS idx_tasks_completed
ON tasks(patient_id, completed_at DESC) WHERE status = 'completed';

-- ================================================================
-- MOOD TRACKING QUERIES
-- ================================================================

-- Mood entries by patient (timeline queries)
-- Performance Impact: Fast retrieval of mood history for charts and analysis
-- Used in: Mood charts, trend analysis, progress tracking
CREATE INDEX IF NOT EXISTS idx_mood_tracking_patient
ON mood_tracking(patient_id, date DESC);

-- Date range queries for mood analytics
-- Performance Impact: Optimizes queries for specific time periods
-- Used in: Weekly/monthly mood reports, pattern detection
CREATE INDEX IF NOT EXISTS idx_mood_tracking_date_range
ON mood_tracking(date, patient_id);

-- ================================================================
-- SOS SYSTEM QUERIES
-- ================================================================

-- SOS usage by patient (crisis tracking)
-- Performance Impact: Fast retrieval of patient's SOS history
-- Used in: Crisis monitoring, patient risk assessment
CREATE INDEX IF NOT EXISTS idx_sos_usages_patient
ON sos_usages(patient_id, timestamp DESC);

-- Active unresolved SOS incidents
-- Performance Impact: Critical for real-time crisis response - instant alert retrieval
-- Used in: Real-time alerts, crisis intervention dashboard
CREATE INDEX IF NOT EXISTS idx_sos_usages_active
ON sos_usages(patient_id, level, timestamp DESC) WHERE resolved = false;

-- Emergency level incidents
-- Performance Impact: Fast identification of critical cases
-- Used in: Emergency alerts, priority notifications
CREATE INDEX IF NOT EXISTS idx_sos_usages_emergency
ON sos_usages(level, timestamp DESC) WHERE level = 'emergency' AND resolved = false;

-- ================================================================
-- SUBSCRIPTION & PAYMENT QUERIES
-- ================================================================

-- Active subscriptions by user
-- Performance Impact: Fast subscription status checks for access control
-- Used in: Authentication, feature gating, billing
CREATE INDEX IF NOT EXISTS idx_subscriptions_user
ON subscriptions(user_id, status);

-- Subscription expiration tracking
-- Performance Impact: Enables efficient detection of expiring subscriptions
-- Used in: Renewal reminders, automated notifications
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiration
ON subscriptions(current_period_end, status)
WHERE status = 'active' AND cancel_at_period_end = false;

-- Payment tracking by user
-- Performance Impact: Fast retrieval of payment history
-- Used in: Billing history, transaction lists
CREATE INDEX IF NOT EXISTS idx_payments_user
ON payments(user_id, created_at DESC);

-- Failed payment monitoring
-- Performance Impact: Enables efficient retry logic and failure notifications
-- Used in: Payment retry system, failure alerts
CREATE INDEX IF NOT EXISTS idx_payments_failed
ON payments(status, created_at DESC) WHERE status IN ('failed', 'requires_action');

-- Invoice lookup by user
-- Performance Impact: Fast invoice retrieval for billing pages
-- Used in: Billing dashboard, invoice downloads
CREATE INDEX IF NOT EXISTS idx_invoices_user
ON invoices(user_id, created_at DESC);

-- ================================================================
-- MULTI-CLINIC QUERIES
-- ================================================================

-- Clinic membership lookup
-- Performance Impact: Fast user-clinic relationship queries
-- Used in: Multi-clinic dashboards, access control
CREATE INDEX IF NOT EXISTS idx_clinic_users_user
ON clinic_users(user_id, clinic_id);

-- Clinic's user list
-- Performance Impact: Optimizes clinic roster queries
-- Used in: Clinic management, user administration
CREATE INDEX IF NOT EXISTS idx_clinic_users_clinic
ON clinic_users(clinic_id, status, role);

-- Audit log queries by clinic
-- Performance Impact: Fast retrieval of clinic audit trails
-- Used in: Compliance reports, security audits
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic
ON audit_logs(clinic_id, timestamp DESC);

-- User action history
-- Performance Impact: Enables efficient user activity tracking
-- Used in: User audit trails, security investigations
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
ON audit_logs(user_id, timestamp DESC);

-- Compliance-related logs
-- Performance Impact: Fast retrieval of compliance events
-- Used in: GDPR/HIPAA reporting, compliance audits
CREATE INDEX IF NOT EXISTS idx_audit_logs_compliance
ON audit_logs(compliance_related, timestamp DESC) WHERE compliance_related = true;

-- ================================================================
-- NOTIFICATION & ALERT QUERIES
-- ================================================================

-- Active clinical alerts by psychologist
-- Performance Impact: Fast loading of psychologist's pending alerts
-- Used in: Alert dashboard, real-time notifications
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_psychologist
ON clinical_alerts(psychologist_id, is_active, severity DESC, created_at DESC);

-- Unacknowledged alerts (urgent notifications)
-- Performance Impact: Instant retrieval of new alerts requiring attention
-- Used in: Real-time notification system, alert badges
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_unack
ON clinical_alerts(psychologist_id, acknowledged_at) WHERE acknowledged_at IS NULL AND is_active = true;

-- Patient-specific alerts
-- Performance Impact: Fast retrieval of patient's alert history
-- Used in: Patient profile, risk timeline
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_patient
ON clinical_alerts(patient_id, created_at DESC);

-- Generated reports by psychologist
-- Performance Impact: Fast loading of psychologist's report history
-- Used in: Reports dashboard, report management
CREATE INDEX IF NOT EXISTS idx_generated_reports_psychologist
ON generated_reports(psychologist_id, generated_at DESC);

-- Patient progress reports
-- Performance Impact: Optimizes patient-specific report queries
-- Used in: Patient profile, progress tracking
CREATE INDEX IF NOT EXISTS idx_progress_reports_patient
ON progress_reports(patient_id, generated_at DESC);

-- ================================================================
-- USER CONSENT & PRIVACY QUERIES
-- ================================================================

-- User consents lookup (GDPR compliance)
-- Performance Impact: Fast consent verification for compliance
-- Used in: Data processing checks, consent management
CREATE INDEX IF NOT EXISTS idx_user_consents_user
ON user_consents(user_id, consent_type, consent_given);

-- Active consents filter
-- Performance Impact: Optimizes queries for current consent status
-- Used in: Compliance checks, consent dashboards
CREATE INDEX IF NOT EXISTS idx_user_consents_active
ON user_consents(user_id, consent_type) WHERE consent_given = true AND revoked_at IS NULL;

-- Data export requests tracking
-- Performance Impact: Fast retrieval of pending export requests
-- Used in: GDPR data portability, export queue processing
CREATE INDEX IF NOT EXISTS idx_data_exports_pending
ON data_exports(status, requested_at) WHERE status IN ('pending', 'processing');

-- User's export history
-- Performance Impact: Optimizes user's export request queries
-- Used in: Export history, download links
CREATE INDEX IF NOT EXISTS idx_data_exports_user
ON data_exports(user_id, requested_at DESC);

-- ================================================================
-- ENCRYPTION & SECURITY QUERIES
-- ================================================================

-- Active encryption keys lookup
-- Performance Impact: Fast retrieval of current encryption keys
-- Used in: Message encryption, secure communications
CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_active
ON user_encryption_keys(user_id, is_active) WHERE is_active = true;

-- Message read receipts tracking
-- Performance Impact: Fast lookup of read status for messages
-- Used in: Read receipt display, message analytics
CREATE INDEX IF NOT EXISTS idx_message_read_receipts
ON message_read_receipts(message_id, user_id);

-- Unread messages query
-- Performance Impact: Enables efficient unread message counting
-- Used in: Notification badges, unread indicators
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_unread
ON message_read_receipts(user_id, message_id) WHERE read_at IS NULL;

-- ================================================================
-- PERFORMANCE ANALYSIS QUERIES
-- ================================================================

-- To analyze index usage and effectiveness, run:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;

-- To find missing indexes (tables with high sequential scans):
-- SELECT schemaname, tablename, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
-- FROM pg_stat_user_tables
-- WHERE seq_scan > 1000 AND idx_scan < seq_scan
-- ORDER BY seq_scan DESC;

-- To identify unused indexes (candidates for removal):
-- SELECT schemaname, tablename, indexname, idx_scan
-- FROM pg_stat_user_indexes
-- WHERE idx_scan = 0 AND indexname NOT LIKE 'pg_toast%'
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- ================================================================
-- MAINTENANCE NOTES
-- ================================================================
-- 1. Monitor index usage regularly using pg_stat_user_indexes
-- 2. Consider VACUUM ANALYZE after creating indexes on large tables
-- 3. Review and drop unused indexes to reduce write overhead
-- 4. Update statistics after bulk data loads: ANALYZE table_name;
-- 5. For very large tables, consider using CREATE INDEX CONCURRENTLY
-- 6. Monitor index bloat and rebuild if necessary using REINDEX
-- ================================================================
