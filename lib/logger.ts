/**
 * Structured Logger with Sentry Integration
 *
 * This module provides structured logging with different log levels,
 * Sentry integration for errors, request ID tracking, user context in logs,
 * and performance logging.
 */

import * as Sentry from "@sentry/nextjs"
import { isSentryEnabled } from "./sentry-helpers"
import { captureError, captureMessage } from "./error-tracking"

// ================================================================
// TYPE DEFINITIONS
// ================================================================

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal"

interface LogContext {
  [key: string]: any
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  requestId?: string
  userId?: string
  error?: Error
  stack?: string
}

interface LoggerOptions {
  requestId?: string
  userId?: string
  service?: string
  environment?: string
}

// ================================================================
// LOGGER CLASS
// ================================================================

class Logger {
  private requestId?: string
  private userId?: string
  private service: string
  private environment: string
  private minLevel: LogLevel

  constructor(options: LoggerOptions = {}) {
    this.requestId = options.requestId
    this.userId = options.userId
    this.service = options.service || "caris-saas-pro"
    this.environment =
      options.environment || process.env.NODE_ENV || "development"

    // Set minimum log level based on environment
    this.minLevel = this.getMinLogLevel()
  }

  /**
   * Get minimum log level based on environment
   */
  private getMinLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL as LogLevel

    if (envLevel) {
      return envLevel
    }

    // Default levels by environment
    switch (this.environment) {
      case "production":
        return "info"
      case "staging":
        return "debug"
      case "development":
        return "debug"
      default:
        return "debug"
    }
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error", "fatal"]
    const minLevelIndex = levels.indexOf(this.minLevel)
    const currentLevelIndex = levels.indexOf(level)

    return currentLevelIndex >= minLevelIndex
  }

  /**
   * Format log entry
   */
  private formatLog(entry: LogEntry): string {
    if (this.environment === "development") {
      // Pretty print for development
      return JSON.stringify(entry, null, 2)
    }

    // Compact JSON for production (better for log aggregation)
    return JSON.stringify(entry)
  }

  /**
   * Write log entry
   */
  private writeLog(entry: LogEntry): void {
    const formattedLog = this.formatLog(entry)

    // Write to appropriate console method
    switch (entry.level) {
      case "debug":
        console.debug(formattedLog)
        break
      case "info":
        console.info(formattedLog)
        break
      case "warn":
        console.warn(formattedLog)
        break
      case "error":
      case "fatal":
        console.error(formattedLog)
        break
    }

    // Send to Sentry for errors
    if (entry.level === "error" || entry.level === "fatal") {
      if (entry.error) {
        captureError(entry.error, {
          level: entry.level === "fatal" ? "fatal" : "error",
          tags: {
            service: this.service,
            request_id: this.requestId || "unknown",
          },
          context: entry.context,
        })
      } else {
        captureMessage(entry.message, entry.level === "fatal" ? "fatal" : "error", {
          tags: {
            service: this.service,
            request_id: this.requestId || "unknown",
          },
          context: entry.context,
        })
      }
    }
  }

  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: {
        service: this.service,
        environment: this.environment,
        ...context,
      },
    }

    if (this.requestId) {
      entry.requestId = this.requestId
    }

    if (this.userId) {
      entry.userId = this.userId
    }

    if (error) {
      entry.error = error
      entry.stack = error.stack
    }

    return entry
  }

  /**
   * Set request ID for this logger instance
   */
  setRequestId(requestId: string): void {
    this.requestId = requestId
  }

  /**
   * Set user ID for this logger instance
   */
  setUserId(userId: string): void {
    this.userId = userId
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog("debug")) return

    const entry = this.createLogEntry("debug", message, context)
    this.writeLog(entry)
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog("info")) return

    const entry = this.createLogEntry("info", message, context)
    this.writeLog(entry)
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog("warn")) return

    const entry = this.createLogEntry("warn", message, context)
    this.writeLog(entry)

    // Send warnings to Sentry as breadcrumbs
    if (isSentryEnabled()) {
      Sentry.addBreadcrumb({
        category: "log",
        message,
        level: "warning",
        data: context,
      })
    }
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog("error")) return

    const entry = this.createLogEntry("error", message, context, error)
    this.writeLog(entry)
  }

  /**
   * Fatal level logging
   */
  fatal(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog("fatal")) return

    const entry = this.createLogEntry("fatal", message, context, error)
    this.writeLog(entry)
  }

  /**
   * Create a child logger with additional context
   */
  child(options: Partial<LoggerOptions>): Logger {
    return new Logger({
      requestId: options.requestId || this.requestId,
      userId: options.userId || this.userId,
      service: options.service || this.service,
      environment: options.environment || this.environment,
    })
  }
}

// ================================================================
// SINGLETON INSTANCE
// ================================================================

// Default logger instance
export const logger = new Logger()

// ================================================================
// CONVENIENCE FUNCTIONS
// ================================================================

/**
 * Create a logger with request context
 */
export function createRequestLogger(requestId: string): Logger {
  return new Logger({ requestId })
}

/**
 * Create a logger with user context
 */
export function createUserLogger(userId: string): Logger {
  return new Logger({ userId })
}

/**
 * Create a logger with both request and user context
 */
export function createContextLogger(requestId: string, userId: string): Logger {
  return new Logger({ requestId, userId })
}

// ================================================================
// REQUEST ID GENERATION
// ================================================================

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Extract request ID from headers
 */
export function getRequestIdFromHeaders(
  headers: Headers | Record<string, string>
): string | undefined {
  if (headers instanceof Headers) {
    return headers.get("x-request-id") || undefined
  }
  return headers["x-request-id"]
}

// ================================================================
// PERFORMANCE LOGGING
// ================================================================

/**
 * Log performance metrics
 */
export function logPerformance(
  operation: string,
  duration: number,
  context?: LogContext
): void {
  logger.info(`Performance: ${operation}`, {
    ...context,
    duration_ms: duration,
    operation,
  })

  // Track in Sentry
  if (isSentryEnabled()) {
    Sentry.metrics.distribution("performance.operation_duration", duration, {
      unit: "millisecond",
      tags: {
        operation,
      },
    })
  }
}

/**
 * Measure and log async operation performance
 */
export async function measureAsyncOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const startTime = performance.now()

  try {
    const result = await fn()
    const duration = performance.now() - startTime

    logPerformance(operation, duration, {
      ...context,
      status: "success",
    })

    return result
  } catch (error) {
    const duration = performance.now() - startTime

    logPerformance(operation, duration, {
      ...context,
      status: "error",
    })

    throw error
  }
}

/**
 * Measure and log sync operation performance
 */
export function measureOperation<T>(
  operation: string,
  fn: () => T,
  context?: LogContext
): T {
  const startTime = performance.now()

  try {
    const result = fn()
    const duration = performance.now() - startTime

    logPerformance(operation, duration, {
      ...context,
      status: "success",
    })

    return result
  } catch (error) {
    const duration = performance.now() - startTime

    logPerformance(operation, duration, {
      ...context,
      status: "error",
    })

    throw error
  }
}

// ================================================================
// API REQUEST LOGGING
// ================================================================

/**
 * Log API request
 */
export function logApiRequest(
  method: string,
  endpoint: string,
  statusCode: number,
  duration: number,
  context?: LogContext
): void {
  const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info"

  logger[level](`API ${method} ${endpoint} ${statusCode}`, {
    ...context,
    method,
    endpoint,
    status_code: statusCode,
    duration_ms: duration,
  })
}

/**
 * API request logger middleware helper
 */
export function createApiLogger(method: string, endpoint: string) {
  const requestId = generateRequestId()
  const requestLogger = createRequestLogger(requestId)
  const startTime = performance.now()

  return {
    requestId,
    logger: requestLogger,
    finish: (statusCode: number, context?: LogContext) => {
      const duration = performance.now() - startTime
      logApiRequest(method, endpoint, statusCode, duration, {
        ...context,
        request_id: requestId,
      })
    },
  }
}

// ================================================================
// DATABASE QUERY LOGGING
// ================================================================

/**
 * Log database query
 */
export function logDatabaseQuery(
  operation: string,
  table: string,
  duration: number,
  context?: LogContext
): void {
  logger.debug(`Database ${operation} on ${table}`, {
    ...context,
    operation,
    table,
    duration_ms: duration,
  })

  // Warn about slow queries
  if (duration > 1000) {
    logger.warn(`Slow database query detected: ${operation} on ${table}`, {
      ...context,
      operation,
      table,
      duration_ms: duration,
      slow_query: true,
    })
  }
}

// ================================================================
// STRUCTURED LOG FORMATS
// ================================================================

/**
 * Log user action
 */
export function logUserAction(
  userId: string,
  action: string,
  context?: LogContext
): void {
  logger.info(`User action: ${action}`, {
    ...context,
    user_id: userId,
    action,
    action_type: "user",
  })
}

/**
 * Log authentication event
 */
export function logAuthEvent(
  event: "login" | "logout" | "register" | "failed_login",
  userId?: string,
  context?: LogContext
): void {
  const level = event === "failed_login" ? "warn" : "info"

  logger[level](`Auth event: ${event}`, {
    ...context,
    user_id: userId,
    event,
    event_type: "auth",
  })
}

/**
 * Log payment event
 */
export function logPaymentEvent(
  event: string,
  amount: number,
  currency: string,
  context?: LogContext
): void {
  logger.info(`Payment event: ${event}`, {
    ...context,
    event,
    amount,
    currency,
    event_type: "payment",
  })
}

/**
 * Log therapy session event
 */
export function logSessionEvent(
  event: string,
  sessionId: string,
  sessionType: string,
  context?: LogContext
): void {
  logger.info(`Session event: ${event}`, {
    ...context,
    event,
    session_id: sessionId,
    session_type: sessionType,
    event_type: "session",
  })
}

/**
 * Log SOS event (HIGH PRIORITY)
 */
export function logSosEvent(
  patientId: string,
  location?: string,
  context?: LogContext
): void {
  logger.fatal(`SOS Alert triggered`, {
    ...context,
    patient_id: patientId,
    location,
    event_type: "sos",
    critical: true,
  })

  // Also console.error for immediate visibility
  console.error("🚨 CRITICAL SOS ALERT:", {
    patient_id: patientId,
    location,
    timestamp: new Date().toISOString(),
  })
}

// ================================================================
// EXPORT DEFAULT LOGGER
// ================================================================

export default logger
