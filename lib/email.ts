import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

interface EmailTemplate {
  to: string
  subject: string
  html: string
  from?: string
}

export class EmailService {
  private static instance: EmailService
  private fromEmail = process.env.FROM_EMAIL || "noreply@caris.com"

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  async sendEmail({ to, subject, html, from }: EmailTemplate) {
    try {
      const result = await resend.emails.send({
        from: from || this.fromEmail,
        to,
        subject,
        html,
      })

      console.log("Email enviado com sucesso:", result)
      return { success: true, data: result }
    } catch (error) {
      console.error("Erro ao enviar email:", error)
      return { success: false, error }
    }
  }

  // Template para lembrete de sessão
  async sendSessionReminder(
    patientEmail: string,
    patientName: string,
    sessionDate: Date,
    psychologistName: string,
    sessionType: string,
  ) {
    const formattedDate = sessionDate.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const formattedTime = sessionDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Lembrete de Sessão - Cáris</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2D9B9B, #1E7A7A); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .session-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2D9B9B; }
            .button { display: inline-block; background: #2D9B9B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌟 Lembrete de Sessão</h1>
              <p>Sua sessão está chegando!</p>
            </div>
            <div class="content">
              <p>Olá, <strong>${patientName}</strong>!</p>
              
              <p>Este é um lembrete amigável sobre sua próxima sessão de terapia:</p>
              
              <div class="session-card">
                <h3>📅 Detalhes da Sessão</h3>
                <p><strong>Data:</strong> ${formattedDate}</p>
                <p><strong>Horário:</strong> ${formattedTime}</p>
                <p><strong>Psicólogo(a):</strong> ${psychologistName}</p>
                <p><strong>Tipo:</strong> ${sessionType === "online" ? "💻 Online" : "🏢 Presencial"}</p>
              </div>

              ${
                sessionType === "online"
                  ? `
                <p>Para sessões online, certifique-se de:</p>
                <ul>
                  <li>Ter uma conexão estável com a internet</li>
                  <li>Estar em um ambiente privado e silencioso</li>
                  <li>Testar seu microfone e câmera previamente</li>
                </ul>
                <a href="#" class="button">🎥 Entrar na Sessão</a>
              `
                  : `
                <p>Para sessões presenciais, lembre-se de:</p>
                <ul>
                  <li>Chegar com 10 minutos de antecedência</li>
                  <li>Trazer um documento de identificação</li>
                  <li>Confirmar o endereço do consultório</li>
                </ul>
              `
              }

              <p>Se precisar reagendar ou tiver alguma dúvida, entre em contato conosco o quanto antes.</p>
              
              <div class="footer">
                <p>Cuidando de você com carinho 💚</p>
                <p><strong>Equipe Cáris</strong></p>
                <p><small>Este é um e-mail automático. Para dúvidas, responda este e-mail.</small></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({
      to: patientEmail,
      subject: `🌟 Lembrete: Sua sessão com ${psychologistName} é amanhã`,
      html,
    })
  }

  // Template para nova sessão agendada
  async sendSessionConfirmation(
    patientEmail: string,
    patientName: string,
    sessionDate: Date,
    psychologistName: string,
    sessionType: string,
  ) {
    const formattedDate = sessionDate.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const formattedTime = sessionDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Sessão Confirmada - Cáris</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2D9B9B, #1E7A7A); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .session-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2D9B9B; }
            .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Sessão Confirmada!</h1>
              <p>Sua sessão foi agendada com sucesso</p>
            </div>
            <div class="content">
              <p>Olá, <strong>${patientName}</strong>!</p>
              
              <div class="success">
                <strong>🎉 Ótima notícia!</strong> Sua sessão foi confirmada e está no seu calendário.
              </div>
              
              <div class="session-card">
                <h3>📅 Detalhes da Sessão</h3>
                <p><strong>Data:</strong> ${formattedDate}</p>
                <p><strong>Horário:</strong> ${formattedTime}</p>
                <p><strong>Psicólogo(a):</strong> ${psychologistName}</p>
                <p><strong>Tipo:</strong> ${sessionType === "online" ? "💻 Online" : "🏢 Presencial"}</p>
              </div>

              <p>Você receberá um lembrete 24 horas antes da sessão.</p>
              
              <p>Se precisar reagendar ou cancelar, faça isso com pelo menos 24 horas de antecedência.</p>
              
              <div class="footer">
                <p>Estamos ansiosos para te ajudar! 💚</p>
                <p><strong>Equipe Cáris</strong></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({
      to: patientEmail,
      subject: `✅ Sessão confirmada para ${formattedDate}`,
      html,
    })
  }

  // Template para nova entrada no diário
  async sendDiaryNotification(
    psychologistEmail: string,
    psychologistName: string,
    patientName: string,
    entryTitle: string,
  ) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Nova Entrada no Diário - Cáris</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2D9B9B, #1E7A7A); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .notification-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF8C42; }
            .button { display: inline-block; background: #2D9B9B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📝 Nova Entrada no Diário</h1>
              <p>Um dos seus pacientes fez uma nova entrada</p>
            </div>
            <div class="content">
              <p>Olá, <strong>Dr(a). ${psychologistName}</strong>!</p>
              
              <div class="notification-card">
                <h3>📖 Detalhes da Entrada</h3>
                <p><strong>Paciente:</strong> ${patientName}</p>
                <p><strong>Título:</strong> "${entryTitle}"</p>
                <p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
              </div>

              <p>Esta entrada está disponível para revisão no painel do psicólogo.</p>
              
              <a href="#" class="button">📋 Ver Entrada Completa</a>
              
              <div class="footer">
                <p>Acompanhando o progresso juntos 💚</p>
                <p><strong>Equipe Cáris</strong></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({
      to: psychologistEmail,
      subject: `📝 ${patientName} fez uma nova entrada no diário`,
      html,
    })
  }
}
