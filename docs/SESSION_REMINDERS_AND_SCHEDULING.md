# Session Reminders and Scheduling System

Complete documentation for the CÁRIS Session Reminders and Scheduling system.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Configuration](#configuration)
7. [Usage Examples](#usage-examples)
8. [Cron Jobs](#cron-jobs)
9. [Development](#development)

## Overview

The Session Reminders and Scheduling system provides comprehensive functionality for managing therapy sessions, including:

- Automated email, SMS, and push notification reminders
- Conflict detection and availability checking
- Recurring session patterns (weekly, bi-weekly, monthly)
- Timezone-aware scheduling
- Alternative time slot suggestions

## Features

### 1. Session Reminders

**Supported Reminder Types:**
- 24-hour advance reminders
- 1-hour advance reminders
- 15-minute advance reminders

**Delivery Channels:**
- Email (via Resend)
- SMS (via Twilio)
- Push notifications (via Pusher)

**Key Capabilities:**
- User-configurable reminder preferences
- Timezone-aware scheduling
- Automatic reminder sending via cron jobs
- Manual reminder triggering
- Delivery status tracking

### 2. Conflict Detection

**Features:**
- Real-time conflict checking
- Psychologist availability validation
- Session overlap detection
- Break time validation (minimum 10 minutes)
- Timezone conflict detection
- Session load analysis

### 3. Recurring Sessions

**Supported Patterns:**
- Weekly recurrence
- Bi-weekly recurrence
- Monthly recurrence

**Management Options:**
- Update single occurrence
- Update all future occurrences
- Update entire series
- Delete single/future/all sessions
- Skip specific occurrences
- Exception date handling

## Architecture

### Core Libraries

#### 1. Session Reminders Service (`/lib/session-reminders.ts`)

```typescript
import SessionReminderService from "@/lib/session-reminders"

const reminderService = SessionReminderService.getInstance()

// Get sessions needing reminders
const sessions = await reminderService.getSessionsNeedingReminders("24h")

// Send reminders for a session
const results = await reminderService.sendReminders(sessionData, "1h")

// Process all pending reminders
const stats = await reminderService.processPendingReminders("15min")
```

#### 2. Conflict Detection Service (`/lib/session-conflicts.ts`)

```typescript
import SessionConflictService from "@/lib/session-conflicts"

const conflictService = SessionConflictService.getInstance()

// Check for conflicts
const conflicts = await conflictService.checkConflicts({
  psychologistId: 1,
  patientId: 2,
  scheduledAt: new Date("2024-12-01T10:00:00"),
  duration: 50,
  timezone: "America/Sao_Paulo"
})

// Get availability
const availability = await conflictService.getPsychologistAvailability(
  psychologistId,
  new Date(),
  "America/Sao_Paulo"
)

// Suggest alternatives
const suggestions = await conflictService.suggestAlternativeSlots(checkData, 5)
```

#### 3. Recurring Sessions Service (`/lib/recurring-sessions.ts`)

```typescript
import RecurringSessionService from "@/lib/recurring-sessions"

const recurringService = RecurringSessionService.getInstance()

// Create recurring series
const series = await recurringService.createRecurringSeries({
  psychologistId: 1,
  patientId: 2,
  clinicId: 1,
  startDate: new Date("2024-12-01T10:00:00"),
  duration: 50,
  type: "therapy",
  timezone: "America/Sao_Paulo",
  pattern: "weekly",
  occurrences: 10
})

// Update series
await recurringService.updateFutureSessions(sessionId, {
  duration: 60
})

// Delete series
await recurringService.deleteRecurringSeries(sessionId, "all")
```

## Database Schema

### New Fields Added to `sessions` Table

```typescript
// Recurring session fields
recurringSeriesId: text("recurring_series_id")
recurrencePattern: text("recurrence_pattern") // 'weekly', 'biweekly', 'monthly'
isRecurring: boolean("is_recurring").default(false)
parentSessionId: integer("parent_session_id")

// Reminder tracking
reminderSent24h: boolean("reminder_sent_24h").default(false)
reminderSent1h: boolean("reminder_sent_1h").default(false)
reminderSent15min: boolean("reminder_sent_15min").default(false)
```

### New Fields Added to `users` Table

```typescript
phone: varchar("phone", { length: 20 }) // For SMS reminders
```

### Existing `userSettings` Table Fields

```typescript
// Timezone
timezone: text("timezone").default("America/Sao_Paulo")

// Notification preferences
emailNotifications: boolean("email_notifications").default(true)
smsNotifications: boolean("sms_notifications").default(false)

// Reminder preferences
emailRemindersEnabled: boolean("email_reminders_enabled").default(true)
smsRemindersEnabled: boolean("sms_reminders_enabled").default(false)
reminderBefore24h: boolean("reminder_before_24h").default(true)
reminderBefore1h: boolean("reminder_before_1h").default(true)
reminderBefore15min: boolean("reminder_before_15min").default(false)
```

## API Endpoints

### 1. Reminder Management API

**Endpoint:** `/api/sessions/reminders`

#### GET - Get Reminder Preferences

```bash
GET /api/sessions/reminders
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "emailRemindersEnabled": true,
    "smsRemindersEnabled": false,
    "reminderBefore24h": true,
    "reminderBefore1h": true,
    "reminderBefore15min": false,
    "timezone": "America/Sao_Paulo"
  }
}
```

#### PUT - Update Reminder Preferences

```bash
PUT /api/sessions/reminders
Content-Type: application/json

{
  "emailRemindersEnabled": true,
  "smsRemindersEnabled": true,
  "reminderBefore24h": true,
  "reminderBefore1h": true,
  "reminderBefore15min": false,
  "timezone": "America/Sao_Paulo"
}
```

#### POST - Send Manual Reminder

```bash
POST /api/sessions/reminders
Content-Type: application/json

{
  "sessionId": 123,
  "action": "send_manual_reminder"
}
```

### 2. Conflict Detection API

**Endpoint:** `/api/sessions/check-conflicts`

#### POST - Check Conflicts

```bash
POST /api/sessions/check-conflicts
Content-Type: application/json

{
  "action": "check_conflicts",
  "psychologistId": 1,
  "patientId": 2,
  "scheduledAt": "2024-12-01T10:00:00Z",
  "duration": 50,
  "timezone": "America/Sao_Paulo",
  "excludeSessionId": 100
}
```

#### POST - Validate Scheduling

```bash
POST /api/sessions/check-conflicts
Content-Type: application/json

{
  "action": "validate_scheduling",
  "psychologistId": 1,
  "patientId": 2,
  "scheduledAt": "2024-12-01T10:00:00Z",
  "duration": 50,
  "timezone": "America/Sao_Paulo"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "valid": false,
    "errors": ["Time slot overlaps with 1 existing session(s)"],
    "warnings": ["Session scheduled outside typical business hours"],
    "suggestions": [
      {
        "startTime": "2024-12-01T14:00:00Z",
        "endTime": "2024-12-01T14:50:00Z",
        "timezone": "America/Sao_Paulo",
        "score": 85
      }
    ]
  }
}
```

#### POST - Get Availability

```bash
POST /api/sessions/check-conflicts
Content-Type: application/json

{
  "action": "get_availability",
  "psychologistId": 1,
  "scheduledAt": "2024-12-01",
  "timezone": "America/Sao_Paulo"
}
```

#### GET - Get Availability

```bash
GET /api/sessions/check-conflicts?psychologistId=1&date=2024-12-01&timezone=America/Sao_Paulo
```

### 3. Recurring Sessions API

**Endpoint:** `/api/sessions/recurring`

#### POST - Create Recurring Series

```bash
POST /api/sessions/recurring
Content-Type: application/json

{
  "action": "create_series",
  "psychologistId": 1,
  "patientId": 2,
  "clinicId": 1,
  "startDate": "2024-12-01T10:00:00Z",
  "duration": 50,
  "type": "therapy",
  "timezone": "America/Sao_Paulo",
  "pattern": "weekly",
  "occurrences": 10,
  "notes": "Weekly therapy sessions",
  "sessionValue": 150.00
}
```

Response:
```json
{
  "success": true,
  "message": "Recurring series created successfully: 10 sessions created",
  "data": {
    "seriesId": "series_1234567890_abc123",
    "pattern": "weekly",
    "sessions": [...],
    "metadata": {
      "totalSessions": 10,
      "createdSessions": 10,
      "skippedSessions": 0,
      "conflicts": 0
    }
  }
}
```

#### POST - Update Single Session

```bash
POST /api/sessions/recurring
Content-Type: application/json

{
  "action": "update_single",
  "sessionId": 123,
  "scheduledAt": "2024-12-01T14:00:00Z",
  "duration": 60
}
```

#### POST - Update Future Sessions

```bash
POST /api/sessions/recurring
Content-Type: application/json

{
  "action": "update_future",
  "sessionId": 123,
  "duration": 60,
  "notes": "Updated notes"
}
```

#### POST - Delete Series

```bash
POST /api/sessions/recurring
Content-Type: application/json

{
  "action": "delete_series",
  "sessionId": 123,
  "deleteType": "all"  // "single", "future", or "all"
}
```

#### GET - Get Series Information

```bash
GET /api/sessions/recurring?seriesId=series_1234567890_abc123
# OR
GET /api/sessions/recurring?sessionId=123
```

### 4. Cron Management API (Admin Only)

**Endpoint:** `/api/cron/session-reminders`

#### GET - Get Cron Status

```bash
GET /api/cron/session-reminders
Authorization: Bearer <admin-token>
```

#### POST - Manage Cron Jobs

```bash
POST /api/cron/session-reminders
Content-Type: application/json

{
  "action": "run_manual",
  "jobType": "24h"  // "24h", "1h", or "15min"
}
```

Other actions: `"start"`, `"stop"`, `"restart"`

## Configuration

### Environment Variables

Add these to your `.env.local`:

```bash
# Email (Resend)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@caris.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Pusher (for push notifications)
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=us2

# Cron Jobs
ENABLE_CRON=true  # Set to true to enable cron jobs in development
NODE_ENV=production  # Cron jobs auto-start in production

# Application
NEXT_PUBLIC_APP_URL=https://your-app-url.com
```

### Initialize Cron Jobs

Add to your application entry point (e.g., `app/layout.tsx` or `instrumentation.ts`):

```typescript
import "@/lib/init-cron"
```

Or manually:

```typescript
import { initializeCronJobs } from "@/lib/cron"

initializeCronJobs()
```

## Usage Examples

### Example 1: Schedule a Session with Conflict Check

```typescript
// 1. Check for conflicts
const conflictCheck = await fetch("/api/sessions/check-conflicts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "validate_scheduling",
    psychologistId: 1,
    patientId: 2,
    scheduledAt: "2024-12-01T10:00:00Z",
    duration: 50,
    timezone: "America/Sao_Paulo"
  })
})

const validation = await conflictCheck.json()

if (validation.data.valid) {
  // 2. Create the session
  // ... (use your existing session creation logic)
} else {
  // 3. Show errors and suggestions
  console.log("Errors:", validation.data.errors)
  console.log("Suggestions:", validation.data.suggestions)
}
```

### Example 2: Create Weekly Recurring Sessions

```typescript
const response = await fetch("/api/sessions/recurring", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "create_series",
    psychologistId: 1,
    patientId: 2,
    clinicId: 1,
    startDate: "2024-12-01T10:00:00Z",
    duration: 50,
    type: "therapy",
    timezone: "America/Sao_Paulo",
    pattern: "weekly",
    occurrences: 12,  // 3 months
    notes: "Weekly cognitive behavioral therapy"
  })
})

const result = await response.json()
console.log(`Created ${result.data.metadata.createdSessions} sessions`)
```

### Example 3: Configure Reminder Preferences

```typescript
const response = await fetch("/api/sessions/reminders", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailRemindersEnabled: true,
    smsRemindersEnabled: true,
    reminderBefore24h: true,
    reminderBefore1h: true,
    reminderBefore15min: false,
    timezone: "America/Sao_Paulo"
  })
})
```

## Cron Jobs

### Automatic Reminder Processing

The system automatically processes reminders using cron jobs:

| Job | Schedule | Purpose |
|-----|----------|---------|
| 24h reminders | Every 5 minutes | Send reminders 24 hours before sessions |
| 1h reminders | Every 5 minutes | Send reminders 1 hour before sessions |
| 15min reminders | Every 5 minutes | Send reminders 15 minutes before sessions |
| Daily summary | Daily at 8 AM | Log system status |

### Manual Cron Execution

For testing or troubleshooting:

```typescript
import { sessionReminderCronJobs } from "@/lib/cron"

// Run a specific job manually
const stats = await sessionReminderCronJobs.runJobManually("24h")
console.log(`Sent ${stats.successful} out of ${stats.processed} reminders`)
```

## Development

### Running Database Migrations

After schema changes:

```bash
# Generate migrations
pnpm db:generate

# Apply migrations
pnpm db:migrate
```

### Testing Reminders Locally

1. Set `ENABLE_CRON=true` in `.env.local`
2. Start the development server
3. Manually trigger a reminder:

```bash
curl -X POST http://localhost:3000/api/cron/session-reminders \
  -H "Content-Type: application/json" \
  -d '{"action": "run_manual", "jobType": "24h"}'
```

### Testing Conflict Detection

```bash
curl -X POST http://localhost:3000/api/sessions/check-conflicts \
  -H "Content-Type: application/json" \
  -d '{
    "action": "check_conflicts",
    "psychologistId": 1,
    "scheduledAt": "2024-12-01T10:00:00Z",
    "duration": 50,
    "timezone": "America/Sao_Paulo"
  }'
```

## Troubleshooting

### Reminders Not Being Sent

1. Check environment variables are set correctly
2. Verify cron jobs are running: `GET /api/cron/session-reminders`
3. Check user reminder preferences
4. Verify session times are within the reminder windows
5. Check logs for errors

### SMS Not Working

1. Verify Twilio credentials
2. Check user has phone number in database
3. Verify phone number format (E.164 format: +1234567890)
4. Check Twilio account balance
5. Verify user has SMS reminders enabled

### Conflicts Not Detected

1. Ensure timezone is correctly set
2. Check session statuses (only 'scheduled' and 'confirmed' are checked)
3. Verify buffer minutes configuration
4. Check for database query errors in logs

## Best Practices

1. **Always check for conflicts** before creating sessions
2. **Use timezone-aware dates** when scheduling
3. **Set appropriate reminder preferences** per user
4. **Monitor cron job health** regularly
5. **Test reminder delivery** before production deployment
6. **Handle timezone conversions** carefully
7. **Validate recurring series** before creation
8. **Provide alternative slots** when conflicts occur
9. **Log all reminder delivery attempts** for auditing
10. **Respect user notification preferences**

## Support

For issues or questions:
- Check the logs in `/var/log` or console output
- Review error messages in API responses
- Verify database schema is up to date
- Check environment variable configuration
- Review cron job status via the admin API

## License

Part of the CÁRIS SaaS Pro platform.
