/**
 * Error Tracking Utilities
 *
 * This module provides custom error capture functions, breadcrumb tracking,
 * user action tracking, API error tracking, database error tracking,
 * and business logic error tracking.
 */

import * as Sentry from "@sentry/nextjs"
import {
  addBreadcrumb,
  setApiContext,
  customFingerprint,
  groupDatabaseError,
  groupApiError,
  groupAuthError,
  groupValidationError,
  isSentryEnabled,
} from "./sentry-helpers"

// ================================================================
// TYPE DEFINITIONS
// ================================================================

interface ErrorOptions {
  level?: Sentry.SeverityLevel
  tags?: Record<string, string>
  context?: Record<string, any>
  user?: any
  fingerprint?: string[]
}

interface ApiErrorOptions extends ErrorOptions {
  endpoint: string
  method: string
  statusCode?: number
  requestBody?: any
  responseBody?: any
}

interface DatabaseErrorOptions extends ErrorOptions {
  query?: string
  table?: string
  operation?: string
}

interface ValidationErrorOptions extends ErrorOptions {
  field?: string
  value?: any
  constraint?: string
}

// ================================================================
// CUSTOM ERROR CLASSES
// ================================================================

/**
 * Base application error
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational = true) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.isOperational = isOperational

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * API error
 */
export class ApiError extends AppError {
  public readonly endpoint: string
  public readonly method: string

  constructor(
    message: string,
    endpoint: string,
    method: string,
    statusCode: number = 500
  ) {
    super(message, statusCode)
    this.endpoint = endpoint
    this.method = method
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  public readonly query?: string
  public readonly table?: string

  constructor(message: string, query?: string, table?: string) {
    super(message, 500)
    this.query = query
    this.table = table
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, 401)
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Not authorized") {
    super(message, 403)
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  public readonly fields: Record<string, string>

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message, 400)
    this.fields = fields
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404)
  }
}

// ================================================================
// GENERAL ERROR TRACKING
// ================================================================

/**
 * Capture an error with Sentry
 */
export function captureError(error: Error, options?: ErrorOptions): string {
  if (!isSentryEnabled()) {
    console.error("Error (Sentry not enabled):", error, options)
    return ""
  }

  // Set fingerprint if provided, otherwise use custom fingerprinting
  const fingerprint = options?.fingerprint || customFingerprint(error)

  const eventId = Sentry.captureException(error, {
    level: options?.level || "error",
    tags: options?.tags,
    contexts: options?.context ? { custom: options.context } : undefined,
    user: options?.user,
    fingerprint,
  })

  return eventId
}

/**
 * Capture a message with Sentry
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  options?: ErrorOptions
): string {
  if (!isSentryEnabled()) {
    console.log("Message (Sentry not enabled):", message, options)
    return ""
  }

  const eventId = Sentry.captureMessage(message, {
    level,
    tags: options?.tags,
    contexts: options?.context ? { custom: options.context } : undefined,
    user: options?.user,
  })

  return eventId
}

// ================================================================
// API ERROR TRACKING
// ================================================================

/**
 * Track API errors
 */
export function captureApiError(
  error: Error,
  options: ApiErrorOptions
): string {
  if (!isSentryEnabled()) {
    console.error("API Error (Sentry not enabled):", error, options)
    return ""
  }

  // Add API context
  setApiContext({
    endpoint: options.endpoint,
    method: options.method,
    statusCode: options.statusCode,
  })

  // Add breadcrumb
  addBreadcrumb({
    category: "api",
    message: `API Error: ${options.method} ${options.endpoint}`,
    level: "error",
    data: {
      endpoint: options.endpoint,
      method: options.method,
      status_code: options.statusCode,
    },
  })

  // Group by API endpoint
  const fingerprint = groupApiError(error, options.endpoint)

  const eventId = Sentry.captureException(error, {
    level: options.level || "error",
    tags: {
      ...options.tags,
      "api.endpoint": options.endpoint,
      "api.method": options.method,
      "api.status": options.statusCode?.toString() || "unknown",
    },
    contexts: {
      api: {
        endpoint: options.endpoint,
        method: options.method,
        status_code: options.statusCode,
        request_body: options.requestBody
          ? JSON.stringify(options.requestBody).substring(0, 1000)
          : undefined,
        response_body: options.responseBody
          ? JSON.stringify(options.responseBody).substring(0, 1000)
          : undefined,
      },
      ...options.context,
    },
    fingerprint,
  })

  return eventId
}

/**
 * Track failed API requests
 */
export function trackFailedApiRequest(
  endpoint: string,
  method: string,
  statusCode: number,
  error?: Error
): void {
  const message = `API request failed: ${method} ${endpoint} (${statusCode})`

  if (error) {
    captureApiError(error, { endpoint, method, statusCode })
  } else {
    captureMessage(message, "warning", {
      tags: {
        "api.endpoint": endpoint,
        "api.method": method,
        "api.status": statusCode.toString(),
      },
    })
  }
}

// ================================================================
// DATABASE ERROR TRACKING
// ================================================================

/**
 * Track database errors
 */
export function captureDatabaseError(
  error: Error,
  options: DatabaseErrorOptions = {}
): string {
  if (!isSentryEnabled()) {
    console.error("Database Error (Sentry not enabled):", error, options)
    return ""
  }

  // Add breadcrumb
  addBreadcrumb({
    category: "database",
    message: `Database Error: ${options.operation || "unknown"} on ${
      options.table || "unknown"
    }`,
    level: "error",
    data: {
      table: options.table,
      operation: options.operation,
    },
  })

  // Group by database operation
  const fingerprint = groupDatabaseError(error)

  const eventId = Sentry.captureException(error, {
    level: options.level || "error",
    tags: {
      ...options.tags,
      "db.table": options.table || "unknown",
      "db.operation": options.operation || "unknown",
    },
    contexts: {
      database: {
        table: options.table,
        operation: options.operation,
        query: options.query
          ? options.query.substring(0, 500)
          : undefined, // Limit query length
      },
      ...options.context,
    },
    fingerprint,
  })

  return eventId
}

/**
 * Track database connection errors
 */
export function trackDatabaseConnectionError(error: Error): void {
  captureDatabaseError(error, {
    operation: "connection",
    level: "fatal",
    tags: {
      critical: "true",
    },
  })
}

/**
 * Track slow database queries
 */
export function trackSlowQuery(
  query: string,
  executionTime: number,
  threshold: number = 1000
): void {
  if (executionTime > threshold) {
    captureMessage(`Slow database query detected (${executionTime}ms)`, "warning", {
      tags: {
        "db.slow_query": "true",
        "db.execution_time": executionTime.toString(),
      },
      context: {
        database: {
          query: query.substring(0, 500),
          execution_time_ms: executionTime,
          threshold_ms: threshold,
        },
      },
    })
  }
}

// ================================================================
// AUTHENTICATION ERROR TRACKING
// ================================================================

/**
 * Track authentication errors
 */
export function captureAuthError(error: Error, options?: ErrorOptions): string {
  if (!isSentryEnabled()) {
    console.error("Auth Error (Sentry not enabled):", error, options)
    return ""
  }

  // Add breadcrumb
  addBreadcrumb({
    category: "auth",
    message: `Authentication Error: ${error.message}`,
    level: "warning",
  })

  // Group by auth error type
  const fingerprint = groupAuthError(error)

  const eventId = Sentry.captureException(error, {
    level: options?.level || "warning",
    tags: {
      ...options?.tags,
      "auth.error": "true",
    },
    contexts: options?.context,
    fingerprint,
  })

  return eventId
}

/**
 * Track failed login attempts
 */
export function trackFailedLogin(email: string, reason: string): void {
  captureMessage(`Failed login attempt: ${reason}`, "warning", {
    tags: {
      "auth.failed_login": "true",
      "auth.reason": reason,
    },
    context: {
      auth: {
        email: email.replace(/(.{2})(.*)(@.*)/, "$1***$3"), // Redact email
        reason,
      },
    },
  })
}

/**
 * Track suspicious authentication activity
 */
export function trackSuspiciousAuthActivity(
  userId: string,
  activity: string,
  details?: Record<string, any>
): void {
  captureMessage(`Suspicious auth activity: ${activity}`, "warning", {
    tags: {
      "security.suspicious": "true",
      "security.type": "auth",
    },
    context: {
      security: {
        user_id: userId,
        activity,
        ...details,
      },
    },
  })
}

// ================================================================
// VALIDATION ERROR TRACKING
// ================================================================

/**
 * Track validation errors
 */
export function captureValidationError(
  error: Error,
  options: ValidationErrorOptions = {}
): string {
  if (!isSentryEnabled()) {
    console.error("Validation Error (Sentry not enabled):", error, options)
    return ""
  }

  // Add breadcrumb
  addBreadcrumb({
    category: "validation",
    message: `Validation Error: ${options.field || "unknown field"}`,
    level: "info",
    data: {
      field: options.field,
      constraint: options.constraint,
    },
  })

  // Group by validation constraint
  const fingerprint = groupValidationError(error)

  const eventId = Sentry.captureException(error, {
    level: options.level || "info",
    tags: {
      ...options.tags,
      "validation.field": options.field || "unknown",
      "validation.constraint": options.constraint || "unknown",
    },
    contexts: {
      validation: {
        field: options.field,
        value:
          typeof options.value === "string"
            ? options.value.substring(0, 100)
            : String(options.value),
        constraint: options.constraint,
      },
      ...options.context,
    },
    fingerprint,
  })

  return eventId
}

// ================================================================
// BUSINESS LOGIC ERROR TRACKING
// ================================================================

/**
 * Track payment errors
 */
export function capturePaymentError(
  error: Error,
  paymentData: {
    amount?: number
    currency?: string
    paymentMethod?: string
    customerId?: string
  }
): string {
  if (!isSentryEnabled()) {
    console.error("Payment Error (Sentry not enabled):", error, paymentData)
    return ""
  }

  const eventId = Sentry.captureException(error, {
    level: "error",
    tags: {
      "payment.error": "true",
      "payment.method": paymentData.paymentMethod || "unknown",
      "payment.currency": paymentData.currency || "unknown",
    },
    contexts: {
      payment: {
        amount: paymentData.amount,
        currency: paymentData.currency,
        method: paymentData.paymentMethod,
        customer_id: paymentData.customerId,
      },
    },
    fingerprint: ["payment", error.name],
  })

  return eventId
}

/**
 * Track session errors (therapy sessions)
 */
export function captureSessionError(
  error: Error,
  sessionData: {
    sessionId: string
    sessionType: string
    participantCount?: number
    status?: string
  }
): string {
  if (!isSentryEnabled()) {
    console.error("Session Error (Sentry not enabled):", error, sessionData)
    return ""
  }

  const eventId = Sentry.captureException(error, {
    level: "error",
    tags: {
      "session.error": "true",
      "session.type": sessionData.sessionType,
      "session.status": sessionData.status || "unknown",
    },
    contexts: {
      session: {
        id: sessionData.sessionId,
        type: sessionData.sessionType,
        participants: sessionData.participantCount,
        status: sessionData.status,
      },
    },
    fingerprint: ["session", sessionData.sessionType, error.name],
  })

  return eventId
}

/**
 * Track SOS (emergency) errors - HIGH PRIORITY
 */
export function captureSosError(
  error: Error,
  sosData: {
    patientId: string
    location?: string
    emergencyContacts?: number
  }
): string {
  if (!isSentryEnabled()) {
    console.error("SOS Error (Sentry not enabled):", error, sosData)
    return ""
  }

  const eventId = Sentry.captureException(error, {
    level: "fatal", // Highest priority
    tags: {
      "sos.error": "true",
      "sos.critical": "true",
      critical: "true",
    },
    contexts: {
      sos: {
        patient_id: sosData.patientId,
        location: sosData.location,
        emergency_contacts_notified: sosData.emergencyContacts,
      },
    },
    fingerprint: ["sos", "critical", error.name],
  })

  // Also log to console for immediate visibility
  console.error("CRITICAL SOS ERROR:", error, sosData)

  return eventId
}

/**
 * Track chat/messaging errors
 */
export function captureChatError(
  error: Error,
  chatData: {
    chatId: string
    messageId?: string
    senderId?: string
    recipientId?: string
  }
): string {
  if (!isSentryEnabled()) {
    console.error("Chat Error (Sentry not enabled):", error, chatData)
    return ""
  }

  const eventId = Sentry.captureException(error, {
    level: "error",
    tags: {
      "chat.error": "true",
    },
    contexts: {
      chat: {
        chat_id: chatData.chatId,
        message_id: chatData.messageId,
        sender_id: chatData.senderId,
        recipient_id: chatData.recipientId,
      },
    },
    fingerprint: ["chat", error.name],
  })

  return eventId
}

// ================================================================
// USER ACTION TRACKING
// ================================================================

/**
 * Track critical user actions
 */
export function trackUserAction(
  action: string,
  userId: string,
  metadata?: Record<string, any>
): void {
  addBreadcrumb({
    category: "user-action",
    message: action,
    level: "info",
    data: {
      user_id: userId,
      ...metadata,
    },
  })
}

/**
 * Track form submissions
 */
export function trackFormSubmission(formName: string, success: boolean): void {
  addBreadcrumb({
    category: "form",
    message: `Form ${success ? "submitted" : "submission failed"}: ${formName}`,
    level: success ? "info" : "warning",
    data: {
      form_name: formName,
      success,
    },
  })
}

/**
 * Track button clicks
 */
export function trackButtonClick(buttonName: string, context?: string): void {
  addBreadcrumb({
    category: "ui.click",
    message: `Button clicked: ${buttonName}`,
    level: "info",
    data: {
      button_name: buttonName,
      context,
    },
  })
}

// ================================================================
// UNHANDLED ERROR TRACKING
// ================================================================

/**
 * Setup global error handlers
 * Call this in your app initialization
 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window !== "undefined") {
    // Handle uncaught errors
    window.addEventListener("error", (event) => {
      captureError(event.error || new Error(event.message), {
        level: "error",
        tags: {
          handler: "window.error",
        },
        context: {
          event: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        },
      })
    })

    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason))

      captureError(error, {
        level: "error",
        tags: {
          handler: "unhandledrejection",
        },
      })
    })
  }
}
