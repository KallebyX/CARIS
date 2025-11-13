# Calendar Integration - Quick Start

## Overview

This module provides bi-directional calendar synchronization between CÁRIS and external calendar providers (Google Calendar and Outlook Calendar).

## Quick Setup (5 minutes)

### 1. Run Migrations

```bash
./scripts/run-calendar-migrations.sh
```

### 2. Configure Environment Variables

Copy these to your `.env.local`:

```env
# Google Calendar API
GOOGLE_CALENDAR_CLIENT_ID=your_client_id_here
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback

# Microsoft Graph API
MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/calendar/outlook/callback
```

### 3. Test the Integration

```bash
# Start dev server
pnpm dev

# Navigate to: http://localhost:3000/dashboard/settings/calendar
# Click "Connect Google Calendar" or "Connect Outlook Calendar"
```

## Key Files

### Services
- `/lib/calendar/google.ts` - Google Calendar API client
- `/lib/calendar/outlook.ts` - Outlook Calendar API client
- `/lib/calendar/integration.ts` - Basic calendar sync
- `/lib/calendar/calendar-sync-enhanced.ts` - Advanced bi-directional sync
- `/lib/calendar/timezone-handler.ts` - Timezone utilities
- `/lib/calendar/sync-monitor.ts` - Monitoring and metrics

### Components
- `/components/calendar/calendar-widget.tsx` - Dashboard calendar widget
- `/app/dashboard/(patient)/settings/calendar/page.tsx` - Patient calendar settings
- `/app/dashboard/(psychologist)/settings/calendar/page.tsx` - Psychologist calendar settings

### API Routes
- `/app/api/calendar/google/*` - Google OAuth and operations
- `/app/api/calendar/outlook/*` - Outlook OAuth and operations
- `/app/api/calendar/sync/*` - Sync operations and status

### Tests
- `/__tests__/integration/calendar.test.ts` - Integration tests

### Documentation
- `/docs/CALENDAR_INTEGRATION.md` - Complete documentation
- `/docs/CALENDAR_TESTING_GUIDE.md` - Testing guide

## Usage Examples

### Sync a Session to Calendars

```typescript
import { EnhancedCalendarSyncService } from '@/lib/calendar/calendar-sync-enhanced';

const syncService = new EnhancedCalendarSyncService();

// Sync user's calendar
const result = await syncService.syncUserCalendar({
  userId: 123,
  direction: 'bidirectional',
  resolveConflicts: true,
  conflictResolution: 'newest',
});

console.log(`Synced: ${result.synced}, Failed: ${result.failed}`);
```

### Handle Timezones

```typescript
import { TimezoneHandler } from '@/lib/calendar/timezone-handler';

// Convert timezone
const convertedTime = TimezoneHandler.convertSessionTime(
  sessionDate,
  'America/Sao_Paulo',
  'America/New_York'
);

// Get timezone info
const info = TimezoneHandler.getTimezoneInfo('America/Sao_Paulo');
console.log(info.offsetString); // "-03:00"
```

### Monitor Sync Operations

```typescript
import { CalendarSyncMonitor } from '@/lib/calendar/sync-monitor';

const monitor = new CalendarSyncMonitor();

// Get metrics
const metrics = await monitor.getUserSyncMetrics(userId);
console.log(`Success rate: ${metrics.successRate}%`);

// Check quota
const quota = await monitor.monitorQuotaUsage(userId, 'google');
console.log(`Quota remaining: ${quota.quotaRemaining}`);
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 CÁRIS Platform                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Sessions   │  │  User        │  │  Sync     │  │
│  │  Database   │  │  Settings    │  │  Logs     │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  │
│         │                │                 │         │
│         └────────────────┴─────────────────┘         │
│                          │                           │
└──────────────────────────┼───────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │   Calendar Sync Enhanced          │
         │   - Bi-directional sync           │
         │   - Conflict resolution           │
         │   - Batch operations              │
         └─────────────┬────────────────────┘
                       │
         ┌─────────────┴────────────────┐
         │                              │
    ┌────▼─────┐                 ┌─────▼─────┐
    │  Google  │                 │  Outlook  │
    │ Calendar │                 │  Calendar │
    │   API    │                 │    API    │
    └──────────┘                 └───────────┘
```

## Features Checklist

✅ Google Calendar OAuth
✅ Outlook Calendar OAuth
✅ Create session → Create calendar event
✅ Update session → Update calendar event
✅ Delete session → Delete calendar event
✅ Bi-directional sync
✅ Conflict detection
✅ Conflict resolution
✅ Timezone handling
✅ DST support
✅ Reminder configuration
✅ Batch sync
✅ Auto-sync (every 15 min)
✅ Manual sync
✅ Sync monitoring
✅ Quota tracking
✅ Error handling
✅ Token refresh
✅ Comprehensive tests
✅ Complete documentation

## Common Issues

### Issue: "Access Denied" during OAuth

**Solution**: Check that redirect URI in provider console matches exactly with your environment variable.

### Issue: Events not syncing

**Solution**:
1. Check calendar is connected (Settings > Calendar)
2. Verify sync is enabled
3. Click "Sync Now" to manually trigger
4. Check sync history for errors

### Issue: Wrong timezone

**Solution**:
1. Check user timezone in Settings > Calendar
2. Verify session timezone field in database
3. Use TimezoneHandler utility for conversions

## Performance

- **Sync Duration**: ~100ms per session
- **Batch Sync**: ~10-20 seconds for 100 sessions
- **API Quota**: 10,000 requests/day (Google), 10,000 requests/10min (Outlook)
- **Auto-Sync**: Every 15 minutes (configurable)

## Security

- ✅ OAuth 2.0 authentication
- ✅ Encrypted token storage
- ✅ Role-based access control
- ✅ Secure token refresh
- ✅ Audit logging
- ✅ LGPD/GDPR compliant

## Next Steps

1. Read full documentation: `/docs/CALENDAR_INTEGRATION.md`
2. Review testing guide: `/docs/CALENDAR_TESTING_GUIDE.md`
3. Run tests: `pnpm test calendar`
4. Test OAuth flows in UI
5. Monitor sync operations

## Support

- **Full Documentation**: `/docs/CALENDAR_INTEGRATION.md`
- **Testing Guide**: `/docs/CALENDAR_TESTING_GUIDE.md`
- **GitHub Issues**: Tag with `calendar`
- **Email**: support@caris.com

## License

Copyright © 2024 CÁRIS. All rights reserved.
