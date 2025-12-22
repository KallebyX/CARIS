import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { SessionConflictService } from "@/lib/session-conflicts"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * API Endpoint: /api/sessions/check-conflicts
 * Handles session conflict detection and availability checking
 */

/**
 * POST - Check for session conflicts
 * Body: {
 *   psychologistId: number,
 *   patientId?: number,
 *   scheduledAt: string (ISO date),
 *   duration: number,
 *   timezone: string,
 *   excludeSessionId?: number
 * }
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
    const {
      psychologistId,
      patientId,
      scheduledAt,
      duration,
      timezone,
      excludeSessionId,
      action,
    } = body

    // Validate user has permission (must be psychologist or patient involved)
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

    // Verify user is either the psychologist or patient
    if (
      user.role !== "admin" &&
      user.role !== "clinic_admin" &&
      userId !== psychologistId &&
      userId !== patientId
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You don't have access to this resource" },
        { status: 403 }
      )
    }

    const conflictService = SessionConflictService.getInstance()

    // Handle different actions
    switch (action) {
      case "check_conflicts":
      case undefined: {
        // Default action: check for conflicts
        if (!psychologistId || !scheduledAt || !duration || !timezone) {
          return NextResponse.json(
            {
              success: false,
              error: "Missing required fields: psychologistId, scheduledAt, duration, timezone",
            },
            { status: 400 }
          )
        }

        const result = await conflictService.checkConflicts({
          psychologistId,
          patientId,
          scheduledAt: new Date(scheduledAt),
          duration,
          timezone,
          excludeSessionId,
        })

        return NextResponse.json({
          success: true,
          data: result,
        })
      }

      case "validate_scheduling": {
        // Comprehensive validation
        if (!psychologistId || !scheduledAt || !duration || !timezone) {
          return NextResponse.json(
            {
              success: false,
              error: "Missing required fields: psychologistId, scheduledAt, duration, timezone",
            },
            { status: 400 }
          )
        }

        const validation = await conflictService.validateSessionScheduling({
          psychologistId,
          patientId,
          scheduledAt: new Date(scheduledAt),
          duration,
          timezone,
          excludeSessionId,
        })

        return NextResponse.json({
          success: true,
          data: validation,
        })
      }

      case "get_availability": {
        // Get psychologist availability for a specific date
        if (!psychologistId || !scheduledAt) {
          return NextResponse.json(
            { success: false, error: "Missing required fields: psychologistId, scheduledAt" },
            { status: 400 }
          )
        }

        const availability = await conflictService.getPsychologistAvailability(
          psychologistId,
          new Date(scheduledAt),
          timezone || "America/Sao_Paulo"
        )

        return NextResponse.json({
          success: true,
          data: {
            date: scheduledAt,
            timezone: timezone || "America/Sao_Paulo",
            slots: availability,
          },
        })
      }

      case "suggest_alternatives": {
        // Suggest alternative time slots
        if (!psychologistId || !scheduledAt || !duration || !timezone) {
          return NextResponse.json(
            {
              success: false,
              error: "Missing required fields: psychologistId, scheduledAt, duration, timezone",
            },
            { status: 400 }
          )
        }

        const suggestions = await conflictService.suggestAlternativeSlots(
          {
            psychologistId,
            patientId,
            scheduledAt: new Date(scheduledAt),
            duration,
            timezone,
            excludeSessionId,
          },
          body.numSuggestions || 5
        )

        return NextResponse.json({
          success: true,
          data: {
            originalTime: scheduledAt,
            suggestions,
          },
        })
      }

      case "check_timezone_conflict": {
        // Check timezone compatibility
        if (!psychologistId || !patientId || !scheduledAt) {
          return NextResponse.json(
            {
              success: false,
              error: "Missing required fields: psychologistId, patientId, scheduledAt",
            },
            { status: 400 }
          )
        }

        const timezoneCheck = await conflictService.checkTimezoneConflict(
          psychologistId,
          patientId,
          new Date(scheduledAt)
        )

        return NextResponse.json({
          success: true,
          data: timezoneCheck,
        })
      }

      case "get_session_load": {
        // Get psychologist's session load for a date range
        if (!psychologistId || !body.startDate || !body.endDate) {
          return NextResponse.json(
            {
              success: false,
              error: "Missing required fields: psychologistId, startDate, endDate",
            },
            { status: 400 }
          )
        }

        const load = await conflictService.getSessionLoad(
          psychologistId,
          new Date(body.startDate),
          new Date(body.endDate)
        )

        return NextResponse.json({
          success: true,
          data: load,
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error checking session conflicts:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check conflicts",
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Get psychologist availability
 * Query params: psychologistId, date, timezone
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
    const psychologistId = searchParams.get("psychologistId")
    const date = searchParams.get("date")
    const timezone = searchParams.get("timezone") || "America/Sao_Paulo"

    if (!psychologistId || !date) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: psychologistId, date" },
        { status: 400 }
      )
    }

    const conflictService = SessionConflictService.getInstance()
    const availability = await conflictService.getPsychologistAvailability(
      parseInt(psychologistId),
      new Date(date),
      timezone
    )

    return NextResponse.json({
      success: true,
      data: {
        psychologistId: parseInt(psychologistId),
        date,
        timezone,
        slots: availability,
      },
    })
  } catch (error) {
    console.error("Error fetching availability:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch availability" },
      { status: 500 }
    )
  }
}
