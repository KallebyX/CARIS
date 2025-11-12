import { db } from '@/db';
import { pgTable, serial, integer, timestamp, boolean, text, json } from 'drizzle-orm/pg-core';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

// Calendar sync logs table (needs to be added to schema)
export const calendarSyncLogs = pgTable('calendar_sync_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  direction: text('direction').notNull(), // 'to_calendar', 'from_calendar', 'bidirectional'
  provider: text('provider'), // 'google', 'outlook', 'both'
  success: boolean('success').notNull(),
  syncedCount: integer('synced_count').notNull().default(0),
  failedCount: integer('failed_count').notNull().default(0),
  conflictCount: integer('conflict_count').notNull().default(0),
  errors: json('errors'), // Array of error messages
  duration: integer('duration'), // milliseconds
  syncedAt: timestamp('synced_at').notNull().defaultNow(),
});

export interface SyncLogEntry {
  userId: number;
  direction: 'to_calendar' | 'from_calendar' | 'bidirectional';
  provider?: 'google' | 'outlook' | 'both';
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflictCount: number;
  errors?: any[];
  duration?: number;
}

export interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalSynced: number;
  totalFailed: number;
  totalConflicts: number;
  averageDuration: number;
  successRate: number;
  lastSync?: Date;
  errorRate: number;
}

export interface QuotaUsage {
  provider: 'google' | 'outlook';
  apiCallsToday: number;
  quotaLimit: number;
  quotaRemaining: number;
  quotaResetAt: Date;
  warningThreshold: number;
  isNearLimit: boolean;
}

export class CalendarSyncMonitor {
  private readonly GOOGLE_QUOTA_LIMIT = 10000; // Google Calendar API quota
  private readonly OUTLOOK_QUOTA_LIMIT = 10000; // Microsoft Graph API quota
  private readonly WARNING_THRESHOLD = 0.8; // 80% of quota

  /**
   * Log a sync operation
   */
  async logSync(entry: SyncLogEntry): Promise<void> {
    try {
      // In a real implementation, this would insert into the database
      // For now, we'll use console.log
      console.log('Calendar Sync Log:', {
        userId: entry.userId,
        direction: entry.direction,
        success: entry.success,
        synced: entry.syncedCount,
        failed: entry.failedCount,
        conflicts: entry.conflictCount,
        timestamp: new Date().toISOString(),
      });

      // Store in database (pseudo-code - requires schema migration)
      // await db.insert(calendarSyncLogs).values(entry);
    } catch (error) {
      console.error('Error logging sync operation:', error);
    }
  }

  /**
   * Get sync metrics for a user
   */
  async getUserSyncMetrics(
    userId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<SyncMetrics> {
    try {
      // In a real implementation, query from database
      // For now, return mock data
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        totalSynced: 0,
        totalFailed: 0,
        totalConflicts: 0,
        averageDuration: 0,
        successRate: 0,
        errorRate: 0,
      };

      // Real implementation would be:
      // const logs = await db.query.calendarSyncLogs.findMany({
      //   where: and(
      //     eq(calendarSyncLogs.userId, userId),
      //     startDate ? gte(calendarSyncLogs.syncedAt, startDate) : undefined,
      //     endDate ? lte(calendarSyncLogs.syncedAt, endDate) : undefined
      //   ),
      // });
      //
      // return this.calculateMetrics(logs);
    } catch (error) {
      console.error('Error getting sync metrics:', error);
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        totalSynced: 0,
        totalFailed: 0,
        totalConflicts: 0,
        averageDuration: 0,
        successRate: 0,
        errorRate: 0,
      };
    }
  }

  /**
   * Calculate metrics from sync logs
   */
  private calculateMetrics(logs: any[]): SyncMetrics {
    if (logs.length === 0) {
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        totalSynced: 0,
        totalFailed: 0,
        totalConflicts: 0,
        averageDuration: 0,
        successRate: 0,
        errorRate: 0,
      };
    }

    const totalSyncs = logs.length;
    const successfulSyncs = logs.filter((log) => log.success).length;
    const failedSyncs = totalSyncs - successfulSyncs;
    const totalSynced = logs.reduce((sum, log) => sum + log.syncedCount, 0);
    const totalFailed = logs.reduce((sum, log) => sum + log.failedCount, 0);
    const totalConflicts = logs.reduce((sum, log) => sum + log.conflictCount, 0);
    const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const averageDuration = totalDuration / totalSyncs;
    const successRate = (successfulSyncs / totalSyncs) * 100;
    const errorRate = (failedSyncs / totalSyncs) * 100;
    const lastSync = logs.length > 0 ? new Date(logs[0].syncedAt) : undefined;

    return {
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      totalSynced,
      totalFailed,
      totalConflicts,
      averageDuration,
      successRate,
      lastSync,
      errorRate,
    };
  }

  /**
   * Get sync history for a user
   */
  async getSyncHistory(
    userId: number,
    limit: number = 10
  ): Promise<Array<SyncLogEntry & { syncedAt: Date }>> {
    try {
      // In a real implementation, query from database
      return [];

      // Real implementation:
      // const logs = await db.query.calendarSyncLogs.findMany({
      //   where: eq(calendarSyncLogs.userId, userId),
      //   orderBy: desc(calendarSyncLogs.syncedAt),
      //   limit: limit,
      // });
      //
      // return logs;
    } catch (error) {
      console.error('Error getting sync history:', error);
      return [];
    }
  }

  /**
   * Monitor API quota usage
   */
  async monitorQuotaUsage(userId: number, provider: 'google' | 'outlook'): Promise<QuotaUsage> {
    try {
      const quotaLimit =
        provider === 'google' ? this.GOOGLE_QUOTA_LIMIT : this.OUTLOOK_QUOTA_LIMIT;

      // In a real implementation, track API calls in Redis or similar
      // For now, return mock data
      const apiCallsToday = 0;
      const quotaRemaining = quotaLimit - apiCallsToday;
      const isNearLimit = apiCallsToday >= quotaLimit * this.WARNING_THRESHOLD;

      // Quota resets at midnight UTC
      const now = new Date();
      const quotaResetAt = new Date(now);
      quotaResetAt.setUTCHours(24, 0, 0, 0);

      return {
        provider,
        apiCallsToday,
        quotaLimit,
        quotaRemaining,
        quotaResetAt,
        warningThreshold: quotaLimit * this.WARNING_THRESHOLD,
        isNearLimit,
      };
    } catch (error) {
      console.error('Error monitoring quota usage:', error);
      const quotaLimit =
        provider === 'google' ? this.GOOGLE_QUOTA_LIMIT : this.OUTLOOK_QUOTA_LIMIT;
      return {
        provider,
        apiCallsToday: 0,
        quotaLimit,
        quotaRemaining: quotaLimit,
        quotaResetAt: new Date(),
        warningThreshold: quotaLimit * this.WARNING_THRESHOLD,
        isNearLimit: false,
      };
    }
  }

  /**
   * Alert on sync failures
   */
  async alertOnSyncFailure(userId: number, error: string): Promise<void> {
    try {
      console.error(`Sync failure alert for user ${userId}:`, error);

      // In a real implementation, send notifications
      // - Email to user
      // - Push notification
      // - Slack/Discord webhook for admins
      // - Store in notifications table
    } catch (err) {
      console.error('Error sending sync failure alert:', err);
    }
  }

  /**
   * Alert when approaching API quota limits
   */
  async alertOnQuotaLimit(userId: number, quotaUsage: QuotaUsage): Promise<void> {
    try {
      if (quotaUsage.isNearLimit) {
        console.warn(
          `Quota limit warning for user ${userId}:`,
          `${quotaUsage.apiCallsToday}/${quotaUsage.quotaLimit} API calls used for ${quotaUsage.provider}`
        );

        // In a real implementation, send notifications
        // - Email to user
        // - Admin notification
        // - Temporarily disable auto-sync if critical
      }
    } catch (error) {
      console.error('Error sending quota alert:', error);
    }
  }

  /**
   * Get overall system sync metrics
   */
  async getSystemSyncMetrics(startDate?: Date, endDate?: Date): Promise<SyncMetrics> {
    try {
      // In a real implementation, aggregate all user metrics
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        totalSynced: 0,
        totalFailed: 0,
        totalConflicts: 0,
        averageDuration: 0,
        successRate: 0,
        errorRate: 0,
      };
    } catch (error) {
      console.error('Error getting system sync metrics:', error);
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        totalSynced: 0,
        totalFailed: 0,
        totalConflicts: 0,
        averageDuration: 0,
        successRate: 0,
        errorRate: 0,
      };
    }
  }

  /**
   * Get sync performance metrics
   */
  async getPerformanceMetrics(userId?: number): Promise<{
    averageResponseTime: number;
    peakResponseTime: number;
    syncThroughput: number; // sessions per minute
    errorDistribution: Record<string, number>;
  }> {
    try {
      // In a real implementation, analyze sync logs
      return {
        averageResponseTime: 0,
        peakResponseTime: 0,
        syncThroughput: 0,
        errorDistribution: {},
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return {
        averageResponseTime: 0,
        peakResponseTime: 0,
        syncThroughput: 0,
        errorDistribution: {},
      };
    }
  }

  /**
   * Clean up old sync logs (data retention)
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // In a real implementation, delete old logs
      console.log(`Cleaning up sync logs older than ${cutoffDate.toISOString()}`);

      // Real implementation:
      // const result = await db
      //   .delete(calendarSyncLogs)
      //   .where(lte(calendarSyncLogs.syncedAt, cutoffDate));
      //
      // return result.rowCount || 0;

      return 0;
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
      return 0;
    }
  }

  /**
   * Get sync failure trends
   */
  async getFailureTrends(
    days: number = 30
  ): Promise<Array<{ date: string; failures: number; total: number; rate: number }>> {
    try {
      // In a real implementation, aggregate failure rates by day
      return [];
    } catch (error) {
      console.error('Error getting failure trends:', error);
      return [];
    }
  }

  /**
   * Track calendar event operation (for quota management)
   */
  async trackApiCall(userId: number, provider: 'google' | 'outlook', operation: string): Promise<void> {
    try {
      // In a real implementation, increment counter in Redis
      const key = `calendar:api:${provider}:${userId}:${new Date().toISOString().split('T')[0]}`;
      console.log(`API call tracked: ${key} - ${operation}`);

      // Check if approaching quota
      const quotaUsage = await this.monitorQuotaUsage(userId, provider);
      if (quotaUsage.isNearLimit) {
        await this.alertOnQuotaLimit(userId, quotaUsage);
      }
    } catch (error) {
      console.error('Error tracking API call:', error);
    }
  }
}
