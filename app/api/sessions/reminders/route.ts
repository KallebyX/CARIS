import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { SessionReminderService } from "@/lib/session-reminders"
import { db } from "@/db"
import { users, userSettings } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * API Endpoint: /api/sessions/reminders
 * Handles session reminder configuration and manual sending
 */

/**
 * GET - Get reminder preferences for the current user
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

    // Get user settings
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1)

    if (!settings) {
      // Return default settings
      return NextResponse.json({
        success: true,
        data: {
          emailRemindersEnabled: true,
          smsRemindersEnabled: false,
          reminderBefore24h: true,
          reminderBefore1h: true,
          reminderBefore15min: false,
          timezone: "America/Sao_Paulo",
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        emailRemindersEnabled: settings.emailRemindersEnabled,
        smsRemindersEnabled: settings.smsRemindersEnabled,
        reminderBefore24h: settings.reminderBefore24h,
        reminderBefore1h: settings.reminderBefore1h,
        reminderBefore15min: settings.reminderBefore15min,
        timezone: settings.timezone,
      },
    })
  } catch (error) {
    console.error("Error fetching reminder preferences:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch reminder preferences" },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update reminder preferences
 */
export async function PUT(request: NextRequest) {
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
      emailRemindersEnabled,
      smsRemindersEnabled,
      reminderBefore24h,
      reminderBefore1h,
      reminderBefore15min,
      timezone,
    } = body

    // Validate input
    if (
      typeof emailRemindersEnabled !== "boolean" ||
      typeof smsRemindersEnabled !== "boolean" ||
      typeof reminderBefore24h !== "boolean" ||
      typeof reminderBefore1h !== "boolean" ||
      typeof reminderBefore15min !== "boolean"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid reminder preferences format" },
        { status: 400 }
      )
    }

    // Check if settings exist
    const [existingSettings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1)

    if (existingSettings) {
      // Update existing settings
      await db
        .update(userSettings)
        .set({
          emailRemindersEnabled,
          smsRemindersEnabled,
          reminderBefore24h,
          reminderBefore1h,
          reminderBefore15min,
          timezone: timezone || existingSettings.timezone,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId))
    } else {
      // Create new settings
      await db.insert(userSettings).values({
        userId,
        emailRemindersEnabled,
        smsRemindersEnabled,
        reminderBefore24h,
        reminderBefore1h,
        reminderBefore15min,
        timezone: timezone || "America/Sao_Paulo",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Reminder preferences updated successfully",
    })
  } catch (error) {
    console.error("Error updating reminder preferences:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update reminder preferences" },
      { status: 500 }
    )
  }
}

/**
 * POST - Manually send a reminder for a specific session
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
    const { sessionId, action } = body

    if (!sessionId || typeof sessionId !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid session ID" },
        { status: 400 }
      )
    }

    // Verify user has access to this session (either as patient or psychologist)
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

    // Handle different actions
    switch (action) {
      case "send_manual_reminder": {
        const reminderService = SessionReminderService.getInstance()
        const success = await reminderService.sendManualReminder(sessionId)

        if (success) {
          return NextResponse.json({
            success: true,
            message: "Reminder sent successfully",
          })
        } else {
          return NextResponse.json(
            { success: false, error: "Failed to send reminder" },
            { status: 500 }
          )
        }
      }

      case "test_reminder": {
        // Send a test reminder to verify configuration
        const reminderService = SessionReminderService.getInstance()
        const success = await reminderService.sendManualReminder(sessionId)

        return NextResponse.json({
          success: true,
          message: "Test reminder sent",
          data: { sent: success },
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error processing reminder action:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process reminder action" },
      { status: 500 }
    )
  }
}
