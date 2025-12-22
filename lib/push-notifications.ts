import webpush from "web-push"

// Configurar VAPID keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || "",
}

// Only configure VAPID if keys are properly set (65 bytes when decoded)
const isVapidConfigured = vapidKeys.publicKey.length > 0 && vapidKeys.privateKey.length > 0

if (isVapidConfigured) {
  try {
    webpush.setVapidDetails("mailto:admin@caris.com", vapidKeys.publicKey, vapidKeys.privateKey)
  } catch (error) {
    console.warn("Failed to configure VAPID keys:", error)
  }
}

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: any
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

export class PushNotificationService {
  private static instance: PushNotificationService

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService()
    }
    return PushNotificationService.instance
  }

  async sendNotification(subscription: PushSubscription, payload: NotificationPayload) {
    try {
      const result = await webpush.sendNotification(subscription, JSON.stringify(payload))

      console.log("Push notification enviada com sucesso")
      return { success: true, data: result }
    } catch (error) {
      console.error("Erro ao enviar push notification:", error)
      return { success: false, error }
    }
  }

  // Notificação de lembrete de sessão
  async sendSessionReminderPush(
    subscription: PushSubscription,
    patientName: string,
    sessionDate: Date,
    psychologistName: string,
  ) {
    const formattedTime = sessionDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })

    const payload: NotificationPayload = {
      title: "🌟 Lembrete de Sessão",
      body: `Sua sessão com ${psychologistName} é amanhã às ${formattedTime}`,
      icon: "/icons/session-reminder.png",
      badge: "/icons/badge.png",
      data: {
        type: "session-reminder",
        sessionDate: sessionDate.toISOString(),
        psychologist: psychologistName,
      },
      actions: [
        {
          action: "view",
          title: "Ver Detalhes",
          icon: "/icons/view.png",
        },
        {
          action: "reschedule",
          title: "Reagendar",
          icon: "/icons/reschedule.png",
        },
      ],
    }

    return this.sendNotification(subscription, payload)
  }

  // Notificação de nova mensagem no chat
  async sendChatMessagePush(subscription: PushSubscription, senderName: string, message: string) {
    const payload: NotificationPayload = {
      title: `💬 Nova mensagem de ${senderName}`,
      body: message.length > 100 ? `${message.substring(0, 100)}...` : message,
      icon: "/icons/chat.png",
      badge: "/icons/badge.png",
      data: {
        type: "chat-message",
        sender: senderName,
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: "reply",
          title: "Responder",
          icon: "/icons/reply.png",
        },
        {
          action: "view",
          title: "Ver Chat",
          icon: "/icons/view.png",
        },
      ],
    }

    return this.sendNotification(subscription, payload)
  }

  // Notificação de SOS ativado
  async sendSOSAlertPush(subscription: PushSubscription, patientName: string) {
    const payload: NotificationPayload = {
      title: "🚨 Alerta SOS Ativado",
      body: `${patientName} ativou o botão SOS e precisa de atenção imediata`,
      icon: "/icons/sos-alert.png",
      badge: "/icons/badge.png",
      image: "/icons/sos-banner.png",
      data: {
        type: "sos-alert",
        patient: patientName,
        timestamp: new Date().toISOString(),
        priority: "high",
      },
      actions: [
        {
          action: "contact",
          title: "Entrar em Contato",
          icon: "/icons/phone.png",
        },
        {
          action: "view",
          title: "Ver Detalhes",
          icon: "/icons/view.png",
        },
      ],
    }

    return this.sendNotification(subscription, payload)
  }

  // Notificação de nova entrada no diário
  async sendDiaryEntryPush(subscription: PushSubscription, patientName: string, entryTitle: string) {
    const payload: NotificationPayload = {
      title: "📝 Nova Entrada no Diário",
      body: `${patientName} fez uma nova entrada: "${entryTitle}"`,
      icon: "/icons/diary.png",
      badge: "/icons/badge.png",
      data: {
        type: "diary-entry",
        patient: patientName,
        title: entryTitle,
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          action: "view",
          title: "Ler Entrada",
          icon: "/icons/read.png",
        },
      ],
    }

    return this.sendNotification(subscription, payload)
  }
}
