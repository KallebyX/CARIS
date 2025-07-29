import { GoogleCalendarService, CalendarEvent } from './google';
import { OutlookCalendarService, OutlookEvent } from './outlook';
import { db } from '@/db';
import { userSettings, sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface SessionData {
  id: number;
  patientId: number;
  psychologistId: number;
  sessionDate: Date;
  durationMinutes: number;
  type: string;
  status: string;
  notes?: string;
  timezone?: string;
}

export interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
}

export class CalendarIntegrationService {
  private googleService = new GoogleCalendarService();
  private outlookService = new OutlookCalendarService();

  async syncSessionToCalendars(
    session: SessionData,
    patient: UserData,
    psychologist: UserData
  ): Promise<{ googleEventId?: string; outlookEventId?: string }> {
    const result: { googleEventId?: string; outlookEventId?: string } = {};

    // Get user settings for the psychologist (main calendar owner)
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, psychologist.id),
    });

    if (!settings) {
      throw new Error('User settings not found');
    }

    const sessionStart = new Date(session.sessionDate);
    const sessionEnd = new Date(sessionStart.getTime() + session.durationMinutes * 60000);
    const timezone = settings.timezone || 'America/Sao_Paulo';

    const eventTitle = `Consulta com ${patient.name}`;
    const eventDescription = `Sessão de terapia ${session.type} com ${patient.name}${session.notes ? `\n\nNotas: ${session.notes}` : ''}`;

    // Sync to Google Calendar if enabled
    if (settings.googleCalendarEnabled && settings.googleCalendarAccessToken) {
      try {
        this.googleService.setCredentials(
          settings.googleCalendarAccessToken,
          settings.googleCalendarRefreshToken || undefined
        );

        const googleEvent: CalendarEvent = {
          summary: eventTitle,
          description: eventDescription,
          start: {
            dateTime: sessionStart.toISOString(),
            timeZone: timezone,
          },
          end: {
            dateTime: sessionEnd.toISOString(),
            timeZone: timezone,
          },
          attendees: [
            {
              email: patient.email,
              displayName: patient.name,
            },
          ],
          reminders: {
            useDefault: false,
            overrides: this.buildReminderOverrides(settings),
          },
        };

        const googleEventId = await this.googleService.createEvent(googleEvent);
        if (googleEventId) {
          result.googleEventId = googleEventId;
        }
      } catch (error) {
        console.error('Error syncing to Google Calendar:', error);
        // If token is expired, try to refresh
        if (settings.googleCalendarRefreshToken) {
          try {
            const newToken = await this.googleService.refreshAccessToken(
              settings.googleCalendarRefreshToken
            );
            if (newToken) {
              await db
                .update(userSettings)
                .set({ googleCalendarAccessToken: newToken })
                .where(eq(userSettings.userId, psychologist.id));
            }
          } catch (refreshError) {
            console.error('Error refreshing Google Calendar token:', refreshError);
          }
        }
      }
    }

    // Sync to Outlook Calendar if enabled
    if (settings.outlookCalendarEnabled && settings.outlookCalendarAccessToken) {
      try {
        this.outlookService.setAccessToken(settings.outlookCalendarAccessToken);

        const outlookEvent: OutlookEvent = {
          subject: eventTitle,
          body: {
            contentType: 'text',
            content: eventDescription,
          },
          start: {
            dateTime: sessionStart.toISOString(),
            timeZone: timezone,
          },
          end: {
            dateTime: sessionEnd.toISOString(),
            timeZone: timezone,
          },
          attendees: [
            {
              emailAddress: {
                address: patient.email,
                name: patient.name,
              },
            },
          ],
          isReminderOn: settings.emailRemindersEnabled || settings.reminderBefore1h,
          reminderMinutesBeforeStart: 60,
        };

        const outlookEventId = await this.outlookService.createEvent(outlookEvent);
        if (outlookEventId) {
          result.outlookEventId = outlookEventId;
        }
      } catch (error) {
        console.error('Error syncing to Outlook Calendar:', error);
        // If token is expired, try to refresh
        if (settings.outlookCalendarRefreshToken) {
          try {
            const newToken = await this.outlookService.refreshAccessToken(
              settings.outlookCalendarRefreshToken
            );
            if (newToken) {
              await db
                .update(userSettings)
                .set({ outlookCalendarAccessToken: newToken })
                .where(eq(userSettings.userId, psychologist.id));
            }
          } catch (refreshError) {
            console.error('Error refreshing Outlook token:', refreshError);
          }
        }
      }
    }

    // Update session with calendar event IDs
    if (result.googleEventId || result.outlookEventId) {
      await db
        .update(sessions)
        .set({
          googleCalendarEventId: result.googleEventId,
          outlookCalendarEventId: result.outlookEventId,
          timezone: timezone,
        })
        .where(eq(sessions.id, session.id));
    }

    return result;
  }

  async updateSessionInCalendars(
    session: SessionData,
    patient: UserData,
    psychologist: UserData
  ): Promise<void> {
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, psychologist.id),
    });

    if (!settings) return;

    const sessionStart = new Date(session.sessionDate);
    const sessionEnd = new Date(sessionStart.getTime() + session.durationMinutes * 60000);
    const timezone = settings.timezone || 'America/Sao_Paulo';

    const eventTitle = `Consulta com ${patient.name}`;
    const eventDescription = `Sessão de terapia ${session.type} com ${patient.name}${session.notes ? `\n\nNotas: ${session.notes}` : ''}`;

    // Get current session data from database
    const currentSession = await db.query.sessions.findFirst({
      where: eq(sessions.id, session.id),
    });

    if (!currentSession) return;

    // Update Google Calendar event
    if (
      currentSession.googleCalendarEventId &&
      settings.googleCalendarEnabled &&
      settings.googleCalendarAccessToken
    ) {
      try {
        this.googleService.setCredentials(
          settings.googleCalendarAccessToken,
          settings.googleCalendarRefreshToken || undefined
        );

        await this.googleService.updateEvent(currentSession.googleCalendarEventId, {
          summary: eventTitle,
          description: eventDescription,
          start: {
            dateTime: sessionStart.toISOString(),
            timeZone: timezone,
          },
          end: {
            dateTime: sessionEnd.toISOString(),
            timeZone: timezone,
          },
        });
      } catch (error) {
        console.error('Error updating Google Calendar event:', error);
      }
    }

    // Update Outlook Calendar event
    if (
      currentSession.outlookCalendarEventId &&
      settings.outlookCalendarEnabled &&
      settings.outlookCalendarAccessToken
    ) {
      try {
        this.outlookService.setAccessToken(settings.outlookCalendarAccessToken);

        await this.outlookService.updateEvent(currentSession.outlookCalendarEventId, {
          subject: eventTitle,
          body: {
            contentType: 'text',
            content: eventDescription,
          },
          start: {
            dateTime: sessionStart.toISOString(),
            timeZone: timezone,
          },
          end: {
            dateTime: sessionEnd.toISOString(),
            timeZone: timezone,
          },
        });
      } catch (error) {
        console.error('Error updating Outlook Calendar event:', error);
      }
    }
  }

  async deleteSessionFromCalendars(sessionId: number): Promise<void> {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      with: {
        psychologist: {
          with: {
            settings: true,
          },
        },
      },
    });

    if (!session || !session.psychologist?.settings) return;

    const settings = session.psychologist.settings;

    // Delete from Google Calendar
    if (session.googleCalendarEventId && settings.googleCalendarEnabled) {
      try {
        this.googleService.setCredentials(
          settings.googleCalendarAccessToken || '',
          settings.googleCalendarRefreshToken || undefined
        );
        await this.googleService.deleteEvent(session.googleCalendarEventId);
      } catch (error) {
        console.error('Error deleting Google Calendar event:', error);
      }
    }

    // Delete from Outlook Calendar
    if (session.outlookCalendarEventId && settings.outlookCalendarEnabled) {
      try {
        this.outlookService.setAccessToken(settings.outlookCalendarAccessToken || '');
        await this.outlookService.deleteEvent(session.outlookCalendarEventId);
      } catch (error) {
        console.error('Error deleting Outlook Calendar event:', error);
      }
    }
  }

  private buildReminderOverrides(settings: any) {
    const reminders = [];

    if (settings.reminderBefore24h) {
      reminders.push({ method: 'email' as const, minutes: 24 * 60 });
    }
    if (settings.reminderBefore1h) {
      reminders.push({ method: 'popup' as const, minutes: 60 });
    }
    if (settings.reminderBefore15min) {
      reminders.push({ method: 'popup' as const, minutes: 15 });
    }

    return reminders.length > 0 ? reminders : [{ method: 'popup' as const, minutes: 60 }];
  }
}