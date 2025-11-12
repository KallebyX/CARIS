import { NextResponse } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schema"
import { logger } from "@/lib/logger"
import { captureError } from "@/lib/error-tracking"

// ================================================================
// TYPES
// ================================================================

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  uptime: number
  version: string
  environment: string
  responseTime: number
  services: {
    database: ServiceStatus
    application: ServiceStatus
    pusher?: ServiceStatus
    redis?: ServiceStatus
  }
  system: {
    memory: MemoryInfo
    cpu: NodeJS.CpuUsage
    pid: number
    platform: string
    nodeVersion: string
  }
  checks: HealthCheck[]
  error?: string
}

interface ServiceStatus {
  status: "healthy" | "degraded" | "unhealthy"
  responseTime?: number
  lastCheck?: string
  error?: string
}

interface MemoryInfo {
  used: number
  total: number
  external: number
  percentage: number
}

interface HealthCheck {
  name: string
  status: "pass" | "warn" | "fail"
  duration: number
  message?: string
  error?: string
}

// ================================================================
// HEALTH CHECK FUNCTIONS
// ================================================================

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now()

  try {
    await db.select().from(users).limit(1)

    const duration = Date.now() - startTime

    // Warn if database query is slow
    if (duration > 100) {
      return {
        name: "database",
        status: "warn",
        duration,
        message: "Database response is slow",
      }
    }

    return {
      name: "database",
      status: "pass",
      duration,
    }
  } catch (error) {
    const duration = Date.now() - startTime

    logger.error("Database health check failed", error as Error)

    return {
      name: "database",
      status: "fail",
      duration,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Check Pusher connectivity (optional)
 */
async function checkPusher(): Promise<HealthCheck> {
  const startTime = Date.now()

  try {
    // Check if Pusher credentials are configured
    if (!process.env.PUSHER_APP_ID || !process.env.NEXT_PUBLIC_PUSHER_KEY) {
      return {
        name: "pusher",
        status: "warn",
        duration: Date.now() - startTime,
        message: "Pusher not configured",
      }
    }

    // Basic connectivity check (you can enhance this with actual Pusher ping)
    return {
      name: "pusher",
      status: "pass",
      duration: Date.now() - startTime,
    }
  } catch (error) {
    const duration = Date.now() - startTime

    return {
      name: "pusher",
      status: "warn",
      duration,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Check system memory
 */
function checkMemory(): HealthCheck {
  const startTime = Date.now()

  try {
    const memUsage = process.memoryUsage()
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024
    const percentage = (heapUsedMB / heapTotalMB) * 100

    // Warn if memory usage is high
    if (percentage > 90) {
      return {
        name: "memory",
        status: "fail",
        duration: Date.now() - startTime,
        message: `High memory usage: ${percentage.toFixed(2)}%`,
      }
    }

    if (percentage > 75) {
      return {
        name: "memory",
        status: "warn",
        duration: Date.now() - startTime,
        message: `Elevated memory usage: ${percentage.toFixed(2)}%`,
      }
    }

    return {
      name: "memory",
      status: "pass",
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      name: "memory",
      status: "fail",
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Check application uptime
 */
function checkUptime(): HealthCheck {
  const startTime = Date.now()

  try {
    const uptime = process.uptime()

    // Just started (may be unstable)
    if (uptime < 60) {
      return {
        name: "uptime",
        status: "warn",
        duration: Date.now() - startTime,
        message: "Application recently started",
      }
    }

    return {
      name: "uptime",
      status: "pass",
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      name: "uptime",
      status: "fail",
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// ================================================================
// MAIN HEALTH CHECK HANDLER
// ================================================================

export async function GET() {
  const startTime = Date.now()

  try {
    // Run all health checks in parallel
    const [databaseCheck, pusherCheck, memoryCheck, uptimeCheck] =
      await Promise.all([
        checkDatabase(),
        checkPusher(),
        checkMemory(),
        checkUptime(),
      ])

    const checks = [databaseCheck, pusherCheck, memoryCheck, uptimeCheck]

    // Determine overall health status
    const hasFailed = checks.some((check) => check.status === "fail")
    const hasWarning = checks.some((check) => check.status === "warn")

    const overallStatus: "healthy" | "degraded" | "unhealthy" = hasFailed
      ? "unhealthy"
      : hasWarning
      ? "degraded"
      : "healthy"

    // Build health status
    const memUsage = process.memoryUsage()
    const health: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      responseTime: Date.now() - startTime,
      services: {
        database: {
          status: databaseCheck.status === "pass" ? "healthy" : "unhealthy",
          responseTime: databaseCheck.duration,
          lastCheck: new Date().toISOString(),
          error: databaseCheck.error,
        },
        application: {
          status: overallStatus,
        },
        pusher: {
          status:
            pusherCheck.status === "pass"
              ? "healthy"
              : pusherCheck.status === "warn"
              ? "degraded"
              : "unhealthy",
          responseTime: pusherCheck.duration,
        },
      },
      system: {
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
          percentage: Math.round(
            (memUsage.heapUsed / memUsage.heapTotal) * 100
          ),
        },
        cpu: process.cpuUsage(),
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version,
      },
      checks,
    }

    // Log health check
    if (overallStatus === "unhealthy") {
      logger.error("Health check failed", undefined, { health })
    } else if (overallStatus === "degraded") {
      logger.warn("Health check degraded", { health })
    } else {
      logger.debug("Health check passed", { health })
    }

    // Return appropriate status code
    const statusCode =
      overallStatus === "unhealthy" ? 503 : overallStatus === "degraded" ? 200 : 200

    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    logger.error("Health check exception", error as Error)
    captureError(error as Error, {
      level: "error",
      tags: {
        endpoint: "/api/health",
      },
    })

    const health: HealthStatus = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      responseTime: Date.now() - startTime,
      services: {
        database: {
          status: "unhealthy",
        },
        application: {
          status: "unhealthy",
        },
      },
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          percentage: Math.round(
            (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) *
              100
          ),
        },
        cpu: process.cpuUsage(),
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version,
      },
      checks: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }

    return NextResponse.json(health, { status: 503 })
  }
}

/**
 * HEAD request for lightweight connectivity checks (used by PWA)
 * Returns minimal response without database check for faster ping
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}