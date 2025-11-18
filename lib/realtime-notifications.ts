import { pusherServer } from "./pusher"
import { NotificationService } from "./notification-service"
import { db } from "@/db"
import { users, sessions, sosUsages } from "@/db/schema"
import { eq } from "drizzle-orm"

interface RealtimeNotification {
  id: string
  type: "session-reminder" | "new-message" | "diary-entry" | "sos-alert" | "session-update" | "task-assigned"
  title: string
  message: string
  data?: any
  priority: "low" | "medium" | "high" | "urgent"
  timestamp: string
  userId: number
  read: boolean
}

export class RealtimeNotificationService {
  private static instance: RealtimeNotificationService
  private notificationService: NotificationService

  constructor() {
    this.notificationService = NotificationService.getInstance()
  }

  static getInstance(): RealtimeNotificationService {
    if (!RealtimeNotificationService.instance) {
      RealtimeNotificationService.instance = new RealtimeNotificationService()
    }
    return RealtimeNotificationService.instance
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async sendRealtimeNotification(userId: number, notification: RealtimeNotification) {
    try {
      // SECURITY: Send via Pusher to user's private channel
      await pusherServer.trigger(`private-user-${userId}`, "notification", notification)

      // Note: Removed public urgent-notifications channel for security
      // Urgent notifications are now sent only to the user's private channel
      // Admin/psychologist alerts should use separate private-role-{role} channels

      console.log(`Notificação em tempo real enviada para usuário ${userId}:`, notification.type)
    } catch (error) {
      console.error("Erro ao enviar notificação em tempo real:", error)
    }
  }

  // Notificação de nova mensagem no chat
  async notifyNewChatMessage(senderId: number, receiverId: number, messageContent: string) {
    try {
      // Buscar dados do remetente
      const sender = await db
        .select({ name: users.name, role: users.role })
        .from(users)
        .where(eq(users.id, senderId))
        .limit(1)

      if (sender.length === 0) return

      const senderData = sender[0]
      const notification: RealtimeNotification = {
        id: this.generateNotificationId(),
        type: "new-message",
        title: `Nova mensagem de ${senderData.name}`,
        message: messageContent.length > 100 ? `${messageContent.substring(0, 100)}...` : messageContent,
        data: {
          senderId,
          senderName: senderData.name,
          senderRole: senderData.role,
          messagePreview: messageContent.substring(0, 200),
        },
        priority: "medium",
        timestamp: new Date().toISOString(),
        userId: receiverId,
        read: false,
      }

      await this.sendRealtimeNotification(receiverId, notification)

      // Também enviar notificação externa se configurado
      await this.notificationService.sendChatMessageNotification(receiverId, senderData.name, messageContent)
    } catch (error) {
      console.error("Erro ao notificar nova mensagem:", error)
    }
  }

  // Notificação de SOS ativado
  async notifySOSActivated(patientId: number, psychologistId: number, toolName: string) {
    try {
      // Buscar dados do paciente
      const patient = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, patientId))
        .limit(1)

      if (patient.length === 0) return

      const patientData = patient[0]
      const notification: RealtimeNotification = {
        id: this.generateNotificationId(),
        type: "sos-alert",
        title: "🚨 ALERTA SOS ATIVADO",
        message: `${patientData.name} ativou o SOS usando ${toolName}. Atenção imediata necessária!`,
        data: {
          patientId,
          patientName: patientData.name,
          patientEmail: patientData.email,
          toolUsed: toolName,
          timestamp: new Date().toISOString(),
        },
        priority: "urgent",
        timestamp: new Date().toISOString(),
        userId: psychologistId,
        read: false,
      }

      await this.sendRealtimeNotification(psychologistId, notification)

      // Registrar o uso do SOS no banco
      await db.insert(sosUsages).values({
        patientId,
        toolName,
        durationMinutes: 0, // Será atualizado quando a ferramenta for finalizada
      })

      // Enviar notificações externas
      await this.notificationService.sendSOSAlert(psychologistId, patientData.name)
    } catch (error) {
      console.error("Erro ao notificar SOS:", error)
    }
  }

  // Notificação de nova entrada no diário
  async notifyNewDiaryEntry(patientId: number, psychologistId: number, entryTitle: string, mood: number) {
    try {
      // Buscar dados do paciente
      const patient = await db.select({ name: users.name }).from(users).where(eq(users.id, patientId)).limit(1)

      if (patient.length === 0) return

      const patientData = patient[0]
      const moodEmoji = ["😢", "😕", "😐", "😊", "😄"][mood - 1] || "😐"

      const notification: RealtimeNotification = {
        id: this.generateNotificationId(),
        type: "diary-entry",
        title: `📝 Nova entrada no diário`,
        message: `${patientData.name} fez uma nova entrada: "${entryTitle}" ${moodEmoji}`,
        data: {
          patientId,
          patientName: patientData.name,
          entryTitle,
          mood,
          moodEmoji,
        },
        priority: "medium",
        timestamp: new Date().toISOString(),
        userId: psychologistId,
        read: false,
      }

      await this.sendRealtimeNotification(psychologistId, notification)

      // Enviar notificação externa
      await this.notificationService.sendDiaryEntryNotification(psychologistId, patientData.name, entryTitle)
    } catch (error) {
      console.error("Erro ao notificar entrada no diário:", error)
    }
  }

  // Notificação de sessão atualizada
  async notifySessionUpdate(sessionId: number, type: "created" | "updated" | "cancelled", updatedBy: number) {
    try {
      // Buscar dados da sessão
      const sessionData = await db
        .select({
          id: sessions.id,
          sessionDate: sessions.sessionDate,
          type: sessions.type,
          status: sessions.status,
          patientId: sessions.patientId,
          psychologistId: sessions.psychologistId,
          patientName: users.name,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.patientId, users.id))
        .where(eq(sessions.id, sessionId))
        .limit(1)

      if (sessionData.length === 0) return

      const session = sessionData[0]
      const formattedDate = session.sessionDate.toLocaleDateString("pt-BR")
      const formattedTime = session.sessionDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })

      let title = ""
      let message = ""
      let priority: "low" | "medium" | "high" | "urgent" = "medium"

      switch (type) {
        case "created":
          title = "📅 Nova sessão agendada"
          message = `Sessão com ${session.patientName} agendada para ${formattedDate} às ${formattedTime}`
          break
        case "updated":
          title = "📝 Sessão atualizada"
          message = `Sessão com ${session.patientName} foi atualizada para ${formattedDate} às ${formattedTime}`
          break
        case "cancelled":
          title = "❌ Sessão cancelada"
          message = `Sessão com ${session.patientName} de ${formattedDate} foi cancelada`
          priority = "high"
          break
      }

      // Notificar ambos os usuários (paciente e psicólogo)
      const usersToNotify = [session.patientId, session.psychologistId].filter((id) => id !== updatedBy)

      for (const userId of usersToNotify) {
        const notification: RealtimeNotification = {
          id: this.generateNotificationId(),
          type: "session-update",
          title,
          message,
          data: {
            sessionId: session.id,
            sessionDate: session.sessionDate.toISOString(),
            sessionType: session.type,
            status: session.status,
            patientName: session.patientName,
            updateType: type,
          },
          priority,
          timestamp: new Date().toISOString(),
          userId,
          read: false,
        }

        await this.sendRealtimeNotification(userId, notification)
      }

      // Enviar notificações externas se for uma nova sessão
      if (type === "created") {
        // Buscar nome do psicólogo
        const psychologist = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, session.psychologistId))
          .limit(1)

        if (psychologist.length > 0) {
          await this.notificationService.sendSessionConfirmation(
            session.patientId,
            session.sessionDate,
            psychologist[0].name,
            session.type,
          )
        }
      }
    } catch (error) {
      console.error("Erro ao notificar atualização de sessão:", error)
    }
  }

  // Notificação de tarefa atribuída
  async notifyTaskAssigned(taskId: number, patientId: number, psychologistId: number, taskTitle: string) {
    try {
      // Buscar nome do psicólogo
      const psychologist = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, psychologistId))
        .limit(1)

      if (psychologist.length === 0) return

      const psychologistData = psychologist[0]
      const notification: RealtimeNotification = {
        id: this.generateNotificationId(),
        type: "task-assigned",
        title: "📋 Nova tarefa atribuída",
        message: `${psychologistData.name} atribuiu uma nova tarefa: "${taskTitle}"`,
        data: {
          taskId,
          taskTitle,
          psychologistId,
          psychologistName: psychologistData.name,
        },
        priority: "medium",
        timestamp: new Date().toISOString(),
        userId: patientId,
        read: false,
      }

      await this.sendRealtimeNotification(patientId, notification)
    } catch (error) {
      console.error("Erro ao notificar tarefa atribuída:", error)
    }
  }

  // Notificação de lembrete de sessão
  async notifySessionReminder(patientId: number, sessionDate: Date, psychologistName: string) {
    try {
      const formattedDate = sessionDate.toLocaleDateString("pt-BR")
      const formattedTime = sessionDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })

      const notification: RealtimeNotification = {
        id: this.generateNotificationId(),
        type: "session-reminder",
        title: "🔔 Lembrete de sessão",
        message: `Sua sessão com ${psychologistName} é amanhã às ${formattedTime}`,
        data: {
          sessionDate: sessionDate.toISOString(),
          psychologistName,
          formattedDate,
          formattedTime,
        },
        priority: "high",
        timestamp: new Date().toISOString(),
        userId: patientId,
        read: false,
      }

      await this.sendRealtimeNotification(patientId, notification)
    } catch (error) {
      console.error("Erro ao notificar lembrete de sessão:", error)
    }
  }

  // Buscar notificações não lidas do usuário
  async getUnreadNotifications(userId: number): Promise<RealtimeNotification[]> {
    // Por enquanto, retornamos um array vazio
    // Em uma implementação completa, você salvaria as notificações no banco
    return []
  }

  // Marcar notificação como lida
  async markNotificationAsRead(userId: number, notificationId: string) {
    try {
      await pusherServer.trigger(`private-user-${userId}`, "notification-read", {
        notificationId,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error)
    }
  }

  // Marcar todas as notificações como lidas
  async markAllNotificationsAsRead(userId: number) {
    try {
      await pusherServer.trigger(`private-user-${userId}`, "all-notifications-read", {
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Erro ao marcar todas as notificações como lidas:", error)
    }
  }
}
