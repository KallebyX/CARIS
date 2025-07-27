import { NextResponse } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schema"

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Test database connection
    await db.select().from(users).limit(1)
    
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      responseTime: Date.now() - startTime,
      services: {
        database: "healthy",
        application: "healthy"
      },
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        cpu: process.cpuUsage(),
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version
      }
    }

    return NextResponse.json(health, { status: 200 })
  } catch (error) {
    console.error("Health check failed:", error)
    
    const health = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      responseTime: Date.now() - startTime,
      services: {
        database: "unhealthy",
        application: "degraded"
      },
      error: error instanceof Error ? error.message : "Unknown error"
    }

    return NextResponse.json(health, { status: 503 })
  }
} 