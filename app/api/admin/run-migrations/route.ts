import { NextRequest, NextResponse } from 'next/server'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from '@/db/schema'

/**
 * Database Migration API
 *
 * Runs pending Drizzle migrations on the database.
 * Protected by ADMIN_SECRET.
 *
 * IMPORTANT: Use the DIRECT_URL (unpooled connection) for migrations,
 * not the pooled connection. Neon requires this for DDL operations.
 *
 * Usage:
 * curl -X POST https://your-app.vercel.app/api/admin/run-migrations \
 *   -H "Authorization: Bearer YOUR_ADMIN_SECRET"
 */

export async function POST(request: NextRequest) {
  // Protect this endpoint with a secret
  const authHeader = request.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET || process.env.JWT_SECRET

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Use DIRECT_URL for migrations (unpooled connection)
  const connectionString = process.env.DIRECT_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL

  if (!connectionString) {
    return NextResponse.json({
      success: false,
      error: 'No database connection string found',
      message: 'Please set DIRECT_URL, DATABASE_URL_UNPOOLED, or POSTGRES_URL environment variable',
    }, { status: 500 })
  }

  // Check if this is a pooled connection (not recommended for migrations)
  const isPooled = connectionString.includes('-pooler')
  if (isPooled) {
    console.warn('[Migrations] Warning: Using pooled connection for migrations. This may cause issues with Neon.')
  }

  let migrationClient: ReturnType<typeof postgres> | null = null

  try {
    // Create a dedicated connection for migrations
    migrationClient = postgres(connectionString, {
      max: 1,
      ssl: 'require',
      connect_timeout: 30,
    })

    const migrationDb = drizzle(migrationClient, { schema })

    console.log('[Migrations] Starting database migrations...')

    // Run migrations
    await migrate(migrationDb, { migrationsFolder: './drizzle' })

    console.log('[Migrations] Migrations completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Migrations completed successfully',
      warning: isPooled
        ? 'Used pooled connection. For best results, set DIRECT_URL to use unpooled connection.'
        : undefined,
    })
  } catch (error) {
    console.error('[Migrations] Migration failed:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Check for common errors
    let troubleshooting = ''
    if (errorMessage.includes('already exists')) {
      troubleshooting = 'Some tables already exist. This is usually safe to ignore.'
    } else if (errorMessage.includes('connection refused')) {
      troubleshooting = 'Could not connect to database. Check your connection string.'
    } else if (errorMessage.includes('authentication')) {
      troubleshooting = 'Authentication failed. Check your database credentials.'
    } else if (errorMessage.includes('SSL')) {
      troubleshooting = 'SSL connection issue. Ensure sslmode=require is in your connection string.'
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      troubleshooting: troubleshooting || 'Check the server logs for more details.',
      usedPooledConnection: isPooled,
    }, { status: 500 })
  } finally {
    // Close the migration connection
    if (migrationClient) {
      try {
        await migrationClient.end()
      } catch {
        // Ignore close errors
      }
    }
  }
}
