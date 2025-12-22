import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { RecurringSessionService } from "@/lib/recurring-sessions"
import { db } from "@/db"
import { users, sessions } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * API Endpoint: /api/sessions/recurring
 * Handles recurring session creation and management
 */

/**
 * POST - Create a recurring session series or manage existing series
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

    const body = await request.json()
    const { action } = body

    // Get user to verify permissions
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    const recurringService = RecurringSessionService.getInstance()

    switch (action) {
      case "create_series": {
        // Only psychologists can create recurring sessions
        if (user.role !== "psychologist" && user.role !== "admin" && user.role !== "clinic_admin") {
          return NextResponse.json(
            { success: false, error: "Only psychologists can create recurring sessions" },
            { status: 403 }
          )
        }

        const {
          psychologistId,
          patientId,
          clinicId,
          startDate,
          duration,
          type,
          timezone,
          pattern,
          occurrences,
          endDate,
          skipDates,
          notes,
          sessionValue,
        } = body

        // Validate required fields
        if (
          !psychologistId ||
          !patientId ||
          !clinicId ||
          !startDate ||
          !duration ||
          !type ||
          !timezone ||
          !pattern
        ) {
          return NextResponse.json(
            {
              success: false,
              error: "Missing required fields for recurring series creation",
            },
            { status: 400 }
          )
        }

        // Verify user is the psychologist
        if (userId !== psychologistId && user.role !== "admin") {
          return NextResponse.json(
            { success: false, error: "You can only create sessions for yourself" },
            { status: 403 }
          )
        }

        // Validate configuration
        const validation = recurringService.validateRecurringConfig({
          psychologistId,
          patientId,
          clinicId,
          startDate: new Date(startDate),
          duration,
          type,
          timezone,
          pattern,
          occurrences,
          endDate: endDate ? new Date(endDate) : undefined,
          skipDates: skipDates?.map((d: string) => new Date(d)),
          notes,
          sessionValue,
        })

        if (!validation.valid) {
          return NextResponse.json(
            {
              success: false,
              error: "Invalid recurring configuration",
              errors: validation.errors,
            },
            { status: 400 }
          )
        }

        // Create the recurring series
        const series = await recurringService.createRecurringSeries({
          psychologistId,
          patientId,
          clinicId,
          startDate: new Date(startDate),
          duration,
          type,
          timezone,
          pattern,
          occurrences,
          endDate: endDate ? new Date(endDate) : undefined,
          skipDates: skipDates?.map((d: string) => new Date(d)),
          notes,
          sessionValue,
        })

        return NextResponse.json({
          success: true,
          message: `Recurring series created successfully: ${series.metadata.createdSessions} sessions created`,
          data: series,
        })
      }

      case "update_single": {
        // Update a single session in a series
        const { sessionId, scheduledAt, duration, notes, status } = body

        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: "Missing sessionId" },
            { status: 400 }
          )
        }

        // Verify user has permission to update this session
        const [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, sessionId))
          .limit(1)

        if (!session) {
          return NextResponse.json(
            { success: false, error: "Session not found" },
            { status: 404 }
          )
        }

        if (
          userId !== session.psychologistId &&
          userId !== session.patientId &&
          user.role !== "admin"
        ) {
          return NextResponse.json(
            { success: false, error: "Forbidden" },
            { status: 403 }
          )
        }

        const success = await recurringService.updateSingleSession(sessionId, {
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          duration,
          notes,
          status,
        })

        return NextResponse.json({
          success,
          message: success ? "Session updated successfully" : "Failed to update session",
        })
      }

      case "update_future": {
        // Update all future sessions in a series
        const { sessionId, scheduledAt, duration, notes, status } = body

        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: "Missing sessionId" },
            { status: 400 }
          )
        }

        // Verify permissions
        const [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, sessionId))
          .limit(1)

        if (!session) {
          return NextResponse.json(
            { success: false, error: "Session not found" },
            { status: 404 }
          )
        }

        if (userId !== session.psychologistId && user.role !== "admin") {
          return NextResponse.json(
            { success: false, error: "Only the psychologist can update future sessions" },
            { status: 403 }
          )
        }

        const result = await recurringService.updateFutureSessions(sessionId, {
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          duration,
          notes,
          status,
        })

        return NextResponse.json({
          success: true,
          message: `Updated ${result.updated} future sessions`,
          data: result,
        })
      }

      case "update_all": {
        // Update all sessions in a series
        const { sessionId, duration, notes, status } = body

        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: "Missing sessionId" },
            { status: 400 }
          )
        }

        // Verify permissions
        const [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, sessionId))
          .limit(1)

        if (!session) {
          return NextResponse.json(
            { success: false, error: "Session not found" },
            { status: 404 }
          )
        }

        if (userId !== session.psychologistId && user.role !== "admin") {
          return NextResponse.json(
            { success: false, error: "Only the psychologist can update all sessions" },
            { status: 403 }
          )
        }

        const result = await recurringService.updateAllSessions(sessionId, {
          duration,
          notes,
          status,
        })

        return NextResponse.json({
          success: true,
          message: `Updated ${result.updated} sessions in the series`,
          data: result,
        })
      }

      case "delete_series": {
        // Delete recurring series
        const { sessionId, deleteType } = body

        if (!sessionId || !deleteType) {
          return NextResponse.json(
            { success: false, error: "Missing sessionId or deleteType" },
            { status: 400 }
          )
        }

        if (!["single", "future", "all"].includes(deleteType)) {
          return NextResponse.json(
            { success: false, error: "Invalid deleteType. Must be 'single', 'future', or 'all'" },
            { status: 400 }
          )
        }

        // Verify permissions
        const [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, sessionId))
          .limit(1)

        if (!session) {
          return NextResponse.json(
            { success: false, error: "Session not found" },
            { status: 404 }
          )
        }

        if (userId !== session.psychologistId && user.role !== "admin") {
          return NextResponse.json(
            { success: false, error: "Only the psychologist can delete sessions" },
            { status: 403 }
          )
        }

        const result = await recurringService.deleteRecurringSeries(
          sessionId,
          deleteType
        )

        return NextResponse.json({
          success: true,
          message: `Cancelled ${result.deleted} session(s)`,
          data: result,
        })
      }

      case "skip_occurrence": {
        // Skip a specific occurrence
        const { sessionId } = body

        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: "Missing sessionId" },
            { status: 400 }
          )
        }

        // Verify permissions
        const [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, sessionId))
          .limit(1)

        if (!session) {
          return NextResponse.json(
            { success: false, error: "Session not found" },
            { status: 404 }
          )
        }

        if (
          userId !== session.psychologistId &&
          userId !== session.patientId &&
          user.role !== "admin"
        ) {
          return NextResponse.json(
            { success: false, error: "Forbidden" },
            { status: 403 }
          )
        }

        const success = await recurringService.skipSessionOccurrence(sessionId)

        return NextResponse.json({
          success,
          message: success
            ? "Session occurrence skipped successfully"
            : "Failed to skip occurrence",
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error managing recurring sessions:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to manage recurring sessions",
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Get recurring series information
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

    const { searchParams } = new URL(request.url)
    const seriesId = searchParams.get("seriesId")
    const sessionId = searchParams.get("sessionId")

    if (!seriesId && !sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing seriesId or sessionId parameter" },
        { status: 400 }
      )
    }

    const recurringService = RecurringSessionService.getInstance()

    if (sessionId) {
      // Get series information from a session ID
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, parseInt(sessionId)))
        .limit(1)

      if (!session || !session.recurringSeriesId) {
        return NextResponse.json(
          { success: false, error: "Session not found or not part of a series" },
          { status: 404 }
        )
      }

      const extractedSeriesId = session.recurringSeriesId
      const seriesSessions = await recurringService.getSeriesSessions(extractedSeriesId)
      const stats = await recurringService.getSeriesStatistics(extractedSeriesId)

      return NextResponse.json({
        success: true,
        data: {
          seriesId: extractedSeriesId,
          sessions: seriesSessions,
          statistics: stats,
        },
      })
    } else if (seriesId) {
      // Get series information directly
      const seriesSessions = await recurringService.getSeriesSessions(seriesId)
      const stats = await recurringService.getSeriesStatistics(seriesId)

      return NextResponse.json({
        success: true,
        data: {
          seriesId,
          sessions: seriesSessions,
          statistics: stats,
        },
      })
    }

    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error fetching recurring series:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch recurring series information" },
      { status: 500 }
    )
  }
}
