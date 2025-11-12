/**
 * Secrets Management & Environment Variable Validation
 *
 * Provides:
 * - Environment variable validation
 * - Secret rotation helpers
 * - Encryption key management
 * - API key validation
 * - Secure configuration loading
 *
 * @module secrets
 */

import { z } from "zod"
import { createHash, randomBytes } from "crypto"

// ================================================================
// ENVIRONMENT SCHEMA
// ================================================================

/**
 * Complete environment variable schema
 * Validates all required secrets at startup
 */
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database
  POSTGRES_URL: z.string().url("Invalid PostgreSQL URL"),
  POSTGRES_PRISMA_URL: z.string().url().optional(),
  POSTGRES_URL_NON_POOLING: z.string().url().optional(),

  // JWT Secrets
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  CSRF_SECRET: z.string().min(32).optional(),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters").optional(),

  // Email Service (Resend)
  RESEND_API_KEY: z.string().regex(/^re_[a-zA-Z0-9_]+$/, "Invalid Resend API key").optional(),
  EMAIL_FROM: z.string().email().optional(),

  // SMS Service (Twilio)
  TWILIO_ACCOUNT_SID: z.string().regex(/^AC[a-f0-9]{32}$/, "Invalid Twilio SID").optional(),
  TWILIO_AUTH_TOKEN: z.string().length(32).optional(),
  TWILIO_PHONE_NUMBER: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),

  // Real-time (Pusher)
  NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
  PUSHER_APP_ID: z.string().optional(),
  PUSHER_SECRET: z.string().optional(),
  PUSHER_CLUSTER: z.string().default("us2"),

  // Payment (Stripe)
  STRIPE_SECRET_KEY: z.string().regex(/^sk_(test|live)_[a-zA-Z0-9]+$/).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().regex(/^pk_(test|live)_[a-zA-Z0-9]+$/).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().regex(/^whsec_[a-zA-Z0-9]+$/).optional(),

  // Storage (Cloudflare R2 or AWS S3)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),

  // Error Tracking (Sentry)
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // Rate Limiting (Upstash Redis)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // CORS
  ALLOWED_ORIGINS: z.string().optional(),

  // Application
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  // Feature Flags
  ENABLE_RATE_LIMITING: z.enum(["true", "false"]).default("true").transform((val) => val === "true"),
  ENABLE_ENCRYPTION: z.enum(["true", "false"]).default("true").transform((val) => val === "true"),
  ENABLE_AUDIT_LOGS: z.enum(["true", "false"]).default("true").transform((val) => val === "true"),
})

export type Env = z.infer<typeof envSchema>

// ================================================================
// ENVIRONMENT VALIDATION
// ================================================================

let validatedEnv: Env | null = null

/**
 * Validate and load environment variables
 * Call this at application startup
 */
export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv
  }

  try {
    validatedEnv = envSchema.parse(process.env)
    console.log("[Secrets] Environment variables validated successfully")
    return validatedEnv
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[Secrets] Environment validation failed:")
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`)
      })
      throw new Error("Invalid environment configuration")
    }
    throw error
  }
}

/**
 * Get validated environment variable
 */
export function getEnv<K extends keyof Env>(key: K): Env[K] {
  if (!validatedEnv) {
    validatedEnv = validateEnv()
  }
  return validatedEnv[key]
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnv("NODE_ENV") === "production"
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnv("NODE_ENV") === "development"
}

// ================================================================
// SECRET VALIDATION
// ================================================================

/**
 * Validate secret strength
 */
export function validateSecretStrength(secret: string, minLength: number = 32): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  if (secret.length < minLength) {
    issues.push(`Secret must be at least ${minLength} characters`)
  }

  // Check entropy (randomness)
  const uniqueChars = new Set(secret).size
  if (uniqueChars < minLength / 2) {
    issues.push("Secret has low entropy (too many repeated characters)")
  }

  // Check for common patterns
  if (/^[a-zA-Z]+$/.test(secret)) {
    issues.push("Secret should contain numbers or special characters")
  }

  if (/^[0-9]+$/.test(secret)) {
    issues.push("Secret should contain letters")
  }

  if (secret === secret.toLowerCase() || secret === secret.toUpperCase()) {
    issues.push("Secret should contain mixed case letters")
  }

  // Check for common weak secrets
  const weakSecrets = [
    "password",
    "secret",
    "changeme",
    "12345678",
    "qwerty",
    "admin",
  ]
  if (weakSecrets.some((weak) => secret.toLowerCase().includes(weak))) {
    issues.push("Secret contains common weak patterns")
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Generate cryptographically secure secret
 */
export function generateSecret(length: number = 64): string {
  return randomBytes(length).toString("base64url")
}

/**
 * Generate API key with prefix
 */
export function generateApiKey(prefix: string = "caris"): string {
  const secret = randomBytes(32).toString("base64url")
  return `${prefix}_${secret}`
}

// ================================================================
// SECRET ROTATION
// ================================================================

export interface SecretRotationInfo {
  currentSecret: string
  previousSecret?: string
  rotatedAt?: Date
  expiresAt?: Date
}

/**
 * Create rotation info for a secret
 * Useful for zero-downtime secret rotation
 */
export function createRotationInfo(
  newSecret: string,
  oldSecret?: string,
  validityDays: number = 30
): SecretRotationInfo {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000)

  return {
    currentSecret: newSecret,
    previousSecret: oldSecret,
    rotatedAt: now,
    expiresAt,
  }
}

/**
 * Verify secret against rotation info
 * Supports both current and previous secret for grace period
 */
export function verifyWithRotation(
  secret: string,
  rotationInfo: SecretRotationInfo
): boolean {
  // Check current secret
  if (secret === rotationInfo.currentSecret) {
    return true
  }

  // Check previous secret if within grace period
  if (rotationInfo.previousSecret && rotationInfo.expiresAt) {
    if (
      secret === rotationInfo.previousSecret &&
      new Date() < rotationInfo.expiresAt
    ) {
      console.warn("[Secrets] Using deprecated secret, please update to new secret")
      return true
    }
  }

  return false
}

// ================================================================
// ENCRYPTION KEY MANAGEMENT
// ================================================================

/**
 * Derive encryption key from secret
 */
export function deriveEncryptionKey(
  secret: string,
  salt: string = "caris-encryption-v1"
): Buffer {
  return Buffer.from(
    createHash("sha256")
      .update(secret)
      .update(salt)
      .digest("hex")
      .slice(0, 32) // 256 bits
  )
}

/**
 * Get master encryption key
 */
export function getMasterKey(): Buffer {
  const secret = getEnv("ENCRYPTION_KEY") || getEnv("JWT_SECRET")
  return deriveEncryptionKey(secret)
}

/**
 * Generate data encryption key (DEK)
 * For envelope encryption pattern
 */
export function generateDataKey(): {
  key: Buffer
  encryptedKey: string
} {
  const key = randomBytes(32) // 256-bit key
  const masterKey = getMasterKey()

  // In production, use KMS to encrypt the data key
  // For now, simple encryption with master key
  const cipher = require("crypto").createCipheriv(
    "aes-256-gcm",
    masterKey,
    randomBytes(12)
  )

  let encryptedKey = cipher.update(key, undefined, "base64")
  encryptedKey += cipher.final("base64")

  return {
    key,
    encryptedKey: `${cipher.getAuthTag().toString("base64")}:${encryptedKey}`,
  }
}

// ================================================================
// API KEY VALIDATION
// ================================================================

/**
 * Hash API key for storage
 */
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex")
}

/**
 * Verify API key against hash
 */
export function verifyApiKey(apiKey: string, hash: string): boolean {
  return hashApiKey(apiKey) === hash
}

/**
 * Validate API key format
 */
export function validateApiKeyFormat(apiKey: string, prefix?: string): boolean {
  if (prefix) {
    if (!apiKey.startsWith(`${prefix}_`)) {
      return false
    }
    const secret = apiKey.slice(prefix.length + 1)
    return secret.length >= 32 && /^[a-zA-Z0-9_-]+$/.test(secret)
  }

  return /^[a-zA-Z0-9_-]+$/.test(apiKey) && apiKey.length >= 32
}

// ================================================================
// DATABASE CREDENTIAL MANAGEMENT
// ================================================================

/**
 * Parse database URL safely
 */
export function parseDatabaseUrl(url: string): {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
} | null {
  try {
    const parsed = new URL(url)

    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
      return null
    }

    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 5432,
      database: parsed.pathname.slice(1),
      username: parsed.username,
      password: parsed.password,
      ssl: parsed.searchParams.get("sslmode") !== "disable",
    }
  } catch {
    return null
  }
}

/**
 * Validate database connection string
 */
export function validateDatabaseUrl(url: string): boolean {
  const parsed = parseDatabaseUrl(url)
  if (!parsed) return false

  // Check for required fields
  if (!parsed.host || !parsed.database || !parsed.username) {
    return false
  }

  // Warn if using insecure connection in production
  if (isProduction() && !parsed.ssl) {
    console.warn("[Secrets] Database connection without SSL in production!")
  }

  return true
}

/**
 * Mask sensitive parts of database URL for logging
 */
export function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.password) {
      parsed.password = "***"
    }
    return parsed.toString()
  } catch {
    return "invalid-url"
  }
}

// ================================================================
// CONFIGURATION HELPERS
// ================================================================

/**
 * Get database configuration
 */
export function getDatabaseConfig() {
  const url = getEnv("POSTGRES_URL")
  const parsed = parseDatabaseUrl(url)

  if (!parsed) {
    throw new Error("Invalid database URL")
  }

  return {
    connectionString: url,
    ...parsed,
    pool: {
      max: isProduction() ? 20 : 5,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    },
  }
}

/**
 * Get JWT configuration
 */
export function getJWTConfig() {
  return {
    secret: getEnv("JWT_SECRET"),
    refreshSecret: getEnv("JWT_REFRESH_SECRET") || getEnv("JWT_SECRET"),
    accessTokenExpiry: isProduction() ? "15m" : "1h",
    refreshTokenExpiry: "7d",
    algorithm: "HS256" as const,
  }
}

/**
 * Get CORS configuration
 */
export function getCORSConfig() {
  const allowedOrigins = getEnv("ALLOWED_ORIGINS")
  const appUrl = getEnv("NEXT_PUBLIC_APP_URL")

  return {
    origins: allowedOrigins
      ? allowedOrigins.split(",").map((origin) => origin.trim())
      : appUrl
      ? [appUrl]
      : [],
    credentials: true,
    maxAge: 86400, // 24 hours
  }
}

// ================================================================
// SECURITY AUDIT
// ================================================================

/**
 * Audit environment security
 * Returns warnings and recommendations
 */
export function auditEnvironmentSecurity(): {
  warnings: string[]
  recommendations: string[]
} {
  const warnings: string[] = []
  const recommendations: string[] = []

  // Check NODE_ENV
  if (!isProduction() && !isDevelopment()) {
    warnings.push("NODE_ENV should be either 'production' or 'development'")
  }

  // Check JWT secret strength
  const jwtSecret = getEnv("JWT_SECRET")
  const jwtValidation = validateSecretStrength(jwtSecret)
  if (!jwtValidation.valid) {
    warnings.push("JWT_SECRET is weak: " + jwtValidation.issues.join(", "))
  }

  // Check if using separate refresh secret
  if (!getEnv("JWT_REFRESH_SECRET")) {
    recommendations.push("Use separate JWT_REFRESH_SECRET for better security")
  }

  // Check if using CSRF secret
  if (!getEnv("CSRF_SECRET")) {
    recommendations.push("Set CSRF_SECRET for CSRF protection")
  }

  // Check database SSL
  const dbUrl = getEnv("POSTGRES_URL")
  if (isProduction() && !dbUrl.includes("sslmode=require")) {
    warnings.push("Database connection should use SSL in production")
  }

  // Check if Sentry is configured in production
  if (isProduction() && !getEnv("SENTRY_DSN")) {
    recommendations.push("Configure SENTRY_DSN for error tracking")
  }

  // Check if rate limiting is enabled
  if (!getEnv("ENABLE_RATE_LIMITING")) {
    warnings.push("Rate limiting is disabled")
  }

  return { warnings, recommendations }
}

/**
 * Print security audit to console
 */
export function printSecurityAudit(): void {
  const audit = auditEnvironmentSecurity()

  if (audit.warnings.length > 0) {
    console.warn("\n[Security Audit] WARNINGS:")
    audit.warnings.forEach((warning) => console.warn(`  ⚠️  ${warning}`))
  }

  if (audit.recommendations.length > 0) {
    console.log("\n[Security Audit] Recommendations:")
    audit.recommendations.forEach((rec) => console.log(`  💡 ${rec}`))
  }

  if (audit.warnings.length === 0 && audit.recommendations.length === 0) {
    console.log("[Security Audit] ✅ No issues found")
  }
}
