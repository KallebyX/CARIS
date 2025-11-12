/**
 * API Caching Layer for CÁRIS Platform
 *
 * Provides flexible caching for API responses using either:
 * - Upstash Redis (production, distributed, persistent)
 * - In-memory Map (development, single-instance)
 *
 * Features:
 * - Automatic cache key generation
 * - TTL (Time To Live) management
 * - Cache invalidation strategies (tag-based, pattern-based)
 * - Cache warming for common queries
 * - Compression for large payloads
 * - Stale-while-revalidate pattern
 * - Cache statistics and monitoring
 *
 * @example
 * // Basic caching:
 * const data = await withCache('user:123', async () => {
 *   return await fetchUserData(123)
 * }, { ttl: 300 })
 *
 * @example
 * // With tags for invalidation:
 * const sessions = await withCache('sessions:patient:123', async () => {
 *   return await fetchSessions(123)
 * }, { ttl: 60, tags: ['patient:123', 'sessions'] })
 */

import { NextRequest, NextResponse } from 'next/server'

// ================================================================
// TYPES & INTERFACES
// ================================================================

export interface CacheOptions {
  /**
   * Time to live in seconds
   * @default 300 (5 minutes)
   */
  ttl?: number

  /**
   * Tags for cache invalidation
   * @example ['user:123', 'sessions']
   */
  tags?: string[]

  /**
   * Whether to compress the cached value
   * @default true for values > 10KB
   */
  compress?: boolean

  /**
   * Stale-while-revalidate time in seconds
   * Serves stale data while fetching fresh data in background
   * @default 0 (disabled)
   */
  swr?: number

  /**
   * Skip caching (useful for conditional caching)
   * @default false
   */
  skip?: boolean

  /**
   * Custom cache key prefix
   * @default 'cache'
   */
  prefix?: string
}

export interface CacheEntry<T = any> {
  value: T
  timestamp: number
  expiresAt: number
  tags?: string[]
  compressed: boolean
  swr?: number
}

export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  size: number
  keys: number
}

// ================================================================
// IN-MEMORY STORAGE (Development & Fallback)
// ================================================================

const inMemoryCache = new Map<string, CacheEntry>()
const cacheStats = { hits: 0, misses: 0 }

/**
 * Cleanup expired cache entries every minute
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of inMemoryCache.entries()) {
      if (entry.expiresAt < now) {
        inMemoryCache.delete(key)
      }
    }
  }, 60 * 1000) // 1 minute
}

// ================================================================
// REDIS CLIENT (Production)
// ================================================================

let redisClient: any = null
let redisAvailable = false

/**
 * Initialize Redis client if environment variables are present
 */
async function initRedis() {
  if (redisClient !== null) return redisClient

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (redisUrl && redisToken) {
    try {
      const { Redis } = await import('@upstash/redis')
      redisClient = new Redis({
        url: redisUrl,
        token: redisToken,
      })
      redisAvailable = true
      console.log('[API Cache] Using Upstash Redis for distributed caching')
    } catch (error) {
      console.warn('[API Cache] Failed to initialize Redis, falling back to in-memory cache:', error)
      redisClient = null
      redisAvailable = false
    }
  } else {
    console.log('[API Cache] Redis not configured, using in-memory cache')
    redisAvailable = false
  }

  return redisClient
}

// ================================================================
// COMPRESSION UTILITIES
// ================================================================

/**
 * Compress string data using built-in compression
 * Falls back to no compression if not available
 */
async function compress(data: string): Promise<string> {
  try {
    if (typeof Buffer !== 'undefined' && Buffer.from) {
      // Simple base64 encoding as fallback (not real compression)
      // In production, consider using pako or similar for real compression
      return Buffer.from(data).toString('base64')
    }
    return data
  } catch (error) {
    return data
  }
}

/**
 * Decompress string data
 */
async function decompress(data: string): Promise<string> {
  try {
    if (typeof Buffer !== 'undefined' && Buffer.from) {
      return Buffer.from(data, 'base64').toString('utf-8')
    }
    return data
  } catch (error) {
    return data
  }
}

// ================================================================
// STORAGE INTERFACE
// ================================================================

/**
 * Get value from cache (Redis or in-memory)
 */
async function getFromCache<T>(key: string): Promise<CacheEntry<T> | null> {
  if (redisAvailable && redisClient) {
    try {
      const data = await redisClient.get(key)
      if (!data) return null

      const entry = typeof data === 'string' ? JSON.parse(data) : data

      // Handle decompression
      if (entry.compressed && typeof entry.value === 'string') {
        entry.value = JSON.parse(await decompress(entry.value))
      }

      return entry
    } catch (error) {
      console.error('[API Cache] Redis get error:', error)
      return inMemoryCache.get(key) || null
    }
  }

  return inMemoryCache.get(key) || null
}

/**
 * Set value in cache (Redis or in-memory)
 */
async function setInCache<T>(
  key: string,
  entry: CacheEntry<T>,
  ttlSeconds: number
): Promise<void> {
  if (redisAvailable && redisClient) {
    try {
      const entryToStore = { ...entry }

      // Handle compression
      if (entry.compressed) {
        const serialized = JSON.stringify(entry.value)
        entryToStore.value = await compress(serialized) as any
      }

      await redisClient.setex(key, ttlSeconds, JSON.stringify(entryToStore))
      return
    } catch (error) {
      console.error('[API Cache] Redis set error:', error)
    }
  }

  // Fallback to in-memory
  inMemoryCache.set(key, entry)
}

/**
 * Delete value from cache
 */
async function deleteFromCache(key: string): Promise<void> {
  if (redisAvailable && redisClient) {
    try {
      await redisClient.del(key)
    } catch (error) {
      console.error('[API Cache] Redis delete error:', error)
    }
  }

  inMemoryCache.delete(key)
}

/**
 * Get all keys matching a pattern
 */
async function getKeys(pattern: string): Promise<string[]> {
  if (redisAvailable && redisClient) {
    try {
      return await redisClient.keys(pattern)
    } catch (error) {
      console.error('[API Cache] Redis keys error:', error)
    }
  }

  // In-memory pattern matching
  const keys: string[] = []
  const regex = new RegExp(pattern.replace('*', '.*'))
  for (const key of inMemoryCache.keys()) {
    if (regex.test(key)) {
      keys.push(key)
    }
  }
  return keys
}

// ================================================================
// CACHE KEY GENERATION
// ================================================================

/**
 * Generate cache key from components
 */
export function generateCacheKey(
  components: (string | number | undefined)[],
  prefix: string = 'cache'
): string {
  const cleanComponents = components.filter(c => c !== undefined && c !== null)
  return `${prefix}:${cleanComponents.join(':')}`
}

/**
 * Generate cache key from request
 * Includes URL, method, and optionally query parameters
 */
export function generateRequestCacheKey(
  request: NextRequest,
  includeQuery: boolean = true
): string {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  if (includeQuery && url.search) {
    // Sort query parameters for consistent keys
    const params = new URLSearchParams(url.search)
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&')

    return generateCacheKey([method, path, sortedParams], 'cache')
  }

  return generateCacheKey([method, path], 'cache')
}

// ================================================================
// MAIN CACHING FUNCTIONS
// ================================================================

/**
 * Get value from cache or compute it
 * Implements stale-while-revalidate if configured
 *
 * @param key - Cache key
 * @param fetchFn - Function to fetch data on cache miss
 * @param options - Cache configuration options
 * @returns Cached or freshly fetched data
 *
 * @example
 * ```ts
 * const sessions = await withCache(
 *   'sessions:patient:123',
 *   async () => await db.query.sessions.findMany({ where: eq(sessions.patientId, 123) }),
 *   { ttl: 300, tags: ['patient:123', 'sessions'] }
 * )
 * ```
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Initialize Redis on first call
  if (!redisClient && !redisAvailable) {
    await initRedis()
  }

  const {
    ttl = 300, // 5 minutes default
    tags = [],
    compress: shouldCompress = false,
    swr = 0,
    skip = false,
    prefix = 'cache'
  } = options

  // Skip caching if requested
  if (skip) {
    return fetchFn()
  }

  const cacheKey = key.startsWith(prefix) ? key : `${prefix}:${key}`

  // Try to get from cache
  const cached = await getFromCache<T>(cacheKey)
  const now = Date.now()

  // Cache hit - return if not expired
  if (cached) {
    cacheStats.hits++

    // Check if stale and within SWR window
    if (cached.expiresAt < now && swr > 0) {
      const swrWindow = cached.expiresAt + (swr * 1000)

      if (now < swrWindow) {
        // Return stale data and refresh in background
        console.log(`[API Cache] Serving stale data for ${cacheKey}, refreshing in background`)

        // Refresh in background (fire and forget)
        fetchFn().then(async (freshData) => {
          await setInCache(
            cacheKey,
            {
              value: freshData,
              timestamp: Date.now(),
              expiresAt: Date.now() + (ttl * 1000),
              tags,
              compressed: shouldCompress,
              swr
            },
            ttl
          )
        }).catch(err => {
          console.error('[API Cache] Background refresh failed:', err)
        })

        return cached.value
      }
    }

    // Not expired - return cached value
    if (cached.expiresAt >= now) {
      return cached.value
    }
  }

  // Cache miss - fetch fresh data
  cacheStats.misses++
  const data = await fetchFn()

  // Determine if compression is beneficial
  const serialized = JSON.stringify(data)
  const shouldCompressData = shouldCompress || serialized.length > 10240 // 10KB threshold

  // Store in cache
  const entry: CacheEntry<T> = {
    value: data,
    timestamp: now,
    expiresAt: now + (ttl * 1000),
    tags,
    compressed: shouldCompressData,
    swr
  }

  await setInCache(cacheKey, entry, ttl + (swr || 0))

  // Store tag mappings for invalidation
  if (tags.length > 0) {
    for (const tag of tags) {
      const tagKey = `${prefix}:tag:${tag}`
      // In production with Redis, use Sets for tag management
      // For simplicity, we'll store a simple mapping
      await setInCache(
        tagKey,
        { value: [cacheKey], timestamp: now, expiresAt: now + (86400 * 1000), tags: [], compressed: false },
        86400 // 24 hours
      )
    }
  }

  return data
}

/**
 * Wrapper for API routes with automatic caching
 * Caches the response based on request URL and method
 *
 * @example
 * ```ts
 * export const GET = withCachedResponse(
 *   async (request) => {
 *     const data = await fetchData()
 *     return NextResponse.json(data)
 *   },
 *   { ttl: 300, tags: ['api-data'] }
 * )
 * ```
 */
export async function withCachedResponse(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: CacheOptions = {}
): Promise<(request: NextRequest) => Promise<NextResponse>> {
  return async (request: NextRequest) => {
    const cacheKey = generateRequestCacheKey(request)

    try {
      // Try to get cached response
      const cached = await withCache<any>(
        cacheKey,
        async () => {
          const response = await handler(request)
          const data = await response.json()
          return {
            data,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
          }
        },
        options
      )

      // Reconstruct response from cache
      const response = NextResponse.json(cached.data, { status: cached.status })

      // Add cache headers
      response.headers.set('X-Cache', 'HIT')
      response.headers.set('Cache-Control', `public, max-age=${options.ttl || 300}`)

      return response
    } catch (error) {
      console.error('[API Cache] Cache error, executing handler:', error)
      const response = await handler(request)
      response.headers.set('X-Cache', 'MISS')
      return response
    }
  }
}

// ================================================================
// CACHE INVALIDATION
// ================================================================

/**
 * Invalidate cache by exact key
 */
export async function invalidateCache(key: string, prefix: string = 'cache'): Promise<void> {
  const cacheKey = key.startsWith(prefix) ? key : `${prefix}:${key}`
  await deleteFromCache(cacheKey)
  console.log(`[API Cache] Invalidated cache: ${cacheKey}`)
}

/**
 * Invalidate cache by tag
 * Removes all cache entries associated with the tag
 *
 * @example
 * ```ts
 * // Invalidate all caches related to patient 123
 * await invalidateCacheByTag('patient:123')
 * ```
 */
export async function invalidateCacheByTag(tag: string, prefix: string = 'cache'): Promise<void> {
  const tagKey = `${prefix}:tag:${tag}`
  const tagged = await getFromCache<string[]>(tagKey)

  if (tagged?.value) {
    await Promise.all(tagged.value.map(key => deleteFromCache(key)))
    await deleteFromCache(tagKey)
    console.log(`[API Cache] Invalidated ${tagged.value.length} caches with tag: ${tag}`)
  }
}

/**
 * Invalidate cache by pattern
 * Supports wildcards (*)
 *
 * @example
 * ```ts
 * // Invalidate all session caches
 * await invalidateCacheByPattern('sessions:*')
 * ```
 */
export async function invalidateCacheByPattern(pattern: string, prefix: string = 'cache'): Promise<void> {
  const fullPattern = pattern.startsWith(prefix) ? pattern : `${prefix}:${pattern}`
  const keys = await getKeys(fullPattern)

  await Promise.all(keys.map(key => deleteFromCache(key)))
  console.log(`[API Cache] Invalidated ${keys.length} caches matching pattern: ${pattern}`)
}

/**
 * Clear all cache entries
 * Use with caution in production
 */
export async function clearAllCache(): Promise<void> {
  if (redisAvailable && redisClient) {
    try {
      await redisClient.flushdb()
      console.log('[API Cache] Cleared all Redis cache')
    } catch (error) {
      console.error('[API Cache] Failed to clear Redis cache:', error)
    }
  }

  inMemoryCache.clear()
  console.log('[API Cache] Cleared in-memory cache')
}

// ================================================================
// CACHE WARMING
// ================================================================

/**
 * Pre-populate cache with commonly accessed data
 * Run this on application startup or scheduled intervals
 *
 * @example
 * ```ts
 * await warmCache([
 *   { key: 'leaderboard:weekly', fn: () => getWeeklyLeaderboard(), ttl: 300 },
 *   { key: 'meditation:popular', fn: () => getPopularMeditations(), ttl: 600 }
 * ])
 * ```
 */
export async function warmCache(
  entries: Array<{ key: string; fn: () => Promise<any>; options?: CacheOptions }>
): Promise<void> {
  console.log(`[API Cache] Warming cache with ${entries.length} entries...`)

  await Promise.all(
    entries.map(({ key, fn, options }) =>
      withCache(key, fn, options).catch(err => {
        console.error(`[API Cache] Failed to warm cache for ${key}:`, err)
      })
    )
  )

  console.log('[API Cache] Cache warming completed')
}

// ================================================================
// MONITORING & STATISTICS
// ================================================================

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  const totalRequests = cacheStats.hits + cacheStats.misses
  const hitRate = totalRequests > 0 ? cacheStats.hits / totalRequests : 0

  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    hitRate: Math.round(hitRate * 100) / 100,
    size: inMemoryCache.size,
    keys: inMemoryCache.size
  }
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  cacheStats.hits = 0
  cacheStats.misses = 0
}

/**
 * Get cache entry metadata without retrieving the value
 * Useful for monitoring and debugging
 */
export async function getCacheMetadata(key: string, prefix: string = 'cache'): Promise<{
  exists: boolean
  expiresAt?: number
  age?: number
  tags?: string[]
} | null> {
  const cacheKey = key.startsWith(prefix) ? key : `${prefix}:${key}`
  const entry = await getFromCache(cacheKey)

  if (!entry) {
    return { exists: false }
  }

  return {
    exists: true,
    expiresAt: entry.expiresAt,
    age: Date.now() - entry.timestamp,
    tags: entry.tags
  }
}

// ================================================================
// PRESET CONFIGURATIONS
// ================================================================

/**
 * Cache configuration presets for common use cases
 */
export const CachePresets = {
  /**
   * Short cache for frequently changing data
   */
  SHORT: { ttl: 60, swr: 30 } as CacheOptions, // 1 minute + 30s SWR

  /**
   * Medium cache for moderate changing data
   */
  MEDIUM: { ttl: 300, swr: 60 } as CacheOptions, // 5 minutes + 1min SWR

  /**
   * Long cache for rarely changing data
   */
  LONG: { ttl: 3600, swr: 300 } as CacheOptions, // 1 hour + 5min SWR

  /**
   * Very long cache for static data
   */
  STATIC: { ttl: 86400, swr: 3600 } as CacheOptions, // 24 hours + 1h SWR

  /**
   * User-specific data cache
   */
  USER_DATA: { ttl: 300, tags: ['user'] } as CacheOptions,

  /**
   * Session data cache
   */
  SESSION_DATA: { ttl: 600, tags: ['sessions'] } as CacheOptions,

  /**
   * Leaderboard cache
   */
  LEADERBOARD: { ttl: 300, tags: ['leaderboard', 'gamification'] } as CacheOptions,

  /**
   * Analytics data cache
   */
  ANALYTICS: { ttl: 1800, compress: true } as CacheOptions
}
