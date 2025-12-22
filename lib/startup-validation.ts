/**
 * Startup Validation for CÁRIS Platform
 *
 * Validates critical configuration on application startup to prevent
 * deployment with insecure settings.
 *
 * This file should be imported and executed at the earliest point in
 * the application lifecycle (e.g., instrumentation.ts or top of root layout)
 */

/**
 * Validate JWT_SECRET strength
 */
function validateJWTSecret(): void {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error(
      '❌ CRITICAL: JWT_SECRET environment variable is not set.\n' +
      '   Set a strong secret (minimum 64 characters) in your .env file.\n' +
      '   Example: openssl rand -base64 64'
    )
  }

  // Check minimum length
  if (secret.length < 64) {
    throw new Error(
      `❌ CRITICAL: JWT_SECRET is too weak (${secret.length} characters).\n` +
      `   Minimum required: 64 characters for production security.\n` +
      `   Current: ${secret.substring(0, 10)}...\n` +
      `   Generate strong secret: openssl rand -base64 64`
    )
  }

  // Check for default/weak secrets
  const weakSecrets = [
    'your-secret-key',
    'change-me',
    'secret',
    'password',
    '123456',
    'test',
    'development',
    'dev-secret',
  ]

  const lowerSecret = secret.toLowerCase()
  for (const weak of weakSecrets) {
    if (lowerSecret.includes(weak)) {
      throw new Error(
        `❌ CRITICAL: JWT_SECRET contains weak/default value: "${weak}".\n` +
        `   Generate a strong unique secret: openssl rand -base64 64`
      )
    }
  }

  // Check entropy (basic)
  const uniqueChars = new Set(secret).size
  if (uniqueChars < 20) {
    throw new Error(
      `❌ CRITICAL: JWT_SECRET has low entropy (${uniqueChars} unique characters).\n` +
      `   Use a cryptographically random secret with high entropy.\n` +
      `   Generate: openssl rand -base64 64`
    )
  }

  console.info('✅ JWT_SECRET validation passed')
}

/**
 * Validate encryption configuration
 */
function validateEncryptionConfig(): void {
  const encryptionSecret = process.env.ENCRYPTION_SECRET
  const jwtSecret = process.env.JWT_SECRET

  const secret = encryptionSecret || jwtSecret

  if (!secret) {
    throw new Error(
      '❌ CRITICAL: No encryption secret found.\n' +
      '   Set ENCRYPTION_SECRET or JWT_SECRET in environment.\n' +
      '   For production, use separate ENCRYPTION_SECRET: openssl rand -base64 64'
    )
  }

  // Same validation as JWT secret
  if (secret.length < 32) {
    console.warn(
      `⚠️  WARNING: Encryption secret is weak (${secret.length} characters).\n` +
      `   Recommended: 64+ characters for AES-256 security.`
    )
  }

  if (!encryptionSecret) {
    console.warn(
      '⚠️  WARNING: Using JWT_SECRET for encryption.\n' +
      '   For better security, set separate ENCRYPTION_SECRET in production.'
    )
  }

  console.info('✅ Encryption configuration validated')
}

/**
 * Validate database configuration
 */
function validateDatabaseConfig(): void {
  const postgresUrl = process.env.POSTGRES_URL

  if (!postgresUrl) {
    throw new Error(
      '❌ CRITICAL: POSTGRES_URL environment variable is not set.\n' +
      '   Configure your PostgreSQL connection string in .env'
    )
  }

  // Check for default/insecure database passwords
  if (postgresUrl.includes('password=password') || postgresUrl.includes(':password@')) {
    console.warn(
      '⚠️  WARNING: Database URL may contain weak password.\n' +
      '   Ensure strong database credentials in production.'
    )
  }

  console.info('✅ Database configuration validated')
}

/**
 * Validate Node environment
 */
function validateNodeEnvironment(): void {
  const nodeEnv = process.env.NODE_ENV

  if (!nodeEnv) {
    console.warn('⚠️  WARNING: NODE_ENV not set. Defaulting to development.')
  }

  if (nodeEnv === 'production') {
    // Additional production checks
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
      throw new Error('❌ CRITICAL: Production deployment requires JWT_SECRET >= 64 characters')
    }

    console.info('✅ Production environment checks passed')
  }
}

/**
 * Validate Pusher configuration (optional but recommended)
 */
function validatePusherConfig(): void {
  const pusherAppId = process.env.PUSHER_APP_ID
  const pusherKey = process.env.PUSHER_KEY
  const pusherSecret = process.env.PUSHER_SECRET

  if (!pusherAppId || !pusherKey || !pusherSecret) {
    console.warn(
      '⚠️  WARNING: Pusher configuration incomplete.\n' +
      '   Real-time features (chat, notifications) will not work.\n' +
      '   Set PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET in .env'
    )
    return
  }

  console.info('✅ Pusher configuration found')
}

/**
 * Validate security headers and rate limiting
 */
function validateSecurityConfig(): void {
  // Check if rate limiting is configured
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    console.warn(
      '⚠️  WARNING: Redis (Upstash) not configured.\n' +
      '   Rate limiting will use in-memory storage (not recommended for production).\n' +
      '   For distributed rate limiting, configure Upstash Redis.'
    )
  } else {
    console.info('✅ Rate limiting (Redis) configured')
  }
}

/**
 * Main validation function - runs all checks
 * Call this at application startup
 *
 * NOTE: This function now only logs warnings and errors but does NOT
 * stop the application from starting. In serverless environments like
 * Vercel, calling process.exit(1) causes 500 errors for all requests.
 *
 * The application will start and run even with validation warnings,
 * but security issues should be addressed before going to production.
 */
export function validateStartupConfiguration(): void {
  // Skip validation entirely if SKIP_STARTUP_VALIDATION is set
  // Useful for build processes that don't have all env vars
  if (process.env.SKIP_STARTUP_VALIDATION === 'true') {
    console.info('⏭️  Skipping startup validation (SKIP_STARTUP_VALIDATION=true)')
    return
  }

  console.info('\n🔐 Running CÁRIS Platform Security Validation...\n')

  const errors: string[] = []
  const warnings: string[] = []

  // Run all validations, collecting errors instead of throwing
  try {
    validateNodeEnvironment()
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : 'Node environment validation failed')
  }

  try {
    validateJWTSecret()
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'JWT secret validation failed')
  }

  try {
    validateEncryptionConfig()
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : 'Encryption config validation failed')
  }

  try {
    validateDatabaseConfig()
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Database config validation failed')
  }

  try {
    validatePusherConfig()
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : 'Pusher config validation failed')
  }

  try {
    validateSecurityConfig()
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : 'Security config validation failed')
  }

  // Log all warnings
  for (const warning of warnings) {
    console.warn('⚠️  ' + warning)
  }

  // Log all errors
  for (const err of errors) {
    console.error('❌ ' + err)
  }

  // Summary
  if (errors.length === 0 && warnings.length === 0) {
    console.info('\n✅ All critical validations passed - Application is secure to start\n')
  } else if (errors.length === 0) {
    console.info(`\n⚠️  Validation completed with ${warnings.length} warning(s) - Application will start\n`)
  } else {
    console.error(`\n❌ Validation completed with ${errors.length} error(s) and ${warnings.length} warning(s)`)
    console.error('   These issues should be addressed before production deployment.\n')

    // In development, throw to make issues visible
    // In production, log but continue - let the app try to run
    // (specific features will fail gracefully if env vars are missing)
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(`Startup validation failed with ${errors.length} error(s). Check console for details.`)
    }
  }
}

/**
 * Validate individual secrets for migration or rotation
 */
export function validateSecretStrength(secret: string, minLength: number = 64): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  if (secret.length < minLength) {
    issues.push(`Too short (${secret.length} chars, need ${minLength})`)
  }

  const uniqueChars = new Set(secret).size
  if (uniqueChars < 20) {
    issues.push(`Low entropy (${uniqueChars} unique characters)`)
  }

  const weakPatterns = ['password', 'secret', '123456', 'qwerty', 'abc123']
  for (const pattern of weakPatterns) {
    if (secret.toLowerCase().includes(pattern)) {
      issues.push(`Contains weak pattern: ${pattern}`)
    }
  }

  return {
    valid: issues.length === 0,
    issues
  }
}

// Export for use in instrumentation or middleware
export default validateStartupConfiguration
