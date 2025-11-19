-- Migration: Remove duplicate fields from schema
-- LOW-10: Remove redundant alternative fields that are not used

-- This migration cleans up duplicate fields that were identified as unused:
-- 1. mood_tracking.mood_score (duplicate of mood)
-- 2. mood_tracking.energy_level (duplicate of energy)
-- 3. audit_logs.resource (duplicate of resource_type, which is the active field)

BEGIN;

-- ============================================================================
-- MOOD TRACKING TABLE - Remove duplicate fields
-- ============================================================================

-- Remove mood_score (duplicate of mood)
ALTER TABLE mood_tracking
DROP COLUMN IF EXISTS mood_score;

-- Remove energy_level (duplicate of energy)
ALTER TABLE mood_tracking
DROP COLUMN IF EXISTS energy_level;

-- ============================================================================
-- AUDIT LOGS TABLE - Remove duplicate field and enforce NOT NULL
-- ============================================================================

-- Remove resource (duplicate of resource_type)
ALTER TABLE audit_logs
DROP COLUMN IF EXISTS resource;

-- Ensure resource_type is NOT NULL (it's the active field)
-- First, update any NULL values to a default
UPDATE audit_logs
SET resource_type = 'unknown'
WHERE resource_type IS NULL;

-- Then add NOT NULL constraint
ALTER TABLE audit_logs
ALTER COLUMN resource_type SET NOT NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify mood_tracking fields were removed:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'mood_tracking'
-- AND column_name IN ('mood_score', 'energy_level');
-- Expected: 0 rows

-- Verify audit_logs field was removed and constraint added:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'audit_logs'
-- AND column_name IN ('resource', 'resource_type');
-- Expected: 1 row (resource_type, NOT NULL)

-- ============================================================================
-- ROLLBACK PLAN (if needed)
-- ============================================================================

-- To rollback this migration:
-- BEGIN;
--
-- ALTER TABLE mood_tracking
-- ADD COLUMN mood_score integer;
--
-- ALTER TABLE mood_tracking
-- ADD COLUMN energy_level integer;
--
-- ALTER TABLE audit_logs
-- ADD COLUMN resource varchar(100);
--
-- ALTER TABLE audit_logs
-- ALTER COLUMN resource_type DROP NOT NULL;
--
-- COMMIT;
