import { db } from "@/db"
import { sessions, users, userSettings } from "@/db/schema"
import { eq, and, or, gte, lte, ne } from "drizzle-orm"
import { addMinutes, subMinutes, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { toZonedTime, fromZonedTime } from "date-fns-tz"

/**
 * Session Conflict Detection Service
 * Handles checking for overlapping sessions, validating psychologist availability,
 * managing timezone conflicts, and suggesting alternative time slots
 */

export interface SessionConflictCheck {
  psychologistId: number
  patientId?: number
  scheduledAt: Date
  duration: number // in minutes
  timezone: string
  excludeSessionId?: number // For editing existing sessions
}

export interface ConflictResult {
  hasConflict: boolean
  conflicts: Array<{
    sessionId: number
    patientName: string
    scheduledAt: Date
    duration: number
    endTime: Date
    conflictType: "overlap" | "back-to-back" | "break-violation"
  }>
  message?: string
}

export interface AvailabilitySlot {
  startTime: Date
  endTime: Date
  available: boolean
  reason?: string
}

export interface AlternativeSlot {
  startTime: Date
  endTime: Date
  timezone: string
  score: number // 0-100, higher is better
}

export interface WorkingHours {
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
  available: boolean
}

export class SessionConflictService {
  private static instance: SessionConflictService
  private readonly MIN_BREAK_MINUTES = 10 // Minimum break between sessions
  private readonly BUFFER_MINUTES = 5 // Buffer for timezone/scheduling uncertainties

  static getInstance(): SessionConflictService {
    if (!SessionConflictService.instance) {
      SessionConflictService.instance = new SessionConflictService()
    }
    return SessionConflictService.instance
  }

  /**
   * Check if a new session would conflict with existing sessions
   */
  async checkConflicts(checkData: SessionConflictCheck): Promise<ConflictResult> {
    try {
      // Calculate session end time
      const sessionEndTime = addMinutes(checkData.scheduledAt, checkData.duration)

      // Add buffer for safer scheduling
      const checkStartTime = subMinutes(checkData.scheduledAt, this.BUFFER_MINUTES)
      const checkEndTime = addMinutes(sessionEndTime, this.BUFFER_MINUTES)

      // Query for potentially conflicting sessions
      let conflictQuery = db
        .select({
          session: sessions,
          patient: {
            id: users.id,
            name: users.name,
          },
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.patientId, users.id))
        .where(
          and(
            eq(sessions.psychologistId, checkData.psychologistId),
            or(
              eq(sessions.status, "scheduled"),
              eq(sessions.status, "confirmed")
            ),
            // Check for any overlap with the proposed time slot
            or(
              // Existing session starts during proposed session
              and(
                gte(sessions.scheduledAt, checkStartTime),
                lte(sessions.scheduledAt, checkEndTime)
              ),
              // Existing session ends during proposed session
              and(
                gte(sessions.scheduledAt, checkStartTime),
                lte(sessions.scheduledAt, checkEndTime)
              ),
              // Proposed session is completely within existing session
              and(
                lte(sessions.scheduledAt, checkStartTime),
                gte(sessions.scheduledAt, checkEndTime)
              )
            )
          )
        )

      // Exclude specific session if editing
      if (checkData.excludeSessionId) {
        conflictQuery = conflictQuery.where(ne(sessions.id, checkData.excludeSessionId))
      }

      const conflictingSessions = await conflictQuery

      if (conflictingSessions.length === 0) {
        return {
          hasConflict: false,
          conflicts: [],
          message: "No conflicts found. Time slot is available.",
        }
      }

      // Analyze conflicts
      const conflicts = conflictingSessions.map((row) => {
        const existingStart = row.session.scheduledAt
        const existingEnd = addMinutes(existingStart, row.session.duration)
        const proposedStart = checkData.scheduledAt
        const proposedEnd = sessionEndTime

        let conflictType: "overlap" | "back-to-back" | "break-violation" = "overlap"

        // Determine conflict type
        if (
          existingEnd.getTime() === proposedStart.getTime() ||
          proposedEnd.getTime() === existingStart.getTime()
        ) {
          conflictType = "back-to-back"
        } else {
          const timeBetween = Math.min(
            Math.abs(existingEnd.getTime() - proposedStart.getTime()),
            Math.abs(proposedEnd.getTime() - existingStart.getTime())
          )

          if (timeBetween < this.MIN_BREAK_MINUTES * 60 * 1000) {
            conflictType = "break-violation"
          }
        }

        return {
          sessionId: row.session.id,
          patientName: row.patient.name,
          scheduledAt: existingStart,
          duration: row.session.duration,
          endTime: existingEnd,
          conflictType,
        }
      })

      return {
        hasConflict: true,
        conflicts,
        message: `Found ${conflicts.length} conflicting session(s)`,
      }
    } catch (error) {
      console.error("Error checking session conflicts:", error)
      throw new Error("Failed to check session conflicts")
    }
  }

  /**
   * Get psychologist's availability for a specific date
   */
  async getPsychologistAvailability(
    psychologistId: number,
    date: Date,
    timezone: string = "America/Sao_Paulo"
  ): Promise<AvailabilitySlot[]> {
    try {
      // Convert date to psychologist's timezone
      const zonedDate = toZonedTime(date, timezone)
      const dayStart = startOfDay(zonedDate)
      const dayEnd = endOfDay(zonedDate)

      // Get all sessions for this psychologist on this day
      const daySessions = await db
        .select({
          scheduledAt: sessions.scheduledAt,
          duration: sessions.duration,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.psychologistId, psychologistId),
            gte(sessions.scheduledAt, dayStart),
            lte(sessions.scheduledAt, dayEnd),
            or(
              eq(sessions.status, "scheduled"),
              eq(sessions.status, "confirmed")
            )
          )
        )
        .orderBy(sessions.scheduledAt)

      // Define working hours (8 AM to 8 PM by default)
      const workStart = new Date(dayStart)
      workStart.setHours(8, 0, 0, 0)
      const workEnd = new Date(dayStart)
      workEnd.setHours(20, 0, 0, 0)

      const slots: AvailabilitySlot[] = []
      let currentTime = workStart

      // Generate 50-minute slots with 10-minute breaks
      while (currentTime < workEnd) {
        const slotEnd = addMinutes(currentTime, 50)

        if (slotEnd > workEnd) break

        // Check if this slot conflicts with any existing session
        const hasConflict = daySessions.some((session) => {
          const sessionEnd = addMinutes(session.scheduledAt, session.duration)
          return (
            isWithinInterval(currentTime, {
              start: session.scheduledAt,
              end: sessionEnd,
            }) ||
            isWithinInterval(slotEnd, {
              start: session.scheduledAt,
              end: sessionEnd,
            }) ||
            (currentTime <= session.scheduledAt && slotEnd >= sessionEnd)
          )
        })

        slots.push({
          startTime: new Date(currentTime),
          endTime: new Date(slotEnd),
          available: !hasConflict,
          reason: hasConflict ? "Session already scheduled" : undefined,
        })

        // Move to next slot (50 min session + 10 min break)
        currentTime = addMinutes(currentTime, 60)
      }

      return slots
    } catch (error) {
      console.error("Error getting psychologist availability:", error)
      throw new Error("Failed to get availability")
    }
  }

  /**
   * Suggest alternative time slots when there's a conflict
   */
  async suggestAlternativeSlots(
    checkData: SessionConflictCheck,
    numSuggestions: number = 5
  ): Promise<AlternativeSlot[]> {
    try {
      const alternatives: AlternativeSlot[] = []
      const searchDate = new Date(checkData.scheduledAt)

      // Search for available slots in the next 7 days
      for (let dayOffset = 0; dayOffset < 7 && alternatives.length < numSuggestions; dayOffset++) {
        const currentDate = new Date(searchDate)
        currentDate.setDate(currentDate.getDate() + dayOffset)

        const daySlots = await this.getPsychologistAvailability(
          checkData.psychologistId,
          currentDate,
          checkData.timezone
        )

        // Filter available slots
        const availableSlots = daySlots.filter((slot) => slot.available)

        for (const slot of availableSlots) {
          if (alternatives.length >= numSuggestions) break

          // Calculate score based on various factors
          const score = this.calculateSlotScore(
            slot.startTime,
            checkData.scheduledAt,
            dayOffset
          )

          alternatives.push({
            startTime: slot.startTime,
            endTime: slot.endTime,
            timezone: checkData.timezone,
            score,
          })
        }
      }

      // Sort by score (highest first)
      alternatives.sort((a, b) => b.score - a.score)

      return alternatives.slice(0, numSuggestions)
    } catch (error) {
      console.error("Error suggesting alternative slots:", error)
      throw new Error("Failed to suggest alternatives")
    }
  }

  /**
   * Calculate a score for a time slot based on proximity to requested time
   * Higher score = better match
   */
  private calculateSlotScore(
    slotTime: Date,
    requestedTime: Date,
    dayOffset: number
  ): number {
    let score = 100

    // Penalize based on day offset (prefer sooner)
    score -= dayOffset * 10

    // Penalize based on time difference within the day
    const requestedHour = requestedTime.getHours()
    const slotHour = slotTime.getHours()
    const hourDifference = Math.abs(requestedHour - slotHour)
    score -= hourDifference * 5

    // Bonus for same time of day
    if (Math.abs(requestedHour - slotHour) <= 1) {
      score += 15
    }

    // Bonus for preferred time slots (10 AM - 4 PM)
    if (slotHour >= 10 && slotHour <= 16) {
      score += 10
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Validate if a session can be scheduled (comprehensive check)
   */
  async validateSessionScheduling(
    checkData: SessionConflictCheck
  ): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
    suggestions?: AlternativeSlot[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Check 1: Date is not in the past
      const now = new Date()
      if (checkData.scheduledAt < now) {
        errors.push("Cannot schedule sessions in the past")
      }

      // Check 2: Date is not too far in the future (e.g., 6 months)
      const maxFutureDate = new Date()
      maxFutureDate.setMonth(maxFutureDate.getMonth() + 6)
      if (checkData.scheduledAt > maxFutureDate) {
        warnings.push("Scheduling more than 6 months in advance")
      }

      // Check 3: Duration is reasonable
      if (checkData.duration < 30 || checkData.duration > 180) {
        errors.push("Session duration must be between 30 and 180 minutes")
      }

      // Check 4: Check for conflicts
      const conflictResult = await this.checkConflicts(checkData)
      if (conflictResult.hasConflict) {
        const conflictTypes = conflictResult.conflicts.map((c) => c.conflictType)

        if (conflictTypes.includes("overlap")) {
          errors.push(
            `Time slot overlaps with ${conflictResult.conflicts.length} existing session(s)`
          )
        } else if (conflictTypes.includes("break-violation")) {
          warnings.push(
            `Less than ${this.MIN_BREAK_MINUTES} minutes break between sessions`
          )
        }
      }

      // Check 5: Validate business hours
      const hour = checkData.scheduledAt.getHours()
      if (hour < 6 || hour >= 22) {
        warnings.push("Session scheduled outside typical business hours (6 AM - 10 PM)")
      }

      // Check 6: Validate day of week
      const dayOfWeek = checkData.scheduledAt.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        warnings.push("Session scheduled on weekend")
      }

      // If there are conflicts, suggest alternatives
      let suggestions: AlternativeSlot[] | undefined
      if (conflictResult.hasConflict || errors.length > 0) {
        suggestions = await this.suggestAlternativeSlots(checkData, 5)
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions,
      }
    } catch (error) {
      console.error("Error validating session scheduling:", error)
      return {
        valid: false,
        errors: ["Failed to validate session scheduling"],
        warnings: [],
      }
    }
  }

  /**
   * Check timezone compatibility between patient and psychologist
   */
  async checkTimezoneConflict(
    psychologistId: number,
    patientId: number,
    scheduledAt: Date
  ): Promise<{
    hasConflict: boolean
    psychologistTimezone: string
    patientTimezone: string
    psychologistLocalTime: Date
    patientLocalTime: Date
    warning?: string
  }> {
    try {
      // Get timezone preferences
      const [psychologistSettings, patientSettings] = await Promise.all([
        db
          .select({ timezone: userSettings.timezone })
          .from(userSettings)
          .where(eq(userSettings.userId, psychologistId))
          .limit(1),
        db
          .select({ timezone: userSettings.timezone })
          .from(userSettings)
          .where(eq(userSettings.userId, patientId))
          .limit(1),
      ])

      const psychologistTZ = psychologistSettings[0]?.timezone || "America/Sao_Paulo"
      const patientTZ = patientSettings[0]?.timezone || "America/Sao_Paulo"

      const psychologistLocal = toZonedTime(scheduledAt, psychologistTZ)
      const patientLocal = toZonedTime(scheduledAt, patientTZ)

      // Check if either time is outside reasonable hours
      const psychHour = psychologistLocal.getHours()
      const patientHour = patientLocal.getHours()

      let hasConflict = false
      let warning: string | undefined

      if (psychHour < 6 || psychHour >= 22) {
        hasConflict = true
        warning = `Session is scheduled at ${psychHour}:00 in psychologist's timezone (${psychologistTZ}), which is outside typical hours`
      } else if (patientHour < 6 || patientHour >= 22) {
        hasConflict = true
        warning = `Session is scheduled at ${patientHour}:00 in patient's timezone (${patientTZ}), which is outside typical hours`
      } else if (Math.abs(psychHour - patientHour) > 8) {
        warning = `Large timezone difference: ${Math.abs(psychHour - patientHour)} hours between psychologist and patient`
      }

      return {
        hasConflict,
        psychologistTimezone: psychologistTZ,
        patientTimezone: patientTZ,
        psychologistLocalTime: psychologistLocal,
        patientLocalTime: patientLocal,
        warning,
      }
    } catch (error) {
      console.error("Error checking timezone conflict:", error)
      throw new Error("Failed to check timezone conflict")
    }
  }

  /**
   * Get sessions count for a psychologist in a date range
   */
  async getSessionLoad(
    psychologistId: number,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalSessions: number
    totalHours: number
    averagePerDay: number
    busiestDay: { date: Date; sessions: number } | null
  }> {
    try {
      const sessionsInRange = await db
        .select({
          scheduledAt: sessions.scheduledAt,
          duration: sessions.duration,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.psychologistId, psychologistId),
            gte(sessions.scheduledAt, startDate),
            lte(sessions.scheduledAt, endDate),
            or(
              eq(sessions.status, "scheduled"),
              eq(sessions.status, "confirmed"),
              eq(sessions.status, "completed")
            )
          )
        )

      const totalSessions = sessionsInRange.length
      const totalHours = sessionsInRange.reduce(
        (sum, s) => sum + s.duration / 60,
        0
      )

      // Calculate days in range
      const daysDiff = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      const averagePerDay = totalSessions / daysDiff

      // Find busiest day
      const sessionsByDay = new Map<string, number>()
      sessionsInRange.forEach((session) => {
        const dayKey = session.scheduledAt.toISOString().split("T")[0]
        sessionsByDay.set(dayKey, (sessionsByDay.get(dayKey) || 0) + 1)
      })

      let busiestDay: { date: Date; sessions: number } | null = null
      sessionsByDay.forEach((count, dateStr) => {
        if (!busiestDay || count > busiestDay.sessions) {
          busiestDay = { date: new Date(dateStr), sessions: count }
        }
      })

      return {
        totalSessions,
        totalHours,
        averagePerDay,
        busiestDay,
      }
    } catch (error) {
      console.error("Error calculating session load:", error)
      throw new Error("Failed to calculate session load")
    }
  }
}

export default SessionConflictService.getInstance()
