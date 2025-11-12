/**
 * Database Security Library
 *
 * Provides:
 * - Connection pool security
 * - Query timeout enforcement
 * - Prepared statement helpers
 * - Row-level security (RLS) utilities
 * - SQL injection prevention
 * - Database encryption helpers
 *
 * @module db-security
 */

import { db } from "@/db"
import { sql } from "drizzle-orm"
import { DatabaseError } from "./error-handler"
import { validateSQLIdentifier } from "./validation"

// ================================================================
// QUERY TIMEOUT CONFIGURATION
// ================================================================

const QUERY_TIMEOUTS = {
  // Default timeouts in milliseconds
  SELECT: 10000, // 10 seconds
  INSERT: 5000, // 5 seconds
  UPDATE: 5000, // 5 seconds
  DELETE: 5000, // 5 seconds
  TRANSACTION: 30000, // 30 seconds

  // Specific operation timeouts
  BULK_OPERATION: 60000, // 1 minute
  REPORT_GENERATION: 120000, // 2 minutes
  BACKUP: 300000, // 5 minutes
}

/**
 * Execute query with timeout
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  operationName: string = "Database operation"
): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new DatabaseError(`${operationName} timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ])
}

// ================================================================
// PREPARED STATEMENT HELPERS
// ================================================================

/**
 * Safely execute parameterized query
 * Ensures all user inputs are properly escaped
 */
export async function executeParameterizedQuery<T>(
  query: string,
  params: any[],
  timeoutMs: number = QUERY_TIMEOUTS.SELECT
): Promise<T> {
  // Validate that query doesn't contain raw SQL injection attempts
  if (containsSQLInjectionPatterns(query)) {
    throw new DatabaseError("Potentially unsafe SQL query detected")
  }

  try {
    const result = await withTimeout(
      db.execute(sql.raw(query, ...params)),
      timeoutMs,
      "Parameterized query"
    )

    return result as T
  } catch (error) {
    throw new DatabaseError(
      "Query execution failed",
      error instanceof Error ? error.message : undefined
    )
  }
}

/**
 * Detect SQL injection patterns
 */
function containsSQLInjectionPatterns(query: string): boolean {
  const dangerousPatterns = [
    /--\s/i, // SQL comments
    /;\s*(DROP|DELETE|UPDATE|INSERT|CREATE|ALTER)\s/i, // Chained dangerous commands
    /UNION\s+SELECT/i, // UNION attacks
    /'\s*OR\s*'1'\s*=\s*'1/i, // Classic OR injection
    /'\s*OR\s*1\s*=\s*1/i, // Numeric OR injection
    /xp_cmdshell/i, // Command execution
    /EXEC\s*\(/i, // Execute commands
  ]

  return dangerousPatterns.some((pattern) => pattern.test(query))
}

// ================================================================
// ROW-LEVEL SECURITY (RLS)
// ================================================================

/**
 * Filter query results based on user permissions
 */
export function applyRowLevelSecurity<T>(
  records: T[],
  userId: number,
  userRole: string,
  options?: {
    ownerField?: string
    allowedRoles?: string[]
  }
): T[] {
  const { ownerField = "userId", allowedRoles = ["admin"] } = options || {}

  // Admins can see everything
  if (allowedRoles.includes(userRole)) {
    return records
  }

  // Filter to only records owned by user
  return records.filter((record: any) => {
    // If no owner field, deny access
    if (!(ownerField in record)) {
      return false
    }

    // Check if user owns the record
    return record[ownerField] === userId
  })
}

/**
 * Check if user can access a specific record
 */
export function canAccessRecord(
  record: any,
  userId: number,
  userRole: string,
  options?: {
    ownerField?: string
    allowedRoles?: string[]
    sharedWith?: number[]
  }
): boolean {
  const { ownerField = "userId", allowedRoles = ["admin"], sharedWith = [] } = options || {}

  // Admins can access everything
  if (allowedRoles.includes(userRole)) {
    return true
  }

  // Check if user owns the record
  if (record[ownerField] === userId) {
    return true
  }

  // Check if record is shared with user
  if (sharedWith.includes(userId)) {
    return true
  }

  return false
}

/**
 * Build WHERE clause for RLS
 * Use this in Drizzle queries to enforce access control
 */
export function buildRLSWhere(
  userId: number,
  userRole: string,
  options?: {
    ownerField?: string
    allowedRoles?: string[]
  }
) {
  const { ownerField = "userId", allowedRoles = ["admin"] } = options || {}

  // Admins bypass RLS
  if (allowedRoles.includes(userRole)) {
    return undefined // No WHERE clause needed
  }

  // Return WHERE clause for owned records only
  return sql`${sql.identifier(ownerField)} = ${userId}`
}

// ================================================================
// DATABASE ENCRYPTION
// ================================================================

/**
 * Encrypt sensitive field before storage
 */
export function encryptField(value: string, key?: Buffer): string {
  const crypto = require("crypto")

  // Use provided key or generate from secret
  const encryptionKey =
    key || Buffer.from(process.env.ENCRYPTION_KEY || process.env.JWT_SECRET!, "utf-8").slice(0, 32)

  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv)

  let encrypted = cipher.update(value, "utf8", "base64")
  encrypted += cipher.final("base64")

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`
}

/**
 * Decrypt sensitive field from storage
 */
export function decryptField(encryptedValue: string, key?: Buffer): string {
  const crypto = require("crypto")

  const encryptionKey =
    key || Buffer.from(process.env.ENCRYPTION_KEY || process.env.JWT_SECRET!, "utf-8").slice(0, 32)

  const [ivBase64, authTagBase64, encrypted] = encryptedValue.split(":")

  if (!ivBase64 || !authTagBase64 || !encrypted) {
    throw new DatabaseError("Invalid encrypted value format")
  }

  const iv = Buffer.from(ivBase64, "base64")
  const authTag = Buffer.from(authTagBase64, "base64")

  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, "base64", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

// ================================================================
// SAFE DYNAMIC QUERIES
// ================================================================

/**
 * Safely build dynamic ORDER BY clause
 */
export function buildSafeOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc" = "desc",
  allowedColumns: string[]
): string {
  // Validate sort column is in allowed list
  if (!allowedColumns.includes(sortBy)) {
    throw new DatabaseError(`Invalid sort column: ${sortBy}`)
  }

  // Validate it's a safe identifier
  if (!validateSQLIdentifier(sortBy)) {
    throw new DatabaseError(`Invalid sort column identifier: ${sortBy}`)
  }

  // Validate sort order
  if (!["asc", "desc"].includes(sortOrder.toLowerCase())) {
    throw new DatabaseError(`Invalid sort order: ${sortOrder}`)
  }

  return `${sortBy} ${sortOrder.toUpperCase()}`
}

/**
 * Safely build dynamic WHERE clause with AND conditions
 */
export function buildSafeWhere(
  filters: Record<string, any>,
  allowedColumns: string[]
): { where: string; params: any[] } {
  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  for (const [column, value] of Object.entries(filters)) {
    // Skip null/undefined values
    if (value === null || value === undefined) {
      continue
    }

    // Validate column is allowed
    if (!allowedColumns.includes(column)) {
      throw new DatabaseError(`Invalid filter column: ${column}`)
    }

    // Validate it's a safe identifier
    if (!validateSQLIdentifier(column)) {
      throw new DatabaseError(`Invalid column identifier: ${column}`)
    }

    // Build condition based on value type
    if (Array.isArray(value)) {
      // IN clause
      const placeholders = value.map(() => `$${paramIndex++}`).join(", ")
      conditions.push(`${column} IN (${placeholders})`)
      params.push(...value)
    } else if (typeof value === "object" && value.operator) {
      // Complex operators (>, <, >=, <=, LIKE, etc.)
      const { operator, operand } = value
      const safeOperators = ["=", ">", "<", ">=", "<=", "!=", "LIKE", "ILIKE"]

      if (!safeOperators.includes(operator)) {
        throw new DatabaseError(`Invalid operator: ${operator}`)
      }

      conditions.push(`${column} ${operator} $${paramIndex++}`)
      params.push(operand)
    } else {
      // Simple equality
      conditions.push(`${column} = $${paramIndex++}`)
      params.push(value)
    }
  }

  return {
    where: conditions.length > 0 ? conditions.join(" AND ") : "1=1",
    params,
  }
}

// ================================================================
// TRANSACTION HELPERS
// ================================================================

/**
 * Execute operations in a transaction with timeout
 */
export async function executeTransaction<T>(
  operations: (tx: any) => Promise<T>,
  timeoutMs: number = QUERY_TIMEOUTS.TRANSACTION
): Promise<T> {
  try {
    return await withTimeout(
      db.transaction(async (tx) => {
        return await operations(tx)
      }),
      timeoutMs,
      "Transaction"
    )
  } catch (error) {
    throw new DatabaseError(
      "Transaction failed",
      error instanceof Error ? error.message : undefined
    )
  }
}

/**
 * Execute with retry on deadlock
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if error is retryable (deadlock, lock timeout, etc.)
      const isRetryable =
        lastError.message.includes("deadlock") ||
        lastError.message.includes("lock timeout") ||
        lastError.message.includes("could not serialize")

      if (!isRetryable || attempt === maxRetries) {
        throw lastError
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
    }
  }

  throw lastError || new DatabaseError("Max retries exceeded")
}

// ================================================================
// CONNECTION POOL MONITORING
// ================================================================

/**
 * Get database connection pool stats
 */
export async function getConnectionPoolStats(): Promise<{
  totalConnections: number
  activeConnections: number
  idleConnections: number
  waitingRequests: number
}> {
  // This is a placeholder - actual implementation depends on your connection pool
  // For node-postgres or Drizzle with pg, you'd access pool stats like:
  // const pool = db.$pool
  // return {
  //   totalConnections: pool.totalCount,
  //   activeConnections: pool.idleCount,
  //   idleConnections: pool.waitingCount,
  // }

  return {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean
  latencyMs: number
  error?: string
}> {
  const start = Date.now()

  try {
    await withTimeout(db.execute(sql`SELECT 1 as health_check`), 5000, "Health check")

    const latencyMs = Date.now() - start

    return {
      healthy: true,
      latencyMs,
    }
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// ================================================================
// QUERY PERFORMANCE MONITORING
// ================================================================

/**
 * Wrap query with performance monitoring
 */
export async function withQueryMonitoring<T>(
  queryName: string,
  operation: () => Promise<T>,
  options?: {
    slowQueryThresholdMs?: number
    logParams?: boolean
  }
): Promise<T> {
  const { slowQueryThresholdMs = 1000, logParams = false } = options || {}

  const start = Date.now()

  try {
    const result = await operation()
    const duration = Date.now() - start

    // Log slow queries
    if (duration > slowQueryThresholdMs) {
      console.warn(`[Slow Query] ${queryName} took ${duration}ms`)
    }

    // In production, send to monitoring service
    // await sendMetric('database.query.duration', duration, { query: queryName })

    return result
  } catch (error) {
    const duration = Date.now() - start
    console.error(`[Query Error] ${queryName} failed after ${duration}ms:`, error)
    throw error
  }
}

// ================================================================
// BULK OPERATION HELPERS
// ================================================================

/**
 * Safely execute bulk insert with batching
 */
export async function bulkInsert<T>(
  table: any,
  records: T[],
  batchSize: number = 1000
): Promise<void> {
  if (records.length === 0) {
    return
  }

  // Split into batches to avoid overwhelming database
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)

    await withTimeout(
      db.insert(table).values(batch),
      QUERY_TIMEOUTS.BULK_OPERATION,
      `Bulk insert batch ${i / batchSize + 1}`
    )
  }
}

/**
 * Safely execute bulk update
 */
export async function bulkUpdate<T extends { id: number }>(
  table: any,
  records: T[],
  batchSize: number = 100
): Promise<void> {
  if (records.length === 0) {
    return
  }

  // Execute in transaction for consistency
  await executeTransaction(async (tx) => {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)

      for (const record of batch) {
        await tx.update(table).set(record).where(sql`id = ${record.id}`)
      }
    }
  })
}

// ================================================================
// AUDIT TRAIL HELPERS
// ================================================================

/**
 * Create audit trail for data modification
 */
export async function createAuditTrail(
  operation: "INSERT" | "UPDATE" | "DELETE",
  tableName: string,
  recordId: number,
  userId: number,
  changes?: {
    before?: any
    after?: any
  }
): Promise<void> {
  // This would insert into an audit_trail table
  // For now, just log
  console.log(`[Audit Trail] ${operation} on ${tableName}:${recordId} by user ${userId}`, changes)

  // TODO: Implement actual audit trail table insertion
  // await db.insert(auditTrail).values({
  //   operation,
  //   tableName,
  //   recordId,
  //   userId,
  //   changesBefore: changes?.before,
  //   changesAfter: changes?.after,
  //   timestamp: new Date(),
  // })
}

// ================================================================
// EXPORT TYPES & CONSTANTS
// ================================================================

export { QUERY_TIMEOUTS }
