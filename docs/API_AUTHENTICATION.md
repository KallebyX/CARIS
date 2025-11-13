# CÁRIS API Authentication Guide

Complete guide to authentication and authorization in the CÁRIS API.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [JWT Token Structure](#jwt-token-structure)
4. [Cookie-Based Authentication](#cookie-based-authentication)
5. [Role-Based Access Control](#role-based-access-control)
6. [Security Best Practices](#security-best-practices)
7. [Common Scenarios](#common-scenarios)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The CÁRIS API uses **JWT (JSON Web Token)** authentication stored in **HTTP-only cookies** for secure session management. This approach provides:

- Secure token storage (protected from XSS attacks)
- Automatic token inclusion in requests
- CSRF protection through SameSite cookies
- Seamless integration with server-side rendering

### Key Features

- JWT tokens with 7-day expiration
- HTTP-only, Secure, SameSite=Strict cookies
- Role-based access control (RBAC)
- Automatic session management
- Audit logging for all authentication events

---

## Authentication Flow

### 1. User Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "SecurePassword123!",
  "role": "patient"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "patient"
  }
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*)

---

### 2. User Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "joao@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Set-Cookie: token=eyJhbGc...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
Content-Type: application/json

{
  "message": "Logged in successfully",
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "patient"
  }
}
```

The JWT token is automatically stored in an HTTP-only cookie and will be included in all subsequent requests.

---

### 3. Making Authenticated Requests

Once logged in, the JWT token is automatically included in all requests:

```http
GET /api/users/me
Cookie: token=eyJhbGc...
```

**In JavaScript/TypeScript:**
```javascript
// Using fetch
fetch('/api/users/me', {
  credentials: 'include' // Include cookies
})

// Using the API client
import { apiClient } from '@/lib/api-client'
const user = await apiClient.user.me()
```

---

### 4. User Logout

```http
POST /api/auth/logout
Cookie: token=eyJhbGc...
```

**Response:**
```http
HTTP/1.1 200 OK
Set-Cookie: token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0

{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## JWT Token Structure

### Token Payload

```json
{
  "userId": 1,
  "role": "patient",
  "iat": 1705756800,
  "exp": 1706361600
}
```

### Payload Fields

- `userId` (integer): Unique user identifier
- `role` (string): User role (patient, psychologist, admin, clinic_owner, clinic_admin)
- `iat` (integer): Issued at timestamp
- `exp` (integer): Expiration timestamp (7 days from issue)

### Token Verification

Tokens are verified on every authenticated request:

```typescript
import jwt from 'jsonwebtoken'

const token = cookies.get('token')
const decoded = jwt.verify(token, process.env.JWT_SECRET)
// { userId: 1, role: 'patient', iat: ..., exp: ... }
```

---

## Cookie-Based Authentication

### Cookie Configuration

```javascript
response.cookies.set('token', token, {
  httpOnly: true,        // Prevents JavaScript access
  secure: true,          // HTTPS only (production)
  sameSite: 'strict',    // CSRF protection
  path: '/',             // Available on all routes
  maxAge: 604800         // 7 days in seconds
})
```

### Cookie Properties Explained

**httpOnly**: Prevents client-side JavaScript from accessing the cookie, protecting against XSS attacks.

**secure**: Ensures the cookie is only sent over HTTPS connections (automatically enabled in production).

**sameSite='strict'**: Prevents the cookie from being sent in cross-site requests, protecting against CSRF attacks.

**path='/'**: Makes the cookie available for all routes in the application.

**maxAge**: Sets the cookie expiration time (7 days = 604800 seconds).

---

## Role-Based Access Control

### Available Roles

1. **patient**: Regular patients using the platform
2. **psychologist**: Healthcare professionals providing therapy
3. **admin**: Platform administrators
4. **clinic_owner**: Clinic owners managing their clinics
5. **clinic_admin**: Clinic administrators

### Role Permissions Matrix

| Endpoint                     | Patient | Psychologist | Admin | Clinic Owner |
|------------------------------|---------|--------------|-------|--------------|
| GET /api/users/me            | ✓       | ✓            | ✓     | ✓            |
| GET /api/patient/diary       | ✓       | -            | ✓     | -            |
| POST /api/patient/diary      | ✓       | -            | -     | -            |
| GET /api/psychologist/patients | -     | ✓            | ✓     | -            |
| POST /api/sessions           | -       | ✓            | ✓     | ✓            |
| GET /api/admin/stats         | -       | -            | ✓     | -            |
| POST /api/admin/users        | -       | -            | ✓     | -            |

### Implementing Role Checks

**Server-side (API Route):**
```typescript
import { getUserIdFromRequest } from '@/lib/auth'
import { db } from '@/db'

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  })

  if (user.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Admin-only logic here...
}
```

**Client-side (React Component):**
```typescript
import { useUser } from '@/hooks/useUser'

function AdminPanel() {
  const { user, loading } = useUser()

  if (loading) return <Loading />
  if (!user || user.role !== 'admin') {
    return <Redirect to="/dashboard" />
  }

  return <AdminContent />
}
```

---

## Security Best Practices

### 1. Token Storage

**DO:**
- ✓ Store tokens in HTTP-only cookies
- ✓ Use Secure flag in production
- ✓ Implement SameSite=Strict

**DON'T:**
- ✗ Store tokens in localStorage
- ✗ Store tokens in sessionStorage
- ✗ Expose tokens to client-side JavaScript

---

### 2. Token Expiration

Tokens expire after 7 days. Users must re-authenticate after expiration:

```javascript
// Token expiration check
const decoded = jwt.verify(token, secret)
if (decoded.exp * 1000 < Date.now()) {
  // Token expired
  return { error: 'Token expired' }
}
```

To check token validity:
```typescript
const checkAuth = async () => {
  try {
    const response = await apiClient.user.me()
    return response.user
  } catch (error) {
    // Token invalid or expired
    return null
  }
}
```

---

### 3. Password Security

**Hashing:**
```typescript
import bcrypt from 'bcryptjs'

// Hashing passwords (10 rounds)
const hashedPassword = await bcrypt.hash(password, 10)

// Verifying passwords
const isValid = await bcrypt.compare(password, hashedPassword)
```

**Password Requirements:**
- Minimum 8 characters
- Mixed case letters
- Numbers
- Special characters

---

### 4. Audit Logging

All authentication events are logged:

```typescript
await logAuditEvent({
  userId,
  action: 'login',
  resourceType: 'user',
  resourceId: userId.toString(),
  metadata: {
    sessionDuration: '7d',
    loginMethod: 'password'
  },
  ipAddress,
  userAgent
})
```

Logged events include:
- Successful logins
- Failed login attempts
- Logout events
- Password changes
- Role changes
- Permission changes

---

## Common Scenarios

### Scenario 1: Web Application Login

```typescript
// Login form submission
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await apiClient.auth.login(email, password)
    // Token automatically stored in cookie
    router.push('/dashboard')
  } catch (error) {
    if (error instanceof ApiError) {
      setError(error.message)
    }
  }
}
```

---

### Scenario 2: API Client Authentication

```typescript
import { apiClient } from '@/lib/api-client'

// All requests automatically include cookie
const getUserData = async () => {
  try {
    const { user } = await apiClient.user.me()
    return user
  } catch (error) {
    if (error.statusCode === 401) {
      // Redirect to login
      router.push('/login')
    }
  }
}
```

---

### Scenario 3: Protected Routes (Middleware)

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // Verify token
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET)
    return NextResponse.next()
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*']
}
```

---

### Scenario 4: Mobile App Authentication

For mobile apps, you can use a custom header instead of cookies:

```typescript
// Login and store token
const { token } = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
}).then(res => res.json())

// Store token securely
await SecureStore.setItemAsync('auth_token', token)

// Include in subsequent requests
const response = await fetch('/api/users/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

**Note:** This requires modifying the API to support Bearer tokens in addition to cookies.

---

## Troubleshooting

### Issue: "Unauthorized" error on authenticated requests

**Possible causes:**
1. Token expired (7 days)
2. Cookie not being sent (credentials: 'include' missing)
3. CORS issues (credentials not allowed)
4. Token invalid or corrupted

**Solutions:**
```javascript
// Ensure credentials are included
fetch('/api/endpoint', {
  credentials: 'include'
})

// Check if user is logged in
const checkAuth = async () => {
  try {
    await apiClient.user.me()
    return true
  } catch {
    return false
  }
}

// Re-authenticate if needed
if (!await checkAuth()) {
  router.push('/login')
}
```

---

### Issue: Cookie not being set

**Possible causes:**
1. HTTPS required in production (Secure flag)
2. Cross-domain issues (SameSite policy)
3. Browser blocking third-party cookies

**Solutions:**
1. Ensure using HTTPS in production
2. Set correct domain/path in cookie
3. Use same-origin requests

---

### Issue: CORS errors

**Configuration:**
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
        ],
      },
    ]
  },
}
```

---

### Issue: Token expires too quickly

**Current expiration:** 7 days

To extend token lifetime:
```typescript
// lib/auth.ts
const token = jwt.sign(
  { userId, role },
  process.env.JWT_SECRET,
  { expiresIn: '30d' } // Extend to 30 days
)
```

**Note:** Consider security implications of longer-lived tokens.

---

## Security Checklist

- [x] Passwords hashed with bcrypt (10+ rounds)
- [x] JWT tokens stored in HTTP-only cookies
- [x] Secure flag enabled in production
- [x] SameSite=Strict for CSRF protection
- [x] Token expiration enforced (7 days)
- [x] Role-based access control implemented
- [x] Audit logging for all auth events
- [x] Failed login attempt tracking
- [x] Password complexity requirements
- [x] HTTPS enforced in production

---

## Related Documentation

- [API Reference](./API_REFERENCE.md)
- [Error Handling](./API_ERRORS.md)
- [Code Examples](./API_EXAMPLES.md)
- [Rate Limits](./API_RATE_LIMITS.md)
