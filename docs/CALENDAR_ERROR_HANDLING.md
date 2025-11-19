# Calendar Integration Error Handling

## Overview

Comprehensive error handling system for external calendar integrations (Google Calendar and Outlook Calendar) that provides:
- **Graceful Degradation**: System continues working even when external APIs fail
- **Circuit Breaker Pattern**: Prevents cascade failures
- **Automatic Retry Logic**: Exponential backoff for transient failures
- **Token Auto-Refresh**: Automatic OAuth token renewal
- **Structured Error Reporting**: Detailed error classification and monitoring

## Architecture

### Components

#### 1. Circuit Breaker (`/lib/calendar/circuit-breaker.ts`)

Implements the Circuit Breaker pattern to prevent repetitive calls to failing services.

**States:**
- **CLOSED**: Normal operation, all requests pass through
- **OPEN**: Service is failing, requests are blocked for timeout period
- **HALF_OPEN**: Testing if service recovered

**Configuration:**
```typescript
{
  failureThreshold: 5,      // Open circuit after 5 failures
  successThreshold: 2,      // Close circuit after 2 successes in half-open
  timeout: 60000,           // Wait 1 minute before attempting reset
  monitoringPeriod: 120000  // Count failures in 2-minute window
}
```

**Usage:**
```typescript
import { circuitBreakerManager } from '@/lib/calendar/circuit-breaker'

const breaker = circuitBreakerManager.getOrCreate('google-calendar')

try {
  const result = await breaker.execute(async () => {
    return await googleService.createEvent(eventData)
  })
} catch (error) {
  // Circuit is open or operation failed
  handleError(error)
}
```

#### 2. Retry Handler (`/lib/calendar/retry-handler.ts`)

Automatic retry with exponential backoff for transient failures.

**Retryable Errors:**
- Network timeouts (ETIMEDOUT, ECONNRESET)
- Rate limits (429)
- Server errors (500, 502, 503, 504)
- Connection issues (ENOTFOUND, ECONNREFUSED)

**Configuration:**
```typescript
const CALENDAR_API_RETRY_CONFIG = {
  maxAttempts: 4,
  initialDelayMs: 2000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
}
```

**Usage:**
```typescript
import { retryWithBackoff, CALENDAR_API_RETRY_CONFIG } from '@/lib/calendar/retry-handler'

const result = await retryWithBackoff(
  async () => await outlookService.updateEvent(eventId, data),
  'Outlook update event',
  CALENDAR_API_RETRY_CONFIG
)

if (result.success) {
  console.log('Operation succeeded after', result.attempts, 'attempts')
} else {
  console.error('Operation failed:', result.error)
}
```

#### 3. Error Handler (`/lib/calendar/error-handler.ts`)

Classifies errors and determines appropriate handling strategies.

**Error Types:**
- **Authentication**: TOKEN_EXPIRED, TOKEN_INVALID, REFRESH_FAILED
- **Network**: NETWORK_ERROR, TIMEOUT, CONNECTION_REFUSED
- **API**: RATE_LIMIT_EXCEEDED, QUOTA_EXCEEDED, SERVICE_UNAVAILABLE
- **Validation**: INVALID_REQUEST, INVALID_EVENT_DATA
- **System**: CIRCUIT_BREAKER_OPEN, DATABASE_ERROR

**Error Handling Strategies:**

| Error Type | Retry | Refresh Token | Disable Sync | Notify User | Fallback |
|------------|-------|---------------|--------------|-------------|----------|
| TOKEN_EXPIRED | Yes | Yes | No | No | Skip |
| TOKEN_INVALID | No | No | Yes | Yes | Skip |
| RATE_LIMIT | No | No | No | No | Queue |
| NETWORK_ERROR | Yes | No | No | No | Skip |
| SERVICE_UNAVAILABLE | No | No | No | No | Skip |
| CIRCUIT_BREAKER_OPEN | No | No | No | No | Skip |

**Usage:**
```typescript
import {
  classifyCalendarError,
  getErrorHandlingStrategy,
  getUserFriendlyErrorMessage
} from '@/lib/calendar/error-handler'

try {
  await syncToCalendar(session)
} catch (error) {
  const calendarError = classifyCalendarError(error, 'google')
  const strategy = getErrorHandlingStrategy(calendarError)

  if (strategy.shouldRefreshToken) {
    // Attempt token refresh and retry
    await refreshAndRetry()
  } else if (strategy.shouldDisableSync) {
    // Disable sync in database
    await disableCalendarSync(userId)
  }

  const userMessage = getUserFriendlyErrorMessage(calendarError)
  // Show message to user
}
```

#### 4. Token Refresh (`/lib/calendar/token-refresh.ts`)

Automatic OAuth token refresh when tokens expire.

**Features:**
- Automatic detection of expired tokens
- Retry logic for refresh operations
- Database update with new tokens
- Proactive refresh (5 minutes before expiry)

**Usage:**
```typescript
import { refreshTokenAndRetry, proactiveTokenRefresh } from '@/lib/calendar/token-refresh'

// Automatic refresh and retry
try {
  await syncToGoogle()
} catch (error) {
  if (error.status === 401) {
    // Token expired, refresh and retry
    await refreshTokenAndRetry(
      () => syncToGoogle(),
      'google',
      userId,
      refreshToken
    )
  }
}

// Proactive refresh
await proactiveTokenRefresh(
  'google',
  userId,
  accessToken,
  refreshToken,
  expiresAt
)
```

## Integration with Enhanced Calendar Sync

The enhanced calendar sync service automatically uses all error handling components:

```typescript
import { EnhancedCalendarSyncService } from '@/lib/calendar/calendar-sync-enhanced'

const syncService = new EnhancedCalendarSyncService()

const result = await syncService.syncUserCalendar({
  userId: 123,
  direction: 'bidirectional',
  resolveConflicts: true,
  conflictResolution: 'newest',
})

// Result structure:
{
  success: true,
  synced: 15,      // Number of sessions synced
  failed: 2,       // Number of failures
  conflicts: [],   // Detected conflicts
  errors: [        // Detailed error information
    { sessionId: 456, error: "Google Calendar rate limit exceeded" }
  ]
}
```

## Graceful Degradation Strategies

### 1. Skip Failed Operations

When a single calendar operation fails, continue with others:

```typescript
for (const session of sessions) {
  try {
    await syncSessionToGoogle(session)
    synced++
  } catch (error) {
    // Log error and continue
    errors.push({ sessionId: session.id, error: error.message })
    failed++
  }
}
```

### 2. Queue for Later

Rate-limited operations are queued for later processing:

```typescript
if (error.type === CalendarErrorType.RATE_LIMIT_EXCEEDED) {
  await queueForLater(session, provider)
}
```

### 3. Local-Only Mode

When external calendars are unavailable, sessions remain in CÁRIS:

```typescript
if (circuitBreaker.isOpen()) {
  console.warn('Calendar sync disabled, working in local-only mode')
  // Sessions are still created/updated in CÁRIS database
  return { success: true, mode: 'local-only' }
}
```

## Monitoring and Alerts

### Error Logging

All calendar errors are logged with structured data:

```typescript
{
  timestamp: "2025-11-19T10:30:00.000Z",
  errorType: "TOKEN_EXPIRED",
  provider: "google",
  userId: 123,
  sessionId: 456,
  message: "Google calendar token expired",
  retryable: true,
  requiresUserAction: false,
  stack: "Error: ... at ..."
}
```

### Circuit Breaker Stats

Monitor circuit breaker status for each service:

```typescript
import { circuitBreakerManager } from '@/lib/calendar/circuit-breaker'

const stats = circuitBreakerManager.getStats()

// Stats for each service:
{
  'google-calendar': {
    state: 'CLOSED',
    failures: 0,
    successes: 150,
    lastSuccessTime: Date,
  },
  'outlook-calendar': {
    state: 'OPEN',
    failures: 5,
    nextAttemptTime: Date,
  }
}
```

### User Notifications

User-friendly error messages are provided for situations requiring action:

```typescript
const userMessage = getUserFriendlyErrorMessage(calendarError)

// Examples:
// "Sua conexão com Google Calendar expirou. Por favor, reconecte nas configurações."
// "Google Calendar está temporariamente indisponível. Suas sessões estão seguras no CÁRIS."
// "Limite de uso do Google Calendar foi atingido. A sincronização será retomada em breve."
```

## Testing

### Simulating Failures

```typescript
// Test circuit breaker
const breaker = new CircuitBreaker('test-service', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 5000,
})

// Trigger failures to open circuit
for (let i = 0; i < 3; i++) {
  try {
    await breaker.execute(async () => {
      throw new Error('Service unavailable')
    })
  } catch (error) {
    // Circuit opens after 3 failures
  }
}

// Verify circuit is open
expect(breaker.isOpen()).toBe(true)
```

### Testing Retry Logic

```typescript
let attempts = 0

const result = await retryWithBackoff(
  async () => {
    attempts++
    if (attempts < 3) {
      throw new Error('ETIMEDOUT')
    }
    return 'success'
  },
  'test-operation',
  { maxAttempts: 4, initialDelayMs: 100 }
)

expect(result.success).toBe(true)
expect(result.attempts).toBe(3)
```

## Best Practices

### 1. Always Use Circuit Breaker for External Calls

```typescript
// ✅ Good
const breaker = circuitBreakerManager.getOrCreate('google-calendar')
await breaker.execute(() => googleService.createEvent(data))

// ❌ Bad
await googleService.createEvent(data) // No protection
```

### 2. Handle Errors Gracefully

```typescript
// ✅ Good
try {
  await syncToCalendar()
} catch (error) {
  const calendarError = classifyCalendarError(error, 'google')
  if (calendarError.gracefulDegradation) {
    // Continue with other operations
    console.warn('Calendar sync failed, continuing...')
  } else {
    // Critical error, stop
    throw error
  }
}

// ❌ Bad
try {
  await syncToCalendar()
} catch (error) {
  throw error // No graceful handling
}
```

### 3. Use Retry Logic for Transient Failures

```typescript
// ✅ Good
const result = await retryWithBackoff(
  () => googleService.updateEvent(id, data),
  'Google update',
  CALENDAR_API_RETRY_CONFIG
)

// ❌ Bad
await googleService.updateEvent(id, data) // No retry
```

### 4. Refresh Tokens Proactively

```typescript
// ✅ Good
await proactiveTokenRefresh('google', userId, token, refresh, expiresAt)
await syncToCalendar()

// ❌ Bad
await syncToCalendar() // Wait for 401 error
```

## Configuration

### Environment Variables

```bash
# OAuth Credentials
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
OUTLOOK_CLIENT_ID=your_client_id
OUTLOOK_CLIENT_SECRET=your_client_secret

# Circuit Breaker Settings (Optional)
CALENDAR_CIRCUIT_BREAKER_THRESHOLD=5
CALENDAR_CIRCUIT_BREAKER_TIMEOUT=60000

# Retry Settings (Optional)
CALENDAR_RETRY_MAX_ATTEMPTS=4
CALENDAR_RETRY_INITIAL_DELAY=2000
```

## Troubleshooting

### Circuit Breaker Stuck Open

If circuit breaker is stuck open, manually reset it:

```typescript
import { circuitBreakerManager } from '@/lib/calendar/circuit-breaker'

circuitBreakerManager.getOrCreate('google-calendar').reset()
```

### High Failure Rate

Check circuit breaker stats to identify problematic services:

```typescript
const stats = circuitBreakerManager.getStats()

for (const [service, stat] of stats.entries()) {
  if (stat.state === 'OPEN' || stat.failures > 10) {
    console.error(`Service ${service} is experiencing issues`)
  }
}
```

### Token Refresh Failures

Verify OAuth credentials and refresh token validity:

```typescript
const result = await refreshGoogleToken(refreshToken, userId)

if (!result.success) {
  console.error('Token refresh failed:', result.error)
  // User needs to reconnect account
}
```

## Future Improvements

- [ ] Add metrics dashboard for monitoring
- [ ] Implement exponential backoff for circuit breaker timeout
- [ ] Add webhook support for immediate sync
- [ ] Implement sync queue with Redis
- [ ] Add A/B testing for error handling strategies
- [ ] Integrate with external monitoring services (Sentry, DataDog)
- [ ] Add calendar-specific rate limit tracking
- [ ] Implement predictive token refresh based on usage patterns
