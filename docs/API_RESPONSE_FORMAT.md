# API Response Format Standardization

## Overview

This document defines the standardized response format for all CÁRIS API endpoints. Consistent response structures improve client-side handling, error management, and overall developer experience.

## Standard Response Structure

All API responses follow this structure:

### Success Response

```typescript
{
  success: true,           // Always present - indicates operation success
  data: any,               // The response payload
  meta?: {                 // Optional metadata
    pagination?: {         // For list endpoints
      limit: number,
      offset: number,
      total?: number,
      hasMore?: boolean,
      page?: number,
      totalPages?: number
    },
    timestamp?: string,    // ISO 8601 timestamp
    requestId?: string,    // For request tracking
    [key: string]: any     // Additional metadata
  }
}
```

### Error Response

```typescript
{
  success: false,          // Always false for errors
  error: string,           // Human-readable error message
  code?: string,           // Machine-readable error code (e.g., "UNAUTHORIZED")
  details?: any,           // Additional error details (validation issues, etc.)
  meta?: {
    timestamp?: string,
    requestId?: string,
    [key: string]: any
  }
}
```

## HTTP Status Codes

Standard HTTP status codes are used consistently:

| Code | Usage | Helper Function |
|------|-------|----------------|
| 200 | Successful operation | `apiSuccess()` |
| 201 | Resource created | `apiCreated()` |
| 204 | Successful deletion (no content) | `apiNoContent()` |
| 400 | Bad request / Invalid parameters | `apiBadRequest()` |
| 401 | Authentication required | `apiUnauthorized()` |
| 403 | Forbidden / No permission | `apiForbidden()` |
| 404 | Resource not found | `apiNotFound()` |
| 409 | Conflict / Duplicate resource | `apiConflict()` |
| 422 | Validation error | `apiValidationError()` |
| 500 | Server error | `apiServerError()` |
| 503 | Service unavailable | `apiServiceUnavailable()` |

## Usage Guide

### Import the Utilities

```typescript
import {
  apiSuccess,
  apiSuccessWithPagination,
  apiCreated,
  apiNoContent,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
  apiValidationError,
  handleApiError,
} from '@/lib/api-response'
```

### Basic Success Response

```typescript
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) return apiUnauthorized()

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  })

  if (!user) return apiNotFound("User not found")

  return apiSuccess({ user })
}

// Response:
// {
//   "success": true,
//   "data": {
//     "user": { "id": 1, "name": "John", ... }
//   }
// }
```

### Success with Pagination

```typescript
export async function GET(req: NextRequest) {
  const { limit, offset } = parsePaginationParams(req.nextUrl.searchParams)

  const entries = await db
    .select()
    .from(diaryEntries)
    .limit(limit)
    .offset(offset)

  return apiSuccessWithPagination(
    { entries },
    {
      limit,
      offset,
      hasMore: entries.length === limit
    }
  )
}

// Response:
// {
//   "success": true,
//   "data": {
//     "entries": [...]
//   },
//   "meta": {
//     "pagination": {
//       "limit": 20,
//       "offset": 0,
//       "hasMore": true
//     },
//     "timestamp": "2025-11-19T10:30:00.000Z"
//   }
// }
```

### Resource Creation

```typescript
export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) return apiUnauthorized()

  const body = await req.json()
  const parsedBody = entrySchema.safeParse(body)

  if (!parsedBody.success) {
    return apiValidationError(parsedBody.error)
  }

  const [entry] = await db.insert(diaryEntries)
    .values({ ...parsedBody.data, userId })
    .returning()

  return apiCreated({ entry })
}

// Response (201 Created):
// {
//   "success": true,
//   "data": {
//     "entry": { "id": 123, ... }
//   }
// }
```

### Validation Errors

```typescript
const parsedBody = schema.safeParse(body)

if (!parsedBody.success) {
  return apiValidationError(parsedBody.error)
}

// Response (422 Unprocessable Entity):
// {
//   "success": false,
//   "error": "Validation failed",
//   "code": "VALIDATION_ERROR",
//   "details": {
//     "issues": [
//       {
//         "code": "invalid_type",
//         "expected": "string",
//         "received": "number",
//         "path": ["email"],
//         "message": "Expected string, received number"
//       }
//     ]
//   }
// }
```

### Authentication Errors

```typescript
const userId = await getUserIdFromRequest(req)
if (!userId) {
  return apiUnauthorized()
}

// Or with custom message:
if (!token) {
  return apiUnauthorized("Authentication token required")
}

// Response (401 Unauthorized):
// {
//   "success": false,
//   "error": "Unauthorized",
//   "code": "UNAUTHORIZED"
// }
```

### Authorization Errors

```typescript
const user = await getAuthenticatedUser(req)
if (user.role !== 'admin') {
  return apiForbidden("Admin access required")
}

// Response (403 Forbidden):
// {
//   "success": false,
//   "error": "Admin access required",
//   "code": "FORBIDDEN"
// }
```

### Not Found Errors

```typescript
const session = await db.query.sessions.findFirst({
  where: eq(sessions.id, sessionId)
})

if (!session) {
  return apiNotFound("Session not found")
}

// Response (404 Not Found):
// {
//   "success": false,
//   "error": "Session not found",
//   "code": "NOT_FOUND"
// }
```

### Error Handling with Try-Catch

```typescript
export async function POST(req: NextRequest) {
  try {
    // Endpoint logic here
    const userId = await getUserIdFromRequest(req)
    if (!userId) return apiUnauthorized()

    // ... more logic

    return apiSuccess({ data: result })
  } catch (error) {
    return handleApiError(error)
  }
}

// The handleApiError utility automatically:
// - Converts Zod errors to apiValidationError()
// - Detects auth errors and returns apiUnauthorized()
// - Detects not found errors and returns apiNotFound()
// - Falls back to apiServerError() for unknown errors
```

### Custom Error Codes

```typescript
if (duplicateEmail) {
  return apiConflict("User with this email already exists", {
    code: "DUPLICATE_EMAIL",
    details: { field: "email", value: email }
  })
}

// Response (409 Conflict):
// {
//   "success": false,
//   "error": "User with this email already exists",
//   "code": "DUPLICATE_EMAIL",
//   "details": {
//     "field": "email",
//     "value": "user@example.com"
//   }
// }
```

### Service Unavailable

```typescript
if (!process.env.OPENAI_API_KEY) {
  return apiServiceUnavailable("AI service not configured", {
    code: "AI_SERVICE_NOT_CONFIGURED"
  })
}

// Response (503 Service Unavailable):
// {
//   "success": false,
//   "error": "AI service not configured",
//   "code": "AI_SERVICE_NOT_CONFIGURED"
// }
```

## Client-Side Usage

### TypeScript Types

```typescript
// Import the types
import type { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from '@/lib/api-response'

// Use in fetch calls
async function fetchUserData(userId: number): Promise<User> {
  const response = await fetch(`/api/users/${userId}`)
  const json: ApiResponse<{ user: User }> = await response.json()

  if (!json.success) {
    throw new Error(json.error)
  }

  return json.data.user
}
```

### React Hook Example

```typescript
function useApiData<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then((json: ApiResponse<T>) => {
        if (json.success) {
          setData(json.data)
        } else {
          setError(json.error)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [url])

  return { data, error, loading }
}

// Usage:
const { data, error, loading } = useApiData<{ user: User }>('/api/user/me')
```

### Error Display Component

```typescript
function ErrorDisplay({ error }: { error: ApiErrorResponse }) {
  return (
    <div className="error-banner">
      <h3>{error.error}</h3>
      {error.code && <p className="error-code">Code: {error.code}</p>}
      {error.details && (
        <pre>{JSON.stringify(error.details, null, 2)}</pre>
      )}
    </div>
  )
}
```

## Migration Guide

### Before (Inconsistent)

```typescript
// Different formats across endpoints
return NextResponse.json({ error: "Not found" }, { status: 404 })
return NextResponse.json({ success: true, entry: data })
return NextResponse.json({ message: "Success", user: data })
return NextResponse.json({ entries: data, pagination: {...} })
```

### After (Standardized)

```typescript
// Consistent format using helpers
return apiNotFound("Resource not found")
return apiSuccess({ entry: data })
return apiSuccess({ user: data })
return apiSuccessWithPagination({ entries: data }, paginationMeta)
```

### Gradual Migration Strategy

1. **Phase 1**: New endpoints use standard format
2. **Phase 2**: Update high-traffic endpoints
3. **Phase 3**: Update remaining endpoints
4. **Phase 4**: Remove legacy compatibility helpers

For endpoints that need temporary backward compatibility:

```typescript
// Temporarily support both formats
const useStandardFormat = req.headers.get('X-API-Version') === '2'

if (useStandardFormat) {
  return apiSuccess({ user })
} else {
  // Legacy format
  return NextResponse.json({ user })
}
```

## Error Codes Reference

Common error codes used across the platform:

| Code | Meaning | HTTP Status |
|------|---------|-------------|
| `UNAUTHORIZED` | Not authenticated | 401 |
| `FORBIDDEN` | No permission | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Input validation failed | 422 |
| `DUPLICATE_EMAIL` | Email already exists | 409 |
| `DUPLICATE_RESOURCE` | Resource already exists | 409 |
| `BAD_REQUEST` | Invalid request | 400 |
| `SERVER_ERROR` | Internal server error | 500 |
| `SERVICE_UNAVAILABLE` | External service unavailable | 503 |
| `RATE_LIMITED` | Too many requests | 429 |
| `REQUEST_TIMEOUT` | Request took too long | 504 |
| `CONSENT_REQUIRED` | User consent required | 403 |
| `AI_SERVICE_NOT_CONFIGURED` | AI service not set up | 503 |

## Best Practices

### ✅ DO

- Always use helper functions (`apiSuccess`, `apiError`, etc.)
- Include meaningful error messages
- Use appropriate HTTP status codes
- Add error codes for client-side handling
- Include validation details in error responses
- Use `handleApiError()` in try-catch blocks

### ❌ DON'T

- Don't mix response formats in the same API
- Don't expose sensitive error details to clients
- Don't use generic "error" messages without context
- Don't forget to set appropriate status codes
- Don't return success: true with 4xx/5xx status codes

## Testing

### Example Test Cases

```typescript
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response'

describe('API Response Format', () => {
  it('should return success response with correct structure', () => {
    const response = apiSuccess({ user: { id: 1 } })
    const json = await response.json()

    expect(json.success).toBe(true)
    expect(json.data).toEqual({ user: { id: 1 } })
  })

  it('should return error response with correct structure', () => {
    const response = apiError("Not found", { status: 404 })
    const json = await response.json()

    expect(json.success).toBe(false)
    expect(json.error).toBe("Not found")
    expect(response.status).toBe(404)
  })

  it('should include validation issues in error response', () => {
    const zodError = z.object({ email: z.string().email() })
      .safeParse({ email: "invalid" }).error!

    const response = apiValidationError(zodError)
    const json = await response.json()

    expect(json.success).toBe(false)
    expect(json.code).toBe("VALIDATION_ERROR")
    expect(json.details.issues).toBeDefined()
  })
})
```

## Support

For questions or issues with API response standardization:
- See `/lib/api-response.ts` for implementation
- Check this documentation for usage examples
- Review existing migrated endpoints for patterns

## Version History

- **v1.0** (2025-11-19): Initial standardization
  - Created helper functions
  - Defined standard format
  - Added comprehensive documentation
