import twilio from "twilio"

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_PHONE_NUMBER

export class SMSService {
  private static instance: SMSService
  private client: twilio.Twilio

  constructor() {
    if (!accountSid || !authToken || !fromNumber) {
      console.warn("Twilio credentials not configured. SMS service will be disabled.")
      return
    }

    this.client = twilio(accountSid, authToken)
  }

  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService()
    }
    return SMSService.instance
  }

  async sendSMS(to: string, message: string) {
    if (!this.client) {
      console.warn("SMS service not configured")
      return { success: false, error: "SMS service not configured" }
    }

    try {
      // Formatar número para padrão internacional
      const formattedNumber = this.formatPhoneNumber(to)

      const result = await this.client.messages.create({
        body: message,
        from: fromNumber,
        to: formattedNumber,
      })

      console.log("SMS enviado com sucesso:", result.sid)
      return { success: true, data: result }
    } catch (error) {
      console.error("Erro ao enviar SMS:", error)
      return { success: false, error }
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    const cleaned = phone.replace(/\D/g, "")

    // Se começar com 55 (código do Brasil), mantém
    if (cleaned.startsWith("55")) {
      return `+${cleaned}`
    }

    // Se não tiver código do país, adiciona +55
    if (cleaned.length === 11) {
      return `+55${cleaned}`
    }

    return `+${cleaned}`
  }

  // Lembrete de sessão por SMS
  async sendSessionReminderSMS(phone: string, patientName: string, sessionDate: Date, psychologistName: string) {
    const formattedDate = sessionDate.toLocaleDateString("pt-BR")
    const formattedTime = sessionDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })

    const message = `🌟 Cáris - Lembrete de Sessão

Olá ${patientName}!

Sua sessão com ${psychologistName} é amanhã:
📅 ${formattedDate} às ${formattedTime}

Para reagendar: acesse o app ou ligue (11) 9999-9999

Cuidando de você 💚`

    return this.sendSMS(phone, message)
  }

  // Confirmação de sessão por SMS
  async sendSessionConfirmationSMS(phone: string, patientName: string, sessionDate: Date) {
    const formattedDate = sessionDate.toLocaleDateString("pt-BR")
    const formattedTime = sessionDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })

    const message = `✅ Cáris - Sessão Confirmada!

Olá ${patientName}!

Sua sessão foi confirmada para:
📅 ${formattedDate} às ${formattedTime}

Você receberá um lembrete 24h antes.

Cáris 💚`

    return this.sendSMS(phone, message)
  }

  // SMS de emergência/SOS
  async sendEmergencySMS(phone: string, patientName: string, psychologistName: string) {
    const message = `🚨 Cáris - Alerta SOS

${patientName} ativou o botão SOS.

Psicólogo responsável: ${psychologistName}

Acesse o painel para mais detalhes.

Cáris - Cuidado Imediato`

    return this.sendSMS(phone, message)
  }
}
