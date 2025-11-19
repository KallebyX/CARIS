/**
 * MEDIUM-08: Calendar Integration Error Handling
 *
 * Retry handler with exponential backoff for transient failures
 * Handles network timeouts, rate limits, and temporary API failures
 */

import { safeError } from '@/lib/safe-logger'

export interface RetryConfig {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryableErrors: string[]
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: number
  totalTime: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ETIMEDOUT',
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED',
    '429', // Rate limit
    '500', // Server error
    '502', // Bad gateway
    '503', // Service unavailable
    '504', // Gateway timeout
  ],
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false

  const errorString = String(error).toLowerCase()
  const errorMessage = error.message?.toLowerCase() || ''
  const errorCode = error.code?.toString() || ''
  const errorStatus = error.status?.toString() || error.statusCode?.toString() || ''

  return retryableErrors.some(retryable => {
    const retryableString = retryable.toLowerCase()
    return (
      errorString.includes(retryableString) ||
      errorMessage.includes(retryableString) ||
      errorCode === retryable ||
      errorStatus === retryable
    )
  })
}

/**
 * Calculate delay for next retry using exponential backoff with jitter
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt)
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs)

  // Add jitter (±20%) to prevent thundering herd
  const jitter = cappedDelay * 0.2 * (Math.random() - 0.5)
  return Math.floor(cappedDelay + jitter)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * @param fn - Async function to execute
 * @param context - Context string for logging
 * @param config - Retry configuration
 * @returns Result with success status and data or error
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  context: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<RetryResult<T>> {
  const startTime = Date.now()
  let lastError: Error | undefined

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      const data = await fn()
      const totalTime = Date.now() - startTime

      if (attempt > 0) {
        console.log(
          `[RetryHandler:${context}] Success after ${attempt + 1} attempts (${totalTime}ms)`
        )
      }

      return {
        success: true,
        data,
        attempts: attempt + 1,
        totalTime,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      const isRetryable = isRetryableError(error, config.retryableErrors)
      const isLastAttempt = attempt === config.maxAttempts - 1

      if (!isRetryable || isLastAttempt) {
        const totalTime = Date.now() - startTime

        safeError(
          `[RetryHandler:${context}]`,
          `${isRetryable ? 'Max attempts reached' : 'Non-retryable error'} after ${attempt + 1} attempts (${totalTime}ms):`,
          error
        )

        return {
          success: false,
          error: lastError,
          attempts: attempt + 1,
          totalTime,
        }
      }

      // Calculate delay and wait before retry
      const delay = calculateDelay(attempt, config)

      console.warn(
        `[RetryHandler:${context}] Attempt ${attempt + 1}/${config.maxAttempts} failed. Retrying in ${delay}ms...`,
        {
          error: lastError.message,
          code: (error as any).code,
          status: (error as any).status || (error as any).statusCode,
        }
      )

      await sleep(delay)
    }
  }

  // Should never reach here, but TypeScript needs it
  const totalTime = Date.now() - startTime
  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    attempts: config.maxAttempts,
    totalTime,
  }
}

/**
 * Retry configuration optimized for calendar API calls
 */
export const CALENDAR_API_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 4,
  initialDelayMs: 2000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ETIMEDOUT',
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ENETUNREACH',
    '401', // May be token refresh needed
    '429', // Rate limit
    '500',
    '502',
    '503',
    '504',
    'quota',
    'rate limit',
    'timeout',
  ],
}

/**
 * Retry configuration for token refresh operations
 */
export const TOKEN_REFRESH_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ETIMEDOUT',
    'ECONNRESET',
    '500',
    '502',
    '503',
    '504',
  ],
}

/**
 * Execute multiple operations in parallel with retry
 */
export async function retryAllWithBackoff<T>(
  operations: Array<{ fn: () => Promise<T>; context: string }>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<RetryResult<T>[]> {
  const promises = operations.map(op =>
    retryWithBackoff(op.fn, op.context, config)
  )

  return Promise.all(promises)
}

/**
 * Execute operations in parallel but fail fast if any critical operation fails
 */
export async function retryAllFailFast<T>(
  operations: Array<{ fn: () => Promise<T>; context: string; critical?: boolean }>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<{ results: RetryResult<T>[]; allSuccessful: boolean }> {
  const results = await retryAllWithBackoff(operations, config)

  const criticalFailure = results.some((result, index) => {
    return operations[index].critical && !result.success
  })

  return {
    results,
    allSuccessful: results.every(r => r.success) && !criticalFailure,
  }
}
