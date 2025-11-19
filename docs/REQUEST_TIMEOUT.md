# Request Timeout Guide

## Overview

The CÁRIS platform implements request timeout middleware to prevent hanging requests, slow loris attacks, and resource exhaustion. All API endpoints have automatic timeout protection based on their operation type.

## Default Timeouts

| Endpoint Type | Timeout | Use Case |
|--------------|---------|----------|
| **Default** | 30 seconds | Standard API operations |
| **Upload** | 5 minutes | File uploads (images, documents, audio) |
| **AI Processing** | 2 minutes | OpenAI API calls, analysis, transcription |
| **Reports** | 3 minutes | Report generation, data exports |
| **Health Checks** | 5 seconds | System health monitoring |

## Usage

### Option 1: Wrap Handler Function (Recommended)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withTimeout } from '@/lib/request-timeout'
import { getUserIdFromRequest } from '@/lib/auth'
import { db } from '@/db'

// Automatically applies appropriate timeout based on route
export const GET = withTimeout(async (req: NextRequest) => {
  const userId = await getUserIdFromRequest(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, userId)
  })

  return NextResponse.json({ success: true, data })
})
```

### Option 2: Custom Timeout

```typescript
import { withTimeout } from '@/lib/request-timeout'

// Specify custom timeout (in milliseconds)
export const POST = withTimeout(async (req: NextRequest) => {
  // This operation gets 60 seconds instead of default 30
  const result = await someVeryLongOperation()
  return NextResponse.json({ result })
}, 60_000) // 60 seconds
```

### Option 3: Wrap Individual Promises

```typescript
import { withPromiseTimeout } from '@/lib/request-timeout'

export async function POST(req: NextRequest) {
  try {
    // Wrap a specific operation with timeout
    const result = await withPromiseTimeout(
      fetch('https://api.example.com/slow-endpoint'),
      10_000, // 10 second timeout
      'External API call timed out'
    )

    return NextResponse.json({ result })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 504 })
  }
}
```

## Timeout Behavior

### When Timeout Occurs

1. Request processing is **immediately terminated**
2. Client receives **504 Gateway Timeout** response
3. Error is **logged** with request ID for debugging
4. Response includes:
   - Error message
   - Timeout duration
   - Unique request ID
   - Timeout code

Example timeout response:
```json
{
  "error": "Request Timeout",
  "message": "The request took too long to process and was terminated after 30 seconds.",
  "code": "REQUEST_TIMEOUT",
  "requestId": "req_1700000000000_abc123def",
  "timeout": 30000
}
```

### Slow Request Warning

Requests that exceed **50% of their timeout** are logged as warnings:

```
[REQUEST_TIMEOUT] Slow request detected: {
  requestId: "req_1700000000000_abc123def",
  pathname: "/api/patient/diary",
  duration: 16234,
  timeout: 30000,
  percentage: 54
}
```

This helps identify endpoints that need optimization.

## Automatic Timeout Detection

Timeouts are automatically determined by the request path:

```typescript
// These paths automatically get 5-minute timeout:
/api/chat/files/upload
/api/patient/files/upload
/api/*/upload

// These paths automatically get 2-minute timeout:
/api/ai/*
/api/analyze-image
/api/transcribe

// These paths automatically get 3-minute timeout:
/api/*/report
/api/*/export

// These paths automatically get 5-second timeout:
/api/health
/api/ping

// All others get 30-second default timeout
```

## Configuration

### Environment Variables

You can override default timeouts via environment variables:

```bash
# .env.local
REQUEST_TIMEOUT_DEFAULT=30000      # Default: 30 seconds
REQUEST_TIMEOUT_UPLOAD=300000      # Default: 5 minutes
REQUEST_TIMEOUT_AI=120000          # Default: 2 minutes
REQUEST_TIMEOUT_REPORT=180000      # Default: 3 minutes
REQUEST_TIMEOUT_HEALTH=5000        # Default: 5 seconds
```

### Custom Route Timeouts

For specific routes, edit `lib/request-timeout.ts`:

```typescript
export const ROUTE_TIMEOUTS: Record<string, number> = {
  '/api/my-slow-endpoint': 90_000,  // 90 seconds
  '/api/batch-processing': 600_000,  // 10 minutes
}
```

## Best Practices

### 1. ✅ DO: Wrap all API routes

```typescript
// Good
export const GET = withTimeout(async (req) => {
  // Handler logic
})

export const POST = withTimeout(async (req) => {
  // Handler logic
})
```

### 2. ✅ DO: Set appropriate timeouts for long operations

```typescript
// Good - File upload needs more time
export const POST = withTimeout(async (req) => {
  const file = await req.formData()
  // Process large file
}, 300_000) // 5 minutes
```

### 3. ❌ DON'T: Set excessively long timeouts

```typescript
// Bad - 30 minute timeout is too long
export const GET = withTimeout(async (req) => {
  // If it takes 30 minutes, redesign as async job
}, 1_800_000) // 30 minutes - TOO LONG!
```

For operations over 10 minutes, use:
- Background jobs (cron)
- Queue systems (BullMQ, etc.)
- Serverless functions with extended timeout
- Streaming responses

### 4. ✅ DO: Timeout external API calls

```typescript
// Good
const response = await withPromiseTimeout(
  fetch('https://external-api.com/endpoint'),
  10_000,
  'External API timeout'
)
```

### 5. ✅ DO: Timeout database queries

```typescript
// Good
const result = await withPromiseTimeout(
  db.query.complexQuery.execute(),
  15_000,
  'Database query timeout'
)
```

## Monitoring

### Logging

All timeouts are logged with structured data:

```typescript
console.error('[REQUEST_TIMEOUT] Request timed out:', {
  requestId: 'req_...',
  pathname: '/api/...',
  timeout: 30000,
  timestamp: '2025-11-18T...'
})
```

### Metrics to Track

1. **Timeout rate**: Percentage of requests that timeout
2. **Slow request rate**: Requests exceeding 50% of timeout
3. **Timeout by endpoint**: Which endpoints timeout most often
4. **Average duration**: Request processing time by endpoint

### Alerts

Set up alerts for:
- Timeout rate > 1%
- Slow request rate > 10%
- Any endpoint timing out > 5 times per hour

## Troubleshooting

### Issue: Requests timing out frequently

**Diagnosis:**
```bash
# Check logs for slow requests
grep "REQUEST_TIMEOUT" logs/app.log | grep "Slow request"
```

**Solutions:**
1. Optimize database queries (add indexes, reduce JOINs)
2. Add caching layer (Redis)
3. Paginate large result sets
4. Move to background job if > 1 minute

### Issue: Upload timeouts

**Solutions:**
1. Increase upload timeout: `withTimeout(handler, 600_000)` (10 min)
2. Implement chunked uploads
3. Use presigned URLs for direct-to-storage uploads
4. Add upload progress feedback to client

### Issue: AI endpoint timeouts

**Solutions:**
1. Implement request queuing
2. Cache AI results when possible
3. Use streaming responses for long outputs
4. Consider async processing + polling

## Security Benefits

### Protection Against Attacks

1. **Slow Loris Attack**: Attackers send slow requests to exhaust connections
   - ✅ Timeout prevents connection exhaustion

2. **Resource Exhaustion**: Long-running queries consume resources
   - ✅ Timeout limits resource consumption per request

3. **Denial of Service**: Intentionally slow requests block legitimate traffic
   - ✅ Timeout ensures connections are freed quickly

### Rate Limiting Integration

Timeouts work with rate limiting to provide layered security:

```typescript
import { withTimeout } from '@/lib/request-timeout'
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit'

export const POST = withTimeout(async (req) => {
  // Check rate limit first
  const rateLimitResult = await rateLimit(req, RateLimitPresets.WRITE)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  // Then process with timeout protection
  // Handler logic
})
```

## Migration Guide

### Migrating Existing Endpoints

1. **Import the wrapper:**
   ```typescript
   import { withTimeout } from '@/lib/request-timeout'
   ```

2. **Wrap your handler:**
   ```typescript
   // Before
   export async function GET(req: NextRequest) {
     // handler logic
   }

   // After
   export const GET = withTimeout(async (req: NextRequest) => {
     // handler logic
   })
   ```

3. **Test the endpoint:**
   - Verify normal operation
   - Verify timeout behavior
   - Check logs for warnings

### Rollout Strategy

1. **Phase 1**: High-risk endpoints (uploads, AI, reports)
2. **Phase 2**: Authentication endpoints
3. **Phase 3**: All remaining API routes

## Testing

### Unit Test Example

```typescript
import { withTimeout, TimeoutError } from '@/lib/request-timeout'

describe('Request Timeout', () => {
  it('should timeout after specified duration', async () => {
    const slowHandler = withTimeout(async () => {
      await new Promise(resolve => setTimeout(resolve, 10000))
      return NextResponse.json({ data: 'done' })
    }, 100) // 100ms timeout

    const req = new NextRequest('http://localhost/api/test')
    const response = await slowHandler(req)

    expect(response.status).toBe(504)
    const json = await response.json()
    expect(json.code).toBe('REQUEST_TIMEOUT')
  })
})
```

### Integration Test

```bash
# Test endpoint timeout
curl -X POST http://localhost:3000/api/slow-endpoint \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  --max-time 35

# Should receive 504 if exceeds 30s timeout
```

## Performance Impact

- **Overhead**: <1ms per request (negligible)
- **Memory**: Minimal (one timer per request)
- **Benefits**: Prevents resource exhaustion, improves reliability

## Support

For issues or questions about request timeouts:
- Check logs: `grep "REQUEST_TIMEOUT" logs/app.log`
- Review slow requests: Look for 50%+ timeout warnings
- Adjust timeouts: Update `TIMEOUT_CONFIG` in `lib/request-timeout.ts`
