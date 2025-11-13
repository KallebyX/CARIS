/**
 * Rate Limiting Middleware for CÁRIS Platform
 *
 * Provides configurable rate limiting for API endpoints using either:
 * - Upstash Redis (production, distributed)
 * - In-memory Map (development, single-instance)
 *
 * Features:
 * - Per-user rate limits (authenticated requests)
 * - Per-IP rate limits (unauthenticated requests)
 * - Sliding window algorithm
 * - Configurable limits per endpoint
 * - Proper 429 status with Retry-After header
 *
 * @example
 * // In API route:
 * import { rateLimit } from '@/lib/rate-limit'
 *
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await rateLimit(request, {
 *     limit: 10,
 *     window: 60000 // 1 minute
 *   })
 *
 *   if (!rateLimitResult.success) {
 *     return rateLimitResult.response
 *   }
 *
 *   // Process request...
 * }
 */

import { NextRequest, NextResponse } from 'next/server'

// ================================================================
// TYPES & INTERFACES
// ================================================================

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed in the time window
   * @default 60
   */
  limit?: number

  /**
   * Time window in milliseconds
   * @default 60000 (1 minute)
   */
  window?: number

  /**
   * Unique identifier for this rate limit (used for different endpoints)
   * @default 'default'
   */
  identifier?: string

  /**
   * Whether to skip rate limiting (useful for webhooks, internal APIs)
   * @default false
   */
  skip?: boolean
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  response?: NextResponse
}

interface RateLimitRecord {
  count: number
  resetTime: number
}

// ================================================================
// IN-MEMORY STORAGE (Development & Fallback)
// ================================================================

const inMemoryStore = new Map<string, RateLimitRecord>()

/**
 * Cleanup expired entries every 5 minutes to prevent memory leaks
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of inMemoryStore.entries()) {
      if (record.resetTime < now) {
        inMemoryStore.delete(key)
      }
    }
  }, 5 * 60 * 1000) // 5 minutes
}

// ================================================================
// UPSTASH REDIS CLIENT (Production)
// ================================================================

let redisClient: any = null
let redisAvailable = false

/**
 * Initialize Upstash Redis client if environment variables are present
 */
async function initRedis() {
  if (redisClient !== null) return redisClient

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (redisUrl && redisToken) {
    try {
      // Use Upstash Redis REST API (works in serverless environments)
      const { Redis } = await import('@upstash/redis')
      redisClient = new Redis({
        url: redisUrl,
        token: redisToken,
      })
      redisAvailable = true
      console.log('[Rate Limit] Using Upstash Redis for distributed rate limiting')
    } catch (error) {
      console.warn('[Rate Limit] Failed to initialize Redis, falling back to in-memory store:', error)
      redisClient = null
      redisAvailable = false
    }
  } else {
    console.log('[Rate Limit] Redis not configured, using in-memory store (not recommended for production)')
    redisAvailable = false
  }

  return redisClient
}

// ================================================================
// STORAGE INTERFACE
// ================================================================

/**
 * Get rate limit record from storage (Redis or in-memory)
 */
async function getRecord(key: string): Promise<RateLimitRecord | null> {
  if (redisAvailable && redisClient) {
    try {
      const data = await redisClient.get(key)
      return data as RateLimitRecord | null
    } catch (error) {
      console.error('[Rate Limit] Redis get error, falling back to in-memory:', error)
      return inMemoryStore.get(key) || null
    }
  }

  return inMemoryStore.get(key) || null
}

/**
 * Set rate limit record in storage (Redis or in-memory)
 */
async function setRecord(key: string, record: RateLimitRecord, ttlMs: number): Promise<void> {
  if (redisAvailable && redisClient) {
    try {
      // Set with TTL in seconds for Redis
      await redisClient.setex(key, Math.ceil(ttlMs / 1000), JSON.stringify(record))
      return
    } catch (error) {
      console.error('[Rate Limit] Redis set error, falling back to in-memory:', error)
    }
  }

  // Fallback to in-memory
  inMemoryStore.set(key, record)
}

// ================================================================
// IDENTIFIER EXTRACTION
// ================================================================

/**
 * Extract rate limit identifier from request
 * Tries: userId (from auth) -> IP address -> fallback identifier
 */
function getIdentifier(request: NextRequest, identifier: string): string {
  // Try to get user ID from authorization header or cookies
  const authHeader = request.headers.get('authorization')
  const token = request.cookies.get('token')?.value

  let userId: string | null = null

  // Extract user ID from JWT token (without verification for performance)
  if (token) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
      userId = payload.userId?.toString()
    } catch {
      // Invalid token format, ignore
    }
  }

  // If we have a user ID, use it for per-user rate limiting
  if (userId) {
    return `user:${userId}:${identifier}`
  }

  // Fallback to IP-based rate limiting for unauthenticated requests
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
             request.headers.get('x-real-ip') ||
             request.ip ||
             'unknown'

  return `ip:${ip}:${identifier}`
}

// ================================================================
// RATE LIMITING LOGIC
// ================================================================

/**
 * Sliding window rate limiter
 *
 * Algorithm:
 * 1. Get current request count and reset time
 * 2. If reset time has passed, reset counter
 * 3. If count < limit, allow request and increment
 * 4. If count >= limit, reject with 429
 */
async function slidingWindowRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now()

  // Get existing record
  const record = await getRecord(key)

  // If no record or reset time has passed, start new window
  if (!record || record.resetTime <= now) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs
    }

    await setRecord(key, newRecord, windowMs)

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: newRecord.resetTime
    }
  }

  // Check if limit exceeded
  if (record.count >= limit) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000)

    return {
      success: false,
      limit,
      remaining: 0,
      reset: record.resetTime,
      response: NextResponse.json(
        {
          success: false,
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
          retryAfter: retryAfterSeconds
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': record.resetTime.toString(),
            'Retry-After': retryAfterSeconds.toString(),
          }
        }
      )
    }
  }

  // Increment counter
  const updatedRecord: RateLimitRecord = {
    count: record.count + 1,
    resetTime: record.resetTime
  }

  const ttl = record.resetTime - now
  await setRecord(key, updatedRecord, ttl)

  return {
    success: true,
    limit,
    remaining: limit - updatedRecord.count,
    reset: record.resetTime
  }
}

// ================================================================
// PUBLIC API
// ================================================================

/**
 * Main rate limiting function
 *
 * @param request - Next.js request object
 * @param options - Rate limiting configuration
 * @returns Rate limit result with success status and optional response
 *
 * @example
 * ```ts
 * // Strict rate limit for auth endpoints (10 requests per minute)
 * const result = await rateLimit(request, {
 *   identifier: 'auth:login',
 *   limit: 10,
 *   window: 60000
 * })
 *
 * if (!result.success) {
 *   return result.response
 * }
 * ```
 *
 * @example
 * ```ts
 * // Lenient rate limit for read operations (100 requests per minute)
 * const result = await rateLimit(request, {
 *   identifier: 'api:read',
 *   limit: 100,
 *   window: 60000
 * })
 * ```
 */
export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  // Initialize Redis on first call
  if (!redisClient && !redisAvailable) {
    await initRedis()
  }

  const {
    limit = 60,
    window = 60000, // 1 minute
    identifier = 'default',
    skip = false
  } = options

  // Skip rate limiting if requested
  if (skip) {
    return {
      success: true,
      limit,
      remaining: limit,
      reset: Date.now() + window
    }
  }

  // Generate unique key for this request
  const key = `ratelimit:${getIdentifier(request, identifier)}`

  // Apply sliding window rate limit
  return slidingWindowRateLimit(key, limit, window)
}

// ================================================================
// PRESET CONFIGURATIONS
// ================================================================

/**
 * Rate limit presets for common use cases
 */
export const RateLimitPresets = {
  /**
   * Strict rate limit for authentication endpoints
   * Prevents brute force attacks
   */
  AUTH: {
    identifier: 'auth',
    limit: 10,
    window: 60000 // 10 requests per minute
  },

  /**
   * Moderate rate limit for write operations
   * Balances protection with usability
   */
  WRITE: {
    identifier: 'write',
    limit: 30,
    window: 60000 // 30 requests per minute
  },

  /**
   * Lenient rate limit for read operations
   * Allows frequent polling and browsing
   */
  READ: {
    identifier: 'read',
    limit: 100,
    window: 60000 // 100 requests per minute
  },

  /**
   * Very strict rate limit for sensitive operations
   * Maximum protection for critical endpoints
   */
  SENSITIVE: {
    identifier: 'sensitive',
    limit: 5,
    window: 60000 // 5 requests per minute
  },

  /**
   * Chat message rate limit
   * Prevents spam while allowing natural conversation
   */
  CHAT: {
    identifier: 'chat',
    limit: 60,
    window: 60000 // 1 message per second average
  },

  /**
   * File upload rate limit
   * Prevents abuse of upload endpoints
   */
  UPLOAD: {
    identifier: 'upload',
    limit: 10,
    window: 300000 // 10 uploads per 5 minutes
  },

  /**
   * Search rate limit
   * Prevents search abuse and database overload
   */
  SEARCH: {
    identifier: 'search',
    limit: 30,
    window: 60000 // 30 searches per minute
  }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Check if rate limit headers should be added to response
 * Adds X-RateLimit-* headers to successful responses
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.reset.toString())

  return response
}

/**
 * Wrapper for API routes with automatic rate limiting
 *
 * @example
 * ```ts
 * export const POST = withRateLimit(
 *   async (request) => {
 *     // Your API logic here
 *     return NextResponse.json({ success: true })
 *   },
 *   RateLimitPresets.WRITE
 * )
 * ```
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: RateLimitOptions = {}
) {
  return async (request: NextRequest) => {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, options)

    if (!rateLimitResult.success) {
      return rateLimitResult.response!
    }

    // Call original handler
    const response = await handler(request)

    // Add rate limit headers to response
    return addRateLimitHeaders(response, rateLimitResult)
  }
}

// ================================================================
// CLEANUP & UTILITIES
// ================================================================

/**
 * Manually clear rate limit for a specific identifier
 * Useful for testing or admin overrides
 */
export async function clearRateLimit(identifier: string): Promise<void> {
  const key = `ratelimit:${identifier}`

  if (redisAvailable && redisClient) {
    try {
      await redisClient.del(key)
    } catch (error) {
      console.error('[Rate Limit] Failed to clear Redis key:', error)
    }
  }

  inMemoryStore.delete(key)
}

/**
 * Get current rate limit status for an identifier
 * Useful for displaying rate limit info to users
 */
export async function getRateLimitStatus(
  request: NextRequest,
  identifier: string = 'default'
): Promise<{ count: number; limit: number; reset: number }> {
  const key = `ratelimit:${getIdentifier(request, identifier)}`
  const record = await getRecord(key)

  if (!record) {
    return { count: 0, limit: 60, reset: Date.now() + 60000 }
  }

  return {
    count: record.count,
    limit: 60, // Would need to be stored with record for exact value
    reset: record.resetTime
  }
}
