import { EmailService } from "./email"
import { SMSService } from "./sms"
import { PushNotificationService } from "./push-notifications"
import { db } from "@/db"
import { users, userSettings, patientProfiles } from "@/db/schema"
import { eq } from "drizzle-orm"

interface NotificationPreferences {
  emailNotifications: boolean
  pushNotifications: boolean
  sessionReminders: boolean
  diaryReminders: boolean
}

interface UserData {
  id: number
  name: string
  email: string
  phone?: string
  role: string
  preferences: NotificationPreferences
  pushSubscription?: any
}

export class NotificationService {
  private static instance: NotificationService
  private emailService: EmailService
  private smsService: SMSService
  private pushService: PushNotificationService

  constructor() {
    this.emailService = EmailService.getInstance()
    this.smsService = SMSService.getInstance()
    this.pushService = PushNotificationService.getInstance()
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  private async getUserData(userId: number): Promise<UserData | null> {
    try {
      const userData = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          phone: patientProfiles.phone,
          emailNotifications: userSettings.emailNotifications,
          pushNotifications: userSettings.pushNotifications,
          sessionReminders: userSettings.sessionReminders,
          diaryReminders: userSettings.diaryReminders,
        })
        .from(users)
        .leftJoin(userSettings, eq(users.id, userSettings.userId))
        .leftJoin(patientProfiles, eq(users.id, patientProfiles.userId))
        .where(eq(users.id, userId))
        .limit(1)

      if (userData.length === 0) return null

      const user = userData[0]
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || undefined,
        role: user.role,
        preferences: {
          emailNotifications: user.emailNotifications ?? true,
          pushNotifications: user.pushNotifications ?? true,
          sessionReminders: user.sessionReminders ?? true,
          diaryReminders: user.diaryReminders ?? true,
        },
      }
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error)
      return null
    }
  }

  // Enviar lembrete de sessão
  async sendSessionReminder(patientId: number, sessionDate: Date, psychologistName: string, sessionType: string) {
    const patient = await this.getUserData(patientId)
    if (!patient || !patient.preferences.sessionReminders) return

    const promises = []

    // E-mail
    if (patient.preferences.emailNotifications) {
      promises.push(
        this.emailService.sendSessionReminder(patient.email, patient.name, sessionDate, psychologistName, sessionType),
      )
    }

    // SMS
    if (patient.phone) {
      promises.push(this.smsService.sendSessionReminderSMS(patient.phone, patient.name, sessionDate, psychologistName))
    }

    // Push Notification
    if (patient.preferences.pushNotifications && patient.pushSubscription) {
      promises.push(
        this.pushService.sendSessionReminderPush(patient.pushSubscription, patient.name, sessionDate, psychologistName),
      )
    }

    const results = await Promise.allSettled(promises)
    console.log("Resultados do lembrete de sessão:", results)
  }

  // Confirmar nova sessão
  async sendSessionConfirmation(patientId: number, sessionDate: Date, psychologistName: string, sessionType: string) {
    const patient = await this.getUserData(patientId)
    if (!patient) return

    const promises = []

    // E-mail
    if (patient.preferences.emailNotifications) {
      promises.push(
        this.emailService.sendSessionConfirmation(
          patient.email,
          patient.name,
          sessionDate,
          psychologistName,
          sessionType,
        ),
      )
    }

    // SMS
    if (patient.phone) {
      promises.push(this.smsService.sendSessionConfirmationSMS(patient.phone, patient.name, sessionDate))
    }

    const results = await Promise.allSettled(promises)
    console.log("Resultados da confirmação de sessão:", results)
  }

  // Notificar nova entrada no diário
  async sendDiaryEntryNotification(psychologistId: number, patientName: string, entryTitle: string) {
    const psychologist = await this.getUserData(psychologistId)
    if (!psychologist || !psychologist.preferences.diaryReminders) return

    const promises = []

    // E-mail
    if (psychologist.preferences.emailNotifications) {
      promises.push(
        this.emailService.sendDiaryNotification(psychologist.email, psychologist.name, patientName, entryTitle),
      )
    }

    // Push Notification
    if (psychologist.preferences.pushNotifications && psychologist.pushSubscription) {
      promises.push(this.pushService.sendDiaryEntryPush(psychologist.pushSubscription, patientName, entryTitle))
    }

    const results = await Promise.allSettled(promises)
    console.log("Resultados da notificação de diário:", results)
  }

  // Alerta SOS
  async sendSOSAlert(psychologistId: number, patientName: string, patientPhone?: string) {
    const psychologist = await this.getUserData(psychologistId)
    if (!psychologist) return

    const promises = []

    // E-mail (sempre enviar para SOS)
    promises.push(
      this.emailService.sendEmail({
        to: psychologist.email,
        subject: "🚨 ALERTA SOS - Atenção Imediata Necessária",
        html: `
          <div style="background: #fee; padding: 20px; border-left: 4px solid #f00;">
            <h2 style="color: #d00;">🚨 ALERTA SOS ATIVADO</h2>
            <p><strong>Paciente:</strong> ${patientName}</p>
            <p><strong>Horário:</strong> ${new Date().toLocaleString("pt-BR")}</p>
            ${patientPhone ? `<p><strong>Telefone:</strong> ${patientPhone}</p>` : ""}
            <p style="color: #d00;"><strong>AÇÃO NECESSÁRIA:</strong> Entre em contato imediatamente com o paciente.</p>
          </div>
        `,
      }),
    )

    // SMS (sempre enviar para SOS)
    if (psychologist.phone) {
      promises.push(this.smsService.sendEmergencySMS(psychologist.phone, patientName, psychologist.name))
    }

    // Push Notification (sempre enviar para SOS)
    if (psychologist.pushSubscription) {
      promises.push(this.pushService.sendSOSAlertPush(psychologist.pushSubscription, patientName))
    }

    const results = await Promise.allSettled(promises)
    console.log("Resultados do alerta SOS:", results)
  }

  // Notificar nova mensagem no chat
  async sendChatMessageNotification(receiverId: number, senderName: string, message: string) {
    const receiver = await this.getUserData(receiverId)
    if (!receiver || !receiver.preferences.pushNotifications) return

    // Apenas push notification para mensagens de chat
    if (receiver.pushSubscription) {
      await this.pushService.sendChatMessagePush(receiver.pushSubscription, senderName, message)
    }
  }
}
