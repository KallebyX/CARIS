import { db } from '@/db';
import { sessions, userSettings, users } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { Resend } from 'resend';
import twilio from 'twilio';
import * as cron from 'node-cron';

interface SessionReminder {
  sessionId: number;
  patientName: string;
  patientEmail: string;
  psychologistName: string;
  sessionDate: Date;
  sessionType: string;
  timeUntilSession: number; // minutes
}

export class ReminderService {
  private resend: Resend;
  private twilioClient: any;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  // Initialize cron jobs for reminder checking
  initializeReminderScheduler() {
    // Check every 15 minutes for upcoming sessions
    cron.schedule('*/15 * * * *', async () => {
      await this.checkAndSendReminders();
    });

    console.log('Reminder scheduler initialized');
  }

  private async checkAndSendReminders() {
    try {
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const next1Hour = new Date(now.getTime() + 60 * 60 * 1000);
      const next15Minutes = new Date(now.getTime() + 15 * 60 * 1000);

      // Get upcoming sessions in the next 24 hours
      const upcomingSessions = await db.query.sessions.findMany({
        where: and(
          gte(sessions.sessionDate, now),
          lte(sessions.sessionDate, next24Hours),
          eq(sessions.status, 'confirmada')
        ),
        with: {
          patient: {
            with: {
              settings: true,
            },
          },
          psychologist: {
            with: {
              settings: true,
            },
          },
        },
      });

      for (const session of upcomingSessions) {
        const sessionDate = new Date(session.sessionDate);
        const timeUntilSession = Math.floor((sessionDate.getTime() - now.getTime()) / (1000 * 60));

        const patientSettings = session.patient.settings;
        const psychologistSettings = session.psychologist.settings;

        // Check if we should send 24-hour reminder
        if (this.shouldSendReminder(timeUntilSession, 24 * 60, 30)) {
          if (patientSettings?.reminderBefore24h) {
            await this.sendReminder(session, 'patient', '24 hours');
          }
          if (psychologistSettings?.reminderBefore24h) {
            await this.sendReminder(session, 'psychologist', '24 hours');
          }
        }

        // Check if we should send 1-hour reminder
        if (this.shouldSendReminder(timeUntilSession, 60, 15)) {
          if (patientSettings?.reminderBefore1h) {
            await this.sendReminder(session, 'patient', '1 hour');
          }
          if (psychologistSettings?.reminderBefore1h) {
            await this.sendReminder(session, 'psychologist', '1 hour');
          }
        }

        // Check if we should send 15-minute reminder
        if (this.shouldSendReminder(timeUntilSession, 15, 5)) {
          if (patientSettings?.reminderBefore15min) {
            await this.sendReminder(session, 'patient', '15 minutes');
          }
          if (psychologistSettings?.reminderBefore15min) {
            await this.sendReminder(session, 'psychologist', '15 minutes');
          }
        }
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  }

  private shouldSendReminder(
    timeUntilSession: number,
    targetMinutes: number,
    toleranceMinutes: number
  ): boolean {
    return Math.abs(timeUntilSession - targetMinutes) <= toleranceMinutes;
  }

  private async sendReminder(
    session: any,
    recipient: 'patient' | 'psychologist',
    timeframe: string
  ) {
    try {
      const recipientUser = recipient === 'patient' ? session.patient : session.psychologist;
      const otherUser = recipient === 'patient' ? session.psychologist : session.patient;
      const settings = recipientUser.settings;

      const sessionDate = new Date(session.sessionDate);
      const formattedDate = sessionDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const formattedTime = sessionDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      // Send email reminder if enabled
      if (settings?.emailRemindersEnabled) {
        await this.sendEmailReminder({
          to: recipientUser.email,
          recipientName: recipientUser.name,
          otherPersonName: otherUser.name,
          sessionDate: formattedDate,
          sessionTime: formattedTime,
          sessionType: session.type,
          timeframe,
          role: recipient,
        });
      }

      // Send SMS reminder if enabled
      if (settings?.smsRemindersEnabled && this.twilioClient) {
        // Note: We would need to add phone numbers to user profiles
        // This is a placeholder for SMS functionality
        await this.sendSMSReminder({
          recipientName: recipientUser.name,
          otherPersonName: otherUser.name,
          sessionDate: formattedDate,
          sessionTime: formattedTime,
          timeframe,
          role: recipient,
        });
      }

      console.log(`Sent ${timeframe} reminder to ${recipient}: ${recipientUser.name}`);
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  }

  private async sendEmailReminder(params: {
    to: string;
    recipientName: string;
    otherPersonName: string;
    sessionDate: string;
    sessionTime: string;
    sessionType: string;
    timeframe: string;
    role: 'patient' | 'psychologist';
  }) {
    const {
      to,
      recipientName,
      otherPersonName,
      sessionDate,
      sessionTime,
      sessionType,
      timeframe,
      role,
    } = params;

    const isPatient = role === 'patient';
    const subject = `Lembrete: Consulta em ${timeframe}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #2563eb; margin-bottom: 20px;">
            📅 Lembrete de Consulta
          </h2>
          
          <p>Olá, <strong>${recipientName}</strong>!</p>
          
          <p>Este é um lembrete de que você tem uma consulta agendada em <strong>${timeframe}</strong>.</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Detalhes da Consulta</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin-bottom: 10px;">
                <strong>Data:</strong> ${sessionDate}
              </li>
              <li style="margin-bottom: 10px;">
                <strong>Horário:</strong> ${sessionTime}
              </li>
              <li style="margin-bottom: 10px;">
                <strong>Tipo:</strong> ${sessionType === 'online' ? 'Online' : 'Presencial'}
              </li>
              <li style="margin-bottom: 10px;">
                <strong>${isPatient ? 'Psicólogo(a)' : 'Paciente'}:</strong> ${otherPersonName}
              </li>
            </ul>
          </div>

          ${sessionType === 'online' ? `
            <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af;">
                💻 <strong>Consulta Online:</strong> Acesse a plataforma alguns minutos antes do horário agendado.
              </p>
            </div>
          ` : ''}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Este é um lembrete automático da plataforma CÁRIS.
            </p>
          </div>
        </div>
      </div>
    `;

    await this.resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@caris.com',
      to,
      subject,
      html,
    });
  }

  private async sendSMSReminder(params: {
    recipientName: string;
    otherPersonName: string;
    sessionDate: string;
    sessionTime: string;
    timeframe: string;
    role: 'patient' | 'psychologist';
  }) {
    // Placeholder for SMS functionality
    // This would require phone numbers in user profiles
    const message = `CÁRIS: Lembrete de consulta em ${params.timeframe}. Data: ${params.sessionDate} às ${params.sessionTime}. ${params.role === 'patient' ? 'Psicólogo(a)' : 'Paciente'}: ${params.otherPersonName}`;
    
    console.log('SMS Reminder (placeholder):', message);
    
    // Implementation would be:
    // await this.twilioClient.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: recipientPhoneNumber
    // });
  }

  // Manual reminder sending for testing
  async sendTestReminder(sessionId: number, timeframe: string) {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      with: {
        patient: {
          with: {
            settings: true,
          },
        },
        psychologist: {
          with: {
            settings: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    await this.sendReminder(session, 'patient', timeframe);
    await this.sendReminder(session, 'psychologist', timeframe);
  }
}