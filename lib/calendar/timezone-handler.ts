import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface TimezoneInfo {
  timezone: string;
  offset: number;
  offsetString: string;
  isDST: boolean;
  abbreviation: string;
}

export class TimezoneHandler {
  /**
   * Get user's timezone from settings or detect from browser
   */
  static async getUserTimezone(userId: number): Promise<string> {
    try {
      const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
      });

      return settings?.timezone || 'America/Sao_Paulo';
    } catch (error) {
      console.error('Error getting user timezone:', error);
      return 'America/Sao_Paulo';
    }
  }

  /**
   * Detect timezone from browser (client-side)
   */
  static detectBrowserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.error('Error detecting browser timezone:', error);
      return 'America/Sao_Paulo';
    }
  }

  /**
   * Convert date from one timezone to another
   */
  static convertTimezone(date: Date, fromTimezone: string, toTimezone: string): Date {
    try {
      // Get the date string in the source timezone
      const dateString = date.toLocaleString('en-US', { timeZone: fromTimezone });

      // Parse it and interpret in target timezone
      const converted = new Date(dateString);

      return converted;
    } catch (error) {
      console.error('Error converting timezone:', error);
      return date;
    }
  }

  /**
   * Get timezone information
   */
  static getTimezoneInfo(timezone: string, date: Date = new Date()): TimezoneInfo {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short',
      });

      const parts = formatter.formatToParts(date);
      const timeZoneName = parts.find((part) => part.type === 'timeZoneName')?.value || '';

      // Calculate offset
      const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
      const offset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60); // in minutes

      const hours = Math.floor(Math.abs(offset) / 60);
      const minutes = Math.abs(offset) % 60;
      const sign = offset >= 0 ? '+' : '-';
      const offsetString = `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

      // Check if DST is active
      const isDST = this.isDaylightSavingTime(date, timezone);

      return {
        timezone,
        offset,
        offsetString,
        isDST,
        abbreviation: timeZoneName,
      };
    } catch (error) {
      console.error('Error getting timezone info:', error);
      return {
        timezone,
        offset: 0,
        offsetString: '+00:00',
        isDST: false,
        abbreviation: 'UTC',
      };
    }
  }

  /**
   * Check if daylight saving time is active
   */
  static isDaylightSavingTime(date: Date, timezone: string): boolean {
    try {
      // Get offset in January (winter) and July (summer)
      const january = new Date(date.getFullYear(), 0, 1);
      const july = new Date(date.getFullYear(), 6, 1);

      const janOffset = this.getTimezoneOffset(january, timezone);
      const julyOffset = this.getTimezoneOffset(july, timezone);
      const currentOffset = this.getTimezoneOffset(date, timezone);

      // DST is active if current offset is different from standard offset
      const standardOffset = Math.max(janOffset, julyOffset);
      return currentOffset < standardOffset;
    } catch (error) {
      console.error('Error checking DST:', error);
      return false;
    }
  }

  /**
   * Get timezone offset in minutes
   */
  private static getTimezoneOffset(date: Date, timezone: string): number {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
  }

  /**
   * Format date in user's timezone
   */
  static formatInTimezone(
    date: Date,
    timezone: string,
    options: Intl.DateTimeFormatOptions = {}
  ): string {
    try {
      return date.toLocaleString('pt-BR', {
        timeZone: timezone,
        ...options,
      });
    } catch (error) {
      console.error('Error formatting date in timezone:', error);
      return date.toLocaleString('pt-BR');
    }
  }

  /**
   * Get all available timezones for Brazil
   */
  static getBrazilTimezones(): Array<{ value: string; label: string; offset: string }> {
    return [
      {
        value: 'America/Sao_Paulo',
        label: 'Brasília (GMT-3)',
        offset: '-03:00',
      },
      {
        value: 'America/Manaus',
        label: 'Manaus (GMT-4)',
        offset: '-04:00',
      },
      {
        value: 'America/Rio_Branco',
        label: 'Rio Branco (GMT-5)',
        offset: '-05:00',
      },
      {
        value: 'America/Noronha',
        label: 'Fernando de Noronha (GMT-2)',
        offset: '-02:00',
      },
    ];
  }

  /**
   * Get common world timezones
   */
  static getCommonTimezones(): Array<{ value: string; label: string; offset: string }> {
    const timezones = [
      { value: 'America/Sao_Paulo', label: 'São Paulo, Rio de Janeiro (BRT)', offset: '-03:00' },
      { value: 'America/New_York', label: 'New York (EST)', offset: '-05:00' },
      { value: 'America/Los_Angeles', label: 'Los Angeles (PST)', offset: '-08:00' },
      { value: 'America/Chicago', label: 'Chicago (CST)', offset: '-06:00' },
      { value: 'Europe/London', label: 'London (GMT)', offset: '+00:00' },
      { value: 'Europe/Paris', label: 'Paris (CET)', offset: '+01:00' },
      { value: 'Europe/Moscow', label: 'Moscow (MSK)', offset: '+03:00' },
      { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: '+04:00' },
      { value: 'Asia/Kolkata', label: 'Mumbai, Kolkata (IST)', offset: '+05:30' },
      { value: 'Asia/Shanghai', label: 'Beijing, Shanghai (CST)', offset: '+08:00' },
      { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: '+09:00' },
      { value: 'Australia/Sydney', label: 'Sydney (AEDT)', offset: '+11:00' },
      { value: 'Pacific/Auckland', label: 'Auckland (NZDT)', offset: '+13:00' },
    ];

    return timezones;
  }

  /**
   * Validate timezone string
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Resolve timezone conflicts (when different users have different timezones)
   */
  static async resolveTimezoneConflict(
    userId1: number,
    userId2: number
  ): Promise<{ timezone: string; strategy: string }> {
    try {
      const [user1Settings, user2Settings] = await Promise.all([
        db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId1) }),
        db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId2) }),
      ]);

      const tz1 = user1Settings?.timezone || 'America/Sao_Paulo';
      const tz2 = user2Settings?.timezone || 'America/Sao_Paulo';

      if (tz1 === tz2) {
        return { timezone: tz1, strategy: 'same' };
      }

      // Use the timezone of the psychologist (assumed to be user1 in most cases)
      // In a real implementation, you'd check the user role
      return { timezone: tz1, strategy: 'psychologist_preference' };
    } catch (error) {
      console.error('Error resolving timezone conflict:', error);
      return { timezone: 'America/Sao_Paulo', strategy: 'default' };
    }
  }

  /**
   * Convert session time to user's local timezone
   */
  static convertSessionTime(
    sessionTime: Date,
    sessionTimezone: string,
    userTimezone: string
  ): Date {
    try {
      if (sessionTimezone === userTimezone) {
        return sessionTime;
      }

      // Get the session time as a string in the session timezone
      const sessionTimeString = sessionTime.toLocaleString('en-US', {
        timeZone: sessionTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      // Parse and interpret in user timezone
      const userLocalTime = new Date(sessionTimeString);

      return userLocalTime;
    } catch (error) {
      console.error('Error converting session time:', error);
      return sessionTime;
    }
  }

  /**
   * Get friendly timezone display name
   */
  static getTimezoneFriendlyName(timezone: string): string {
    const info = this.getTimezoneInfo(timezone);
    const city = timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
    return `${city} (${info.offsetString})`;
  }

  /**
   * Calculate time difference between two timezones
   */
  static getTimeDifference(timezone1: string, timezone2: string, date: Date = new Date()): number {
    const offset1 = this.getTimezoneOffset(date, timezone1);
    const offset2 = this.getTimezoneOffset(date, timezone2);
    return offset1 - offset2;
  }

  /**
   * Get timezone-aware date range for calendar queries
   */
  static getDateRangeInTimezone(
    startDate: Date,
    endDate: Date,
    timezone: string
  ): { start: string; end: string } {
    try {
      // Convert to ISO strings in the specified timezone
      const start = new Date(startDate.toLocaleString('en-US', { timeZone: timezone }));
      const end = new Date(endDate.toLocaleString('en-US', { timeZone: timezone }));

      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    } catch (error) {
      console.error('Error getting date range in timezone:', error);
      return {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      };
    }
  }
}
