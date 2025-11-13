# Sentry Integration - CÁRIS SaaS Pro

Complete Sentry monitoring integration for error tracking, performance monitoring, and application health.

## Overview

The CÁRIS platform now includes comprehensive Sentry integration for:

- ✅ **Error Tracking**: Automatic capture of client and server errors
- ✅ **Performance Monitoring**: API, database, and component performance tracking
- ✅ **Session Replay**: User session recordings for debugging
- ✅ **Health Monitoring**: System health checks and uptime tracking
- ✅ **Custom Metrics**: Business-specific KPIs and analytics
- ✅ **Alert System**: Configurable alerts for critical events
- ✅ **Privacy Compliance**: PII scrubbing for mental health data

## Quick Links

- 📚 [Setup Guide](./SENTRY_SETUP.md) - Complete setup instructions
- 🔔 [Alerts Configuration](./MONITORING_ALERTS.md) - Alert rules and routing
- 📊 [Monitoring Dashboard](../app/admin/monitoring/page.tsx) - Admin monitoring UI
- 🔧 [Health Check API](../app/api/health/route.ts) - Health check endpoint

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     CÁRIS Application                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Client     │  │   Server     │  │  Monitoring  │      │
│  │   (Browser)  │  │   (Node.js)  │  │  Dashboard   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         │                 │                  │               │
│  ┌──────▼─────────────────▼──────────────────▼───────┐      │
│  │          Sentry Integration Layer                 │      │
│  │                                                    │      │
│  │  • Error Tracking    • Performance Monitoring     │      │
│  │  • Session Replay    • Health Checks              │      │
│  │  • Custom Metrics    • Alert Rules                │      │
│  └────────────────────────┬───────────────────────────┘      │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │  Sentry Cloud  │
                   │                │
                   │  • Dashboard   │
                   │  • Alerts      │
                   │  • Analytics   │
                   └────────────────┘
```

### Files Structure

```
CARIS/
├── sentry.client.config.ts          # Client-side Sentry config
├── sentry.server.config.ts          # Server-side Sentry config
├── next.config.js                   # Sentry webpack plugin
│
├── lib/
│   ├── sentry-helpers.ts            # Helper utilities
│   ├── error-tracking.ts            # Custom error tracking
│   ├── sentry-performance.ts        # Performance monitoring
│   └── logger.ts                    # Structured logging
│
├── components/
│   └── error-boundary.tsx           # Error boundary component
│
├── app/
│   ├── admin/
│   │   └── monitoring/
│   │       └── page.tsx             # Monitoring dashboard
│   └── api/
│       └── health/
│           └── route.ts             # Enhanced health check
│
└── docs/
    ├── SENTRY_SETUP.md              # Setup guide
    ├── MONITORING_ALERTS.md         # Alert configuration
    └── SENTRY_INTEGRATION.md        # This file
```

## Features

### 1. Error Tracking

**Automatic Error Capture**:
- Uncaught exceptions
- Promise rejections
- React component errors
- API errors
- Database errors

**Custom Error Classes**:
```typescript
import {
  ApiError,
  DatabaseError,
  AuthenticationError,
  ValidationError,
  NotFoundError
} from '@/lib/error-tracking'

// Throw custom errors
throw new ApiError('Failed to fetch data', '/api/users', 'GET', 500)
throw new DatabaseError('Query failed', query, 'users')
throw new AuthenticationError('Invalid token')
```

**Error Boundary**:
```typescript
import { ErrorBoundary } from '@/components/error-boundary'

export default function MyPage() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  )
}
```

### 2. Performance Monitoring

**API Endpoint Tracing**:
```typescript
import { traceApi } from '@/lib/sentry-performance'

export async function GET() {
  return traceApi(
    { endpoint: '/api/users', method: 'GET' },
    async (transaction) => {
      const users = await getUsers()
      return NextResponse.json(users)
    }
  )
}
```

**Database Query Tracing**:
```typescript
import { traceDatabaseQuery } from '@/lib/sentry-performance'

const users = await traceDatabaseQuery(
  {
    query: 'SELECT * FROM users WHERE active = true',
    table: 'users',
    operation: 'select'
  },
  async () => {
    return await db.select().from(users).where(eq(users.active, true))
  }
)
```

**Component Performance**:
```typescript
import { onRenderCallback } from '@/lib/sentry-performance'

<Profiler id="MyComponent" onRender={onRenderCallback}>
  <MyComponent />
</Profiler>
```

### 3. Session Replay

**Features**:
- Records user interactions
- Captures console logs
- Shows network requests
- Privacy-first (masks sensitive data)

**Configuration**:
```typescript
// Already configured in sentry.client.config.ts
replaysSessionSampleRate: 0.1,      // 10% of sessions
replaysOnErrorSampleRate: 1.0,      // 100% of error sessions
maskAllText: true,                  // Mask all text
blockAllMedia: true,                // Block all media
```

### 4. Health Monitoring

**Health Check Endpoint**: `/api/health`

**Checks**:
- Database connectivity
- Memory usage
- Pusher/WebSocket status
- Application uptime
- System resources

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "uptime": 86400,
  "version": "1.0.0",
  "environment": "production",
  "responseTime": 50,
  "services": {
    "database": { "status": "healthy", "responseTime": 25 },
    "application": { "status": "healthy" },
    "pusher": { "status": "healthy", "responseTime": 15 }
  },
  "system": {
    "memory": { "used": 256, "total": 512, "percentage": 50 },
    "cpu": { "user": 12345, "system": 6789 },
    "platform": "linux",
    "nodeVersion": "v18.17.0"
  },
  "checks": [...]
}
```

### 5. Custom Metrics

**Track Business Metrics**:
```typescript
import {
  trackCounter,
  trackGauge,
  trackDistribution
} from '@/lib/sentry-performance'

// Count events
trackCounter('user.signup', 1, { plan: 'premium' })

// Track values
trackGauge('active_sessions', 150)

// Track distributions
trackDistribution('api.response_time', 250, 'millisecond', {
  endpoint: '/api/users'
})
```

**Predefined Metrics**:
```typescript
import {
  trackUserEngagement,
  trackFeatureUsage,
  trackConversion,
  trackSessionMetrics
} from '@/lib/sentry-performance'

// User engagement
trackUserEngagement('button_click', { button: 'upgrade' })

// Feature usage
trackFeatureUsage('video-therapy', userId)

// Conversions
trackConversion('subscription', 99.99)

// Session metrics
trackSessionMetrics('video', 45, 2) // 45 min, 2 participants
```

### 6. Structured Logging

**Logger Instance**:
```typescript
import { logger } from '@/lib/logger'

logger.debug('Debug message', { userId: '123' })
logger.info('User logged in', { userId: '123', method: 'email' })
logger.warn('Slow query detected', { query: 'SELECT...', duration: 1500 })
logger.error('API error', error, { endpoint: '/api/users' })
logger.fatal('Critical error', error, { context: 'payment' })
```

**Contextual Loggers**:
```typescript
import { createRequestLogger, createUserLogger } from '@/lib/logger'

// Request-scoped logger
const requestLogger = createRequestLogger(requestId)
requestLogger.info('Processing request')

// User-scoped logger
const userLogger = createUserLogger(userId)
userLogger.info('User action', { action: 'update_profile' })
```

### 7. User Context

**Identify Users**:
```typescript
import { identifyUser, clearUser } from '@/lib/sentry-helpers'

// Set user context
identifyUser({
  id: user.id,
  email: user.email,
  username: user.username,
  role: user.role,
  subscription: user.subscriptionTier
})

// Clear on logout
clearUser()
```

**Custom Context**:
```typescript
import {
  setCustomContext,
  setSessionContext,
  setPaymentContext
} from '@/lib/sentry-helpers'

// Add custom context
setCustomContext('feature', {
  name: 'video-therapy',
  enabled: true,
  version: '2.0'
})

// Session context
setSessionContext({
  sessionId: 'sess_123',
  sessionType: 'video',
  participantCount: 2
})

// Payment context
setPaymentContext({
  amount: 99.99,
  currency: 'USD',
  paymentMethod: 'card'
})
```

### 8. Breadcrumbs

**Add Breadcrumbs**:
```typescript
import {
  addBreadcrumb,
  addNavigationBreadcrumb,
  addUserActionBreadcrumb,
  addApiCallBreadcrumb
} from '@/lib/sentry-helpers'

// Generic breadcrumb
addBreadcrumb({
  category: 'ui',
  message: 'Button clicked',
  level: 'info',
  data: { buttonId: 'submit' }
})

// Navigation
addNavigationBreadcrumb('/dashboard', '/profile')

// User action
addUserActionBreadcrumb('profile_update', {
  fields: ['name', 'email']
})

// API call
addApiCallBreadcrumb('/api/users', 'GET', 200)
```

## Privacy & Compliance

### PII Scrubbing

**Automatic Scrubbing**:
- Email addresses → `em***@example.com`
- JWT tokens → `[TOKEN_REDACTED]`
- Passwords → `[REDACTED]`
- API keys → `[REDACTED]`
- Credit cards → `[REDACTED]`

**Session Replay Privacy**:
```typescript
// Already configured
maskAllText: true              // Mask all text
blockAllMedia: true            // Block images/videos
mask: ['.sensitive', 'input']  // Mask specific elements
block: ['.pii']                // Block PII elements
```

**Before Send Hook**:
```typescript
// Scrubs sensitive data before sending to Sentry
beforeSend(event, hint) {
  // Remove sensitive headers
  delete event.request?.headers?.authorization
  delete event.request?.headers?.cookie

  // Redact email addresses
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map(exception => {
      exception.value = exception.value?.replace(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        '[EMAIL_REDACTED]'
      )
      return exception
    })
  }

  return event
}
```

## Alert Configuration

### Alert Types

1. **Error Rate Alerts** - High error volume
2. **Performance Alerts** - Slow responses
3. **Availability Alerts** - Service downtime
4. **Resource Alerts** - High CPU/memory
5. **Security Alerts** - Suspicious activity

See [MONITORING_ALERTS.md](./MONITORING_ALERTS.md) for detailed configuration.

### Notification Channels

- **Slack**: Real-time alerts to team channels
- **Email**: Important alerts and digests
- **PagerDuty**: Critical incidents
- **Microsoft Teams**: Alternative to Slack

## Monitoring Dashboard

Access the monitoring dashboard at `/admin/monitoring`

**Features**:
- Real-time health status
- Service status (database, Pusher, etc.)
- System metrics (memory, CPU)
- Health check results
- Sentry integration status
- Quick links to Sentry dashboard

## Usage Examples

### Example 1: API Error Tracking

```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server'
import { captureApiError } from '@/lib/error-tracking'
import { traceApi } from '@/lib/sentry-performance'

export async function GET(request: Request) {
  return traceApi(
    { endpoint: '/api/users', method: 'GET' },
    async (transaction) => {
      try {
        const users = await db.select().from(users)
        return NextResponse.json({ users })
      } catch (error) {
        captureApiError(error as Error, {
          endpoint: '/api/users',
          method: 'GET',
          statusCode: 500
        })
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
}
```

### Example 2: Payment Error Tracking

```typescript
import { capturePaymentError } from '@/lib/error-tracking'
import { setPaymentContext } from '@/lib/sentry-helpers'

async function processPayment(paymentData) {
  setPaymentContext({
    amount: paymentData.amount,
    currency: paymentData.currency,
    paymentMethod: paymentData.method
  })

  try {
    const result = await stripe.charges.create(paymentData)
    return result
  } catch (error) {
    capturePaymentError(error, {
      amount: paymentData.amount,
      currency: paymentData.currency,
      paymentMethod: paymentData.method,
      customerId: paymentData.customerId
    })
    throw error
  }
}
```

### Example 3: SOS Emergency Tracking

```typescript
import { captureSosError } from '@/lib/error-tracking'
import { logSosEvent } from '@/lib/logger'

async function triggerSOS(patientId: string, location: string) {
  try {
    logSosEvent(patientId, location)
    await notifyEmergencyContacts(patientId)
  } catch (error) {
    captureSosError(error as Error, {
      patientId,
      location,
      emergencyContacts: 0
    })
    throw error
  }
}
```

### Example 4: Performance Monitoring

```typescript
import { measureAsyncOperation } from '@/lib/logger'
import { trackSessionMetrics } from '@/lib/sentry-performance'

async function createTherapySession(sessionData) {
  const { result, duration } = await measureAsyncOperation(
    'create_therapy_session',
    async () => {
      return await db.insert(sessions).values(sessionData)
    }
  )

  trackSessionMetrics(
    sessionData.type,
    sessionData.duration,
    sessionData.participantCount
  )

  return result
}
```

## Environment Variables

Required environment variables:

```bash
# Sentry DSN (required)
SENTRY_DSN=https://xxxxx@yyyyy.ingest.sentry.io/zzzzz
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@yyyyy.ingest.sentry.io/zzzzz

# Sentry Project (required for source maps)
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=caris-saas-pro
SENTRY_AUTH_TOKEN=your-auth-token

# Environment (optional)
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_RELEASE=$VERCEL_GIT_COMMIT_SHA

# Logging (optional)
LOG_LEVEL=info
```

See `.env.production` for complete list.

## Best Practices

1. **Use Error Boundaries** for React components
2. **Add Context** to all errors (user, session, etc.)
3. **Use Custom Error Classes** for better grouping
4. **Track Performance** for critical operations
5. **Monitor Business Metrics** not just errors
6. **Configure Alerts** for critical events
7. **Review Regularly** - Check Sentry dashboard weekly
8. **Scrub PII** - Never send patient data to Sentry
9. **Test in Staging** before deploying to production
10. **Document Incidents** - Create runbooks for common issues

## Troubleshooting

### Events Not Appearing

1. Check DSN configuration
2. Verify environment is not "development"
3. Check browser console for errors
4. Verify Sentry initialization

### Source Maps Not Working

1. Check `SENTRY_AUTH_TOKEN` is set
2. Verify build logs show "Source maps uploaded"
3. Check release name matches

### Too Many Events

1. Reduce sampling rates
2. Add more error filters
3. Use `beforeSend` to filter events

See [SENTRY_SETUP.md](./SENTRY_SETUP.md) for detailed troubleshooting.

## Resources

- [Sentry Setup Guide](./SENTRY_SETUP.md)
- [Monitoring Alerts Guide](./MONITORING_ALERTS.md)
- [Sentry Documentation](https://docs.sentry.io/)
- [Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)

## Support

For help with Sentry integration:

1. Check documentation in `/docs`
2. Review code examples above
3. Check Sentry dashboard for errors
4. Contact DevOps team
5. Open support ticket with Sentry

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
**Maintainer**: DevOps Team
