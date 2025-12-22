import { NotificationService } from "./notification-service"
import { db } from "@/db"
import { sessions, users, patientProfiles } from "@/db/schema"
import { eq, and, gte, lte } from "drizzle-orm"

export class NotificationScheduler {
  private static instance: NotificationScheduler
  private notificationService: NotificationService

  constructor() {
    this.notificationService = NotificationService.getInstance()
  }

  static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler()
    }
    return NotificationScheduler.instance
  }

  // Verificar e enviar lembretes de sessão (executar diariamente)
  async checkAndSendSessionReminders() {
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      const dayAfterTomorrow = new Date(tomorrow)
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

      // Buscar sessões confirmadas para amanhã
      const upcomingSessions = await db
        .select({
          id: sessions.id,
          sessionDate: sessions.scheduledAt,
          type: sessions.type,
          patientId: sessions.patientId,
          psychologistId: sessions.psychologistId,
          patientName: users.name,
          patientEmail: users.email,
          patientPhone: patientProfiles.phone,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.patientId, users.id))
        .leftJoin(patientProfiles, eq(users.id, patientProfiles.userId))
        .where(
          and(
            eq(sessions.status, "confirmada"),
            gte(sessions.scheduledAt, tomorrow),
            lte(sessions.scheduledAt, dayAfterTomorrow),
          ),
        )

      // Buscar dados dos psicólogos
      const psychologistIds = [...new Set(upcomingSessions.map((s) => s.psychologistId))]
      const psychologists = await db
        .select({
          id: users.id,
          name: users.name,
        })
        .from(users)
        .where(eq(users.role, "psychologist"))

      const psychologistMap = new Map(psychologists.map((p) => [p.id, p.name]))

      // Enviar lembretes
      for (const session of upcomingSessions) {
        const psychologistName = psychologistMap.get(session.psychologistId) || "Psicólogo"

        await this.notificationService.sendSessionReminder(
          session.patientId,
          session.sessionDate,
          psychologistName,
          session.type,
        )
      }

      console.log(`Enviados ${upcomingSessions.length} lembretes de sessão`)
    } catch (error) {
      console.error("Erro ao enviar lembretes de sessão:", error)
    }
  }

  // Verificar sessões perdidas (executar a cada hora)
  async checkMissedSessions() {
    try {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      // Buscar sessões confirmadas que já passaram do horário
      const missedSessions = await db
        .select({
          id: sessions.id,
          sessionDate: sessions.scheduledAt,
          patientId: sessions.patientId,
          psychologistId: sessions.psychologistId,
        })
        .from(sessions)
        .where(and(eq(sessions.status, "confirmada"), lte(sessions.scheduledAt, oneHourAgo)))

      // Marcar como perdidas e notificar
      for (const session of missedSessions) {
        await db
          .update(sessions)
          .set({ status: "cancelada", notes: "Sessão perdida - não compareceu" })
          .where(eq(sessions.id, session.id))

        // Aqui você pode adicionar lógica para notificar sobre sessões perdidas
      }

      console.log(`Marcadas ${missedSessions.length} sessões como perdidas`)
    } catch (error) {
      console.error("Erro ao verificar sessões perdidas:", error)
    }
  }

  // Iniciar o agendador (chamar na inicialização da aplicação)
  startScheduler() {
    // Verificar lembretes de sessão todos os dias às 9h
    setInterval(() => {
      const now = new Date()
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        this.checkAndSendSessionReminders()
      }
    }, 60 * 1000) // Verificar a cada minuto

    // Verificar sessões perdidas a cada hora
    setInterval(
      () => {
        this.checkMissedSessions()
      },
      60 * 60 * 1000,
    ) // A cada hora

    console.log("Notification scheduler iniciado")
  }
}
