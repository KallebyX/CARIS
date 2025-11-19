# Drizzle Schema Timezone Update Guide

## Overview

This document shows the required changes to `/db/schema.ts` to implement timezone support after running migration `0004_add_timezone_support.sql`.

## Changes Required

### 1. Update Import Statement

```typescript
// Add withTimezone support to timestamp import
import {
  pgTable, serial, text, integer,
  timestamp,  // Update usage to include { withTimezone: true }
  boolean, varchar, date, decimal, json, jsonb, index
} from "drizzle-orm/pg-core"
```

### 2. Users Table

```typescript
// BEFORE:
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // ...
  lastLoginAt: timestamp("last_login_at"),
  passwordChangedAt: timestamp("password_changed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// AFTER:
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // ...
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
```

### 3. Sessions Table (CRITICAL)

```typescript
// BEFORE:
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  timezone: text("timezone"),  // Remove this field
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// AFTER:
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  // Updated to use scheduled_at_tz from migration, then rename in cleanup
  scheduledAt: timestamp("scheduled_at_tz", { withTimezone: true }).notNull(),
  // timezone field removed - no longer needed with timestamptz
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
```

### 4. Diary Entries

```typescript
// BEFORE:
export const diaryEntries = pgTable("diary_entries", {
  id: serial("id").primaryKey(),
  entryDate: timestamp("entry_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// AFTER:
export const diaryEntries = pgTable("diary_entries", {
  id: serial("id").primaryKey(),
  entryDate: timestamp("entry_date", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})
```

### 5. Meditation Sessions

```typescript
// BEFORE:
export const meditationSessions = pgTable('meditation_sessions', {
  id: serial('id').primaryKey(),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// AFTER:
export const meditationSessions = pgTable('meditation_sessions', {
  id: serial('id').primaryKey(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

### 6. Chat Messages

```typescript
// BEFORE:
export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at'),
  editedAt: timestamp('edited_at'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// AFTER:
export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

### 7. Notifications

```typescript
// BEFORE:
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  readAt: timestamp("read_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// AFTER:
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  readAt: timestamp("read_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
```

### 8. Mood Tracking

```typescript
// BEFORE:
export const moodTracking = pgTable("mood_tracking", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// AFTER:
export const moodTracking = pgTable("mood_tracking", {
  id: serial("id").primaryKey(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})
```

### 9. Audit Logs

```typescript
// BEFORE:
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// AFTER:
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})
```

### 10. Tasks

```typescript
// BEFORE:
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  dueDate: timestamp("due_date"),
  assignedAt: timestamp("assigned_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// AFTER:
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})
```

### 11. SOS Alerts

```typescript
// BEFORE:
export const sosAlerts = pgTable("sos_alerts", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// AFTER:
export const sosAlerts = pgTable("sos_alerts", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})
```

### 12. Gamification Tables

```typescript
// User Achievements
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).defaultNow().notNull(),
})

// Weekly Challenges
export const weeklyChallenges = pgTable("weekly_challenges", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// User Challenge Progress
export const userChallengeProgress = pgTable("user_challenge_progress", {
  id: serial("id").primaryKey(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// Point Activities
export const pointActivities = pgTable("point_activities", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})
```

### 13. Consents

```typescript
// BEFORE:
export const consents = pgTable('consents', {
  id: serial('id').primaryKey(),
  consentDate: timestamp('consent_date').notNull().defaultNow(),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// AFTER:
export const consents = pgTable('consents', {
  id: serial('id').primaryKey(),
  consentDate: timestamp('consent_date', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

### 14. Clinic Tables

```typescript
// Clinics
export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// Clinic Users
export const clinicUsers = pgTable("clinic_users", {
  id: serial("id").primaryKey(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// Invitations
export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
```

### 15. Subscriptions

```typescript
// BEFORE:
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  canceledAt: timestamp('canceled_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// AFTER:
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

### 16. Fields That Should NOT Have Timezone

```typescript
// Patient Profiles - birth date is a calendar date, not a moment in time
export const patientProfiles = pgTable("patient_profiles", {
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).primaryKey(),
  birthDate: timestamp("birth_date"),  // NO TIMEZONE - calendar date only
  // ...
})

// Email Verifications - simple flag, timezone not critical
export const emailVerifications = pgTable("email_verifications", {
  id: serial("id").primaryKey(),
  verifiedAt: timestamp("verified_at"),  // NO TIMEZONE - simple flag
  // ...
})
```

## Implementation Steps

### Step 1: Run Migration

```bash
# Apply the SQL migration first
pnpm db:migrate
```

### Step 2: Update Schema File

Make all the changes above to `/db/schema.ts`.

### Step 3: Generate New Migration (Optional)

If you want Drizzle to track the schema changes:

```bash
pnpm db:generate
```

This will create a new migration file that should be mostly empty (since we already applied changes via SQL).

### Step 4: Test in Development

```typescript
// Test timezone behavior
const session = await db.insert(sessions).values({
  scheduledAt: new Date('2025-11-20T14:30:00-03:00'), // São Paulo time
  // ...
}).returning()

console.log(session.scheduledAt.toISOString())
// Should output: 2025-11-20T17:30:00.000Z (converted to UTC)

// Query with timezone awareness
const todaySessions = await db
  .select()
  .from(sessions)
  .where(
    sql`DATE(${sessions.scheduledAt} AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE`
  )
```

### Step 5: Update Application Code

Most application code should continue working, but review:

1. **Session scheduling endpoints** - Remove timezone field handling
2. **Calendar integration** - Use native timezone conversion
3. **Date queries** - Update to use timezone-aware comparisons
4. **Frontend** - Ensure ISO 8601 format with timezone

## Cleanup (After Verification)

Once the new `scheduled_at_tz` field is verified working, clean up the old fields:

```sql
-- Remove old session fields (run after testing)
BEGIN;

ALTER TABLE sessions DROP COLUMN IF EXISTS scheduled_at;
ALTER TABLE sessions DROP COLUMN IF EXISTS timezone;
ALTER TABLE sessions RENAME COLUMN scheduled_at_tz TO scheduled_at;

COMMIT;
```

Update schema.ts accordingly:

```typescript
export const sessions = pgTable("sessions", {
  // ...
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  // timezone field completely removed
  // ...
})
```

## Verification Checklist

After making these changes:

- [ ] Run `pnpm db:generate` to check for schema drift
- [ ] Test session creation in different timezones
- [ ] Verify calendar integration still works
- [ ] Check notification scheduling
- [ ] Test data retention queries
- [ ] Validate analytics queries with timezone conversions
- [ ] Test DST transition handling
- [ ] Update any custom SQL queries in application code

## TypeScript Benefits

With these changes, TypeScript will now properly type timestamp fields:

```typescript
// Before: Date | null
const session = await db.query.sessions.findFirst()
session.scheduledAt // Date (stored without timezone context)

// After: Date | null (but stored in UTC, auto-converts)
const session = await db.query.sessions.findFirst()
session.scheduledAt // Date (timezone-aware, auto-converts to local)
```

## Common Patterns After Migration

### Creating Sessions

```typescript
// Client sends ISO 8601 with timezone
const scheduledAt = new Date('2025-11-20T14:30:00-03:00')

await db.insert(sessions).values({
  scheduledAt, // PostgreSQL auto-converts to UTC
  psychologistId,
  patientId,
})
```

### Querying by Date in Specific Timezone

```typescript
// Find sessions today in São Paulo timezone
const todayInSaoPaulo = sql`CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo'`

const sessions = await db
  .select()
  .from(sessions)
  .where(
    sql`DATE(${sessions.scheduledAt} AT TIME ZONE 'America/Sao_Paulo') = ${todayInSaoPaulo}`
  )
```

### Formatting for Display

```typescript
// Backend (API response)
return apiSuccess({
  scheduledAt: session.scheduledAt.toISOString(), // Includes timezone
})

// Frontend (display in user's timezone)
const localTime = new Date(scheduledAt).toLocaleString('pt-BR', {
  timeZone: userTimezone,
  dateStyle: 'short',
  timeStyle: 'short',
})
```
