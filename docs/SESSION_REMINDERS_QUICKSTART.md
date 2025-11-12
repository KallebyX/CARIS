# Session Reminders & Scheduling - Quick Start Guide

Get the Session Reminders and Scheduling system up and running in 5 minutes.

## Prerequisites

- CÁRIS platform already installed
- PostgreSQL database configured
- Node.js 18+ and pnpm installed

## Step 1: Install Dependencies (Already Done)

The required packages are already in package.json:
- `twilio` - SMS reminders
- `node-cron` - Scheduled tasks
- `date-fns` - Date manipulation
- `date-fns-tz` - Timezone handling

## Step 2: Configure Environment Variables

Add these to your `.env.local`:

```bash
# Email Reminders (Resend - already configured)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@caris.com

# SMS Reminders (Twilio - REQUIRED for SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Pusher (already configured)
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=us2

# Enable Cron Jobs
ENABLE_CRON=true

# App URL (for links in reminders)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Get Twilio Credentials (for SMS)

1. Sign up at https://www.twilio.com/try-twilio
2. Get a phone number from Twilio Console
3. Copy Account SID and Auth Token from dashboard

## Step 3: Run Database Migration

```bash
# Generate Drizzle migrations from schema
pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# OR manually run the SQL script
psql $POSTGRES_URL -f scripts/migrations/add-session-reminders-fields.sql
```

## Step 4: Initialize Cron Jobs

Add this import to your `app/layout.tsx` or create `instrumentation.ts`:

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeCronJobs } = await import('./lib/cron')
    initializeCronJobs()
  }
}
```

Or simply import at the top of any server file:

```typescript
import "@/lib/init-cron"
```

## Step 5: Test the System

### Test 1: Check Conflict Detection

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

### Test 2: Get Psychologist Availability

```bash
curl "http://localhost:3000/api/sessions/check-conflicts?psychologistId=1&date=2024-12-01&timezone=America/Sao_Paulo"
```

### Test 3: Create Recurring Sessions

```bash
curl -X POST http://localhost:3000/api/sessions/recurring \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "create_series",
    "psychologistId": 1,
    "patientId": 2,
    "clinicId": 1,
    "startDate": "2024-12-01T10:00:00Z",
    "duration": 50,
    "type": "therapy",
    "timezone": "America/Sao_Paulo",
    "pattern": "weekly",
    "occurrences": 4
  }'
```

### Test 4: Configure Reminder Preferences

```bash
curl -X PUT http://localhost:3000/api/sessions/reminders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "emailRemindersEnabled": true,
    "smsRemindersEnabled": true,
    "reminderBefore24h": true,
    "reminderBefore1h": true,
    "reminderBefore15min": false,
    "timezone": "America/Sao_Paulo"
  }'
```

### Test 5: Manually Trigger Reminder Job

```bash
curl -X POST http://localhost:3000/api/cron/session-reminders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "action": "run_manual",
    "jobType": "24h"
  }'
```

## Step 6: Verify Everything Works

### Check Cron Jobs are Running

```bash
curl http://localhost:3000/api/cron/session-reminders \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "jobs": [
      {"jobName": "24h-reminders", "running": true},
      {"jobName": "1h-reminders", "running": true},
      {"jobName": "15min-reminders", "running": true},
      {"jobName": "daily-summary", "running": true}
    ],
    "environment": "development",
    "cronEnabled": true
  }
}
```

### Check Application Logs

You should see:
```
🕐 Initializing session reminder cron jobs...
✓ All reminder cron jobs initialized successfully
  - 24h reminders: Every 5 minutes
  - 1h reminders: Every 5 minutes
  - 15min reminders: Every 5 minutes
  - Daily summary: 8:00 AM every day
🚀 Starting session reminder cron jobs...
  ✓ Started: 24h-reminders
  ✓ Started: 1h-reminders
  ✓ Started: 15min-reminders
  ✓ Started: daily-summary
✓ All cron jobs started successfully
```

## Common Use Cases

### 1. Schedule a Session with Conflict Check

```typescript
// Frontend code
async function scheduleSession(data) {
  // 1. Check for conflicts
  const validation = await fetch("/api/sessions/check-conflicts", {
    method: "POST",
    body: JSON.stringify({
      action: "validate_scheduling",
      ...data
    })
  }).then(r => r.json())

  if (!validation.data.valid) {
    // Show errors and suggestions
    alert(validation.data.errors.join("\n"))
    return validation.data.suggestions
  }

  // 2. Create session
  const session = await fetch("/api/sessions", {
    method: "POST",
    body: JSON.stringify(data)
  }).then(r => r.json())

  return session
}
```

### 2. Create Weekly Therapy Sessions

```typescript
const series = await fetch("/api/sessions/recurring", {
  method: "POST",
  body: JSON.stringify({
    action: "create_series",
    psychologistId: 1,
    patientId: 2,
    clinicId: 1,
    startDate: new Date("2024-12-01T10:00:00"),
    duration: 50,
    type: "therapy",
    timezone: "America/Sao_Paulo",
    pattern: "weekly",
    occurrences: 12, // 3 months of weekly sessions
    notes: "CBT weekly sessions"
  })
}).then(r => r.json())

console.log(`Created ${series.data.metadata.createdSessions} sessions`)
```

### 3. Update User Reminder Preferences

```typescript
await fetch("/api/sessions/reminders", {
  method: "PUT",
  body: JSON.stringify({
    emailRemindersEnabled: true,
    smsRemindersEnabled: true,
    reminderBefore24h: true,
    reminderBefore1h: true,
    reminderBefore15min: false
  })
})
```

## Troubleshooting

### Issue: Reminders not being sent

**Solutions:**
1. Check `ENABLE_CRON=true` in `.env.local`
2. Verify cron jobs are running (check logs)
3. Create a test session 25 hours in the future
4. Check user has reminder preferences enabled
5. Manually trigger job: `POST /api/cron/session-reminders`

### Issue: SMS not working

**Solutions:**
1. Verify Twilio credentials in `.env.local`
2. Check user has phone number in database
3. Use E.164 format: `+1234567890`
4. Check Twilio console for errors
5. Verify Twilio account balance

### Issue: Conflicts not detected

**Solutions:**
1. Check session status (must be 'scheduled' or 'confirmed')
2. Verify timezone is correct
3. Check session times overlap (including buffer)
4. Look for database query errors in logs

### Issue: Recurring sessions not creating

**Solutions:**
1. Check validation errors in response
2. Verify start date is in future
3. Check occurrences or endDate is provided
4. Look for conflict detection blocking creation
5. Check database constraints

## Next Steps

1. **Customize Email Templates**: Edit `/lib/session-reminders.ts` email HTML
2. **Adjust Cron Schedule**: Modify `/lib/cron/session-reminders.ts` schedules
3. **Configure Buffer Times**: Update `MIN_BREAK_MINUTES` in `/lib/session-conflicts.ts`
4. **Add Custom Validations**: Extend validation in conflict service
5. **Integrate with Frontend**: Build UI components for scheduling

## Production Checklist

Before deploying to production:

- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Twilio account verified and funded
- [ ] Email templates customized
- [ ] Cron jobs tested manually
- [ ] Timezone handling verified
- [ ] SMS delivery tested
- [ ] Email delivery tested
- [ ] Push notifications tested
- [ ] Error logging configured
- [ ] Monitoring set up for cron jobs
- [ ] Rate limiting configured for APIs
- [ ] Database indexes created
- [ ] Load testing completed

## Support

For detailed documentation, see:
- [Full Documentation](/docs/SESSION_REMINDERS_AND_SCHEDULING.md)
- [Database Schema](/db/schema.ts)
- [API Reference](/docs/SESSION_REMINDERS_AND_SCHEDULING.md#api-endpoints)

## Quick Reference

**Libraries:**
- `/lib/session-reminders.ts` - Reminder service
- `/lib/session-conflicts.ts` - Conflict detection
- `/lib/recurring-sessions.ts` - Recurring sessions
- `/lib/cron/session-reminders.ts` - Cron jobs

**API Endpoints:**
- `/api/sessions/reminders` - Reminder preferences
- `/api/sessions/check-conflicts` - Conflict detection
- `/api/sessions/recurring` - Recurring sessions
- `/api/cron/session-reminders` - Cron management (admin)

**Environment Variables:**
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number
- `ENABLE_CRON` - Enable cron jobs (true/false)

That's it! You're ready to go. 🚀
