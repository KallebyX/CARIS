# Calendar Integration Testing Guide

This guide provides comprehensive testing instructions for the CÁRIS calendar integration with Google Calendar and Outlook Calendar.

## Prerequisites

### 1. Development Environment Setup

```bash
# Install dependencies
pnpm install

# Run database migrations
./scripts/run-calendar-migrations.sh

# Start development server
pnpm dev
```

### 2. Environment Configuration

Ensure your `.env.local` has the following variables:

```env
# Google Calendar
GOOGLE_CALENDAR_CLIENT_ID=your_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback

# Microsoft Outlook
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/calendar/outlook/callback
```

### 3. Test Accounts

Prepare test accounts for:
- Google Calendar account (Gmail)
- Microsoft account (Outlook/Hotmail)
- CÁRIS platform (psychologist and patient)

## Testing Scenarios

### Phase 1: OAuth Flow Testing

#### Test 1.1: Google Calendar OAuth

**Steps:**
1. Login as psychologist
2. Navigate to Settings > Calendar
3. Click "Connect Google Calendar"
4. Verify redirect to Google OAuth consent screen
5. Grant permissions
6. Verify redirect back to CÁRIS
7. Confirm "Connected" badge appears

**Expected Results:**
- ✅ Smooth redirect flow
- ✅ Success toast notification
- ✅ Calendar connection status shows "Connected"
- ✅ Access and refresh tokens stored in database

**Test Data:**
```typescript
// Check database
SELECT
  google_calendar_enabled,
  google_calendar_access_token IS NOT NULL as has_access_token,
  google_calendar_refresh_token IS NOT NULL as has_refresh_token
FROM user_settings
WHERE user_id = <test_user_id>;
```

#### Test 1.2: Outlook Calendar OAuth

**Steps:**
1. Login as psychologist
2. Navigate to Settings > Calendar
3. Click "Connect Outlook Calendar"
4. Verify redirect to Microsoft OAuth consent screen
5. Grant permissions
6. Verify redirect back to CÁRIS
7. Confirm "Connected" badge appears

**Expected Results:**
- ✅ Smooth redirect flow
- ✅ Success toast notification
- ✅ Calendar connection status shows "Connected"
- ✅ Access and refresh tokens stored in database

#### Test 1.3: Error Handling - Access Denied

**Steps:**
1. Start OAuth flow
2. Click "Cancel" or "Deny" on consent screen

**Expected Results:**
- ✅ Redirect back to CÁRIS with error message
- ✅ Clear error toast notification
- ✅ Calendar remains disconnected

### Phase 2: Session Sync Testing

#### Test 2.1: Create Session and Auto-Sync

**Steps:**
1. Login as psychologist with connected calendar
2. Create a new session with a patient
3. Fill in details:
   - Patient: Test Patient
   - Date: Tomorrow at 2:00 PM
   - Duration: 50 minutes
   - Type: Online
4. Save session
5. Check external calendar

**Expected Results:**
- ✅ Session created in CÁRIS database
- ✅ Event created in Google Calendar (if connected)
- ✅ Event created in Outlook Calendar (if connected)
- ✅ Event title: "Consulta com Test Patient"
- ✅ Event time matches session time
- ✅ Event duration is 50 minutes
- ✅ Patient email added as attendee
- ✅ Event ID stored in database

**Verification:**
```typescript
// Check database
SELECT
  id,
  scheduled_at,
  google_calendar_event_id,
  outlook_calendar_event_id
FROM sessions
WHERE id = <session_id>;
```

#### Test 2.2: Update Session and Sync

**Steps:**
1. Update an existing synced session
2. Change time to 3:00 PM
3. Change duration to 60 minutes
4. Save changes
5. Check external calendar

**Expected Results:**
- ✅ Session updated in CÁRIS
- ✅ Event updated in Google Calendar
- ✅ Event updated in Outlook Calendar
- ✅ New time reflected
- ✅ New duration reflected

#### Test 2.3: Delete Session and Sync

**Steps:**
1. Delete a synced session
2. Confirm deletion
3. Check external calendar

**Expected Results:**
- ✅ Session deleted from CÁRIS
- ✅ Event deleted from Google Calendar
- ✅ Event deleted from Outlook Calendar
- ✅ No orphaned events

#### Test 2.4: Batch Sync Multiple Sessions

**Steps:**
1. Create 5 sessions for the next week
2. Click "Sync Now" button
3. Wait for sync to complete

**Expected Results:**
- ✅ All 5 sessions synced
- ✅ Success message shows "5 sessions synced"
- ✅ All events visible in external calendar
- ✅ Sync history updated

### Phase 3: Conflict Resolution Testing

#### Test 3.1: Time Mismatch Detection

**Steps:**
1. Create and sync a session for 2:00 PM
2. Manually edit the event in Google Calendar to 3:00 PM
3. Wait for or trigger automatic sync
4. Check CÁRIS platform

**Expected Results:**
- ✅ Conflict detected
- ✅ Conflict logged
- ✅ Based on strategy:
  - Keep Local: Event updated back to 2:00 PM
  - Keep External: Session updated to 3:00 PM
  - Newest: Most recent change wins

**Verification:**
```sql
SELECT * FROM calendar_sync_logs
WHERE user_id = <user_id>
AND conflict_count > 0
ORDER BY synced_at DESC
LIMIT 1;
```

#### Test 3.2: Deleted External Event

**Steps:**
1. Create and sync a session
2. Delete the event in Google Calendar
3. Trigger sync

**Expected Results:**
- ✅ Conflict detected (deleted_external)
- ✅ Session remains in CÁRIS
- ✅ User notified of conflict

### Phase 4: Timezone Testing

#### Test 4.1: Different Timezones

**Steps:**
1. Set psychologist timezone: São Paulo (GMT-3)
2. Set patient timezone: New York (GMT-5)
3. Create session for 2:00 PM São Paulo time
4. Check both calendars

**Expected Results:**
- ✅ Psychologist sees 2:00 PM São Paulo
- ✅ Patient sees 12:00 PM New York
- ✅ Event stored with correct timezone
- ✅ Both calendars show correct local time

#### Test 4.2: Daylight Saving Time

**Steps:**
1. Create sessions spanning DST transition dates
2. Verify times in both standard and daylight time

**Expected Results:**
- ✅ Times adjust correctly for DST
- ✅ No off-by-one-hour errors
- ✅ Timezone info shows correct offset

### Phase 5: Reminder Testing

#### Test 5.1: Reminder Configuration

**Steps:**
1. Enable reminders:
   - 24 hours before ✓
   - 1 hour before ✓
   - 15 minutes before ✗
2. Create session
3. Check calendar event

**Expected Results:**
- ✅ Google Calendar event has 2 reminders
- ✅ 24-hour email reminder
- ✅ 1-hour popup reminder
- ✅ No 15-minute reminder

#### Test 5.2: Reminder Delivery

**Steps:**
1. Create session 25 hours from now
2. Wait for 24-hour reminder trigger
3. Check email and notifications

**Expected Results:**
- ✅ Email reminder received
- ✅ Calendar notification appears
- ✅ Reminder content includes session details

### Phase 6: Settings Testing

#### Test 6.1: Enable/Disable Sync

**Steps:**
1. Disable Google Calendar sync
2. Create new session
3. Check Google Calendar
4. Re-enable sync
5. Click "Sync Now"

**Expected Results:**
- ✅ No event created when disabled
- ✅ Event created when re-enabled and synced

#### Test 6.2: Timezone Change

**Steps:**
1. Change timezone from São Paulo to Manaus
2. View existing sessions
3. Create new session

**Expected Results:**
- ✅ Existing sessions show in new timezone
- ✅ New sessions use new timezone
- ✅ Calendar events updated with new timezone

#### Test 6.3: Sync Frequency

**Steps:**
1. Set auto-sync frequency to 15 minutes
2. Wait 15 minutes
3. Check sync history

**Expected Results:**
- ✅ Automatic sync triggered
- ✅ Sync history updated
- ✅ New entry every 15 minutes

### Phase 7: Error Handling Testing

#### Test 7.1: Expired Token

**Steps:**
1. Manually expire access token in database
2. Trigger sync
3. Observe behavior

**Expected Results:**
- ✅ Automatic token refresh attempted
- ✅ Sync continues with new token
- ✅ Or, user prompted to reconnect if refresh fails

#### Test 7.2: Network Error

**Steps:**
1. Disconnect internet
2. Trigger sync
3. Reconnect internet

**Expected Results:**
- ✅ Error message displayed
- ✅ Sync status shows failed
- ✅ Retry mechanism activates
- ✅ Sync succeeds when reconnected

#### Test 7.3: API Rate Limit

**Steps:**
1. Trigger many syncs rapidly
2. Monitor API quota

**Expected Results:**
- ✅ Rate limiting respected
- ✅ Requests queued
- ✅ Warning if approaching quota
- ✅ Graceful degradation

### Phase 8: Performance Testing

#### Test 8.1: Large Batch Sync

**Steps:**
1. Create 100 sessions
2. Trigger batch sync
3. Monitor performance

**Expected Results:**
- ✅ All sessions sync successfully
- ✅ Sync completes in reasonable time (<5 min)
- ✅ No memory leaks
- ✅ Progress indication

**Metrics to Monitor:**
```typescript
{
  totalSessions: 100,
  syncDuration: '<duration>ms',
  averagePerSession: '<avg>ms',
  successRate: '100%',
  errorRate: '0%'
}
```

#### Test 8.2: Concurrent Users

**Steps:**
1. Simulate 10 users syncing simultaneously
2. Monitor system resources
3. Check for race conditions

**Expected Results:**
- ✅ All syncs complete successfully
- ✅ No deadlocks
- ✅ No duplicate events
- ✅ Acceptable response times

### Phase 9: Patient Testing

#### Test 9.1: Patient Calendar View

**Steps:**
1. Login as patient
2. Connect calendar
3. View upcoming sessions

**Expected Results:**
- ✅ Patient can connect calendar
- ✅ Sessions appear in patient's calendar
- ✅ Psychologist info included
- ✅ Reminders work for patient

#### Test 9.2: Shared Session Events

**Steps:**
1. Check session event in both calendars
2. Verify attendee list

**Expected Results:**
- ✅ Both psychologist and patient are attendees
- ✅ Both receive reminders
- ✅ Both can see event details

### Phase 10: Security Testing

#### Test 10.1: Token Storage

**Steps:**
1. Check database for tokens
2. Verify encryption

**Expected Results:**
- ✅ Tokens not stored in plaintext
- ✅ Refresh tokens properly secured
- ✅ Tokens never exposed to client

#### Test 10.2: Authorization

**Steps:**
1. Try to access other user's calendar settings
2. Try to sync other user's sessions

**Expected Results:**
- ✅ 403 Forbidden errors
- ✅ Cannot access other users' data
- ✅ Proper role-based access control

## Running Automated Tests

```bash
# Run all tests
pnpm test

# Run calendar-specific tests
pnpm test calendar

# Run with coverage
pnpm test:coverage

# Run integration tests
pnpm test __tests__/integration/calendar.test.ts
```

## Test Coverage Checklist

- [ ] OAuth flow for Google Calendar
- [ ] OAuth flow for Outlook Calendar
- [ ] Session creation with auto-sync
- [ ] Session update with auto-sync
- [ ] Session deletion with auto-sync
- [ ] Batch sync operations
- [ ] Conflict detection and resolution
- [ ] Timezone conversion
- [ ] DST handling
- [ ] Reminder configuration
- [ ] Settings management
- [ ] Error handling (expired tokens)
- [ ] Error handling (network errors)
- [ ] Error handling (API rate limits)
- [ ] Performance (large batches)
- [ ] Security (token storage)
- [ ] Security (authorization)
- [ ] Patient calendar access
- [ ] Multi-calendar support

## Reporting Issues

When reporting calendar integration issues, include:

1. **Environment**: Development/Staging/Production
2. **Browser**: Chrome/Firefox/Safari/Edge (version)
3. **Calendar Provider**: Google/Outlook
4. **User Role**: Psychologist/Patient
5. **Steps to Reproduce**
6. **Expected Behavior**
7. **Actual Behavior**
8. **Screenshots/Videos**
9. **Console Errors**
10. **Network Logs** (if applicable)

## Success Criteria

The calendar integration is considered successful when:

✅ OAuth flows work for both providers
✅ Sessions sync bidirectionally
✅ Conflicts are detected and resolved
✅ Timezones are handled correctly
✅ Reminders work as configured
✅ Error handling is robust
✅ Performance is acceptable
✅ Security measures are in place
✅ Test coverage > 80%
✅ No critical bugs in production

## Next Steps After Testing

1. Deploy to staging environment
2. Conduct user acceptance testing (UAT)
3. Monitor sync logs and metrics
4. Gather user feedback
5. Iterate based on feedback
6. Deploy to production
7. Set up monitoring and alerts
8. Document known issues and workarounds

## Support

For testing support:
- **Documentation**: `/docs/CALENDAR_INTEGRATION.md`
- **Slack Channel**: #calendar-integration
- **GitHub Issues**: Tag with `calendar` label
- **Email**: dev-team@caris.com
