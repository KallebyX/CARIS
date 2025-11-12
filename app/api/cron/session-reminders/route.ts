import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { sessionReminderCronJobs } from "@/lib/cron"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * API Endpoint: /api/cron/session-reminders
 * Manage and monitor session reminder cron jobs
 * Admin only
 */

/**
 * GET - Get cron job status
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify admin access
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const status = sessionReminderCronJobs.getStatus()

    return NextResponse.json({
      success: true,
      data: {
        jobs: status,
        environment: process.env.NODE_ENV,
        cronEnabled: process.env.ENABLE_CRON === "true",
      },
    })
  } catch (error) {
    console.error("Error fetching cron status:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch cron status" },
      { status: 500 }
    )
  }
}

/**
 * POST - Manually trigger cron jobs or manage them
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify admin access
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user || (user.role !== "admin" && !user.isGlobalAdmin)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, jobType } = body

    switch (action) {
      case "run_manual": {
        if (!jobType || !["24h", "1h", "15min"].includes(jobType)) {
          return NextResponse.json(
            { success: false, error: "Invalid jobType. Must be '24h', '1h', or '15min'" },
            { status: 400 }
          )
        }

        const stats = await sessionReminderCronJobs.runJobManually(
          jobType as "24h" | "1h" | "15min"
        )

        return NextResponse.json({
          success: true,
          message: `Manually ran ${jobType} reminder job`,
          data: stats,
        })
      }

      case "start": {
        sessionReminderCronJobs.start()
        return NextResponse.json({
          success: true,
          message: "Cron jobs started",
        })
      }

      case "stop": {
        sessionReminderCronJobs.stop()
        return NextResponse.json({
          success: true,
          message: "Cron jobs stopped",
        })
      }

      case "restart": {
        sessionReminderCronJobs.stop()
        sessionReminderCronJobs.initializeJobs()
        sessionReminderCronJobs.start()
        return NextResponse.json({
          success: true,
          message: "Cron jobs restarted",
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error managing cron jobs:", error)
    return NextResponse.json(
      { success: false, error: "Failed to manage cron jobs" },
      { status: 500 }
    )
  }
}
