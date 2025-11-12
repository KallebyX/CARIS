# CÁRIS API Error Handling

Complete guide to error handling and troubleshooting in the CÁRIS API.

---

## Table of Contents

1. [Error Response Format](#error-response-format)
2. [HTTP Status Codes](#http-status-codes)
3. [Error Types](#error-types)
4. [Validation Errors](#validation-errors)
5. [Error Handling Best Practices](#error-handling-best-practices)
6. [Common Error Scenarios](#common-error-scenarios)
7. [Retry Strategy](#retry-strategy)
8. [Error Logging](#error-logging)

---

## Error Response Format

All API errors follow a consistent JSON format:

### Basic Error Response

```json
{
  "error": "Error message",
  "message": "Detailed explanation",
  "code": "ERROR_CODE"
}
```

### Validation Error Response

```json
{
  "error": "Invalid input",
  "issues": [
    {
      "path": ["email"],
      "message": "Invalid email format"
    },
    {
      "path": ["password"],
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### Internal Server Error Response

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred",
  "timestamp": "2024-01-20T15:30:00Z",
  "requestId": "req_abc123"
}
```

---

## HTTP Status Codes

### 2xx Success

**200 OK**
- Request succeeded
- Response body contains the requested data

**201 Created**
- Resource successfully created
- Response body contains the new resource
- Location header contains the resource URL

**204 No Content**
- Request succeeded
- No response body (e.g., successful DELETE)

---

### 4xx Client Errors

**400 Bad Request**
- Invalid request syntax
- Malformed JSON
- Missing required parameters

```json
{
  "error": "Bad Request",
  "message": "Invalid JSON in request body",
  "code": "INVALID_REQUEST"
}
```

---

**401 Unauthorized**
- Missing or invalid authentication token
- Token expired
- User not logged in

```json
{
  "error": "Unauthorized",
  "message": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**Common causes:**
- JWT token missing or invalid
- Cookie not sent with request
- Token expired (7 days)

**Solution:**
```typescript
// Check authentication and re-login if needed
try {
  const response = await apiClient.user.me()
} catch (error) {
  if (error.statusCode === 401) {
    // Redirect to login
    router.push('/login')
  }
}
```

---

**403 Forbidden**
- Authenticated but lacking permissions
- Role-based access denied
- Resource access restricted

```json
{
  "error": "Forbidden",
  "message": "You don't have permission to access this resource",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**Example:**
```typescript
// Patient trying to access psychologist-only endpoint
// GET /api/psychologist/patients
// Response: 403 Forbidden
{
  "error": "Forbidden",
  "message": "This endpoint is only accessible to psychologists",
  "code": "ROLE_REQUIRED"
}
```

---

**404 Not Found**
- Resource doesn't exist
- Invalid endpoint URL
- Deleted resource

```json
{
  "error": "Not Found",
  "message": "The requested resource was not found",
  "code": "RESOURCE_NOT_FOUND"
}
```

---

**409 Conflict**
- Resource already exists
- Conflicting state
- Duplicate data

```json
{
  "error": "Conflict",
  "message": "A user with this email already exists",
  "code": "DUPLICATE_EMAIL"
}
```

**Example scenarios:**
- Registering with an existing email
- Booking a session at an already occupied time slot
- Creating a duplicate resource

---

**422 Unprocessable Entity**
- Request syntax is correct
- Validation failed on request data
- Business logic validation error

```json
{
  "error": "Invalid input",
  "issues": [
    {
      "path": ["moodRating"],
      "message": "Number must be less than or equal to 4",
      "received": 5
    },
    {
      "path": ["cycle"],
      "message": "Invalid enum value. Expected 'criar' | 'cuidar' | 'crescer' | 'curar', received 'invalid'"
    }
  ]
}
```

---

**429 Too Many Requests**
- Rate limit exceeded
- Too many requests in time window

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705770600
Retry-After: 60
```

---

### 5xx Server Errors

**500 Internal Server Error**
- Unexpected server error
- Database connection failed
- Unhandled exception

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred",
  "code": "INTERNAL_ERROR",
  "requestId": "req_abc123"
}
```

**What to do:**
- Retry the request after a delay
- If persistent, contact support with requestId
- Check status page for known issues

---

**503 Service Unavailable**
- Server temporarily unavailable
- Maintenance mode
- Overloaded server

```json
{
  "error": "Service Unavailable",
  "message": "The service is temporarily unavailable",
  "code": "SERVICE_UNAVAILABLE",
  "retryAfter": 300
}
```

---

## Error Types

### Authentication Errors

**AUTH_REQUIRED**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**TOKEN_EXPIRED**
```json
{
  "error": "Unauthorized",
  "message": "Your session has expired. Please log in again.",
  "code": "TOKEN_EXPIRED"
}
```

**INVALID_CREDENTIALS**
```json
{
  "error": "Unauthorized",
  "message": "Invalid email or password",
  "code": "INVALID_CREDENTIALS"
}
```

---

### Validation Errors

**INVALID_INPUT**
```json
{
  "error": "Invalid input",
  "message": "The provided data is invalid",
  "code": "INVALID_INPUT",
  "issues": [...]
}
```

**MISSING_FIELD**
```json
{
  "error": "Invalid input",
  "message": "Required field missing",
  "code": "MISSING_FIELD",
  "field": "email"
}
```

**INVALID_FORMAT**
```json
{
  "error": "Invalid input",
  "message": "Invalid email format",
  "code": "INVALID_FORMAT",
  "field": "email",
  "expected": "email"
}
```

---

### Resource Errors

**RESOURCE_NOT_FOUND**
```json
{
  "error": "Not Found",
  "message": "Session not found",
  "code": "RESOURCE_NOT_FOUND",
  "resourceType": "session",
  "resourceId": 123
}
```

**RESOURCE_DELETED**
```json
{
  "error": "Gone",
  "message": "This resource has been deleted",
  "code": "RESOURCE_DELETED"
}
```

---

### Business Logic Errors

**CONSENT_REQUIRED**
```json
{
  "error": "Forbidden",
  "message": "Data processing consent required",
  "code": "CONSENT_REQUIRED",
  "consentType": "DATA_PROCESSING"
}
```

**SCHEDULE_CONFLICT**
```json
{
  "error": "Conflict",
  "message": "This time slot is already booked",
  "code": "SCHEDULE_CONFLICT",
  "conflicts": [
    {
      "sessionId": 456,
      "scheduledAt": "2024-01-22T15:00:00Z"
    }
  ]
}
```

---

## Validation Errors

### Zod Validation Errors

The API uses Zod for schema validation. Validation errors follow this format:

```typescript
{
  "error": "Invalid input",
  "issues": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "path": ["name"],
      "message": "Expected string, received number"
    },
    {
      "code": "too_small",
      "minimum": 8,
      "type": "string",
      "inclusive": true,
      "path": ["password"],
      "message": "String must contain at least 8 character(s)"
    }
  ]
}
```

### Common Validation Codes

- `invalid_type`: Wrong data type
- `too_small`: Value below minimum
- `too_big`: Value above maximum
- `invalid_string`: String format invalid (email, url, etc.)
- `invalid_enum_value`: Value not in allowed enum
- `invalid_date`: Invalid date format

---

### Handling Validation Errors

```typescript
import { apiClient, ApiError } from '@/lib/api-client'

try {
  await apiClient.diary.createEntry({
    moodRating: 5, // Invalid: max is 4
    intensityRating: 7,
    content: '',   // Invalid: must have content
    cycle: 'invalid' // Invalid: not a valid cycle
  })
} catch (error) {
  if (error instanceof ApiError && error.statusCode === 422) {
    const { issues } = error.data

    // Display field-specific errors
    issues.forEach((issue: any) => {
      const field = issue.path.join('.')
      console.error(`${field}: ${issue.message}`)
    })

    // Example output:
    // moodRating: Number must be less than or equal to 4
    // content: String must contain at least 1 character(s)
    // cycle: Invalid enum value
  }
}
```

---

## Error Handling Best Practices

### 1. Use the ApiError Class

```typescript
import { apiClient, ApiError } from '@/lib/api-client'

try {
  const response = await apiClient.user.me()
} catch (error) {
  if (error instanceof ApiError) {
    // Structured error with status code and data
    console.error('API Error:', error.message)
    console.error('Status Code:', error.statusCode)
    console.error('Error Data:', error.data)

    // Handle specific status codes
    if (error.statusCode === 401) {
      // Redirect to login
    } else if (error.statusCode === 403) {
      // Show permission error
    } else if (error.statusCode === 422) {
      // Show validation errors
    }
  } else {
    // Network error or other unexpected error
    console.error('Unexpected error:', error)
  }
}
```

---

### 2. Implement Retry Logic

```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (error instanceof ApiError) {
        // Don't retry client errors (4xx)
        if (error.statusCode >= 400 && error.statusCode < 500) {
          throw error
        }

        // Respect Retry-After header
        if (error.statusCode === 429 && error.data?.retryAfter) {
          await sleep(error.data.retryAfter * 1000)
          continue
        }
      }

      // Exponential backoff for server errors
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i))
      }
    }
  }

  throw lastError!
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Usage
const user = await fetchWithRetry(() => apiClient.user.me())
```

---

### 3. Global Error Handler

```typescript
// lib/error-handler.ts
import { ApiError } from '@/lib/api-client'
import { toast } from 'sonner'

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 400:
        toast.error('Invalid request. Please check your input.')
        break
      case 401:
        toast.error('Please log in to continue')
        // Redirect to login
        window.location.href = '/login'
        break
      case 403:
        toast.error("You don't have permission to perform this action")
        break
      case 404:
        toast.error('Resource not found')
        break
      case 422:
        // Show validation errors
        if (error.data?.issues) {
          error.data.issues.forEach((issue: any) => {
            toast.error(issue.message)
          })
        }
        break
      case 429:
        toast.error('Too many requests. Please try again later.')
        break
      case 500:
        toast.error('Server error. Please try again later.')
        // Log to error tracking service
        logError(error)
        break
      default:
        toast.error('An error occurred. Please try again.')
    }
  } else {
    toast.error('Network error. Please check your connection.')
  }
}

function logError(error: ApiError) {
  // Send to error tracking service (Sentry, etc.)
  console.error('API Error:', {
    status: error.statusCode,
    message: error.message,
    data: error.data,
    timestamp: new Date().toISOString()
  })
}
```

---

### 4. Form Validation Integration

```typescript
'use client'

import { useState } from 'react'
import { apiClient, ApiError } from '@/lib/api-client'
import { z } from 'zod'

const diarySchema = z.object({
  moodRating: z.number().min(0).max(4),
  intensityRating: z.number().min(1).max(10),
  content: z.string().min(1),
  cycle: z.enum(['criar', 'cuidar', 'crescer', 'curar'])
})

export default function DiaryForm() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    moodRating: 0,
    intensityRating: 5,
    content: '',
    cycle: 'criar' as const
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    try {
      // Client-side validation
      const validated = diarySchema.parse(formData)

      // API call
      await apiClient.diary.createEntry(validated)

      // Success
      alert('Diary entry created!')
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Client-side validation errors
        const fieldErrors: Record<string, string> = {}
        error.issues.forEach(issue => {
          const field = issue.path[0]
          fieldErrors[field] = issue.message
        })
        setErrors(fieldErrors)
      } else if (error instanceof ApiError && error.statusCode === 422) {
        // Server-side validation errors
        const fieldErrors: Record<string, string> = {}
        error.data.issues?.forEach((issue: any) => {
          const field = issue.path[0]
          fieldErrors[field] = issue.message
        })
        setErrors(fieldErrors)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Mood Rating (0-4)</label>
        <input
          type="number"
          value={formData.moodRating}
          onChange={(e) => setFormData({ ...formData, moodRating: +e.target.value })}
        />
        {errors.moodRating && <span className="error">{errors.moodRating}</span>}
      </div>

      <div>
        <label>Content</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
        />
        {errors.content && <span className="error">{errors.content}</span>}
      </div>

      <button type="submit">Create Entry</button>
    </form>
  )
}
```

---

## Common Error Scenarios

### Scenario 1: Session Expired

**Error:**
```json
{
  "error": "Unauthorized",
  "message": "Your session has expired",
  "code": "TOKEN_EXPIRED"
}
```

**Solution:**
```typescript
// Implement automatic re-authentication
async function makeAuthenticatedRequest<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      // Try to refresh or redirect to login
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
    }
    throw error
  }
}
```

---

### Scenario 2: Consent Required

**Error:**
```json
{
  "error": "Forbidden",
  "message": "Data processing consent required",
  "code": "CONSENT_REQUIRED"
}
```

**Solution:**
```typescript
async function createDiaryEntryWithConsent(data: any) {
  try {
    return await apiClient.diary.createEntry(data)
  } catch (error) {
    if (error instanceof ApiError && error.data?.code === 'CONSENT_REQUIRED') {
      // Show consent dialog
      const consent = await showConsentDialog(error.data.consentType)
      if (consent) {
        // Update consent
        await apiClient.compliance.updateConsent(
          error.data.consentType,
          true
        )
        // Retry
        return await apiClient.diary.createEntry(data)
      }
    }
    throw error
  }
}
```

---

### Scenario 3: Network Error

**Error:**
```
Network error: Failed to fetch
```

**Solution:**
```typescript
async function fetchWithFallback<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    // Check if it's a network error
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      // Show offline message
      toast.error('No internet connection. Please check your network.')

      // Try to use cached data if available
      const cached = await getCachedData()
      if (cached) {
        return cached as T
      }
    }
    throw error
  }
}
```

---

## Retry Strategy

### Recommended Retry Logic

```typescript
interface RetryOptions {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  retryableStatuses: number[]
}

const defaultOptions: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
}

async function retryableRequest<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options }
  let lastError: Error

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (error instanceof ApiError) {
        // Don't retry if not a retryable status
        if (!opts.retryableStatuses.includes(error.statusCode)) {
          throw error
        }

        // Respect Retry-After header
        if (error.data?.retryAfter) {
          await sleep(error.data.retryAfter * 1000)
          continue
        }
      }

      // Exponential backoff with jitter
      if (attempt < opts.maxRetries - 1) {
        const delay = Math.min(
          opts.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          opts.maxDelay
        )
        await sleep(delay)
      }
    }
  }

  throw lastError!
}
```

---

## Error Logging

### Structured Error Logging

```typescript
interface ErrorLog {
  timestamp: string
  userId?: number
  error: {
    type: string
    message: string
    statusCode?: number
    stack?: string
  }
  request: {
    method: string
    url: string
    body?: any
  }
  context?: any
}

function logError(error: unknown, context?: any) {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    error: {
      type: error instanceof ApiError ? 'ApiError' : 'Error',
      message: error instanceof Error ? error.message : 'Unknown error',
      statusCode: error instanceof ApiError ? error.statusCode : undefined,
      stack: error instanceof Error ? error.stack : undefined
    },
    request: {
      method: context?.method || 'UNKNOWN',
      url: context?.url || 'UNKNOWN',
      body: context?.body
    },
    context
  }

  // Send to logging service
  console.error('API Error:', errorLog)

  // Send to Sentry, Datadog, etc.
  // sentry.captureException(error, { extra: errorLog })
}
```

---

## Related Documentation

- [API Reference](./API_REFERENCE.md)
- [Authentication Guide](./API_AUTHENTICATION.md)
- [Code Examples](./API_EXAMPLES.md)
- [Rate Limits](./API_RATE_LIMITS.md)
