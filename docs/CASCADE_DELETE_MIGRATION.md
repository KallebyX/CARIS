# CASCADE DELETE Migration Guide

## Phase 1 Completed ✅

The database schema has been updated with CASCADE DELETE and SET NULL behaviors for critical foreign key relationships.

### Changes Made:

#### CASCADE DELETE (child deleted when parent deleted):
- ✅ `psychologistProfiles.userId` → CASCADE
- ✅ `patientProfiles.userId` → CASCADE
- ✅ `diaryEntries.patientId` → CASCADE
- ✅ `moodTracking.patientId` → CASCADE
- ✅ `pointActivities.userId` → CASCADE
- ✅ `userAchievements.userId`, `userAchievements.achievementId` → CASCADE
- ✅ `userRewards.userId`, `userRewards.rewardId` → CASCADE
- ✅ `chatMessages.roomId` → CASCADE
- ✅ `notifications.userId` → CASCADE

#### SET NULL (preserve record, remove reference):
- ✅ `patientProfiles.psychologistId` → SET NULL
- ✅ `patientProfiles.clinicId` → SET NULL
- ✅ `sessions.clinicId`, `sessions.psychologistId`, `sessions.patientId` → SET NULL
- ✅ `chatMessages.senderId` → SET NULL (preserve messages, anonymize sender)
- ✅ `sosUsages.patientId` → SET NULL (preserve emergency records)
- ✅ `auditLogs.clinicId`, `auditLogs.userId` → SET NULL (preserve audit trail)

### Important Note on notNull Constraints:

When using `onDelete: 'set null'`, the column MUST be nullable. The following columns had their `.notNull()` constraint removed:
- `sessions.clinicId`, `sessions.psychologistId`, `sessions.patientId`
- `chatMessages.senderId`
- `sosUsages.patientId`

This is **correct and intentional** for these columns as they need to preserve records even after the referenced entity is deleted.

## How to Generate and Apply Migration:

### Step 1: Generate Migration

```bash
pnpm db:generate
```

**Note:** Drizzle Kit will ask interactive questions about schema changes:
- For "status column in clinic_users": Select **"+ status create column"**
- For any CASCADE DELETE questions: Review and confirm the changes match this document

### Step 2: Review Generated Migration

Check the generated SQL file in `drizzle/` directory. It should contain:

```sql
-- Example expected changes:
ALTER TABLE "psychologist_profiles"
  DROP CONSTRAINT IF EXISTS "psychologist_profiles_user_id_users_id_fk",
  ADD CONSTRAINT "psychologist_profiles_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "sessions"
  ALTER COLUMN "clinic_id" DROP NOT NULL,
  ALTER COLUMN "psychologist_id" DROP NOT NULL,
  ALTER COLUMN "patient_id" DROP NOT NULL;

ALTER TABLE "sessions"
  DROP CONSTRAINT IF EXISTS "sessions_clinic_id_clinics_id_fk",
  ADD CONSTRAINT "sessions_clinic_id_clinics_id_fk"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL;

-- ... similar changes for all updated foreign keys
```

### Step 3: Backup Database

**CRITICAL**: Before applying any migration to production:

```bash
# Create backup
pg_dump $POSTGRES_URL > backup_before_cascade_$(date +%Y%m%d_%H%M%S).sql

# Verify backup exists and is not empty
ls -lh backup_before_cascade_*.sql
```

### Step 4: Apply Migration

```bash
# Development/Staging
pnpm db:migrate

# Production (with extra caution)
pnpm db:migrate
```

### Step 5: Verify Changes

```sql
-- Check foreign key constraints
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('psychologist_profiles', 'patient_profiles', 'diary_entries', 'sessions', 'chat_messages', 'notifications')
ORDER BY tc.table_name, kcu.column_name;
```

Expected results:
- `psychologist_profiles.user_id` → `delete_rule = 'CASCADE'`
- `sessions.patient_id` → `delete_rule = 'SET NULL'`
- etc.

## Testing Cascade Behavior:

### Test CASCADE DELETE:

```sql
BEGIN;

-- Create test user
INSERT INTO users (name, email, password, role)
VALUES ('Test User', 'test@example.com', 'hash', 'patient')
RETURNING id; -- Note the ID

-- Create dependent records
INSERT INTO diary_entries (patient_id, content)
VALUES (<user_id>, 'Test entry');

-- Delete user - should cascade to diary_entries
DELETE FROM users WHERE id = <user_id>;

-- Verify diary entry was deleted
SELECT COUNT(*) FROM diary_entries WHERE patient_id = <user_id>;
-- Should return 0

ROLLBACK; -- Don't commit test
```

### Test SET NULL:

```sql
BEGIN;

-- Create test users
INSERT INTO users (name, email, password, role)
VALUES ('Psychologist', 'psych@example.com', 'hash', 'psychologist')
RETURNING id; -- Note psych_id

INSERT INTO users (name, email, password, role)
VALUES ('Patient', 'patient@example.com', 'hash', 'patient')
RETURNING id; -- Note patient_id

-- Create session
INSERT INTO sessions (clinic_id, psychologist_id, patient_id, scheduled_at, duration)
VALUES (1, <psych_id>, <patient_id>, NOW(), 50)
RETURNING id; -- Note session_id

-- Delete patient - session should remain with NULL patient_id
DELETE FROM users WHERE id = <patient_id>;

-- Verify session still exists with NULL patient_id
SELECT id, patient_id, psychologist_id
FROM sessions
WHERE id = <session_id>;
-- Should return row with patient_id = NULL

ROLLBACK;
```

## Rollback Plan:

If issues occur, restore from backup:

```bash
# Drop current database (DANGEROUS!)
dropdb caris_db

# Recreate database
createdb caris_db

# Restore from backup
psql $POSTGRES_URL < backup_before_cascade_YYYYMMDD_HHMMSS.sql
```

## Next Steps (Phase 2):

See `CASCADE_DELETE_ANALYSIS.md` for remaining foreign keys to update:
- Meditation-related cascades
- Payment-related cascades
- Custom fields and goals
- Clinic membership tables
- Chat participants and receipts
- And more...

## Compliance Notes:

### LGPD "Right to be Forgotten":
- User deletion now properly cascades to personal data (diary, mood, profile)
- Audit logs preserve user activity via SET NULL for compliance
- Chat messages are anonymized (SET NULL) for legal protection

### HIPAA:
- Patient data deletion is comprehensive via CASCADE
- Session records preserved for billing/audit (SET NULL)
- Emergency records (SOS) preserved for analysis (SET NULL)

## Questions or Issues:

If you encounter problems:
1. Check the generated migration SQL matches expected changes
2. Verify database backup is complete before applying
3. Test in staging environment first
4. Review logs for constraint violation errors
