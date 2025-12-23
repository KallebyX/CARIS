import { NextRequest, NextResponse } from 'next/server'
import { db, checkDatabaseHealth } from '@/db'
import { sql } from 'drizzle-orm'

/**
 * Database Status API
 *
 * Provides information about database connectivity and table existence.
 * Protected by ADMIN_SECRET for production use.
 */

// List of core tables that must exist for the app to work
const CORE_TABLES = [
  'users',
  'patient_profiles',
  'psychologist_profiles',
  'sessions',
  'diary_entries',
  'audit_logs',
  'user_settings',
  'user_consents',
  'user_privacy_settings',
]

export async function GET(request: NextRequest) {
  // Protect this endpoint with a secret
  const authHeader = request.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET || process.env.JWT_SECRET

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // Check basic connectivity
    const healthCheck = await checkDatabaseHealth()

    if (!healthCheck.healthy) {
      return NextResponse.json({
        status: 'unhealthy',
        error: healthCheck.error,
        message: 'Database connection failed. Check POSTGRES_URL environment variable.',
        env: {
          POSTGRES_URL: process.env.POSTGRES_URL ? 'set' : 'not set',
          NODE_ENV: process.env.NODE_ENV,
        }
      }, { status: 500 })
    }

    // Check which tables exist
    const tableCheckResults: Record<string, boolean> = {}
    const missingTables: string[] = []

    for (const tableName of CORE_TABLES) {
      try {
        // Check if table exists by querying information_schema
        const result = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = ${tableName}
          ) as exists
        `)

        const exists = (result as any)[0]?.exists === true
        tableCheckResults[tableName] = exists

        if (!exists) {
          missingTables.push(tableName)
        }
      } catch (error) {
        tableCheckResults[tableName] = false
        missingTables.push(tableName)
      }
    }

    const allTablesExist = missingTables.length === 0

    return NextResponse.json({
      status: allTablesExist ? 'healthy' : 'needs_migration',
      latency: healthCheck.latency,
      tables: tableCheckResults,
      missingTables,
      message: allTablesExist
        ? 'All core tables exist'
        : `Missing ${missingTables.length} core tables. Run migrations: npx drizzle-kit migrate`,
      instructions: missingTables.length > 0 ? {
        local: 'Run: DIRECT_URL="your-neon-unpooled-url" npx drizzle-kit migrate',
        note: 'Use the unpooled Neon URL (without -pooler) for migrations',
        vercel: 'Set DIRECT_URL in environment variables and redeploy, or run migrations locally'
      } : undefined,
      env: {
        POSTGRES_URL: process.env.POSTGRES_URL ? 'set' : 'not set',
        DIRECT_URL: process.env.DIRECT_URL ? 'set' : 'not set',
        NODE_ENV: process.env.NODE_ENV,
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? 'set' : 'not set',
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to check database status',
      env: {
        POSTGRES_URL: process.env.POSTGRES_URL ? 'set' : 'not set',
        NODE_ENV: process.env.NODE_ENV,
      }
    }, { status: 500 })
  }
}
