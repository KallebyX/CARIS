/**
 * SECURITY: Request timeout middleware to prevent hanging requests
 * Protects against slow loris attacks and resource exhaustion
 */

import { NextRequest, NextResponse } from 'next/server'

export interface TimeoutConfig {
  /**
   * Default timeout in milliseconds (30 seconds)
   */
  default: number

  /**
   * Timeout for file upload endpoints (5 minutes)
   */
  upload: number

  /**
   * Timeout for AI/ML processing endpoints (2 minutes)
   */
  ai: number

  /**
   * Timeout for long-running reports (3 minutes)
   */
  report: number

  /**
   * Timeout for health checks (5 seconds)
   */
  health: number
}

export const TIMEOUT_CONFIG: TimeoutConfig = {
  default: 30_000,  // 30 seconds
  upload: 300_000,  // 5 minutes
  ai: 120_000,      // 2 minutes
  report: 180_000,  // 3 minutes
  health: 5_000,    // 5 seconds
}

/**
 * Create a timeout promise that rejects after specified duration
 */
function createTimeoutPromise(timeoutMs: number, requestId: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new TimeoutError(
          `Request timed out after ${timeoutMs}ms`,
          timeoutMs,
          requestId
        )
      )
    }, timeoutMs)
  })
}

/**
 * Custom timeout error class
 */
export class TimeoutError extends Error {
  public readonly timeout: number
  public readonly requestId: string
  public readonly timestamp: string

  constructor(message: string, timeout: number, requestId: string) {
    super(message)
    this.name = 'TimeoutError'
    this.timeout = timeout
    this.requestId = requestId
    this.timestamp = new Date().toISOString()
  }
}

/**
 * Determine timeout duration based on request path
 */
function getTimeoutForPath(pathname: string): number {
  // File upload endpoints
  if (pathname.includes('/upload') || pathname.includes('/files')) {
    return TIMEOUT_CONFIG.upload
  }

  // AI/ML processing endpoints
  if (pathname.includes('/ai/') || pathname.includes('/analyze') || pathname.includes('/transcribe')) {
    return TIMEOUT_CONFIG.ai
  }

  // Report generation endpoints
  if (pathname.includes('/report') || pathname.includes('/export')) {
    return TIMEOUT_CONFIG.report
  }

  // Health check endpoints
  if (pathname.includes('/health') || pathname === '/api/ping') {
    return TIMEOUT_CONFIG.health
  }

  // Default timeout for all other endpoints
  return TIMEOUT_CONFIG.default
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Wrap an API handler with timeout protection
 *
 * Usage:
 * ```typescript
 * export const GET = withTimeout(async (req: NextRequest) => {
 *   // Your handler logic
 *   return NextResponse.json({ data: 'result' })
 * })
 * ```
 */
export function withTimeout<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  customTimeout?: number
): T {
  return (async (req: NextRequest, ...args: any[]) => {
    const requestId = generateRequestId()
    const pathname = new URL(req.url).pathname
    const timeoutMs = customTimeout || getTimeoutForPath(pathname)

    const startTime = Date.now()

    try {
      // Race between the handler and timeout
      const result = await Promise.race([
        handler(req, ...args),
        createTimeoutPromise(timeoutMs, requestId),
      ])

      const duration = Date.now() - startTime

      // Log slow requests (>50% of timeout)
      if (duration > timeoutMs * 0.5) {
        console.warn(`[REQUEST_TIMEOUT] Slow request detected:`, {
          requestId,
          pathname,
          duration,
          timeout: timeoutMs,
          percentage: Math.round((duration / timeoutMs) * 100),
        })
      }

      return result
    } catch (error) {
      if (error instanceof TimeoutError) {
        console.error(`[REQUEST_TIMEOUT] Request timed out:`, {
          requestId: error.requestId,
          pathname,
          timeout: error.timeout,
          timestamp: error.timestamp,
        })

        return NextResponse.json(
          {
            error: 'Request Timeout',
            message: `The request took too long to process and was terminated after ${timeoutMs / 1000} seconds.`,
            code: 'REQUEST_TIMEOUT',
            requestId,
            timeout: timeoutMs,
          },
          {
            status: 504, // Gateway Timeout
            headers: {
              'X-Request-ID': requestId,
              'X-Timeout-MS': timeoutMs.toString(),
            },
          }
        )
      }

      // Re-throw other errors
      throw error
    }
  }) as T
}

/**
 * Middleware-style timeout wrapper for use in middleware.ts
 *
 * Note: Next.js middleware has built-in timeout (30s default),
 * but this provides more granular control per endpoint
 */
export async function timeoutMiddleware(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  customTimeout?: number
): Promise<NextResponse> {
  const wrappedHandler = withTimeout(handler, customTimeout)
  return wrappedHandler(req)
}

/**
 * Utility to wrap any promise with a timeout
 * Useful for database queries, external API calls, etc.
 */
export async function withPromiseTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  const requestId = generateRequestId()

  return Promise.race([
    promise,
    createTimeoutPromise(
      timeoutMs,
      requestId
    ).catch((error) => {
      if (error instanceof TimeoutError) {
        throw new Error(
          errorMessage || `Operation timed out after ${timeoutMs}ms`
        )
      }
      throw error
    }),
  ])
}

/**
 * Configuration for specific routes (can be overridden)
 */
export const ROUTE_TIMEOUTS: Record<string, number> = {
  '/api/chat/files/upload': TIMEOUT_CONFIG.upload,
  '/api/ai/emotional-insights': TIMEOUT_CONFIG.ai,
  '/api/ai/predict-mood': TIMEOUT_CONFIG.ai,
  '/api/ai/risk-assessment': TIMEOUT_CONFIG.ai,
  '/api/psychologist/progress-reports': TIMEOUT_CONFIG.report,
  '/api/admin/reports/analytics': TIMEOUT_CONFIG.report,
  '/api/health': TIMEOUT_CONFIG.health,
}
