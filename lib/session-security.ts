/**
 * Session Security Library
 *
 * Provides:
 * - Session fixation prevention
 * - Session timeout management
 * - Multi-device session management
 * - Suspicious login detection
 * - IP-based session validation
 * - Device fingerprinting
 *
 * @module session-security
 */

import { randomBytes, createHash } from "crypto"
import * as jose from "jose"
import { db } from "@/db"
import { AuthenticationError, AuthorizationError } from "./error-handler"

// ================================================================
// SESSION CONFIGURATION
// ================================================================

const SESSION_CONFIG = {
  // Session timeouts
  ACCESS_TOKEN_EXPIRY: "15m", // 15 minutes
  REFRESH_TOKEN_EXPIRY: "7d", // 7 days
  REMEMBER_ME_EXPIRY: "30d", // 30 days
  ABSOLUTE_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours (max session lifetime)
  IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes of inactivity

  // Security settings
  MAX_SESSIONS_PER_USER: 5, // Maximum concurrent sessions
  REQUIRE_2FA_FOR_SENSITIVE: true,
  ROTATE_TOKEN_ON_USE: true, // Rotate refresh token after use
  ENFORCE_IP_BINDING: false, // Bind session to IP (can cause issues with mobile users)

  // Cookie settings
  COOKIE_SECURE: process.env.NODE_ENV === "production",
  COOKIE_HTTP_ONLY: true,
  COOKIE_SAME_SITE: "strict" as const,
}

// ================================================================
// SESSION TYPES
// ================================================================

export interface SessionData {
  userId: number
  email: string
  role: string
  deviceId: string
  ipAddress: string
  userAgent: string
  createdAt: Date
  lastActivityAt: Date
  expiresAt: Date
  fingerprint: string
}

export interface DeviceFingerprint {
  userAgent: string
  ipAddress: string
  acceptLanguage?: string
  acceptEncoding?: string
  timezone?: string
}

export interface SessionValidationResult {
  valid: boolean
  reason?: string
  requiresRefresh?: boolean
  suspicious?: boolean
}

// ================================================================
// SESSION CREATION
// ================================================================

/**
 * Create new session with security measures
 */
export async function createSession(
  userId: number,
  email: string,
  role: string,
  deviceInfo: DeviceFingerprint,
  options?: {
    rememberMe?: boolean
    force?: boolean
  }
): Promise<{
  accessToken: string
  refreshToken: string
  sessionId: string
  expiresIn: number
}> {
  const { rememberMe = false, force = false } = options || {}

  // Generate unique session ID
  const sessionId = generateSessionId()

  // Generate device ID for this session
  const deviceId = generateDeviceId(deviceInfo)

  // Create device fingerprint
  const fingerprint = createDeviceFingerprint(deviceInfo)

  // Check concurrent session limit
  if (!force) {
    await enforceSessionLimit(userId)
  }

  // Create JWT tokens
  const expiresIn = rememberMe
    ? parseExpiry(SESSION_CONFIG.REMEMBER_ME_EXPIRY)
    : parseExpiry(SESSION_CONFIG.ACCESS_TOKEN_EXPIRY)

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

  const accessToken = await new jose.SignJWT({
    userId,
    email,
    role,
    sessionId,
    deviceId,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_CONFIG.ACCESS_TOKEN_EXPIRY)
    .sign(secret)

  const refreshSecret = new TextEncoder().encode(
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!
  )

  const refreshToken = await new jose.SignJWT({
    userId,
    sessionId,
    deviceId,
    fingerprint,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(
      rememberMe ? SESSION_CONFIG.REMEMBER_ME_EXPIRY : SESSION_CONFIG.REFRESH_TOKEN_EXPIRY
    )
    .sign(refreshSecret)

  // Store session metadata (in production, use Redis or database)
  await storeSessionMetadata({
    sessionId,
    userId,
    email,
    role,
    deviceId,
    ipAddress: deviceInfo.ipAddress,
    userAgent: deviceInfo.userAgent,
    fingerprint,
    createdAt: new Date(),
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + expiresIn),
  })

  return {
    accessToken,
    refreshToken,
    sessionId,
    expiresIn,
  }
}

/**
 * Refresh session tokens
 */
export async function refreshSession(
  refreshToken: string,
  deviceInfo: DeviceFingerprint
): Promise<{
  accessToken: string
  refreshToken: string
  sessionId: string
  expiresIn: number
}> {
  // Verify refresh token
  const refreshSecret = new TextEncoder().encode(
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!
  )

  let payload: any

  try {
    const verified = await jose.jwtVerify(refreshToken, refreshSecret)
    payload = verified.payload
  } catch (error) {
    throw new AuthenticationError("Invalid or expired refresh token")
  }

  // Validate it's a refresh token
  if (payload.type !== "refresh") {
    throw new AuthenticationError("Invalid token type")
  }

  // Get session metadata
  const sessionData = await getSessionMetadata(payload.sessionId)

  if (!sessionData) {
    throw new AuthenticationError("Session not found")
  }

  // Validate session
  const validation = await validateSession(sessionData, deviceInfo)

  if (!validation.valid) {
    throw new AuthenticationError(validation.reason || "Session validation failed")
  }

  // Check if session expired absolutely
  if (new Date() > sessionData.expiresAt) {
    await invalidateSession(payload.sessionId)
    throw new AuthenticationError("Session expired")
  }

  // Create new tokens
  const newSession = await createSession(
    sessionData.userId,
    sessionData.email,
    sessionData.role,
    deviceInfo
  )

  // Invalidate old refresh token if rotation is enabled
  if (SESSION_CONFIG.ROTATE_TOKEN_ON_USE) {
    await invalidateRefreshToken(refreshToken)
  }

  return newSession
}

// ================================================================
// SESSION VALIDATION
// ================================================================

/**
 * Validate session with security checks
 */
export async function validateSession(
  sessionData: SessionData,
  currentDeviceInfo: DeviceFingerprint
): Promise<SessionValidationResult> {
  // Check if session expired
  if (new Date() > sessionData.expiresAt) {
    return {
      valid: false,
      reason: "Session expired",
    }
  }

  // Check idle timeout
  const idleTime = Date.now() - sessionData.lastActivityAt.getTime()
  if (idleTime > SESSION_CONFIG.IDLE_TIMEOUT) {
    return {
      valid: false,
      reason: "Session idle timeout",
    }
  }

  // Check absolute timeout
  const sessionAge = Date.now() - sessionData.createdAt.getTime()
  if (sessionAge > SESSION_CONFIG.ABSOLUTE_TIMEOUT) {
    return {
      valid: false,
      reason: "Session absolute timeout",
    }
  }

  // Check device fingerprint
  const currentFingerprint = createDeviceFingerprint(currentDeviceInfo)
  if (sessionData.fingerprint !== currentFingerprint) {
    // Fingerprint changed - suspicious
    return {
      valid: false,
      reason: "Device fingerprint mismatch",
      suspicious: true,
    }
  }

  // Check IP binding if enabled
  if (SESSION_CONFIG.ENFORCE_IP_BINDING) {
    if (sessionData.ipAddress !== currentDeviceInfo.ipAddress) {
      return {
        valid: false,
        reason: "IP address changed",
        suspicious: true,
      }
    }
  } else {
    // Just warn about IP changes
    if (sessionData.ipAddress !== currentDeviceInfo.ipAddress) {
      console.warn(
        `[Session Security] IP changed for session ${sessionData.userId}: ${sessionData.ipAddress} -> ${currentDeviceInfo.ipAddress}`
      )
      // Could trigger 2FA challenge here
    }
  }

  // Update last activity
  await updateSessionActivity(sessionData.userId, new Date())

  return {
    valid: true,
  }
}

/**
 * Detect suspicious login activity
 */
export async function detectSuspiciousLogin(
  userId: number,
  deviceInfo: DeviceFingerprint
): Promise<{
  suspicious: boolean
  reasons: string[]
  riskScore: number
}> {
  const reasons: string[] = []
  let riskScore = 0

  // Get user's recent sessions
  const recentSessions = await getRecentSessions(userId, 10)

  // Check for unusual location (based on IP)
  const knownIPs = recentSessions.map((s) => s.ipAddress)
  if (!knownIPs.includes(deviceInfo.ipAddress)) {
    reasons.push("Login from new IP address")
    riskScore += 3
  }

  // Check for unusual device
  const knownUserAgents = recentSessions.map((s) => s.userAgent)
  if (!knownUserAgents.includes(deviceInfo.userAgent)) {
    reasons.push("Login from new device")
    riskScore += 2
  }

  // Check for rapid location changes
  if (recentSessions.length > 0) {
    const lastSession = recentSessions[0]
    const timeSinceLastLogin = Date.now() - lastSession.lastActivityAt.getTime()

    // If logged in from different IP in less than 1 hour
    if (
      timeSinceLastLogin < 60 * 60 * 1000 &&
      lastSession.ipAddress !== deviceInfo.ipAddress
    ) {
      reasons.push("Rapid location change detected")
      riskScore += 5
    }
  }

  // Check if login is from Tor or VPN (would need IP intelligence service)
  // if (await isTorOrVPN(deviceInfo.ipAddress)) {
  //   reasons.push("Login from Tor/VPN")
  //   riskScore += 4
  // }

  // Check time-based anomalies
  const currentHour = new Date().getHours()
  const userTypicalHours = getUserTypicalLoginHours(recentSessions)
  if (!userTypicalHours.includes(currentHour)) {
    reasons.push("Login at unusual time")
    riskScore += 1
  }

  return {
    suspicious: riskScore >= 5,
    reasons,
    riskScore,
  }
}

// ================================================================
// SESSION MANAGEMENT
// ================================================================

/**
 * Invalidate session
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  // In production, remove from Redis/database
  // For now, just log
  console.log(`[Session] Invalidating session: ${sessionId}`)

  // TODO: Implement actual session removal
  // await redis.del(`session:${sessionId}`)
}

/**
 * Invalidate all sessions for a user (e.g., on password change)
 */
export async function invalidateAllSessions(userId: number): Promise<void> {
  console.log(`[Session] Invalidating all sessions for user: ${userId}`)

  // TODO: Implement actual session removal
  // const sessions = await redis.keys(`session:*:user:${userId}`)
  // await Promise.all(sessions.map(sessionKey => redis.del(sessionKey)))
}

/**
 * Enforce maximum concurrent sessions per user
 */
async function enforceSessionLimit(userId: number): Promise<void> {
  const activeSessions = await getActiveSessions(userId)

  if (activeSessions.length >= SESSION_CONFIG.MAX_SESSIONS_PER_USER) {
    // Remove oldest session
    const oldestSession = activeSessions.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )[0]

    await invalidateSession(oldestSession.sessionId!)
  }
}

/**
 * Get all active sessions for a user
 */
export async function getActiveSessions(userId: number): Promise<SessionData[]> {
  // TODO: Implement actual session retrieval from Redis/database
  // For now, return empty array
  return []
}

/**
 * Get recent sessions for anomaly detection
 */
async function getRecentSessions(
  userId: number,
  limit: number = 10
): Promise<SessionData[]> {
  // TODO: Implement actual session retrieval
  return []
}

// ================================================================
// DEVICE FINGERPRINTING
// ================================================================

/**
 * Generate device ID from fingerprint
 */
function generateDeviceId(deviceInfo: DeviceFingerprint): string {
  const fingerprintString = [
    deviceInfo.userAgent,
    deviceInfo.acceptLanguage || "",
    deviceInfo.acceptEncoding || "",
    deviceInfo.timezone || "",
  ].join("|")

  return createHash("sha256").update(fingerprintString).digest("hex")
}

/**
 * Create device fingerprint hash
 */
function createDeviceFingerprint(deviceInfo: DeviceFingerprint): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        userAgent: deviceInfo.userAgent,
        ipAddress: deviceInfo.ipAddress,
      })
    )
    .digest("hex")
}

// ================================================================
// HELPERS
// ================================================================

/**
 * Generate secure session ID
 */
function generateSessionId(): string {
  return randomBytes(32).toString("base64url")
}

/**
 * Parse expiry string to milliseconds
 */
function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/)
  if (!match) return 15 * 60 * 1000 // Default 15 minutes

  const [, value, unit] = match
  const num = parseInt(value)

  switch (unit) {
    case "s":
      return num * 1000
    case "m":
      return num * 60 * 1000
    case "h":
      return num * 60 * 60 * 1000
    case "d":
      return num * 24 * 60 * 60 * 1000
    default:
      return 15 * 60 * 1000
  }
}

/**
 * Get user's typical login hours for anomaly detection
 */
function getUserTypicalLoginHours(sessions: SessionData[]): number[] {
  const hours = sessions.map((s) => s.createdAt.getHours())
  const hourCounts = new Map<number, number>()

  for (const hour of hours) {
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
  }

  // Return hours that appear in at least 20% of logins
  const threshold = sessions.length * 0.2
  return Array.from(hourCounts.entries())
    .filter(([_, count]) => count >= threshold)
    .map(([hour]) => hour)
}

// ================================================================
// SESSION STORAGE (TODO: Implement with Redis/Database)
// ================================================================

/**
 * Store session metadata
 */
async function storeSessionMetadata(sessionData: Partial<SessionData>): Promise<void> {
  // TODO: Store in Redis for fast access
  // await redis.setex(
  //   `session:${sessionData.sessionId}`,
  //   SESSION_CONFIG.ABSOLUTE_TIMEOUT / 1000,
  //   JSON.stringify(sessionData)
  // )

  console.log(`[Session] Stored session metadata:`, sessionData.sessionId)
}

/**
 * Get session metadata
 */
async function getSessionMetadata(sessionId: string): Promise<SessionData | null> {
  // TODO: Retrieve from Redis
  // const data = await redis.get(`session:${sessionId}`)
  // return data ? JSON.parse(data) : null

  return null
}

/**
 * Update session activity timestamp
 */
async function updateSessionActivity(sessionId: string, timestamp: Date): Promise<void> {
  // TODO: Update in Redis
  // await redis.hset(`session:${sessionId}`, 'lastActivityAt', timestamp.toISOString())

  console.log(`[Session] Updated activity for session: ${sessionId}`)
}

/**
 * Invalidate refresh token (prevent reuse)
 */
async function invalidateRefreshToken(token: string): Promise<void> {
  // TODO: Add to blacklist in Redis
  // const tokenHash = createHash('sha256').update(token).digest('hex')
  // await redis.setex(`blacklist:${tokenHash}`, 86400 * 7, '1') // 7 days

  console.log(`[Session] Blacklisted refresh token`)
}

// ================================================================
// EXPORT
// ================================================================

export { SESSION_CONFIG }
