import { db } from "@/db"
import { sessions, users, userSettings } from "@/db/schema"
import { eq, and, gte, lte } from "drizzle-orm"
import { EmailService } from "./email"
import { formatInTimeZone, toZonedTime } from "date-fns-tz"
import { addMinutes, addHours, addDays, isBefore, isAfter } from "date-fns"
import twilio from "twilio"

/**
 * Session Reminder Service
 * Handles sending email, SMS, and push notifications for upcoming sessions
 * Supports configurable reminder preferences and timezone handling
 */

// Initialize Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null

export interface ReminderPreferences {
  emailRemindersEnabled: boolean
  smsRemindersEnabled: boolean
  reminderBefore24h: boolean
  reminderBefore1h: boolean
  reminderBefore15min: boolean
  timezone: string
}

export interface SessionReminderData {
  sessionId: number
  patientId: number
  patientName: string
  patientEmail: string
  patientPhone?: string
  psychologistId: number
  psychologistName: string
  scheduledAt: Date
  duration: number
  type: string
  timezone: string
  preferences: ReminderPreferences
}

export type ReminderType = "24h" | "1h" | "15min"

export class SessionReminderService {
  private static instance: SessionReminderService
  private emailService: EmailService

  constructor() {
    this.emailService = EmailService.getInstance()
  }

  static getInstance(): SessionReminderService {
    if (!SessionReminderService.instance) {
      SessionReminderService.instance = new SessionReminderService()
    }
    return SessionReminderService.instance
  }

  /**
   * Get sessions that need reminders sent
   * @param reminderType Type of reminder (24h, 1h, 15min)
   * @returns Array of sessions needing reminders
   */
  async getSessionsNeedingReminders(reminderType: ReminderType): Promise<SessionReminderData[]> {
    const now = new Date()
    let startTime: Date
    let endTime: Date

    // Define time windows for each reminder type
    switch (reminderType) {
      case "24h":
        startTime = addDays(now, 1)
        endTime = addMinutes(addDays(now, 1), 5) // 5-minute window
        break
      case "1h":
        startTime = addHours(now, 1)
        endTime = addMinutes(addHours(now, 1), 5)
        break
      case "15min":
        startTime = addMinutes(now, 15)
        endTime = addMinutes(addMinutes(now, 15), 5)
        break
    }

    try {
      // Query sessions within the time window
      const upcomingSessions = await db
        .select({
          session: sessions,
          patient: {
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
          },
          patientSettings: userSettings,
          psychologist: {
            id: users.id,
            name: users.name,
          },
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.patientId, users.id))
        .leftJoin(userSettings, eq(users.id, userSettings.userId))
        .innerJoin(
          { psychologist: users },
          eq(sessions.psychologistId, users.id)
        )
        .where(
          and(
            gte(sessions.scheduledAt, startTime),
            lte(sessions.scheduledAt, endTime),
            eq(sessions.status, "scheduled")
          )
        )

      // Filter based on user preferences
      return upcomingSessions
        .filter((row) => {
          const settings = row.patientSettings
          if (!settings) return false

          // Check if reminders are enabled for this type
          switch (reminderType) {
            case "24h":
              return settings.emailRemindersEnabled && settings.reminderBefore24h
            case "1h":
              return settings.emailRemindersEnabled && settings.reminderBefore1h
            case "15min":
              return settings.reminderBefore15min
            default:
              return false
          }
        })
        .map((row) => ({
          sessionId: row.session.id,
          patientId: row.patient.id,
          patientName: row.patient.name,
          patientEmail: row.patient.email,
          patientPhone: row.patient.phone || undefined,
          psychologistId: row.psychologist.id,
          psychologistName: row.psychologist.name,
          scheduledAt: row.session.scheduledAt,
          duration: row.session.duration,
          type: row.session.type,
          timezone: row.session.timezone || row.patientSettings?.timezone || "America/Sao_Paulo",
          preferences: {
            emailRemindersEnabled: row.patientSettings?.emailRemindersEnabled ?? true,
            smsRemindersEnabled: row.patientSettings?.smsRemindersEnabled ?? false,
            reminderBefore24h: row.patientSettings?.reminderBefore24h ?? true,
            reminderBefore1h: row.patientSettings?.reminderBefore1h ?? true,
            reminderBefore15min: row.patientSettings?.reminderBefore15min ?? false,
            timezone: row.patientSettings?.timezone || "America/Sao_Paulo",
          },
        }))
    } catch (error) {
      console.error("Error fetching sessions for reminders:", error)
      return []
    }
  }

  /**
   * Send email reminder for a session
   */
  async sendEmailReminder(
    sessionData: SessionReminderData,
    reminderType: ReminderType
  ): Promise<boolean> {
    try {
      // Convert to user's timezone
      const zonedDate = toZonedTime(sessionData.scheduledAt, sessionData.timezone)
      const formattedDate = formatInTimeZone(
        zonedDate,
        sessionData.timezone,
        "EEEE, d 'de' MMMM 'de' yyyy"
      )
      const formattedTime = formatInTimeZone(zonedDate, sessionData.timezone, "HH:mm")

      // Determine subject based on reminder type
      let timeIndicator = ""
      switch (reminderType) {
        case "24h":
          timeIndicator = "amanhã"
          break
        case "1h":
          timeIndicator = "em 1 hora"
          break
        case "15min":
          timeIndicator = "em 15 minutos"
          break
      }

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Lembrete de Sessão - CÁRIS</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
              .header { background: linear-gradient(135deg, #2D9B9B, #1E7A7A); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
              .session-card { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2D9B9B; }
              .alert { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 15px; border-radius: 6px; margin: 15px 0; }
              .button { display: inline-block; background: #2D9B9B; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 15px 0; font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
              .info-box { background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 15px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⏰ Lembrete de Sessão</h1>
                <p>Sua sessão está chegando ${timeIndicator}!</p>
              </div>
              <div class="content">
                <p>Olá, <strong>${sessionData.patientName}</strong>!</p>

                <div class="alert">
                  <strong>🔔 Atenção:</strong> Sua sessão de terapia acontecerá ${timeIndicator}.
                </div>

                <div class="session-card">
                  <h3>📅 Detalhes da Sessão</h3>
                  <p><strong>Data:</strong> ${formattedDate}</p>
                  <p><strong>Horário:</strong> ${formattedTime} (${sessionData.timezone})</p>
                  <p><strong>Duração:</strong> ${sessionData.duration} minutos</p>
                  <p><strong>Psicólogo(a):</strong> ${sessionData.psychologistName}</p>
                  <p><strong>Tipo:</strong> ${sessionData.type === "online" ? "💻 Online" : "🏢 Presencial"}</p>
                </div>

                ${
                  sessionData.type === "online"
                    ? `
                  <div class="info-box">
                    <p><strong>📌 Preparação para sessão online:</strong></p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                      <li>Teste sua conexão de internet</li>
                      <li>Verifique microfone e câmera</li>
                      <li>Escolha um local privado e silencioso</li>
                      <li>Tenha papel e caneta à mão</li>
                    </ul>
                  </div>
                  <center>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/sessions/${sessionData.sessionId}" class="button">
                      🎥 Acessar Sala da Sessão
                    </a>
                  </center>
                `
                    : `
                  <div class="info-box">
                    <p><strong>📌 Lembrete para sessão presencial:</strong></p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                      <li>Chegue com 10 minutos de antecedência</li>
                      <li>Traga um documento de identificação</li>
                      <li>Confirme o endereço do consultório</li>
                    </ul>
                  </div>
                `
                }

                <p style="margin-top: 25px;">
                  Se precisar <strong>reagendar ou cancelar</strong>, faça isso com pelo menos 24 horas de antecedência através da plataforma.
                </p>

                <div class="footer">
                  <p>Cuidando de você com carinho 💚</p>
                  <p><strong>Equipe CÁRIS</strong></p>
                  <p style="font-size: 12px; margin-top: 15px; color: #999;">
                    Este é um e-mail automático de lembrete.<br>
                    Para alterar suas preferências de notificação, acesse suas configurações na plataforma.
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `

      const result = await this.emailService.sendEmail({
        to: sessionData.patientEmail,
        subject: `⏰ Lembrete: Sua sessão com ${sessionData.psychologistName} é ${timeIndicator}`,
        html,
      })

      return result.success
    } catch (error) {
      console.error("Error sending email reminder:", error)
      return false
    }
  }

  /**
   * Send SMS reminder using Twilio
   */
  async sendSMSReminder(
    sessionData: SessionReminderData,
    reminderType: ReminderType
  ): Promise<boolean> {
    if (!twilioClient || !sessionData.patientPhone) {
      console.log("SMS reminder skipped: Twilio not configured or no phone number")
      return false
    }

    if (!sessionData.preferences.smsRemindersEnabled) {
      console.log("SMS reminder skipped: User preference disabled")
      return false
    }

    try {
      const zonedDate = toZonedTime(sessionData.scheduledAt, sessionData.timezone)
      const formattedTime = formatInTimeZone(zonedDate, sessionData.timezone, "HH:mm")
      const formattedDate = formatInTimeZone(zonedDate, sessionData.timezone, "dd/MM/yyyy")

      let timeIndicator = ""
      switch (reminderType) {
        case "24h":
          timeIndicator = "amanhã"
          break
        case "1h":
          timeIndicator = "em 1 hora"
          break
        case "15min":
          timeIndicator = "em 15 minutos"
          break
      }

      const message = `🌟 CÁRIS - Lembrete de Sessão

Olá ${sessionData.patientName}!

Sua sessão com ${sessionData.psychologistName} é ${timeIndicator}:
📅 ${formattedDate} às ${formattedTime}
⏱️ Duração: ${sessionData.duration} min
${sessionData.type === "online" ? "💻 Modalidade: Online" : "🏢 Modalidade: Presencial"}

${sessionData.type === "online" ? `Acesse: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/sessions/${sessionData.sessionId}` : "Lembre-se de chegar 10 min antes!"}

Para cancelar/reagendar, acesse a plataforma.`

      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: sessionData.patientPhone,
      })

      console.log(`SMS reminder sent to ${sessionData.patientPhone}`)
      return true
    } catch (error) {
      console.error("Error sending SMS reminder:", error)
      return false
    }
  }

  /**
   * Send push notification via Pusher
   */
  async sendPushNotification(
    sessionData: SessionReminderData,
    reminderType: ReminderType
  ): Promise<boolean> {
    try {
      // Import Pusher dynamically to avoid circular dependencies
      const { pusherServer } = await import("./pusher")

      const zonedDate = toZonedTime(sessionData.scheduledAt, sessionData.timezone)
      const formattedTime = formatInTimeZone(zonedDate, sessionData.timezone, "HH:mm")

      let timeIndicator = ""
      switch (reminderType) {
        case "24h":
          timeIndicator = "amanhã"
          break
        case "1h":
          timeIndicator = "em 1 hora"
          break
        case "15min":
          timeIndicator = "em 15 minutos"
          break
      }

      // Trigger push notification via Pusher
      await pusherServer.trigger(
        `private-user-${sessionData.patientId}`,
        "session-reminder",
        {
          type: "session_reminder",
          sessionId: sessionData.sessionId,
          title: "Lembrete de Sessão",
          message: `Sua sessão com ${sessionData.psychologistName} é ${timeIndicator} às ${formattedTime}`,
          data: {
            sessionId: sessionData.sessionId,
            scheduledAt: sessionData.scheduledAt.toISOString(),
            psychologistName: sessionData.psychologistName,
            reminderType,
          },
          timestamp: new Date().toISOString(),
        }
      )

      console.log(`Push notification sent to user ${sessionData.patientId}`)
      return true
    } catch (error) {
      console.error("Error sending push notification:", error)
      return false
    }
  }

  /**
   * Send all configured reminders for a session
   */
  async sendReminders(
    sessionData: SessionReminderData,
    reminderType: ReminderType
  ): Promise<{
    email: boolean
    sms: boolean
    push: boolean
  }> {
    const results = {
      email: false,
      sms: false,
      push: false,
    }

    // Send email if enabled
    if (sessionData.preferences.emailRemindersEnabled) {
      results.email = await this.sendEmailReminder(sessionData, reminderType)
    }

    // Send SMS if enabled
    if (sessionData.preferences.smsRemindersEnabled && sessionData.patientPhone) {
      results.sms = await this.sendSMSReminder(sessionData, reminderType)
    }

    // Always try push notification (user can disable in frontend)
    results.push = await this.sendPushNotification(sessionData, reminderType)

    return results
  }

  /**
   * Process all pending reminders for a specific reminder type
   */
  async processPendingReminders(reminderType: ReminderType): Promise<{
    processed: number
    successful: number
    failed: number
  }> {
    console.log(`Processing ${reminderType} reminders...`)

    const sessions = await this.getSessionsNeedingReminders(reminderType)
    const stats = {
      processed: sessions.length,
      successful: 0,
      failed: 0,
    }

    for (const session of sessions) {
      try {
        const results = await this.sendReminders(session, reminderType)

        // Consider successful if at least one channel succeeded
        if (results.email || results.sms || results.push) {
          stats.successful++
          console.log(
            `✓ Reminders sent for session ${session.sessionId} (Email: ${results.email}, SMS: ${results.sms}, Push: ${results.push})`
          )
        } else {
          stats.failed++
          console.error(`✗ All reminder channels failed for session ${session.sessionId}`)
        }
      } catch (error) {
        stats.failed++
        console.error(`Error processing reminder for session ${session.sessionId}:`, error)
      }
    }

    console.log(
      `${reminderType} reminders complete: ${stats.successful}/${stats.processed} successful`
    )
    return stats
  }

  /**
   * Manually send a reminder for a specific session
   */
  async sendManualReminder(sessionId: number): Promise<boolean> {
    try {
      const sessionResults = await db
        .select({
          session: sessions,
          patient: {
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
          },
          patientSettings: userSettings,
          psychologist: {
            id: users.id,
            name: users.name,
          },
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.patientId, users.id))
        .leftJoin(userSettings, eq(users.id, userSettings.userId))
        .innerJoin(
          { psychologist: users },
          eq(sessions.psychologistId, users.id)
        )
        .where(eq(sessions.id, sessionId))
        .limit(1)

      if (sessionResults.length === 0) {
        console.error(`Session ${sessionId} not found`)
        return false
      }

      const row = sessionResults[0]
      const sessionData: SessionReminderData = {
        sessionId: row.session.id,
        patientId: row.patient.id,
        patientName: row.patient.name,
        patientEmail: row.patient.email,
        patientPhone: row.patient.phone || undefined,
        psychologistId: row.psychologist.id,
        psychologistName: row.psychologist.name,
        scheduledAt: row.session.scheduledAt,
        duration: row.session.duration,
        type: row.session.type,
        timezone: row.session.timezone || row.patientSettings?.timezone || "America/Sao_Paulo",
        preferences: {
          emailRemindersEnabled: row.patientSettings?.emailRemindersEnabled ?? true,
          smsRemindersEnabled: row.patientSettings?.smsRemindersEnabled ?? false,
          reminderBefore24h: row.patientSettings?.reminderBefore24h ?? true,
          reminderBefore1h: row.patientSettings?.reminderBefore1h ?? true,
          reminderBefore15min: row.patientSettings?.reminderBefore15min ?? false,
          timezone: row.patientSettings?.timezone || "America/Sao_Paulo",
        },
      }

      // Determine which reminder type based on time until session
      const now = new Date()
      const timeUntilSession = sessionData.scheduledAt.getTime() - now.getTime()
      const hoursUntilSession = timeUntilSession / (1000 * 60 * 60)

      let reminderType: ReminderType
      if (hoursUntilSession > 12) {
        reminderType = "24h"
      } else if (hoursUntilSession > 0.5) {
        reminderType = "1h"
      } else {
        reminderType = "15min"
      }

      const results = await this.sendReminders(sessionData, reminderType)
      return results.email || results.sms || results.push
    } catch (error) {
      console.error("Error sending manual reminder:", error)
      return false
    }
  }
}

export default SessionReminderService.getInstance()
