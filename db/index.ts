import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

// Log warning if POSTGRES_URL is not set but don't crash
// This allows the app to start and show proper error messages
// rather than failing silently with 500 errors
if (!process.env.POSTGRES_URL) {
  console.error('⚠️ WARNING: POSTGRES_URL environment variable is not set. Database operations will fail.')
}

/**
 * PERFORMANCE: Database connection pool configuration
 * Optimized for production with proper connection management
 */
const connectionConfig: postgres.Options<{}> = {
  // Connection pool settings
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum connections in pool
  idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30'), // Close idle connections after 30s
  max_lifetime: parseInt(process.env.DB_MAX_LIFETIME || '3600'), // Close connections after 1 hour
  connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10'), // Connection timeout in seconds

  // Performance settings
  prepare: true, // Use prepared statements for better performance
  fetch_array_type: 'array', // More efficient array type

  // Error handling and logging
  onnotice: process.env.NODE_ENV === 'development'
    ? (notice) => console.info('[DB_NOTICE]', notice)
    : undefined,
  debug: process.env.DB_DEBUG === 'true'
    ? (connection, query, params) => {
        console.info('[DB_QUERY]', query)
        console.info('[DB_PARAMS]', params)
      }
    : undefined,

  // SSL configuration for production
  // Note: For Neon PostgreSQL, use 'require' mode which validates SSL
  // but doesn't require full certificate verification (more compatible)
  ssl: process.env.NODE_ENV === 'production'
    ? 'require'
    : undefined,

  // Transform column names to camelCase (optional, keep for consistency)
  transform: {
    undefined: null, // Convert undefined to null
  },
}

// Create connection pool
// Use a placeholder URL if POSTGRES_URL is not set to prevent immediate crash
// Database operations will fail gracefully with proper error messages
const sql = postgres(process.env.POSTGRES_URL || 'postgres://placeholder:placeholder@localhost:5432/placeholder', connectionConfig)

// Create Drizzle instance with schema
export const db = drizzle(sql, { schema })

/**
 * Graceful shutdown handler
 * Call this before application shutdown to close all connections
 */
export async function closeDatabase() {
  try {
    await sql.end({ timeout: 5 }) // Wait up to 5 seconds for connections to close
    console.info('[DB] Database connections closed')
  } catch (error) {
    console.error('[DB] Error closing database connections:', error)
  }
}

/**
 * Health check - test database connectivity
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean
  latency?: number
  error?: string
}> {
  try {
    const start = Date.now()
    await sql`SELECT 1`
    const latency = Date.now() - start

    return {
      healthy: true,
      latency,
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
