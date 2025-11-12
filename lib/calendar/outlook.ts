import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Event } from '@microsoft/microsoft-graph-types';

export interface OutlookEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: 'text' | 'html';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
  isReminderOn?: boolean;
  reminderMinutesBeforeStart?: number;
}

export class OutlookCalendarService {
  private cca: ConfidentialClientApplication;
  private accessToken?: string;

  constructor() {
    this.cca = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID!,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
      },
    });
  }

  getAuthUrl(userId: string): string {
    const authCodeUrlParameters = {
      scopes: ['https://graph.microsoft.com/calendars.readwrite'],
      redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
      state: userId.toString(),
    };

    return this.cca.getAuthCodeUrl(authCodeUrlParameters);
  }

  async getTokensFromCode(code: string, redirectUri: string) {
    const tokenRequest = {
      code: code,
      scopes: ['https://graph.microsoft.com/calendars.readwrite'],
      redirectUri: redirectUri,
    };

    const response = await this.cca.acquireTokenByCode(tokenRequest);
    return {
      accessToken: response?.accessToken,
      refreshToken: response?.refreshToken,
    };
  }

  setAccessToken(accessToken: string) {
    this.accessToken = accessToken;
  }

  private getGraphClient(): Client {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    return Client.init({
      authProvider: (done) => {
        done(null, this.accessToken!);
      },
    });
  }

  async createEvent(outlookEvent: OutlookEvent): Promise<string | null> {
    try {
      const graphClient = this.getGraphClient();

      const event: Event = {
        subject: outlookEvent.subject,
        body: outlookEvent.body,
        start: {
          dateTime: outlookEvent.start.dateTime,
          timeZone: outlookEvent.start.timeZone,
        },
        end: {
          dateTime: outlookEvent.end.dateTime,
          timeZone: outlookEvent.end.timeZone,
        },
        attendees: outlookEvent.attendees?.map(attendee => ({
          emailAddress: attendee.emailAddress,
          type: 'required',
        })),
        isReminderOn: outlookEvent.isReminderOn ?? true,
        reminderMinutesBeforeStart: outlookEvent.reminderMinutesBeforeStart ?? 60,
      };

      const createdEvent = await graphClient.me.events.post(event);
      return createdEvent.id || null;
    } catch (error) {
      console.error('Error creating Outlook Calendar event:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, outlookEvent: Partial<OutlookEvent>): Promise<void> {
    try {
      const graphClient = this.getGraphClient();

      const event: Partial<Event> = {};
      if (outlookEvent.subject) event.subject = outlookEvent.subject;
      if (outlookEvent.body) event.body = outlookEvent.body;
      if (outlookEvent.start) event.start = outlookEvent.start;
      if (outlookEvent.end) event.end = outlookEvent.end;
      if (outlookEvent.attendees) {
        event.attendees = outlookEvent.attendees.map(attendee => ({
          emailAddress: attendee.emailAddress,
          type: 'required',
        }));
      }

      await graphClient.me.events(eventId).patch(event);
    } catch (error) {
      console.error('Error updating Outlook Calendar event:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      const graphClient = this.getGraphClient();
      await graphClient.me.events(eventId).delete();
    } catch (error) {
      console.error('Error deleting Outlook Calendar event:', error);
      throw error;
    }
  }

  async getEvent(eventId: string) {
    try {
      const graphClient = this.getGraphClient();
      const event = await graphClient.me.events(eventId).get();
      return event;
    } catch (error) {
      console.error('Error getting Outlook Calendar event:', error);
      throw error;
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const silentRequest = {
        account: null, // For confidential client, account is null
        scopes: ['https://graph.microsoft.com/calendars.readwrite'],
        refreshToken: refreshToken,
      };

      const response = await this.cca.acquireTokenSilent(silentRequest);
      return response?.accessToken;
    } catch (error) {
      console.error('Error refreshing Outlook access token:', error);
      throw error;
    }
  }

  async listEvents(startDateTime: string, endDateTime: string) {
    try {
      const graphClient = this.getGraphClient();

      const events = await graphClient
        .me.calendarView.query({
          startDateTime: startDateTime,
          endDateTime: endDateTime,
        })
        .select('subject,start,end,attendees,body,id')
        .orderby('start/dateTime')
        .get();

      return events.value || [];
    } catch (error) {
      console.error('Error listing Outlook Calendar events:', error);
      throw error;
    }
  }
}