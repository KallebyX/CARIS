# CÁRIS API Rate Limits

Complete guide to rate limiting and request throttling in the CÁRIS API.

---

## Table of Contents

1. [Overview](#overview)
2. [Rate Limit Tiers](#rate-limit-tiers)
3. [Rate Limit Headers](#rate-limit-headers)
4. [Endpoint-Specific Limits](#endpoint-specific-limits)
5. [Handling Rate Limits](#handling-rate-limits)
6. [Best Practices](#best-practices)
7. [Monitoring Usage](#monitoring-usage)
8. [Increasing Limits](#increasing-limits)

---

## Overview

The CÁRIS API implements rate limiting to ensure fair usage and protect against abuse. Rate limits are applied per IP address and per authenticated user.

### Why Rate Limiting?

- **Performance**: Prevents server overload
- **Fair Usage**: Ensures equitable access for all users
- **Security**: Protects against DDoS and brute force attacks
- **Resource Management**: Manages computational resources efficiently

### Key Concepts

- **Window**: Time period for rate limit (e.g., 1 minute, 1 hour)
- **Quota**: Maximum requests allowed in a window
- **Reset**: Time when the counter resets to zero

---

## Rate Limit Tiers

### Standard Tier (Default)

**General API Endpoints**
- Limit: 100 requests per minute per IP
- Burst: 200 requests per minute (short burst)
- Daily limit: 10,000 requests per day

**Authentication Endpoints**
- Login: 10 attempts per 15 minutes per IP
- Registration: 5 attempts per hour per IP
- Password reset: 5 attempts per hour per IP

**Heavy Operations**
- Data export: 1 request per hour
- Bulk operations: 10 requests per hour
- AI processing: 50 requests per hour

---

### Premium Tier

**Available for premium subscriptions:**

- General API: 500 requests per minute
- Burst: 1000 requests per minute
- Daily limit: 100,000 requests per day
- AI processing: 500 requests per hour
- Priority queue for resource-intensive operations

---

### Enterprise Tier

**Available for enterprise clients:**

- Custom rate limits based on needs
- Dedicated infrastructure
- No daily limits
- Priority support
- SLA guarantees

---

## Rate Limit Headers

All API responses include rate limit information in headers:

### Response Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1705770600
X-RateLimit-Window: 60
```

### Header Descriptions

**X-RateLimit-Limit**
- Total requests allowed in the current window
- Type: Integer
- Example: `100`

**X-RateLimit-Remaining**
- Requests remaining in the current window
- Type: Integer
- Example: `87`

**X-RateLimit-Reset**
- Unix timestamp when the limit resets
- Type: Integer (seconds since epoch)
- Example: `1705770600`

**X-RateLimit-Window**
- Length of the rate limit window in seconds
- Type: Integer
- Example: `60` (1 minute)

---

### Rate Limit Exceeded Response

When rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705770645

{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45,
  "limit": 100,
  "window": 60
}
```

---

## Endpoint-Specific Limits

### Authentication Endpoints

**POST /api/auth/login**
- Limit: 10 requests per 15 minutes per IP
- Reason: Prevent brute force attacks

**POST /api/auth/register**
- Limit: 5 requests per hour per IP
- Reason: Prevent spam registrations

**POST /api/auth/logout**
- Limit: 20 requests per minute
- Reason: Normal operation

---

### Patient Endpoints

**POST /api/patient/diary**
- Limit: 50 requests per hour
- Reason: Prevent spam, ensure quality entries
- Burst: 10 requests per minute

**GET /api/patient/diary**
- Limit: 100 requests per minute
- Reason: Read operations are less intensive

**POST /api/patient/meditation-sessions**
- Limit: 60 requests per hour
- Reason: One per minute is reasonable for meditation tracking

---

### Chat Endpoints

**POST /api/chat**
- Limit: 100 requests per minute
- Reason: Allow natural conversation flow
- Burst: 200 requests per minute

**GET /api/chat**
- Limit: 200 requests per minute
- Reason: Frequent polling for new messages

**PATCH /api/chat** (mark as read)
- Limit: 500 requests per minute
- Reason: Lightweight operation

---

### Session Management

**POST /api/sessions**
- Limit: 30 requests per hour
- Reason: Prevent excessive booking

**GET /api/sessions**
- Limit: 100 requests per minute
- Reason: Frequent checks for schedule

**POST /api/sessions/:id/start**
- Limit: 10 requests per hour
- Reason: Limited by actual sessions

---

### Psychologist Endpoints

**GET /api/psychologist/patients**
- Limit: 100 requests per minute
- Reason: Frequent dashboard access

**GET /api/psychologist/ai-insights**
- Limit: 50 requests per hour
- Reason: Computationally expensive

**POST /api/psychologist/prescribe-task**
- Limit: 100 requests per hour
- Reason: Normal therapeutic workflow

---

### Admin Endpoints

**GET /api/admin/stats**
- Limit: 60 requests per minute
- Reason: Dashboard polling

**GET /api/admin/audit-logs**
- Limit: 30 requests per minute
- Reason: Resource-intensive query

**POST /api/admin/users**
- Limit: 20 requests per minute
- Reason: Administrative operations

---

### Heavy Operations

**POST /api/compliance/data-export**
- Limit: 1 request per hour per user
- Reason: Very resource-intensive
- Processing time: 5-30 minutes

**POST /api/transcribe**
- Limit: 20 requests per hour
- Reason: AI processing cost
- Concurrent: 2 requests at a time

**POST /api/analyze-image**
- Limit: 30 requests per hour
- Reason: AI vision processing cost

---

## Handling Rate Limits

### Strategy 1: Check Headers Before Retry

```typescript
import { apiClient, ApiError } from '@/lib/api-client'

async function makeRequestWithRateLimit<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 429) {
      const retryAfter = error.data?.retryAfter || 60

      console.log(`Rate limited. Retrying after ${retryAfter} seconds`)

      // Wait before retry
      await sleep(retryAfter * 1000)

      // Retry request
      return await fn()
    }
    throw error
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

---

### Strategy 2: Exponential Backoff

```typescript
async function makeRequestWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (error instanceof ApiError && error.statusCode === 429) {
        // Use Retry-After if provided
        if (error.data?.retryAfter) {
          await sleep(error.data.retryAfter * 1000)
        } else {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000
          await sleep(delay)
        }
      } else {
        // Not a rate limit error, throw immediately
        throw error
      }
    }
  }

  throw lastError!
}
```

---

### Strategy 3: Request Queue with Rate Limiting

```typescript
class RateLimitedQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private requestsInWindow = 0
  private windowStart = Date.now()
  private readonly maxRequestsPerWindow: number
  private readonly windowDuration: number

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequestsPerWindow = maxRequests
    this.windowDuration = windowMs
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      if (!this.processing) {
        this.processQueue()
      }
    })
  }

  private async processQueue() {
    this.processing = true

    while (this.queue.length > 0) {
      // Reset window if needed
      const now = Date.now()
      if (now - this.windowStart >= this.windowDuration) {
        this.requestsInWindow = 0
        this.windowStart = now
      }

      // Wait if limit reached
      if (this.requestsInWindow >= this.maxRequestsPerWindow) {
        const waitTime = this.windowDuration - (now - this.windowStart)
        await sleep(waitTime)
        this.requestsInWindow = 0
        this.windowStart = Date.now()
      }

      // Process next request
      const fn = this.queue.shift()
      if (fn) {
        this.requestsInWindow++
        await fn()
      }
    }

    this.processing = false
  }
}

// Usage
const queue = new RateLimitedQueue(100, 60000) // 100 req/min

async function makeRequest(data: any) {
  return queue.enqueue(() => apiClient.diary.createEntry(data))
}
```

---

### Strategy 4: Adaptive Rate Limiting

```typescript
class AdaptiveRateLimiter {
  private remainingRequests: number = 100
  private resetTime: number = Date.now() + 60000
  private adaptiveDelay: number = 0

  async execute<T>(fn: () => Promise<Response>): Promise<T> {
    // Wait if we need to
    if (this.adaptiveDelay > 0) {
      await sleep(this.adaptiveDelay)
      this.adaptiveDelay = 0
    }

    const response = await fn()

    // Update limits from headers
    const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '100')
    const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0')
    const reset = parseInt(response.headers.get('X-RateLimit-Reset') || '0')

    this.remainingRequests = remaining
    this.resetTime = reset * 1000

    // Adaptive delay based on remaining quota
    if (remaining < limit * 0.1) {
      // Less than 10% remaining, slow down significantly
      this.adaptiveDelay = 5000
    } else if (remaining < limit * 0.3) {
      // Less than 30% remaining, slow down moderately
      this.adaptiveDelay = 2000
    } else if (remaining < limit * 0.5) {
      // Less than 50% remaining, slow down slightly
      this.adaptiveDelay = 1000
    }

    const data = await response.json()
    return data as T
  }

  getStatus() {
    return {
      remaining: this.remainingRequests,
      resetTime: new Date(this.resetTime),
      adaptiveDelay: this.adaptiveDelay
    }
  }
}
```

---

## Best Practices

### 1. Cache Responses

```typescript
class CachedApiClient {
  private cache = new Map<string, { data: any; expiry: number }>()

  async get<T>(key: string, fn: () => Promise<T>, ttl: number = 60000): Promise<T> {
    const cached = this.cache.get(key)

    if (cached && cached.expiry > Date.now()) {
      return cached.data as T
    }

    const data = await fn()
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    })

    return data
  }
}

// Usage
const cachedClient = new CachedApiClient()

// Cache for 5 minutes
const user = await cachedClient.get(
  'user-me',
  () => apiClient.user.me(),
  300000
)
```

---

### 2. Batch Requests

```typescript
// Instead of multiple individual requests
for (const entry of entries) {
  await apiClient.diary.createEntry(entry) // Bad: 100 API calls
}

// Use batch endpoint (if available)
await apiClient.diary.createBatch(entries) // Good: 1 API call
```

---

### 3. Use WebSockets for Real-time

For real-time updates, use WebSockets (Pusher) instead of polling:

```typescript
// Bad: Polling every 5 seconds
setInterval(async () => {
  const messages = await apiClient.chat.getMessages({ roomId })
  updateMessages(messages)
}, 5000) // 12 requests per minute

// Good: WebSocket subscription
const channel = pusher.subscribe(`chat-room-${roomId}`)
channel.bind('new-message', (message) => {
  updateMessages(message)
}) // 0 API requests
```

---

### 4. Implement Request Throttling

```typescript
import throttle from 'lodash/throttle'

// Throttle search to at most once per second
const throttledSearch = throttle(async (query: string) => {
  const results = await apiClient.search(query)
  updateResults(results)
}, 1000, { leading: true, trailing: true })

// Usage in search input
<input
  onChange={(e) => throttledSearch(e.target.value)}
/>
```

---

### 5. Monitor Rate Limit Status

```typescript
class RateLimitMonitor {
  private metrics = {
    totalRequests: 0,
    rateLimitHits: 0,
    averageRemaining: 0,
    lowestRemaining: 100
  }

  track(response: Response) {
    this.metrics.totalRequests++

    const remaining = parseInt(
      response.headers.get('X-RateLimit-Remaining') || '0'
    )

    this.metrics.averageRemaining =
      (this.metrics.averageRemaining * (this.metrics.totalRequests - 1) + remaining) /
      this.metrics.totalRequests

    this.metrics.lowestRemaining = Math.min(
      this.metrics.lowestRemaining,
      remaining
    )

    if (response.status === 429) {
      this.metrics.rateLimitHits++
    }

    // Alert if we're consistently hitting limits
    if (this.metrics.rateLimitHits / this.metrics.totalRequests > 0.05) {
      console.warn('High rate limit hit rate:', this.metrics)
    }
  }

  getMetrics() {
    return this.metrics
  }
}
```

---

## Monitoring Usage

### Dashboard Endpoint

**GET /api/user/rate-limit-status**

```typescript
const status = await fetch('/api/user/rate-limit-status', {
  credentials: 'include'
}).then(r => r.json())

console.log(status)
// {
//   tier: 'standard',
//   limits: {
//     perMinute: 100,
//     perHour: 6000,
//     perDay: 10000
//   },
//   usage: {
//     currentMinute: 45,
//     currentHour: 2340,
//     currentDay: 8765
//   },
//   resetTimes: {
//     minute: '2024-01-20T15:31:00Z',
//     hour: '2024-01-20T16:00:00Z',
//     day: '2024-01-21T00:00:00Z'
//   }
// }
```

---

### Usage Analytics

**GET /api/user/usage-analytics**

```typescript
const analytics = await fetch('/api/user/usage-analytics', {
  credentials: 'include'
}).then(r => r.json())

// {
//   last24Hours: {
//     totalRequests: 5234,
//     rateLimitHits: 3,
//     topEndpoints: [
//       { endpoint: '/api/chat', count: 2341 },
//       { endpoint: '/api/patient/diary', count: 856 }
//     ]
//   },
//   recommendations: [
//     'Consider implementing request caching for /api/chat',
//     'High usage on /api/patient/diary - consider batching'
//   ]
// }
```

---

## Increasing Limits

### Temporary Increase

For special events or use cases, contact support:

```
Email: support@caris.health
Subject: Rate Limit Increase Request

Include:
- Account email
- Current tier
- Requested limits
- Use case description
- Duration needed
```

---

### Permanent Upgrade

Upgrade to Premium or Enterprise tier:

**Premium Tier**
- 5x higher limits
- Priority support
- $99/month

**Enterprise Tier**
- Custom limits
- Dedicated infrastructure
- SLA guarantees
- Custom pricing

Visit: https://caris.health/pricing

---

## Rate Limit FAQs

### Q: Are rate limits per user or per IP?

**A:** Both. Limits are applied per authenticated user AND per IP address. The stricter limit applies.

---

### Q: Do failed requests count toward the limit?

**A:** Yes. All requests, including failed ones (4xx, 5xx), count toward your rate limit.

---

### Q: Can I check my rate limit without making a request?

**A:** Yes, use the `GET /api/user/rate-limit-status` endpoint. This endpoint itself has a very high limit (1000/min).

---

### Q: What happens if I exceed the daily limit?

**A:** You'll receive a 429 response. The limit resets at midnight UTC. For higher limits, upgrade your plan.

---

### Q: Are WebSocket connections counted?

**A:** No. Pusher WebSocket subscriptions and events don't count toward HTTP API rate limits.

---

### Q: Do bulk operations count as one request?

**A:** Bulk operations count as one HTTP request, but may have lower rate limits due to higher server load.

---

## Testing Rate Limits

### Local Testing

```typescript
// Test rate limit handling
async function testRateLimit() {
  const requests = []

  // Make 150 rapid requests (exceeds 100/min limit)
  for (let i = 0; i < 150; i++) {
    requests.push(
      apiClient.user.me().catch(error => ({
        error: error.message,
        status: error.statusCode
      }))
    )
  }

  const results = await Promise.all(requests)

  const successful = results.filter(r => !r.error).length
  const rateLimited = results.filter(r => r.status === 429).length

  console.log(`Successful: ${successful}`)
  console.log(`Rate limited: ${rateLimited}`)
}
```

---

## Related Documentation

- [API Reference](./API_REFERENCE.md)
- [Authentication Guide](./API_AUTHENTICATION.md)
- [Error Handling](./API_ERRORS.md)
- [Code Examples](./API_EXAMPLES.md)
