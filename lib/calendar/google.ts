import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'sms' | 'popup';
      minutes: number;
    }>;
  };
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI
    );
  }

  getAuthUrl(userId: string): string {
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId.toString(),
      prompt: 'consent'
    });
  }

  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getAccessToken(code);
    return tokens;
  }

  setCredentials(accessToken: string, refreshToken?: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  async createEvent(calendarEvent: CalendarEvent): Promise<string | null> {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const event = {
        summary: calendarEvent.summary,
        description: calendarEvent.description,
        start: {
          dateTime: calendarEvent.start.dateTime,
          timeZone: calendarEvent.start.timeZone,
        },
        end: {
          dateTime: calendarEvent.end.dateTime,
          timeZone: calendarEvent.end.timeZone,
        },
        attendees: calendarEvent.attendees,
        reminders: calendarEvent.reminders || {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours
            { method: 'popup', minutes: 60 }, // 1 hour
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      return response.data.id || null;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, calendarEvent: Partial<CalendarEvent>): Promise<void> {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const event: any = {};
      if (calendarEvent.summary) event.summary = calendarEvent.summary;
      if (calendarEvent.description) event.description = calendarEvent.description;
      if (calendarEvent.start) event.start = calendarEvent.start;
      if (calendarEvent.end) event.end = calendarEvent.end;
      if (calendarEvent.attendees) event.attendees = calendarEvent.attendees;

      await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: event,
      });
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      throw error;
    }
  }

  async getEvent(eventId: string) {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const response = await calendar.events.get({
        calendarId: 'primary',
        eventId: eventId,
      });

      return response.data;
    } catch (error) {
      console.error('Error getting Google Calendar event:', error);
      throw error;
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });
      
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials.access_token;
    } catch (error) {
      console.error('Error refreshing Google Calendar access token:', error);
      throw error;
    }
  }
}