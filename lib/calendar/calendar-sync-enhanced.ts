import { db } from '@/db';
import { sessions, userSettings, users } from '@/db/schema';
import { eq, and, gte, lte, or, isNotNull } from 'drizzle-orm';
import { GoogleCalendarService } from './google';
import { OutlookCalendarService } from './outlook';
import { CalendarSyncMonitor } from './sync-monitor';

export interface SyncConflict {
  sessionId: number;
  type: 'time_mismatch' | 'deleted_external' | 'modified_external' | 'deleted_local';
  localData: any;
  externalData: any;
  resolution?: 'keep_local' | 'keep_external' | 'manual';
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: SyncConflict[];
  errors: Array<{ sessionId?: number; error: string }>;
}

export interface CalendarSyncOptions {
  userId: number;
  direction?: 'to_calendar' | 'from_calendar' | 'bidirectional';
  resolveConflicts?: boolean;
  conflictResolution?: 'keep_local' | 'keep_external' | 'newest';
  syncDeleted?: boolean;
}

export class EnhancedCalendarSyncService {
  private googleService = new GoogleCalendarService();
  private outlookService = new OutlookCalendarService();
  private syncMonitor = new CalendarSyncMonitor();

  /**
   * Perform bi-directional calendar sync for a user
   */
  async syncUserCalendar(options: CalendarSyncOptions): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: [],
      errors: [],
    };

    try {
      // Get user settings
      const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, options.userId),
      });

      if (!settings) {
        result.success = false;
        result.errors.push({ error: 'User settings not found' });
        return result;
      }

      // Sync to calendars (CÁRIS -> Calendar)
      if (options.direction === 'to_calendar' || options.direction === 'bidirectional') {
        const toCalendarResult = await this.syncToCalendars(options.userId, settings);
        result.synced += toCalendarResult.synced;
        result.failed += toCalendarResult.failed;
        result.errors.push(...toCalendarResult.errors);
      }

      // Sync from calendars (Calendar -> CÁRIS)
      if (options.direction === 'from_calendar' || options.direction === 'bidirectional') {
        const fromCalendarResult = await this.syncFromCalendars(options.userId, settings);
        result.synced += fromCalendarResult.synced;
        result.failed += fromCalendarResult.failed;
        result.conflicts.push(...fromCalendarResult.conflicts);
        result.errors.push(...fromCalendarResult.errors);
      }

      // Resolve conflicts if requested
      if (options.resolveConflicts && result.conflicts.length > 0) {
        await this.resolveConflicts(result.conflicts, options.conflictResolution || 'newest');
      }

      // Log sync operation
      await this.syncMonitor.logSync({
        userId: options.userId,
        direction: options.direction || 'bidirectional',
        success: result.failed === 0,
        syncedCount: result.synced,
        failedCount: result.failed,
        conflictCount: result.conflicts.length,
      });

      result.success = result.failed === 0;
      return result;
    } catch (error) {
      console.error('Error in enhanced calendar sync:', error);
      result.success = false;
      result.errors.push({ error: error instanceof Error ? error.message : 'Unknown error' });
      return result;
    }
  }

  /**
   * Sync CÁRIS sessions to external calendars
   */
  private async syncToCalendars(userId: number, settings: any): Promise<Partial<SyncResult>> {
    const result: Partial<SyncResult> = {
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Get all sessions for this user that need syncing
      const now = new Date();
      const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

      const userSessions = await db.query.sessions.findMany({
        where: and(
          or(
            eq(sessions.psychologistId, userId),
            eq(sessions.patientId, userId)
          ),
          gte(sessions.scheduledAt, now),
          lte(sessions.scheduledAt, futureDate),
          or(
            eq(sessions.status, 'scheduled'),
            eq(sessions.status, 'confirmed')
          )
        ),
        with: {
          patient: true,
          psychologist: true,
        },
      });

      for (const session of userSessions) {
        try {
          const isPsychologist = session.psychologistId === userId;
          const eventTitle = isPsychologist
            ? `Consulta com ${session.patient.name}`
            : `Consulta com ${session.psychologist.name}`;

          const eventDescription = `Sessão de terapia ${session.type}\n${session.notes || ''}`;

          const sessionStart = new Date(session.scheduledAt);
          const sessionEnd = new Date(sessionStart.getTime() + session.duration * 60000);
          const timezone = session.timezone || settings.timezone || 'America/Sao_Paulo';

          let synced = false;

          // Sync to Google Calendar
          if (settings.googleCalendarEnabled && settings.googleCalendarAccessToken) {
            try {
              await this.syncSessionToGoogle(
                session,
                eventTitle,
                eventDescription,
                sessionStart,
                sessionEnd,
                timezone,
                settings
              );
              synced = true;
            } catch (error) {
              console.error('Error syncing to Google Calendar:', error);
              result.errors?.push({
                sessionId: session.id,
                error: `Google Calendar sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              });
              result.failed = (result.failed || 0) + 1;
            }
          }

          // Sync to Outlook Calendar
          if (settings.outlookCalendarEnabled && settings.outlookCalendarAccessToken) {
            try {
              await this.syncSessionToOutlook(
                session,
                eventTitle,
                eventDescription,
                sessionStart,
                sessionEnd,
                timezone,
                settings
              );
              synced = true;
            } catch (error) {
              console.error('Error syncing to Outlook Calendar:', error);
              result.errors?.push({
                sessionId: session.id,
                error: `Outlook Calendar sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              });
              result.failed = (result.failed || 0) + 1;
            }
          }

          if (synced) {
            result.synced = (result.synced || 0) + 1;
          }
        } catch (error) {
          console.error(`Error syncing session ${session.id}:`, error);
          result.errors?.push({
            sessionId: session.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          result.failed = (result.failed || 0) + 1;
        }
      }

      return result;
    } catch (error) {
      console.error('Error in syncToCalendars:', error);
      result.errors?.push({ error: error instanceof Error ? error.message : 'Unknown error' });
      return result;
    }
  }

  /**
   * Sync sessions from external calendars to CÁRIS
   */
  private async syncFromCalendars(userId: number, settings: any): Promise<Partial<SyncResult>> {
    const result: Partial<SyncResult> = {
      synced: 0,
      failed: 0,
      conflicts: [],
      errors: [],
    };

    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      // Get events from Google Calendar
      if (settings.googleCalendarEnabled && settings.googleCalendarAccessToken) {
        try {
          this.googleService.setCredentials(
            settings.googleCalendarAccessToken,
            settings.googleCalendarRefreshToken || undefined
          );

          const googleEvents = await this.googleService.listEvents(
            now.toISOString(),
            futureDate.toISOString()
          );

          for (const event of googleEvents) {
            const conflict = await this.checkForConflicts(event, userId, 'google');
            if (conflict) {
              result.conflicts?.push(conflict);
            } else {
              // Event is in sync or doesn't exist in CÁRIS
              result.synced = (result.synced || 0) + 1;
            }
          }
        } catch (error) {
          console.error('Error syncing from Google Calendar:', error);
          result.errors?.push({ error: `Google Calendar import failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      }

      // Get events from Outlook Calendar
      if (settings.outlookCalendarEnabled && settings.outlookCalendarAccessToken) {
        try {
          this.outlookService.setAccessToken(settings.outlookCalendarAccessToken);

          const outlookEvents = await this.outlookService.listEvents(
            now.toISOString(),
            futureDate.toISOString()
          );

          for (const event of outlookEvents) {
            const conflict = await this.checkForConflicts(event, userId, 'outlook');
            if (conflict) {
              result.conflicts?.push(conflict);
            } else {
              result.synced = (result.synced || 0) + 1;
            }
          }
        } catch (error) {
          console.error('Error syncing from Outlook Calendar:', error);
          result.errors?.push({ error: `Outlook Calendar import failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      }

      return result;
    } catch (error) {
      console.error('Error in syncFromCalendars:', error);
      result.errors?.push({ error: error instanceof Error ? error.message : 'Unknown error' });
      return result;
    }
  }

  /**
   * Sync a single session to Google Calendar
   */
  private async syncSessionToGoogle(
    session: any,
    title: string,
    description: string,
    start: Date,
    end: Date,
    timezone: string,
    settings: any
  ): Promise<void> {
    this.googleService.setCredentials(
      settings.googleCalendarAccessToken,
      settings.googleCalendarRefreshToken || undefined
    );

    const attendees = [
      {
        email: session.patient.email,
        displayName: session.patient.name,
      },
      {
        email: session.psychologist.email,
        displayName: session.psychologist.name,
      },
    ];

    if (session.googleCalendarEventId) {
      // Update existing event
      await this.googleService.updateEvent(session.googleCalendarEventId, {
        summary: title,
        description,
        start: { dateTime: start.toISOString(), timeZone: timezone },
        end: { dateTime: end.toISOString(), timeZone: timezone },
        attendees,
      });
    } else {
      // Create new event
      const eventId = await this.googleService.createEvent({
        summary: title,
        description,
        start: { dateTime: start.toISOString(), timeZone: timezone },
        end: { dateTime: end.toISOString(), timeZone: timezone },
        attendees,
        reminders: {
          useDefault: false,
          overrides: this.buildReminderOverrides(settings),
        },
      });

      if (eventId) {
        await db
          .update(sessions)
          .set({ googleCalendarEventId: eventId })
          .where(eq(sessions.id, session.id));
      }
    }
  }

  /**
   * Sync a single session to Outlook Calendar
   */
  private async syncSessionToOutlook(
    session: any,
    title: string,
    description: string,
    start: Date,
    end: Date,
    timezone: string,
    settings: any
  ): Promise<void> {
    this.outlookService.setAccessToken(settings.outlookCalendarAccessToken);

    const attendees = [
      {
        emailAddress: {
          address: session.patient.email,
          name: session.patient.name,
        },
      },
      {
        emailAddress: {
          address: session.psychologist.email,
          name: session.psychologist.name,
        },
      },
    ];

    if (session.outlookCalendarEventId) {
      // Update existing event
      await this.outlookService.updateEvent(session.outlookCalendarEventId, {
        subject: title,
        body: { contentType: 'text', content: description },
        start: { dateTime: start.toISOString(), timeZone: timezone },
        end: { dateTime: end.toISOString(), timeZone: timezone },
        attendees,
      });
    } else {
      // Create new event
      const eventId = await this.outlookService.createEvent({
        subject: title,
        body: { contentType: 'text', content: description },
        start: { dateTime: start.toISOString(), timeZone: timezone },
        end: { dateTime: end.toISOString(), timeZone: timezone },
        attendees,
        isReminderOn: true,
        reminderMinutesBeforeStart: 60,
      });

      if (eventId) {
        await db
          .update(sessions)
          .set({ outlookCalendarEventId: eventId })
          .where(eq(sessions.id, session.id));
      }
    }
  }

  /**
   * Check for conflicts between external calendar events and CÁRIS sessions
   */
  private async checkForConflicts(
    externalEvent: any,
    userId: number,
    provider: 'google' | 'outlook'
  ): Promise<SyncConflict | null> {
    // Find corresponding session
    const eventIdField = provider === 'google' ? 'googleCalendarEventId' : 'outlookCalendarEventId';
    const eventId = externalEvent.id;

    const session = await db.query.sessions.findFirst({
      where: eq(sessions[eventIdField], eventId),
    });

    if (!session) {
      // Event exists in calendar but not in CÁRIS - might be a non-CÁRIS event
      return null;
    }

    // Check for time mismatch
    const externalStart = new Date(externalEvent.start?.dateTime || externalEvent.start);
    const sessionStart = new Date(session.scheduledAt);

    if (Math.abs(externalStart.getTime() - sessionStart.getTime()) > 60000) {
      // More than 1 minute difference
      return {
        sessionId: session.id,
        type: 'time_mismatch',
        localData: { scheduledAt: session.scheduledAt },
        externalData: { scheduledAt: externalStart },
      };
    }

    return null;
  }

  /**
   * Resolve sync conflicts
   */
  private async resolveConflicts(
    conflicts: SyncConflict[],
    strategy: 'keep_local' | 'keep_external' | 'newest'
  ): Promise<void> {
    for (const conflict of conflicts) {
      try {
        if (strategy === 'keep_local') {
          // Update external calendar with local data
          await this.updateExternalCalendar(conflict.sessionId);
        } else if (strategy === 'keep_external') {
          // Update local session with external data
          await db
            .update(sessions)
            .set({ scheduledAt: new Date(conflict.externalData.scheduledAt) })
            .where(eq(sessions.id, conflict.sessionId));
        } else if (strategy === 'newest') {
          // Keep the most recently modified version
          const localTime = new Date(conflict.localData.scheduledAt).getTime();
          const externalTime = new Date(conflict.externalData.scheduledAt).getTime();

          if (localTime > externalTime) {
            await this.updateExternalCalendar(conflict.sessionId);
          } else {
            await db
              .update(sessions)
              .set({ scheduledAt: new Date(conflict.externalData.scheduledAt) })
              .where(eq(sessions.id, conflict.sessionId));
          }
        }

        conflict.resolution = strategy;
      } catch (error) {
        console.error(`Error resolving conflict for session ${conflict.sessionId}:`, error);
      }
    }
  }

  /**
   * Update external calendar with local session data
   */
  private async updateExternalCalendar(sessionId: number): Promise<void> {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      with: {
        patient: true,
        psychologist: true,
      },
    });

    if (!session) return;

    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.psychologistId),
    });

    if (!settings) return;

    const sessionStart = new Date(session.scheduledAt);
    const sessionEnd = new Date(sessionStart.getTime() + session.duration * 60000);
    const timezone = session.timezone || settings.timezone || 'America/Sao_Paulo';

    const eventTitle = `Consulta com ${session.patient.name}`;
    const eventDescription = `Sessão de terapia ${session.type}\n${session.notes || ''}`;

    if (session.googleCalendarEventId && settings.googleCalendarEnabled) {
      try {
        this.googleService.setCredentials(
          settings.googleCalendarAccessToken!,
          settings.googleCalendarRefreshToken || undefined
        );
        await this.googleService.updateEvent(session.googleCalendarEventId, {
          summary: eventTitle,
          description: eventDescription,
          start: { dateTime: sessionStart.toISOString(), timeZone: timezone },
          end: { dateTime: sessionEnd.toISOString(), timeZone: timezone },
        });
      } catch (error) {
        console.error('Error updating Google Calendar event:', error);
      }
    }

    if (session.outlookCalendarEventId && settings.outlookCalendarEnabled) {
      try {
        this.outlookService.setAccessToken(settings.outlookCalendarAccessToken!);
        await this.outlookService.updateEvent(session.outlookCalendarEventId, {
          subject: eventTitle,
          body: { contentType: 'text', content: eventDescription },
          start: { dateTime: sessionStart.toISOString(), timeZone: timezone },
          end: { dateTime: sessionEnd.toISOString(), timeZone: timezone },
        });
      } catch (error) {
        console.error('Error updating Outlook Calendar event:', error);
      }
    }
  }

  /**
   * Build reminder overrides from user settings
   */
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

  /**
   * Batch sync multiple users' calendars
   */
  async batchSync(userIds: number[]): Promise<Map<number, SyncResult>> {
    const results = new Map<number, SyncResult>();

    for (const userId of userIds) {
      try {
        const result = await this.syncUserCalendar({
          userId,
          direction: 'bidirectional',
          resolveConflicts: true,
          conflictResolution: 'newest',
        });
        results.set(userId, result);
      } catch (error) {
        console.error(`Error syncing calendar for user ${userId}:`, error);
        results.set(userId, {
          success: false,
          synced: 0,
          failed: 0,
          conflicts: [],
          errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
        });
      }
    }

    return results;
  }

  /**
   * Schedule automatic sync (every 15 minutes)
   */
  scheduleAutoSync(): void {
    setInterval(async () => {
      try {
        // Get all users with calendar integration enabled
        const enabledUsers = await db.query.userSettings.findMany({
          where: or(
            eq(userSettings.googleCalendarEnabled, true),
            eq(userSettings.outlookCalendarEnabled, true)
          ),
        });

        const userIds = enabledUsers.map((s) => s.userId);

        if (userIds.length > 0) {
          console.log(`Starting auto-sync for ${userIds.length} users`);
          await this.batchSync(userIds);
          console.log('Auto-sync completed');
        }
      } catch (error) {
        console.error('Error in auto-sync:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes
  }
}
