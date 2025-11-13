# Calendar Integration - CÁRIS Platform

## Overview

CÁRIS provides comprehensive calendar integration with Google Calendar and Outlook Calendar, allowing seamless synchronization of therapy sessions between the platform and external calendars. This document provides setup instructions, technical details, and troubleshooting guidance.

## Features

### Core Features
- **Bi-directional Sync**: Sessions sync from CÁRIS to external calendars and vice versa
- **Multiple Providers**: Support for Google Calendar and Microsoft Outlook Calendar
- **Automatic Sync**: Configurable automatic synchronization every 15 minutes
- **Manual Sync**: On-demand synchronization trigger
- **Conflict Resolution**: Intelligent handling of scheduling conflicts
- **Timezone Support**: Proper timezone conversion and handling across different regions
- **Reminders**: Configurable reminders (24h, 1h, 15min before sessions)
- **Real-time Updates**: Changes in CÁRIS automatically reflect in external calendars
- **Batch Operations**: Efficient syncing of multiple sessions

### Advanced Features
- **Conflict Detection**: Identifies time mismatches and scheduling conflicts
- **Retry Logic**: Automatic retry with exponential backoff on failures
- **Quota Monitoring**: Track API usage to avoid rate limits
- **Sync History**: Complete audit trail of all sync operations
- **Error Tracking**: Comprehensive error logging and alerts
- **Performance Metrics**: Monitor sync success rates and response times

## Setup Instructions

### Google Calendar Integration

#### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Library"
4. Search for and enable "Google Calendar API"

#### 2. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (or "Internal" for Google Workspace)
3. Fill in the required information:
   - App name: "CÁRIS Mental Health Platform"
   - User support email: Your support email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. Add test users (for testing phase)

#### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Application type: "Web application"
4. Name: "CÁRIS Calendar Integration"
5. Authorized redirect URIs:
   ```
   http://localhost:3000/api/calendar/google/callback (development)
   https://yourdomain.com/api/calendar/google/callback (production)
   ```
6. Save the Client ID and Client Secret

#### 4. Configure Environment Variables

Add to `.env.local`:

```env
# Google Calendar Integration
GOOGLE_CALENDAR_CLIENT_ID=your_client_id_here
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback
```

### Outlook Calendar Integration

#### 1. Register Application in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Fill in the details:
   - Name: "CÁRIS Calendar Integration"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: Web - `http://localhost:3000/api/calendar/outlook/callback`

#### 2. Configure API Permissions

1. Go to "API permissions" in your app
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Select "Delegated permissions"
5. Add the following permissions:
   - `Calendars.ReadWrite`
   - `Calendars.ReadWrite.Shared`
   - `offline_access`
6. Click "Grant admin consent"

#### 3. Create Client Secret

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Add description: "CÁRIS Integration"
4. Select expiration period
5. Save the secret value immediately (you won't see it again)

#### 4. Configure Environment Variables

Add to `.env.local`:

```env
# Microsoft Calendar Integration
MICROSOFT_CLIENT_ID=your_application_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/calendar/outlook/callback
```

## Usage Guide

### For Patients

#### Connecting Your Calendar

1. Navigate to **Dashboard > Settings > Calendar**
2. Click "Connect Google Calendar" or "Connect Outlook Calendar"
3. Authorize CÁRIS to access your calendar
4. Configure sync preferences:
   - Enable automatic sync
   - Set timezone
   - Configure reminder preferences
5. Click "Save Settings"

#### Managing Sync

- **Manual Sync**: Click "Sync Now" button to immediately sync sessions
- **Sync Status**: View sync history and status indicators
- **Disconnect**: Click "Disconnect" to revoke calendar access

### For Psychologists

#### Connecting Your Calendar

1. Navigate to **Dashboard > Settings > Calendar**
2. Click "Connect Google Calendar" or "Connect Outlook Calendar"
3. Authorize CÁRIS to access your calendar
4. Configure sync preferences:
   - Enable automatic sync
   - Choose to sync all patients or specific ones
   - Set timezone
   - Configure reminder preferences
5. Click "Save Settings"

#### Calendar Events

Synchronized session events include:
- **Title**: "Consulta com [Patient Name]"
- **Description**: Session type and notes
- **Attendees**: Patient and psychologist emails
- **Duration**: Configurable (default 50 minutes)
- **Reminders**: Based on user preferences

## Technical Details

### Architecture

```
┌─────────────────┐
│  CÁRIS Platform │
│   (Sessions)    │
└────────┬────────┘
         │
         ├──────────────────┬──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Calendar Sync   │ │  Timezone       │ │  Sync Monitor   │
│    Enhanced     │ │   Handler       │ │                 │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         ├───────────────────┴───────────────────┤
         │                                       │
         ▼                                       ▼
┌─────────────────┐                   ┌─────────────────┐
│ Google Calendar │                   │ Outlook Calendar│
│      API        │                   │      API        │
└─────────────────┘                   └─────────────────┘
```

### Sync Behavior

#### To Calendar (CÁRIS → External)

1. Query upcoming sessions from database
2. For each session:
   - Check if calendar integration is enabled
   - Build event with session details
   - Create or update event in external calendar
   - Store event ID in database
   - Track sync status

#### From Calendar (External → CÁRIS)

1. Query events from external calendar
2. For each event:
   - Match event ID with database sessions
   - Check for time mismatches or conflicts
   - Apply conflict resolution strategy
   - Update local session if needed
   - Log conflicts for review

#### Conflict Resolution Strategies

1. **Keep Local**: Use CÁRIS data as source of truth
2. **Keep External**: Use calendar data as source of truth
3. **Newest**: Use most recently modified version
4. **Manual**: Flag for user review

### Database Schema

#### Sessions Table (existing)

```sql
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  psychologist_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL DEFAULT 50,
  type TEXT NOT NULL DEFAULT 'therapy',
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,

  -- Calendar Integration Fields
  google_calendar_event_id TEXT,
  outlook_calendar_event_id TEXT,
  timezone TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Calendar Sync Logs Table (new)

```sql
CREATE TABLE calendar_sync_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  direction TEXT NOT NULL, -- 'to_calendar', 'from_calendar', 'bidirectional'
  provider TEXT, -- 'google', 'outlook', 'both'
  success BOOLEAN NOT NULL,
  synced_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  conflict_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB,
  duration INTEGER, -- milliseconds
  synced_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### User Settings Table (existing)

```sql
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS google_calendar_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS google_calendar_access_token TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS outlook_calendar_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS outlook_calendar_access_token TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS outlook_calendar_refresh_token TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS reminder_before_24h BOOLEAN DEFAULT TRUE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS reminder_before_1h BOOLEAN DEFAULT TRUE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS reminder_before_15min BOOLEAN DEFAULT FALSE;
```

### API Endpoints

#### Authentication

```
GET  /api/calendar/google/auth     - Get Google OAuth URL
GET  /api/calendar/google/callback - Handle Google OAuth callback
GET  /api/calendar/outlook/auth    - Get Outlook OAuth URL
GET  /api/calendar/outlook/callback - Handle Outlook OAuth callback
POST /api/calendar/google/disconnect - Disconnect Google Calendar
POST /api/calendar/outlook/disconnect - Disconnect Outlook Calendar
```

#### Sync Operations

```
POST /api/calendar/sync            - Trigger manual sync
GET  /api/calendar/sync/status     - Get sync status
GET  /api/calendar/sync/history    - Get sync history
```

#### Settings

```
GET  /api/calendar/settings        - Get calendar settings
PUT  /api/calendar/settings        - Update calendar settings
```

### API Rate Limits

#### Google Calendar API

- **Quota**: 1,000,000 requests per day
- **Per User**: 10,000 requests per day
- **Rate**: 10 queries per second

**Recommendations**:
- Implement exponential backoff
- Cache calendar data when possible
- Batch operations where supported
- Monitor quota usage in Google Cloud Console

#### Microsoft Graph API

- **Quota**: 10,000 requests per 10 minutes per app
- **Throttling**: 429 responses when limits exceeded
- **Retry-After**: Header indicates wait time

**Recommendations**:
- Respect Retry-After headers
- Implement exponential backoff
- Use delta queries for incremental changes
- Monitor throttling in Azure Portal

### Timezone Handling

The platform supports proper timezone conversion:

```typescript
// User timezones
const brazilTimezones = [
  'America/Sao_Paulo',    // GMT-3 (Brasília)
  'America/Manaus',       // GMT-4
  'America/Rio_Branco',   // GMT-5
  'America/Noronha',      // GMT-2
];

// Timezone conversion
const sessionTime = TimezoneHandler.convertSessionTime(
  session.scheduledAt,
  session.timezone,
  user.timezone
);

// DST detection
const isDST = TimezoneHandler.isDaylightSavingTime(
  new Date(),
  'America/Sao_Paulo'
);
```

## Troubleshooting

### Common Issues

#### 1. "Access Denied" Error

**Cause**: User didn't grant calendar permissions

**Solution**:
- Ensure OAuth consent screen is properly configured
- Check that required scopes are requested
- Verify redirect URI matches exactly
- Try disconnecting and reconnecting

#### 2. Token Expired

**Cause**: Access token expired and refresh failed

**Solution**:
- Verify refresh token is stored correctly
- Check token refresh logic in service
- Reconnect calendar if refresh token is invalid
- Monitor token expiration times

#### 3. Sync Failures

**Cause**: API errors, network issues, or rate limiting

**Solution**:
- Check API quota usage in provider console
- Review sync logs for specific errors
- Verify network connectivity
- Implement retry logic with backoff
- Check sync monitor metrics

#### 4. Timezone Issues

**Cause**: Incorrect timezone conversion

**Solution**:
- Verify user timezone settings
- Check session timezone field
- Use TimezoneHandler utility
- Test with different timezone combinations

#### 5. Duplicate Events

**Cause**: Event ID not properly stored or sync ran multiple times

**Solution**:
- Check event IDs in database
- Verify sync logic checks for existing events
- Review sync frequency settings
- Check for race conditions

### Debug Mode

Enable detailed logging:

```env
DEBUG=calendar:*
LOG_LEVEL=debug
```

### Monitoring

Check sync health:

```typescript
// Get sync metrics
const metrics = await syncMonitor.getUserSyncMetrics(userId);

// Check quota usage
const quotaUsage = await syncMonitor.monitorQuotaUsage(userId, 'google');

// View sync history
const history = await syncMonitor.getSyncHistory(userId, 10);
```

## Security Considerations

### Token Storage

- Access tokens encrypted at rest
- Refresh tokens stored securely
- Regular token rotation
- Tokens never exposed to client

### API Security

- Rate limiting on all endpoints
- Authentication required for all operations
- Role-based access control
- Input validation and sanitization

### Data Privacy

- Minimal data shared with calendars
- Patient information anonymized when possible
- LGPD/GDPR compliant data handling
- Audit logging of all sync operations

## Performance Optimization

### Best Practices

1. **Batch Operations**: Sync multiple sessions in single API call
2. **Caching**: Cache calendar settings and avoid redundant queries
3. **Async Processing**: Use background jobs for sync operations
4. **Pagination**: Handle large result sets efficiently
5. **Error Recovery**: Implement robust retry logic

### Performance Metrics

Monitor these metrics:

- Average sync duration
- Success rate percentage
- API response times
- Conflict resolution rate
- Error distribution

## Support

For additional support:

- **Documentation**: `/docs/CALENDAR_INTEGRATION.md`
- **API Reference**: `/docs/api/calendar.md`
- **GitHub Issues**: Submit bug reports and feature requests
- **Email Support**: support@caris.com

## Changelog

### Version 1.0.0 (2024-01-15)

- Initial calendar integration release
- Google Calendar support
- Outlook Calendar support
- Bi-directional sync
- Timezone handling
- Conflict resolution
- Sync monitoring
- Comprehensive testing

## Future Enhancements

- [ ] Apple Calendar support
- [ ] Calendar selection (multiple calendars per provider)
- [ ] Advanced conflict resolution UI
- [ ] Bulk import/export
- [ ] Calendar templates
- [ ] AI-powered scheduling suggestions
- [ ] Integration with video call platforms
- [ ] Shared calendars support
- [ ] Calendar overlays and views
- [ ] Advanced filtering and search

## License

Copyright © 2024 CÁRIS. All rights reserved.
