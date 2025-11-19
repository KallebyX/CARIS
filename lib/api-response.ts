/**
 * MEDIUM-02: Standardized API Response Format
 *
 * Provides consistent response structure across all API endpoints.
 * All endpoints should use these helper functions to ensure uniform responses.
 *
 * Standard Response Format:
 * {
 *   success: boolean,           // Always present - indicates operation success
 *   data?: any,                 // Present on success - the response data
 *   error?: string,             // Present on error - error message
 *   code?: string,              // Optional - error code for client handling
 *   details?: any,              // Optional - additional error details (validation issues, etc)
 *   meta?: {                    // Optional - metadata (pagination, timestamps, etc)
 *     pagination?: PaginationMeta,
 *     timestamp?: string,
 *     requestId?: string,
 *     [key: string]: any
 *   }
 * }
 */

import { NextResponse } from "next/server"
import { ZodError } from "zod"

// ============================================================================
// Types
// ============================================================================

export interface PaginationMeta {
  limit: number
  offset: number
  total?: number
  hasMore?: boolean
  page?: number
  totalPages?: number
}

export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  meta?: {
    pagination?: PaginationMeta
    timestamp?: string
    requestId?: string
    [key: string]: any
  }
}

export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  details?: any
  meta?: {
    timestamp?: string
    requestId?: string
    [key: string]: any
  }
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

// ============================================================================
// Success Response Helpers
// ============================================================================

/**
 * Create a successful API response
 *
 * @example
 * return apiSuccess({ user: { id: 1, name: "John" } })
 * // Returns: { success: true, data: { user: {...} } }
 */
export function apiSuccess<T = any>(
  data: T,
  options?: {
    status?: number
    meta?: ApiSuccessResponse<T>['meta']
    headers?: Record<string, string>
  }
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  }

  if (options?.meta) {
    response.meta = {
      ...options.meta,
      timestamp: options.meta.timestamp || new Date().toISOString(),
    }
  }

  return NextResponse.json(response, {
    status: options?.status || 200,
    headers: options?.headers,
  })
}

/**
 * Create a successful response for list/collection with pagination
 *
 * @example
 * return apiSuccessWithPagination(
 *   entries,
 *   { limit: 20, offset: 0, hasMore: true }
 * )
 */
export function apiSuccessWithPagination<T = any>(
  data: T,
  pagination: PaginationMeta,
  options?: {
    status?: number
    meta?: Omit<ApiSuccessResponse<T>['meta'], 'pagination'>
    headers?: Record<string, string>
  }
): NextResponse<ApiSuccessResponse<T>> {
  return apiSuccess(data, {
    ...options,
    meta: {
      ...options?.meta,
      pagination,
    },
  })
}

/**
 * Create a successful response for creation (201 Created)
 *
 * @example
 * return apiCreated({ entry: newEntry })
 */
export function apiCreated<T = any>(
  data: T,
  options?: {
    meta?: ApiSuccessResponse<T>['meta']
    headers?: Record<string, string>
  }
): NextResponse<ApiSuccessResponse<T>> {
  return apiSuccess(data, {
    status: 201,
    ...options,
  })
}

/**
 * Create a successful response with no content (204 No Content)
 * Used for DELETE operations that don't return data
 *
 * @example
 * return apiNoContent()
 */
export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

// ============================================================================
// Error Response Helpers
// ============================================================================

/**
 * Create an error API response
 *
 * @example
 * return apiError("User not found", { status: 404, code: "USER_NOT_FOUND" })
 */
export function apiError(
  error: string,
  options?: {
    status?: number
    code?: string
    details?: any
    meta?: ApiErrorResponse['meta']
    headers?: Record<string, string>
  }
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error,
  }

  if (options?.code) {
    response.code = options.code
  }

  if (options?.details) {
    response.details = options.details
  }

  if (options?.meta) {
    response.meta = {
      ...options.meta,
      timestamp: options.meta.timestamp || new Date().toISOString(),
    }
  }

  return NextResponse.json(response, {
    status: options?.status || 500,
    headers: options?.headers,
  })
}

/**
 * Create a validation error response (422 Unprocessable Entity)
 *
 * @example
 * if (!parsedBody.success) {
 *   return apiValidationError(parsedBody.error)
 * }
 */
export function apiValidationError(
  error: ZodError | { issues: any[] } | any[],
  message?: string
): NextResponse<ApiErrorResponse> {
  let issues: any[]

  if (error instanceof ZodError) {
    issues = error.issues
  } else if (Array.isArray(error)) {
    issues = error
  } else if (error.issues) {
    issues = error.issues
  } else {
    issues = [error]
  }

  return apiError(message || "Validation failed", {
    status: 422,
    code: "VALIDATION_ERROR",
    details: { issues },
  })
}

/**
 * Create an unauthorized error response (401 Unauthorized)
 * Use when authentication is required but not provided
 *
 * @example
 * if (!userId) return apiUnauthorized()
 */
export function apiUnauthorized(
  message?: string,
  options?: {
    code?: string
    details?: any
  }
): NextResponse<ApiErrorResponse> {
  return apiError(message || "Unauthorized", {
    status: 401,
    code: options?.code || "UNAUTHORIZED",
    details: options?.details,
  })
}

/**
 * Create a forbidden error response (403 Forbidden)
 * Use when user is authenticated but lacks permission
 *
 * @example
 * if (user.role !== 'admin') return apiForbidden()
 */
export function apiForbidden(
  message?: string,
  options?: {
    code?: string
    details?: any
  }
): NextResponse<ApiErrorResponse> {
  return apiError(message || "Forbidden", {
    status: 403,
    code: options?.code || "FORBIDDEN",
    details: options?.details,
  })
}

/**
 * Create a not found error response (404 Not Found)
 *
 * @example
 * if (!session) return apiNotFound("Session not found")
 */
export function apiNotFound(
  message?: string,
  options?: {
    code?: string
    details?: any
  }
): NextResponse<ApiErrorResponse> {
  return apiError(message || "Not found", {
    status: 404,
    code: options?.code || "NOT_FOUND",
    details: options?.details,
  })
}

/**
 * Create a conflict error response (409 Conflict)
 * Use for duplicate resources or conflicting state
 *
 * @example
 * if (existingUser) return apiConflict("User already exists")
 */
export function apiConflict(
  message?: string,
  options?: {
    code?: string
    details?: any
  }
): NextResponse<ApiErrorResponse> {
  return apiError(message || "Conflict", {
    status: 409,
    code: options?.code || "CONFLICT",
    details: options?.details,
  })
}

/**
 * Create a bad request error response (400 Bad Request)
 * Use for malformed requests or invalid parameters
 *
 * @example
 * if (!fileId) return apiBadRequest("File ID is required")
 */
export function apiBadRequest(
  message?: string,
  options?: {
    code?: string
    details?: any
  }
): NextResponse<ApiErrorResponse> {
  return apiError(message || "Bad request", {
    status: 400,
    code: options?.code || "BAD_REQUEST",
    details: options?.details,
  })
}

/**
 * Create a server error response (500 Internal Server Error)
 *
 * @example
 * return apiServerError("Database connection failed")
 */
export function apiServerError(
  message?: string,
  options?: {
    code?: string
    details?: any
  }
): NextResponse<ApiErrorResponse> {
  return apiError(message || "Internal server error", {
    status: 500,
    code: options?.code || "SERVER_ERROR",
    details: options?.details,
  })
}

/**
 * Create a service unavailable error response (503 Service Unavailable)
 * Use when external service is unavailable
 *
 * @example
 * if (!openaiConfigured) return apiServiceUnavailable("AI service not configured")
 */
export function apiServiceUnavailable(
  message?: string,
  options?: {
    code?: string
    details?: any
  }
): NextResponse<ApiErrorResponse> {
  return apiError(message || "Service unavailable", {
    status: 503,
    code: options?.code || "SERVICE_UNAVAILABLE",
    details: options?.details,
  })
}

// ============================================================================
// Legacy Compatibility Helpers
// ============================================================================

/**
 * For endpoints that need to maintain backward compatibility
 * with old response formats while transitioning to the new standard.
 *
 * This should be used temporarily during migration.
 *
 * @deprecated Use apiSuccess() instead
 */
export function apiLegacySuccess<T = any>(
  data: T,
  options?: {
    status?: number
    headers?: Record<string, string>
  }
): NextResponse {
  return NextResponse.json(data, {
    status: options?.status || 200,
    headers: options?.headers,
  })
}

// ============================================================================
// Error Handler Utility
// ============================================================================

/**
 * Handle errors uniformly across all API endpoints
 * Automatically converts Zod errors, auth errors, etc to standard format
 *
 * @example
 * try {
 *   // ... endpoint logic
 * } catch (error) {
 *   return handleApiError(error)
 * }
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  // Zod validation errors
  if (error instanceof ZodError) {
    return apiValidationError(error)
  }

  // Standard Error objects
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('Unauthorized') || error.message.includes('unauthorized')) {
      return apiUnauthorized(error.message)
    }

    if (error.message.includes('Forbidden') || error.message.includes('forbidden')) {
      return apiForbidden(error.message)
    }

    if (error.message.includes('Not found') || error.message.includes('not found')) {
      return apiNotFound(error.message)
    }

    // Generic server error
    return apiServerError(error.message)
  }

  // Unknown error type
  return apiServerError("An unexpected error occurred")
}
