import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import * as jose from "jose"
import { createHash, randomBytes } from "crypto"

// ================================================================
// SECURITY HEADERS CONFIGURATION
// ================================================================

/**
 * Apply comprehensive security headers to all responses
 * Following OWASP security best practices
 */
function applySecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const nonce = randomBytes(16).toString("base64")
  const isProduction = process.env.NODE_ENV === "production"

  // Content Security Policy (CSP)
  // Prevents XSS attacks by controlling what resources can be loaded
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.pusher.com https://www.googletagmanager.com ${isProduction ? "" : "'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' wss://*.pusher.com https://*.pusher.com https://api.stripe.com",
    "media-src 'self' blob: data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ]

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "))

  // Strict Transport Security (HSTS)
  // Forces HTTPS connections for 2 years
  if (isProduction) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    )
  }

  // X-Frame-Options
  // Prevents clickjacking attacks
  response.headers.set("X-Frame-Options", "DENY")

  // X-Content-Type-Options
  // Prevents MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff")

  // X-XSS-Protection (Legacy browsers)
  // Modern browsers use CSP instead
  response.headers.set("X-XSS-Protection", "1; mode=block")

  // Referrer Policy
  // Controls how much referrer information is shared
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // Permissions Policy (formerly Feature Policy)
  // Controls which browser features can be used
  const permissionsPolicy = [
    "camera=(self)",
    "microphone=(self)",
    "geolocation=()",
    "payment=()",
    "usb=()",
    "magnetometer=()",
    "accelerometer=()",
    "gyroscope=()",
  ]
  response.headers.set("Permissions-Policy", permissionsPolicy.join(", "))

  // Cross-Origin policies
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin")
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin")
  response.headers.set("Cross-Origin-Embedder-Policy", "require-corp")

  // Remove sensitive server information
  response.headers.delete("X-Powered-By")
  response.headers.delete("Server")

  return response
}

// ================================================================
// CSRF PROTECTION
// ================================================================

/**
 * Generate CSRF token for a session
 */
function generateCSRFToken(sessionId: string): string {
  const secret = process.env.CSRF_SECRET || process.env.JWT_SECRET!
  const hash = createHash("sha256")
    .update(`${sessionId}:${secret}`)
    .digest("hex")
  return hash
}

/**
 * Verify CSRF token for state-changing operations
 */
function verifyCSRFToken(request: NextRequest, sessionId: string): boolean {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return true
  }

  // Get CSRF token from header or body
  const csrfToken = request.headers.get("x-csrf-token") ||
                    request.headers.get("x-xsrf-token")

  if (!csrfToken) {
    console.warn("[Security] CSRF token missing for", request.method, request.nextUrl.pathname)
    return false
  }

  const expectedToken = generateCSRFToken(sessionId)
  return csrfToken === expectedToken
}

// ================================================================
// CORS CONFIGURATION
// ================================================================

/**
 * Apply CORS headers for API routes
 */
function applyCORSHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get("origin")
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || []

  // In production, only allow specific origins
  if (process.env.NODE_ENV === "production") {
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin)
    }
  } else {
    // In development, allow localhost
    if (origin?.includes("localhost") || origin?.includes("127.0.0.1")) {
      response.headers.set("Access-Control-Allow-Origin", origin)
    }
  }

  response.headers.set("Access-Control-Allow-Credentials", "true")
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  )
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-CSRF-Token, X-Requested-With"
  )
  response.headers.set("Access-Control-Max-Age", "86400") // 24 hours

  return response
}

// ================================================================
// SECURITY LOGGING
// ================================================================

/**
 * Log security events for monitoring
 */
function logSecurityEvent(
  event: string,
  request: NextRequest,
  details?: Record<string, any>
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
             request.headers.get("x-real-ip") ||
             "unknown"

  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ip,
    path: request.nextUrl.pathname,
    method: request.method,
    userAgent: request.headers.get("user-agent"),
    ...details,
  }

  // In production, this should go to a security monitoring service
  // (e.g., Sentry, DataDog, CloudWatch)
  console.warn("[Security Event]", JSON.stringify(logEntry))
}

// ================================================================
// MAIN MIDDLEWARE
// ================================================================

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  const { pathname } = request.nextUrl

  // Handle OPTIONS preflight requests
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 })
    applyCORSHeaders(response, request)
    return response
  }

  // Se não há token, redireciona para login
  if (!token) {
    logSecurityEvent("unauthorized_access_attempt", request)
    const response = NextResponse.redirect(new URL("/login", request.url))
    return applySecurityHeaders(response, request)
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jose.jwtVerify(token, secret)

    // Verifica se o token não expirou
    if (payload.exp && payload.exp < Date.now() / 1000) {
      logSecurityEvent("token_expired", request, { userId: payload.userId })
      const response = NextResponse.redirect(new URL("/login", request.url))
      response.cookies.delete("token")
      response.cookies.delete("refresh_token")
      response.cookies.delete("user_session")
      return applySecurityHeaders(response, request)
    }

    // CSRF Protection for API routes
    if (pathname.startsWith("/api/")) {
      const sessionId = payload.userId?.toString() || payload.sub?.toString() || ""
      if (!verifyCSRFToken(request, sessionId)) {
        logSecurityEvent("csrf_validation_failed", request, {
          userId: payload.userId,
          path: pathname
        })
        // For now, log but don't block (to avoid breaking existing functionality)
        // TODO: Enable blocking after frontend implements CSRF tokens
        // return NextResponse.json(
        //   { error: "Invalid CSRF token" },
        //   { status: 403 }
        // )
      }
    }

    // Verifica permissões de admin
    if (pathname.startsWith("/admin") && payload.role !== "admin") {
      logSecurityEvent("unauthorized_admin_access", request, {
        userId: payload.userId,
        role: payload.role
      })
      const response = NextResponse.redirect(new URL("/dashboard", request.url))
      return applySecurityHeaders(response, request)
    }

    // Token válido, continua com headers de segurança
    const response = NextResponse.next()
    applySecurityHeaders(response, request)

    // Apply CORS for API routes
    if (pathname.startsWith("/api/")) {
      applyCORSHeaders(response, request)
    }

    // Add CSRF token to response for client use
    const sessionId = payload.userId?.toString() || payload.sub?.toString() || ""
    const csrfToken = generateCSRFToken(sessionId)
    response.cookies.set("csrf-token", csrfToken, {
      httpOnly: false, // Needs to be accessible by JavaScript
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    })

    return response
  } catch (error) {
    logSecurityEvent("invalid_token", request, {
      error: error instanceof Error ? error.message : "Unknown error"
    })
    const response = NextResponse.redirect(new URL("/login", request.url))

    // Remove todos os cookies de autenticação
    response.cookies.delete("token")
    response.cookies.delete("refresh_token")
    response.cookies.delete("user_session")
    response.cookies.delete("csrf-token")

    // Headers para evitar cache
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    return applySecurityHeaders(response, request)
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/((?!auth|health).*)/:path*"],
}
