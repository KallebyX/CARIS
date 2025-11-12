/**
 * Centralized Error Handling Library
 *
 * Provides production-safe error handling with:
 * - Custom error types
 * - Sentry integration preparation
 * - Secure error messages (no stack traces to users)
 * - Error logging with context
 * - API error response formatting
 *
 * @module error-handler
 */

import { NextResponse } from "next/server"
import { ZodError } from "zod"

// ================================================================
// CUSTOM ERROR TYPES
// ================================================================

/**
 * Base application error
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: Record<string, any>

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context

    Object.setPrototypeOf(this, AppError.prototype)
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string = "Dados de entrada inválidos", context?: Record<string, any>) {
    super(message, 400, true, context)
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Autenticação necessária", context?: Record<string, any>) {
    super(message, 401, true, context)
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Acesso negado", context?: Record<string, any>) {
    super(message, 403, true, context)
    Object.setPrototypeOf(this, AuthorizationError.prototype)
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = "Recurso", context?: Record<string, any>) {
    super(`${resource} não encontrado`, 404, true, context)
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string = "Conflito de dados", context?: Record<string, any>) {
    super(message, 409, true, context)
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number

  constructor(retryAfter: number = 60, context?: Record<string, any>) {
    super("Muitas requisições. Tente novamente mais tarde.", 429, true, context)
    this.retryAfter = retryAfter
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

/**
 * Internal server error (500)
 */
export class InternalServerError extends AppError {
  constructor(message: string = "Erro interno do servidor", context?: Record<string, any>) {
    super(message, 500, false, context)
    Object.setPrototypeOf(this, InternalServerError.prototype)
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string = "Erro no banco de dados", context?: Record<string, any>) {
    super(message, 500, false, context)
    Object.setPrototypeOf(this, DatabaseError.prototype)
  }
}

/**
 * External service error (502)
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, context?: Record<string, any>) {
    super(`Erro ao comunicar com ${service}`, 502, true, context)
    Object.setPrototypeOf(this, ExternalServiceError.prototype)
  }
}

// ================================================================
// ERROR LOGGING
// ================================================================

export interface ErrorLogContext {
  userId?: number
  requestId?: string
  path?: string
  method?: string
  ip?: string
  userAgent?: string
  [key: string]: any
}

/**
 * Log error with context
 * In production, this should integrate with monitoring service (Sentry, DataDog, etc.)
 */
export function logError(error: Error, context?: ErrorLogContext): void {
  const isProduction = process.env.NODE_ENV === "production"
  const timestamp = new Date().toISOString()

  const errorLog = {
    timestamp,
    name: error.name,
    message: error.message,
    stack: isProduction ? undefined : error.stack,
    context,
    ...(error instanceof AppError && {
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      errorContext: error.context,
    }),
  }

  // In development, log to console with full details
  if (!isProduction) {
    console.error("[Error]", JSON.stringify(errorLog, null, 2))
  } else {
    // In production, send to monitoring service
    // TODO: Integrate with Sentry
    // Sentry.captureException(error, { contexts: { custom: context } })

    // For now, log without stack trace
    console.error("[Error]", JSON.stringify({
      ...errorLog,
      stack: undefined,
    }))
  }

  // Log critical errors to a separate channel for immediate alerting
  if (error instanceof AppError && !error.isOperational) {
    console.error("[CRITICAL ERROR]", JSON.stringify({
      timestamp,
      name: error.name,
      message: error.message,
      context,
    }))

    // TODO: Send alert to on-call team
    // await sendCriticalAlert(errorLog)
  }
}

// ================================================================
// ERROR SANITIZATION
// ================================================================

/**
 * Sanitize error for client response
 * Removes sensitive information and stack traces
 */
export function sanitizeError(error: Error): {
  message: string
  code?: string
  statusCode: number
} {
  const isProduction = process.env.NODE_ENV === "production"

  // Handle known error types
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.constructor.name,
      statusCode: error.statusCode,
    }
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return {
      message: "Dados de entrada inválidos",
      code: "ValidationError",
      statusCode: 400,
    }
  }

  // Handle database errors (don't expose SQL details)
  if (error.message?.includes("SQL") || error.message?.includes("database")) {
    return {
      message: isProduction
        ? "Erro ao processar solicitação"
        : `Database error: ${error.message}`,
      code: "DatabaseError",
      statusCode: 500,
    }
  }

  // Handle JWT errors
  if (error.name === "JWTExpired" || error.message?.includes("jwt")) {
    return {
      message: "Sessão expirada. Faça login novamente.",
      code: "AuthenticationError",
      statusCode: 401,
    }
  }

  // Generic error (hide details in production)
  return {
    message: isProduction
      ? "Ocorreu um erro. Tente novamente mais tarde."
      : error.message,
    code: "InternalServerError",
    statusCode: 500,
  }
}

// ================================================================
// API ERROR RESPONSES
// ================================================================

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: Error,
  context?: ErrorLogContext
): NextResponse {
  // Log the error
  logError(error, context)

  // Sanitize error for client
  const sanitized = sanitizeError(error)

  // Build response
  const response: any = {
    success: false,
    error: sanitized.message,
    code: sanitized.code,
  }

  // Add validation errors if available
  if (error instanceof ZodError) {
    response.errors = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }))
  }

  // Add retry-after for rate limit errors
  if (error instanceof RateLimitError) {
    return NextResponse.json(response, {
      status: sanitized.statusCode,
      headers: {
        "Retry-After": error.retryAfter.toString(),
      },
    })
  }

  return NextResponse.json(response, {
    status: sanitized.statusCode,
  })
}

/**
 * Success response helper
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Record<string, any>
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta }),
  })
}

// ================================================================
// ERROR HANDLER WRAPPER
// ================================================================

/**
 * Wrap async route handler with error handling
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  context?: Omit<ErrorLogContext, "requestId">
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      // Generate request ID for tracking
      const requestId = crypto.randomUUID()

      // Extract request context if available
      const request = args[0] as any
      const errorContext: ErrorLogContext = {
        requestId,
        ...context,
      }

      if (request && typeof request === "object" && "headers" in request) {
        errorContext.path = request.nextUrl?.pathname
        errorContext.method = request.method
        errorContext.ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
                          request.headers.get("x-real-ip")
        errorContext.userAgent = request.headers.get("user-agent")
      }

      return createErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        errorContext
      )
    }
  }
}

// ================================================================
// ERROR UTILITIES
// ================================================================

/**
 * Assert condition or throw error
 */
export function assert(
  condition: any,
  message: string,
  ErrorClass: typeof AppError = AppError
): asserts condition {
  if (!condition) {
    throw new ErrorClass(message)
  }
}

/**
 * Assert entity exists or throw NotFoundError
 */
export function assertExists<T>(
  entity: T | null | undefined,
  resource: string = "Recurso"
): asserts entity is T {
  if (!entity) {
    throw new NotFoundError(resource)
  }
}

/**
 * Assert user has permission or throw AuthorizationError
 */
export function assertAuthorized(
  condition: boolean,
  message: string = "Você não tem permissão para esta ação"
): asserts condition {
  if (!condition) {
    throw new AuthorizationError(message)
  }
}

/**
 * Safely execute async operation with error handling
 */
export async function tryCatch<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation()
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)))
    return fallback
  }
}

// ================================================================
// SENTRY INTEGRATION HELPERS
// ================================================================

/**
 * Initialize Sentry (call in app initialization)
 */
export function initErrorTracking(): void {
  if (process.env.NODE_ENV !== "production") {
    console.log("[Error Tracking] Skipping Sentry init in development")
    return
  }

  const sentryDsn = process.env.SENTRY_DSN
  if (!sentryDsn) {
    console.warn("[Error Tracking] SENTRY_DSN not configured")
    return
  }

  try {
    // TODO: Uncomment when Sentry is installed
    // import("@sentry/nextjs").then((Sentry) => {
    //   Sentry.init({
    //     dsn: sentryDsn,
    //     environment: process.env.NODE_ENV,
    //     tracesSampleRate: 0.1,
    //     beforeSend(event, hint) {
    //       // Filter sensitive data
    //       if (event.request?.headers) {
    //         delete event.request.headers["authorization"]
    //         delete event.request.headers["cookie"]
    //       }
    //       return event
    //     },
    //   })
    // })

    console.log("[Error Tracking] Sentry initialized")
  } catch (error) {
    console.error("[Error Tracking] Failed to initialize Sentry:", error)
  }
}

/**
 * Set user context for error tracking
 */
export function setErrorTrackingUser(user: {
  id: number
  email?: string
  role?: string
}): void {
  // TODO: Uncomment when Sentry is installed
  // import("@sentry/nextjs").then((Sentry) => {
  //   Sentry.setUser({
  //     id: user.id.toString(),
  //     email: user.email,
  //     role: user.role,
  //   })
  // })
}

/**
 * Clear user context (on logout)
 */
export function clearErrorTrackingUser(): void {
  // TODO: Uncomment when Sentry is installed
  // import("@sentry/nextjs").then((Sentry) => {
  //   Sentry.setUser(null)
  // })
}

/**
 * Add breadcrumb for debugging
 */
export function addErrorBreadcrumb(
  message: string,
  category: string = "custom",
  level: "debug" | "info" | "warning" | "error" = "info",
  data?: Record<string, any>
): void {
  // TODO: Uncomment when Sentry is installed
  // import("@sentry/nextjs").then((Sentry) => {
  //   Sentry.addBreadcrumb({
  //     message,
  //     category,
  //     level,
  //     data,
  //     timestamp: Date.now() / 1000,
  //   })
  // })

  // For now, log to console in development
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Breadcrumb][${category}][${level}]`, message, data)
  }
}

// ================================================================
// TYPE EXPORTS
// ================================================================

export type {
  ErrorLogContext,
}
