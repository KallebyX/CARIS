/**
 * MEDIUM-08: Calendar Integration Error Handling
 *
 * Comprehensive error handling for calendar integrations with:
 * - Graceful degradation
 * - Structured error reporting
 * - Token refresh handling
 * - Fallback strategies
 */

import { safeError } from '@/lib/safe-logger'
import { db } from '@/db'
import { userSettings } from '@/db/schema'
import { eq } from 'drizzle-orm'

export enum CalendarErrorType {
  // Authentication errors
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  REFRESH_FAILED = 'REFRESH_FAILED',
  AUTH_REQUIRED = 'AUTH_REQUIRED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',

  // API errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  API_ERROR = 'API_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Validation errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_EVENT_DATA = 'INVALID_EVENT_DATA',

  // System errors
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface CalendarError {
  type: CalendarErrorType
  message: string
  originalError?: Error
  provider?: 'google' | 'outlook'
  userId?: number
  sessionId?: number
  retryable: boolean
  requiresUserAction: boolean
  gracefulDegradation: boolean
  metadata?: Record<string, any>
}

export interface ErrorHandlingStrategy {
  shouldRetry: boolean
  shouldRefreshToken: boolean
  shouldDisableSync: boolean
  shouldNotifyUser: boolean
  fallbackBehavior?: 'skip' | 'queue' | 'local_only'
  userMessage?: string
}

/**
 * Classify an error and determine handling strategy
 */
export function classifyCalendarError(error: any, provider: 'google' | 'outlook'): CalendarError {
  const errorString = String(error).toLowerCase()
  const errorMessage = error.message?.toLowerCase() || ''
  const errorCode = error.code?.toString() || ''
  const statusCode = error.status || error.statusCode || error.response?.status

  // Token/Authentication errors
  if (
    statusCode === 401 ||
    errorCode === '401' ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('invalid_grant') ||
    errorMessage.includes('token expired')
  ) {
    return {
      type: CalendarErrorType.TOKEN_EXPIRED,
      message: `${provider} calendar token expired`,
      originalError: error instanceof Error ? error : undefined,
      provider,
      retryable: true,
      requiresUserAction: false,
      gracefulDegradation: true,
    }
  }

  if (
    errorMessage.includes('refresh_token') ||
    errorMessage.includes('invalid credentials')
  ) {
    return {
      type: CalendarErrorType.TOKEN_INVALID,
      message: `${provider} calendar credentials invalid`,
      originalError: error instanceof Error ? error : undefined,
      provider,
      retryable: false,
      requiresUserAction: true,
      gracefulDegradation: true,
    }
  }

  // Rate limiting
  if (
    statusCode === 429 ||
    errorCode === '429' ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('quota')
  ) {
    return {
      type: CalendarErrorType.RATE_LIMIT_EXCEEDED,
      message: `${provider} calendar rate limit exceeded`,
      originalError: error instanceof Error ? error : undefined,
      provider,
      retryable: true,
      requiresUserAction: false,
      gracefulDegradation: true,
      metadata: {
        retryAfter: error.response?.headers?.['retry-after'],
      },
    }
  }

  // Network errors
  if (
    errorCode === 'ETIMEDOUT' ||
    errorCode === 'ESOCKETTIMEDOUT' ||
    errorMessage.includes('timeout')
  ) {
    return {
      type: CalendarErrorType.TIMEOUT,
      message: `${provider} calendar API timeout`,
      originalError: error instanceof Error ? error : undefined,
      provider,
      retryable: true,
      requiresUserAction: false,
      gracefulDegradation: true,
    }
  }

  if (
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ENOTFOUND' ||
    errorCode === 'ECONNRESET' ||
    errorCode === 'ENETUNREACH'
  ) {
    return {
      type: CalendarErrorType.NETWORK_ERROR,
      message: `Network error connecting to ${provider} calendar`,
      originalError: error instanceof Error ? error : undefined,
      provider,
      retryable: true,
      requiresUserAction: false,
      gracefulDegradation: true,
    }
  }

  // Service errors
  if (
    statusCode === 503 ||
    statusCode === 502 ||
    statusCode === 504 ||
    errorMessage.includes('service unavailable')
  ) {
    return {
      type: CalendarErrorType.SERVICE_UNAVAILABLE,
      message: `${provider} calendar service temporarily unavailable`,
      originalError: error instanceof Error ? error : undefined,
      provider,
      retryable: true,
      requiresUserAction: false,
      gracefulDegradation: true,
    }
  }

  // Circuit breaker
  if (error.name === 'CircuitBreakerError') {
    return {
      type: CalendarErrorType.CIRCUIT_BREAKER_OPEN,
      message: `${provider} calendar circuit breaker is open`,
      originalError: error instanceof Error ? error : undefined,
      provider,
      retryable: false,
      requiresUserAction: false,
      gracefulDegradation: true,
    }
  }

  // Validation errors
  if (
    statusCode === 400 ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('bad request')
  ) {
    return {
      type: CalendarErrorType.INVALID_REQUEST,
      message: `Invalid request to ${provider} calendar`,
      originalError: error instanceof Error ? error : undefined,
      provider,
      retryable: false,
      requiresUserAction: true,
      gracefulDegradation: false,
    }
  }

  // Unknown error
  return {
    type: CalendarErrorType.UNKNOWN_ERROR,
    message: `Unknown error with ${provider} calendar: ${errorMessage}`,
    originalError: error instanceof Error ? error : new Error(String(error)),
    provider,
    retryable: false,
    requiresUserAction: false,
    gracefulDegradation: true,
  }
}

/**
 * Determine error handling strategy based on error classification
 */
export function getErrorHandlingStrategy(calendarError: CalendarError): ErrorHandlingStrategy {
  switch (calendarError.type) {
    case CalendarErrorType.TOKEN_EXPIRED:
      return {
        shouldRetry: true,
        shouldRefreshToken: true,
        shouldDisableSync: false,
        shouldNotifyUser: false,
        fallbackBehavior: 'skip',
      }

    case CalendarErrorType.TOKEN_INVALID:
    case CalendarErrorType.REFRESH_FAILED:
    case CalendarErrorType.AUTH_REQUIRED:
      return {
        shouldRetry: false,
        shouldRefreshToken: false,
        shouldDisableSync: true,
        shouldNotifyUser: true,
        fallbackBehavior: 'skip',
        userMessage: `Por favor, reconecte sua conta ${calendarError.provider === 'google' ? 'Google' : 'Outlook'} Calendar nas configurações`,
      }

    case CalendarErrorType.RATE_LIMIT_EXCEEDED:
    case CalendarErrorType.QUOTA_EXCEEDED:
      return {
        shouldRetry: false,
        shouldRefreshToken: false,
        shouldDisableSync: false,
        shouldNotifyUser: false,
        fallbackBehavior: 'queue',
      }

    case CalendarErrorType.TIMEOUT:
    case CalendarErrorType.NETWORK_ERROR:
    case CalendarErrorType.CONNECTION_REFUSED:
      return {
        shouldRetry: true,
        shouldRefreshToken: false,
        shouldDisableSync: false,
        shouldNotifyUser: false,
        fallbackBehavior: 'skip',
      }

    case CalendarErrorType.SERVICE_UNAVAILABLE:
      return {
        shouldRetry: false,
        shouldRefreshToken: false,
        shouldDisableSync: false,
        shouldNotifyUser: false,
        fallbackBehavior: 'skip',
      }

    case CalendarErrorType.CIRCUIT_BREAKER_OPEN:
      return {
        shouldRetry: false,
        shouldRefreshToken: false,
        shouldDisableSync: false,
        shouldNotifyUser: false,
        fallbackBehavior: 'skip',
      }

    case CalendarErrorType.INVALID_REQUEST:
    case CalendarErrorType.INVALID_EVENT_DATA:
      return {
        shouldRetry: false,
        shouldRefreshToken: false,
        shouldDisableSync: false,
        shouldNotifyUser: true,
        fallbackBehavior: 'skip',
        userMessage: 'Dados de evento inválidos. Por favor, verifique as informações da sessão',
      }

    default:
      return {
        shouldRetry: false,
        shouldRefreshToken: false,
        shouldDisableSync: false,
        shouldNotifyUser: false,
        fallbackBehavior: 'skip',
      }
  }
}

/**
 * Handle calendar sync error with graceful degradation
 */
export async function handleCalendarSyncError(
  error: any,
  provider: 'google' | 'outlook',
  userId: number,
  sessionId?: number
): Promise<{ handled: boolean; shouldContinue: boolean; error: CalendarError }> {
  const calendarError = classifyCalendarError(error, provider)
  calendarError.userId = userId
  calendarError.sessionId = sessionId

  const strategy = getErrorHandlingStrategy(calendarError)

  // Log structured error
  safeError(
    `[CalendarSync:${provider}]`,
    `Error type: ${calendarError.type}`,
    {
      userId,
      sessionId,
      type: calendarError.type,
      message: calendarError.message,
      retryable: calendarError.retryable,
      strategy,
    }
  )

  // Disable sync if credentials are invalid
  if (strategy.shouldDisableSync) {
    try {
      const field = provider === 'google' ? 'googleCalendarEnabled' : 'outlookCalendarEnabled'
      await db
        .update(userSettings)
        .set({ [field]: false })
        .where(eq(userSettings.userId, userId))

      console.warn(
        `[CalendarSync:${provider}] Disabled calendar sync for user ${userId} due to auth failure`
      )
    } catch (dbError) {
      safeError('[CalendarSync]', 'Failed to disable sync in database:', dbError)
    }
  }

  // Determine if we should continue with other operations
  const shouldContinue = calendarError.gracefulDegradation

  return {
    handled: true,
    shouldContinue,
    error: calendarError,
  }
}

/**
 * Create user-friendly error message
 */
export function getUserFriendlyErrorMessage(calendarError: CalendarError): string {
  const providerName = calendarError.provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'

  switch (calendarError.type) {
    case CalendarErrorType.TOKEN_EXPIRED:
    case CalendarErrorType.TOKEN_INVALID:
    case CalendarErrorType.AUTH_REQUIRED:
      return `Sua conexão com ${providerName} expirou. Por favor, reconecte nas configurações.`

    case CalendarErrorType.RATE_LIMIT_EXCEEDED:
      return `Limite de uso do ${providerName} foi atingido. A sincronização será retomada em breve.`

    case CalendarErrorType.SERVICE_UNAVAILABLE:
      return `${providerName} está temporariamente indisponível. Suas sessões estão seguras no CÁRIS.`

    case CalendarErrorType.NETWORK_ERROR:
    case CalendarErrorType.TIMEOUT:
      return `Problema de conexão com ${providerName}. Tentaremos novamente automaticamente.`

    case CalendarErrorType.CIRCUIT_BREAKER_OPEN:
      return `Sincronização com ${providerName} pausada temporariamente devido a múltiplas falhas.`

    default:
      return `Não foi possível sincronizar com ${providerName} no momento. Suas sessões estão seguras no CÁRIS.`
  }
}

/**
 * Log calendar error for monitoring
 */
export function logCalendarErrorForMonitoring(calendarError: CalendarError): void {
  // In production, this would send to monitoring service (Sentry, DataDog, etc.)
  const logData = {
    timestamp: new Date().toISOString(),
    errorType: calendarError.type,
    provider: calendarError.provider,
    userId: calendarError.userId,
    sessionId: calendarError.sessionId,
    message: calendarError.message,
    retryable: calendarError.retryable,
    requiresUserAction: calendarError.requiresUserAction,
    stack: calendarError.originalError?.stack,
    metadata: calendarError.metadata,
  }

  console.error('[CalendarErrorMonitoring]', JSON.stringify(logData, null, 2))

  // TODO: Send to external monitoring service
  // await monitoringService.captureError(logData)
}
