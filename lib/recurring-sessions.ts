import { db } from "@/db"
import { sessions } from "@/db/schema"
import { eq, and, gte, inArray } from "drizzle-orm"
import { addWeeks, addDays, addMonths, isBefore, isAfter, startOfDay } from "date-fns"
import SessionConflictService from "./session-conflicts"

/**
 * Recurring Sessions Service
 * Handles creating and managing recurring session patterns
 * Supports weekly, bi-weekly, and monthly recurring schedules
 */

export type RecurrencePattern = "weekly" | "biweekly" | "monthly"

export interface RecurringSessionConfig {
  psychologistId: number
  patientId: number
  clinicId: number
  startDate: Date
  duration: number // in minutes
  type: string // 'therapy', 'consultation', etc.
  timezone: string
  pattern: RecurrencePattern
  occurrences?: number // Number of sessions to create (if not specified, use endDate)
  endDate?: Date // Last date for recurring sessions
  skipDates?: Date[] // Specific dates to skip
  notes?: string
  sessionValue?: number
}

export interface RecurringSessionSeries {
  seriesId: string // Unique identifier for the series
  pattern: RecurrencePattern
  sessions: Array<{
    id?: number // Will be populated after creation
    scheduledAt: Date
    status: string
    skipped: boolean
  }>
  metadata: {
    totalSessions: number
    createdSessions: number
    skippedSessions: number
    conflicts: number
  }
}

export interface UpdateSeriesOptions {
  updateType: "single" | "future" | "all"
  sessionId: number
  newScheduledAt?: Date
  newDuration?: number
  newNotes?: string
  newStatus?: string
}

export class RecurringSessionService {
  private static instance: RecurringSessionService
  private conflictService: SessionConflictService

  constructor() {
    this.conflictService = SessionConflictService.getInstance()
  }

  static getInstance(): RecurringSessionService {
    if (!RecurringSessionService.instance) {
      RecurringSessionService.instance = new RecurringSessionService()
    }
    return RecurringSessionService.instance
  }

  /**
   * Generate a unique series ID for recurring sessions
   */
  private generateSeriesId(): string {
    return `series_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Calculate all session dates for a recurring pattern
   */
  private calculateSessionDates(
    config: RecurringSessionConfig
  ): Date[] {
    const dates: Date[] = []
    let currentDate = new Date(config.startDate)

    // Determine max occurrences
    const maxOccurrences = config.occurrences || 52 // Default to 1 year weekly
    const endDate = config.endDate || addMonths(config.startDate, 12) // Default to 1 year

    let occurrence = 0

    while (occurrence < maxOccurrences && isBefore(currentDate, endDate)) {
      // Check if this date should be skipped
      const shouldSkip = config.skipDates?.some(
        (skipDate) =>
          startOfDay(skipDate).getTime() === startOfDay(currentDate).getTime()
      )

      if (!shouldSkip) {
        dates.push(new Date(currentDate))
      }

      // Calculate next occurrence based on pattern
      switch (config.pattern) {
        case "weekly":
          currentDate = addWeeks(currentDate, 1)
          break
        case "biweekly":
          currentDate = addWeeks(currentDate, 2)
          break
        case "monthly":
          currentDate = addMonths(currentDate, 1)
          break
      }

      occurrence++
    }

    return dates
  }

  /**
   * Create a recurring session series
   */
  async createRecurringSeries(
    config: RecurringSessionConfig
  ): Promise<RecurringSessionSeries> {
    const seriesId = this.generateSeriesId()
    const sessionDates = this.calculateSessionDates(config)

    const result: RecurringSessionSeries = {
      seriesId,
      pattern: config.pattern,
      sessions: [],
      metadata: {
        totalSessions: sessionDates.length,
        createdSessions: 0,
        skippedSessions: 0,
        conflicts: 0,
      },
    }

    // Create sessions for each date
    for (const scheduledAt of sessionDates) {
      try {
        // Check for conflicts
        const conflictCheck = await this.conflictService.checkConflicts({
          psychologistId: config.psychologistId,
          patientId: config.patientId,
          scheduledAt,
          duration: config.duration,
          timezone: config.timezone,
        })

        if (conflictCheck.hasConflict) {
          result.metadata.conflicts++
          result.sessions.push({
            scheduledAt,
            status: "conflict",
            skipped: true,
          })
          continue
        }

        // Create the session
        const [newSession] = await db
          .insert(sessions)
          .values({
            clinicId: config.clinicId,
            psychologistId: config.psychologistId,
            patientId: config.patientId,
            scheduledAt,
            duration: config.duration,
            type: config.type,
            status: "scheduled",
            timezone: config.timezone,
            recurringSeriesId: seriesId,
            recurrencePattern: config.pattern,
            isRecurring: true,
            notes: config.notes || undefined,
            sessionValue: config.sessionValue?.toString() as any,
          })
          .returning()

        result.sessions.push({
          id: newSession.id,
          scheduledAt,
          status: "scheduled",
          skipped: false,
        })
        result.metadata.createdSessions++
      } catch (error) {
        console.error(`Error creating session for ${scheduledAt}:`, error)
        result.sessions.push({
          scheduledAt,
          status: "error",
          skipped: true,
        })
        result.metadata.skippedSessions++
      }
    }

    return result
  }

  /**
   * Get all sessions in a recurring series
   */
  async getSeriesSessions(seriesId: string): Promise<Array<{
    id: number
    scheduledAt: Date
    duration: number
    status: string
    type: string
  }>> {
    try {
      const seriesSessions = await db
        .select({
          id: sessions.id,
          scheduledAt: sessions.scheduledAt,
          duration: sessions.duration,
          status: sessions.status,
          type: sessions.type,
        })
        .from(sessions)
        .where(eq(sessions.recurringSeriesId, seriesId))

      return seriesSessions
    } catch (error) {
      console.error("Error fetching series sessions:", error)
      return []
    }
  }

  /**
   * Update a single session in a series
   */
  async updateSingleSession(
    sessionId: number,
    updates: {
      scheduledAt?: Date
      duration?: number
      notes?: string
      status?: string
    }
  ): Promise<boolean> {
    try {
      // Check for conflicts if scheduledAt is being changed
      if (updates.scheduledAt) {
        const [existingSession] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, sessionId))
          .limit(1)

        if (existingSession) {
          const conflictCheck = await this.conflictService.checkConflicts({
            psychologistId: existingSession.psychologistId,
            patientId: existingSession.patientId,
            scheduledAt: updates.scheduledAt,
            duration: updates.duration || existingSession.duration,
            timezone: existingSession.timezone || "America/Sao_Paulo",
            excludeSessionId: sessionId,
          })

          if (conflictCheck.hasConflict) {
            throw new Error(
              `Cannot update session: conflicts with ${conflictCheck.conflicts.length} existing session(s)`
            )
          }
        }
      }

      await db
        .update(sessions)
        .set(updates)
        .where(eq(sessions.id, sessionId))

      return true
    } catch (error) {
      console.error("Error updating single session:", error)
      throw error
    }
  }

  /**
   * Update all future sessions in a series
   */
  async updateFutureSessions(
    sessionId: number,
    updates: {
      scheduledAt?: Date
      duration?: number
      notes?: string
      status?: string
    }
  ): Promise<{ updated: number; conflicts: number }> {
    try {
      // Get the target session to find its series
      const [targetSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)

      if (!targetSession || !targetSession.recurringSeriesId) {
        throw new Error("Session not found or not part of a series")
      }

      const seriesId = targetSession.recurringSeriesId

      // Get all future sessions in the series
      const futureSessions = await db
        .select()
        .from(sessions)
        .where(
          and(
            gte(sessions.scheduledAt, targetSession.scheduledAt),
            eq(sessions.psychologistId, targetSession.psychologistId),
            eq(sessions.patientId, targetSession.patientId)
          )
        )

      // Filter to only sessions in this series
      const seriesFutureSessions = futureSessions.filter((s) =>
        s.recurringSeriesId === seriesId
      )

      let updatedCount = 0
      let conflictCount = 0

      for (const session of seriesFutureSessions) {
        try {
          // If updating scheduledAt, calculate time difference and apply to each session
          let newScheduledAt = session.scheduledAt
          if (updates.scheduledAt) {
            const timeDiff =
              updates.scheduledAt.getTime() - targetSession.scheduledAt.getTime()
            newScheduledAt = new Date(session.scheduledAt.getTime() + timeDiff)

            // Check for conflicts
            const conflictCheck = await this.conflictService.checkConflicts({
              psychologistId: session.psychologistId,
              patientId: session.patientId,
              scheduledAt: newScheduledAt,
              duration: updates.duration || session.duration,
              timezone: session.timezone || "America/Sao_Paulo",
              excludeSessionId: session.id,
            })

            if (conflictCheck.hasConflict) {
              conflictCount++
              continue
            }
          }

          await db.update(sessions).set({
            scheduledAt: newScheduledAt,
            duration: updates.duration,
            notes: updates.notes,
            status: updates.status,
          }).where(eq(sessions.id, session.id))

          updatedCount++
        } catch (error) {
          console.error(`Error updating session ${session.id}:`, error)
          conflictCount++
        }
      }

      return { updated: updatedCount, conflicts: conflictCount }
    } catch (error) {
      console.error("Error updating future sessions:", error)
      throw error
    }
  }

  /**
   * Update all sessions in a series
   */
  async updateAllSessions(
    sessionId: number,
    updates: {
      duration?: number
      notes?: string
      status?: string
    }
  ): Promise<{ updated: number; conflicts: number }> {
    try {
      // Get the target session to find its series
      const [targetSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)

      if (!targetSession || !targetSession.recurringSeriesId) {
        throw new Error("Session not found or not part of a series")
      }

      const seriesId = targetSession.recurringSeriesId

      // Get all sessions in the series
      const seriesAllSessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.recurringSeriesId, seriesId))

      let updatedCount = 0

      for (const session of seriesAllSessions) {
        try {
          await db.update(sessions).set({
            duration: updates.duration,
            notes: updates.notes,
            status: updates.status,
          }).where(eq(sessions.id, session.id))

          updatedCount++
        } catch (error) {
          console.error(`Error updating session ${session.id}:`, error)
        }
      }

      return { updated: updatedCount, conflicts: 0 }
    } catch (error) {
      console.error("Error updating all sessions:", error)
      throw error
    }
  }

  /**
   * Delete a recurring series
   */
  async deleteRecurringSeries(
    sessionId: number,
    deleteType: "single" | "future" | "all"
  ): Promise<{ deleted: number }> {
    try {
      // Get the target session
      const [targetSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)

      if (!targetSession || !targetSession.recurringSeriesId) {
        throw new Error("Session not found or not part of a series")
      }

      const seriesId = targetSession.recurringSeriesId

      let sessionsToDelete: typeof targetSession[] = []

      switch (deleteType) {
        case "single":
          sessionsToDelete = [targetSession]
          break

        case "future":
          sessionsToDelete = await db
            .select()
            .from(sessions)
            .where(
              and(
                eq(sessions.recurringSeriesId, seriesId),
                gte(sessions.scheduledAt, targetSession.scheduledAt)
              )
            )
          break

        case "all":
          sessionsToDelete = await db
            .select()
            .from(sessions)
            .where(eq(sessions.recurringSeriesId, seriesId))
          break
      }

      // Delete sessions (or mark as cancelled)
      const sessionIds = sessionsToDelete.map((s) => s.id)

      if (sessionIds.length > 0) {
        // Instead of deleting, mark as cancelled
        await db
          .update(sessions)
          .set({ status: "cancelled" })
          .where(inArray(sessions.id, sessionIds))
      }

      return { deleted: sessionIds.length }
    } catch (error) {
      console.error("Error deleting recurring series:", error)
      throw error
    }
  }

  /**
   * Add an exception date to skip a specific occurrence
   */
  async skipSessionOccurrence(sessionId: number): Promise<boolean> {
    try {
      await db
        .update(sessions)
        .set({
          status: "cancelled",
        })
        .where(eq(sessions.id, sessionId))

      return true
    } catch (error) {
      console.error("Error skipping session occurrence:", error)
      return false
    }
  }

  /**
   * Get recurring pattern statistics
   */
  async getSeriesStatistics(seriesId: string): Promise<{
    total: number
    scheduled: number
    completed: number
    cancelled: number
    skipped: number
    upcoming: number
  }> {
    try {
      const seriesSessions = await this.getSeriesSessions(seriesId)
      const now = new Date()

      const stats = {
        total: seriesSessions.length,
        scheduled: 0,
        completed: 0,
        cancelled: 0,
        skipped: 0,
        upcoming: 0,
      }

      seriesSessions.forEach((session) => {
        switch (session.status) {
          case "scheduled":
            stats.scheduled++
            if (isAfter(session.scheduledAt, now)) {
              stats.upcoming++
            }
            break
          case "completed":
            stats.completed++
            break
          case "cancelled":
            stats.cancelled++
            break
        }
      })

      return stats
    } catch (error) {
      console.error("Error getting series statistics:", error)
      return {
        total: 0,
        scheduled: 0,
        completed: 0,
        cancelled: 0,
        skipped: 0,
        upcoming: 0,
      }
    }
  }

  /**
   * Validate recurring session configuration
   */
  validateRecurringConfig(config: RecurringSessionConfig): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Validate start date
    if (isBefore(config.startDate, new Date())) {
      errors.push("Start date cannot be in the past")
    }

    // Validate duration
    if (config.duration < 30 || config.duration > 180) {
      errors.push("Duration must be between 30 and 180 minutes")
    }

    // Validate occurrences or end date
    if (!config.occurrences && !config.endDate) {
      errors.push("Must specify either occurrences or end date")
    }

    if (config.occurrences && config.occurrences < 1) {
      errors.push("Occurrences must be at least 1")
    }

    if (config.endDate && isBefore(config.endDate, config.startDate)) {
      errors.push("End date must be after start date")
    }

    // Validate pattern
    if (!["weekly", "biweekly", "monthly"].includes(config.pattern)) {
      errors.push("Invalid recurrence pattern")
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export default RecurringSessionService.getInstance()
