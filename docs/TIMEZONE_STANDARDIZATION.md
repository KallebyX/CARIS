# Timezone Standardization Guide

## Problem Analysis

The CÁRIS database schema has timezone inconsistencies that can cause issues with:
- Session scheduling across different timezones
- Accurate time tracking for meditation sessions
- Proper notification timing
- Data retention policy enforcement
- Analytics and reporting accuracy

### Current Issues

**1. Mixed Timezone Handling**
- Some tables use `timestamp` (no timezone awareness)
- Some tables store timezone separately as `text`
- No consistent pattern across the schema

**2. Session Scheduling**
```typescript
// Current (INCONSISTENT):
scheduledAt: timestamp("scheduled_at").notNull()  // No timezone
timezone: text("timezone")                         // Separate field

// Should be:
scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull()
```

**3. Calendar Integration Issues**
- Google Calendar and Outlook use ISO 8601 with timezone
- Converting between string timezone and timestamp is error-prone
- Daylight Saving Time (DST) transitions not handled automatically

## PostgreSQL Timestamp Types

### `timestamp` (without time zone)
- Stores date and time **without** timezone information
- Does **not** convert between timezones
- **Use for:** Birthdate, dates that don't need timezone context

```sql
-- Example:
CREATE TABLE example (
  birth_date timestamp  -- 1990-05-15 00:00:00 (no TZ)
);
```

### `timestamptz` (with time zone)
- Stores date and time in **UTC** internally
- **Automatically converts** to/from client timezone
- Handles DST transitions
- **Use for:** Appointments, events, activity timestamps

```sql
-- Example:
CREATE TABLE example (
  scheduled_at timestamptz  -- Stored as UTC, displayed in client TZ
);
```

## Standardization Rules

### Use `timestamptz` (WITH timezone) for:

1. **Scheduling & Appointments**
   - `sessions.scheduledAt` ✅
   - `reminders.scheduledFor` ✅
   - Any future-dated events ✅

2. **Activity Timestamps**
   - `createdAt` fields ✅
   - `updatedAt` fields ✅
   - `completedAt` fields ✅
   - `startedAt` / `endedAt` ✅

3. **Real-time Events**
   - Chat messages ✅
   - Notifications ✅
   - Audit logs ✅
   - User actions ✅

4. **Data Retention & Compliance**
   - `deletedAt` ✅
   - `expiresAt` ✅
   - `revokedAt` ✅

### Use `timestamp` (WITHOUT timezone) for:

1. **Dates Without Time Context**
   - `birthDate` ❌ (timezone not meaningful)
   - `cycle` tracking dates ❌
   - Calendar dates (as opposed to times) ❌

2. **Duration Calculations**
   - When you only care about elapsed time
   - Not applicable to most fields

## Migration Strategy

### Phase 1: Add Timezone to Critical Fields (Sessions)

```sql
-- Migration: 0004_add_timezone_to_sessions.sql

-- 1. Add new column with timezone
ALTER TABLE sessions
ADD COLUMN scheduled_at_tz timestamptz;

-- 2. Migrate data from scheduled_at + timezone field
UPDATE sessions
SET scheduled_at_tz = (
  CASE
    WHEN timezone IS NOT NULL AND timezone != '' THEN
      (scheduled_at AT TIME ZONE 'UTC') AT TIME ZONE timezone
    ELSE
      scheduled_at AT TIME ZONE 'UTC'
  END
)
WHERE scheduled_at IS NOT NULL;

-- 3. Set default timezone for NULL values
UPDATE sessions
SET scheduled_at_tz = scheduled_at AT TIME ZONE 'America/Sao_Paulo'
WHERE scheduled_at_tz IS NULL AND scheduled_at IS NOT NULL;

-- 4. Make new column NOT NULL after data migration
ALTER TABLE sessions
ALTER COLUMN scheduled_at_tz SET NOT NULL;

-- 5. Drop old columns (after application code is updated)
-- ALTER TABLE sessions DROP COLUMN scheduled_at;
-- ALTER TABLE sessions DROP COLUMN timezone;
-- ALTER TABLE sessions RENAME COLUMN scheduled_at_tz TO scheduled_at;
```

### Phase 2: Standardize Activity Timestamps

```sql
-- Migration: 0005_standardize_activity_timestamps.sql

-- Convert all createdAt/updatedAt fields to timestamptz
-- This is safer as they're already in UTC

BEGIN;

-- Sessions
ALTER TABLE sessions
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- Diary Entries
ALTER TABLE diary_entries
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN entry_date TYPE timestamptz USING entry_date AT TIME ZONE 'UTC';

-- Meditation Sessions
ALTER TABLE meditation_sessions
ALTER COLUMN started_at TYPE timestamptz USING started_at AT TIME ZONE 'UTC',
ALTER COLUMN completed_at TYPE timestamptz USING completed_at AT TIME ZONE 'UTC',
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- Chat Messages
ALTER TABLE chat_messages
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN edited_at TYPE timestamptz USING edited_at AT TIME ZONE 'UTC',
ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC',
ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

-- Notifications
ALTER TABLE notifications
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN read_at TYPE timestamptz USING read_at AT TIME ZONE 'UTC',
ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

-- Users
ALTER TABLE users
ALTER COLUMN last_login_at TYPE timestamptz USING last_login_at AT TIME ZONE 'UTC',
ALTER COLUMN password_changed_at TYPE timestamptz USING password_changed_at AT TIME ZONE 'UTC',
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- Audit Logs
ALTER TABLE audit_logs
ALTER COLUMN timestamp TYPE timestamptz USING timestamp AT TIME ZONE 'UTC',
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

COMMIT;
```

### Phase 3: Update Drizzle Schema

```typescript
// db/schema.ts

// ✅ CORRECT: Use timestamp with timezone
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  // Remove separate timezone field
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// ✅ CORRECT: Activity timestamps
export const meditationSessions = pgTable('meditation_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ❌ CORRECT: Dates without time context (no timezone)
export const patientProfiles = pgTable("patient_profiles", {
  id: serial("id").primaryKey(),
  birthDate: timestamp("birth_date"), // No timezone needed for birth date
})
```

## Application Code Updates

### 1. Date Handling in API Routes

```typescript
// ✅ BEFORE: Manual timezone handling
const scheduledAt = new Date(body.scheduledAt)
const timezone = body.timezone || 'America/Sao_Paulo'
// Complex conversion logic...

// ✅ AFTER: Automatic timezone handling
const scheduledAt = new Date(body.scheduledAt) // ISO 8601 with TZ
// PostgreSQL handles conversion automatically
```

### 2. Session Scheduling

```typescript
// API Route: /api/sessions/create
export async function POST(request: NextRequest) {
  const { scheduledAt, psychologistId, patientId } = await request.json()

  // Client sends ISO 8601: "2025-11-20T14:30:00-03:00"
  // PostgreSQL stores in UTC automatically
  const session = await db.insert(sessions).values({
    scheduledAt: new Date(scheduledAt), // Automatic conversion
    psychologistId,
    patientId,
  }).returning()

  return apiSuccess(session)
}
```

### 3. Querying with Timezones

```typescript
// ✅ Find sessions today in user's timezone
const userTimezone = 'America/Sao_Paulo'
const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD

const sessions = await db
  .select()
  .from(sessions)
  .where(
    sql`DATE(${sessions.scheduledAt} AT TIME ZONE ${userTimezone}) = ${today}`
  )
```

### 4. Calendar Integration

```typescript
// Google Calendar expects RFC 3339 (ISO 8601 with timezone)
const event = {
  start: {
    dateTime: session.scheduledAt.toISOString(), // Auto includes TZ
    timeZone: userTimezone // For recurring events
  }
}

// PostgreSQL timestamptz automatically converts:
// DB (UTC): 2025-11-20 17:30:00+00
// Client (-03:00): 2025-11-20T14:30:00-03:00
```

## Testing

### Test Timezone Conversions

```typescript
describe('Timezone Handling', () => {
  it('should store session in UTC and retrieve in user timezone', async () => {
    // Create session in São Paulo time (-03:00)
    const saoPauloTime = '2025-11-20T14:30:00-03:00'
    const session = await createSession({
      scheduledAt: new Date(saoPauloTime)
    })

    // Verify stored in UTC (17:30)
    const dbTime = await db.query.sessions.findFirst({
      where: eq(sessions.id, session.id)
    })
    expect(dbTime.scheduledAt.toISOString()).toBe('2025-11-20T17:30:00.000Z')

    // Verify retrieval converts back
    const clientTime = dbTime.scheduledAt.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo'
    })
    expect(clientTime).toContain('14:30')
  })

  it('should handle DST transitions correctly', async () => {
    // Test scheduling around DST transition dates
    // Brazil DST typically: October - February
  })
})
```

## Rollback Plan

If issues occur, rollback in reverse order:

```sql
-- Rollback Phase 2: Revert to timestamp without timezone
BEGIN;

ALTER TABLE sessions
ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamp USING updated_at AT TIME ZONE 'UTC';

-- Repeat for all modified tables...

COMMIT;

-- Rollback Phase 1: Restore old session columns
BEGIN;

ALTER TABLE sessions RENAME COLUMN scheduled_at TO scheduled_at_tz;
ALTER TABLE sessions ADD COLUMN scheduled_at timestamp;
ALTER TABLE sessions ADD COLUMN timezone text;

UPDATE sessions
SET
  scheduled_at = scheduled_at_tz AT TIME ZONE 'UTC',
  timezone = 'America/Sao_Paulo'; -- Default

ALTER TABLE sessions DROP COLUMN scheduled_at_tz;

COMMIT;
```

## Deployment Checklist

### Pre-Deployment

- [ ] Backup database
- [ ] Test migrations on staging
- [ ] Verify all timezone conversions
- [ ] Test DST transitions
- [ ] Update documentation

### Deployment Steps

1. **Run Phase 1 Migration** (Sessions)
   ```bash
   pnpm db:migrate
   ```

2. **Deploy Application Code** (supports both old and new columns)

3. **Monitor for Issues** (24-48 hours)

4. **Run Phase 2 Migration** (Activity timestamps)

5. **Update Schema** (Phase 3)

6. **Final Cleanup** (drop old columns)

### Post-Deployment

- [ ] Verify sessions display correctly in all timezones
- [ ] Test calendar sync with Google/Outlook
- [ ] Check notification timing
- [ ] Validate data retention queries
- [ ] Monitor error logs

## Common Timezone Values

```typescript
// Brazil Timezones
'America/Sao_Paulo'    // UTC-3 (DST: Oct-Feb)
'America/Manaus'       // UTC-4 (no DST)
'America/Recife'       // UTC-3 (no DST)
'America/Rio_Branco'   // UTC-5 (no DST)

// Common for testing
'America/New_York'     // UTC-5 (DST: Mar-Nov)
'Europe/London'        // UTC+0 (DST: Mar-Oct)
'Asia/Tokyo'           // UTC+9 (no DST)
```

## Best Practices

1. **Always use ISO 8601 format** in APIs
   ```json
   {
     "scheduledAt": "2025-11-20T14:30:00-03:00"
   }
   ```

2. **Store in UTC, display in local**
   ```typescript
   // Store
   const utc = new Date(localTime).toISOString()

   // Display
   const local = new Date(utc).toLocaleString('pt-BR', {
     timeZone: userTimezone
   })
   ```

3. **Use Drizzle's withTimezone option**
   ```typescript
   timestamp("created_at", { withTimezone: true })
   ```

4. **Test across timezones**
   - São Paulo (UTC-3)
   - UTC
   - Tokyo (UTC+9)

5. **Handle DST transitions**
   - Brazil: October - February
   - Test scheduling around transition dates

## Monitoring

### Query to Check Timezone Consistency

```sql
-- Find tables with mixed timestamp types
SELECT
  table_name,
  column_name,
  data_type,
  CASE
    WHEN data_type = 'timestamp with time zone' THEN 'WITH TZ'
    WHEN data_type = 'timestamp without time zone' THEN 'WITHOUT TZ'
    ELSE data_type
  END as tz_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type LIKE 'timestamp%'
ORDER BY table_name, column_name;
```

### Validate Session Scheduling

```sql
-- Check for sessions with timezone mismatches
SELECT
  id,
  scheduled_at,
  scheduled_at AT TIME ZONE 'America/Sao_Paulo' as sp_time,
  scheduled_at AT TIME ZONE 'UTC' as utc_time,
  timezone
FROM sessions
WHERE scheduled_at > NOW()
ORDER BY scheduled_at
LIMIT 10;
```

## Future Considerations

- [ ] Add timezone to user profile preferences
- [ ] Auto-detect user timezone from browser
- [ ] Support multi-timezone clinics
- [ ] Timezone-aware recurring sessions
- [ ] Historical timezone tracking (for DST changes)
- [ ] Timezone migration audit trail
