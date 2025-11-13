/**
 * Backup Scheduler Service
 * Handles automated backup scheduling with cron jobs
 * Email and Slack notifications for success/failure
 */

import * as cron from 'node-cron';
import { databaseBackupService, BackupMetadata } from './database-backup';
import { fileBackupService, FileBackupMetadata } from './file-backup';
import { Resend } from 'resend';

export interface BackupSchedule {
  daily: string;        // Cron expression for daily backups (3 AM)
  weekly: string;       // Cron expression for weekly backups (Sunday 2 AM)
  monthly: string;      // Cron expression for monthly backups (1st day 1 AM)
}

export interface NotificationConfig {
  email: {
    enabled: boolean;
    recipients: string[];
    fromEmail: string;
  };
  slack: {
    enabled: boolean;
    webhookUrl?: string;
  };
}

const DEFAULT_SCHEDULE: BackupSchedule = {
  daily: '0 3 * * *',        // 3:00 AM every day
  weekly: '0 2 * * 0',       // 2:00 AM every Sunday
  monthly: '0 1 1 * *',      // 1:00 AM on the 1st of every month
};

export class BackupScheduler {
  private schedules: Map<string, cron.ScheduledTask> = new Map();
  private notificationConfig: NotificationConfig;
  private resend: Resend | null = null;
  private isRunning: boolean = false;

  constructor(notificationConfig?: Partial<NotificationConfig>) {
    this.notificationConfig = {
      email: {
        enabled: process.env.BACKUP_EMAIL_NOTIFICATIONS === 'true',
        recipients: (process.env.BACKUP_EMAIL_RECIPIENTS || '').split(',').filter(Boolean),
        fromEmail: process.env.FROM_EMAIL || 'noreply@caris.com',
      },
      slack: {
        enabled: process.env.BACKUP_SLACK_NOTIFICATIONS === 'true',
        webhookUrl: process.env.BACKUP_SLACK_WEBHOOK_URL,
      },
      ...notificationConfig,
    };

    // Initialize Resend for email notifications
    if (this.notificationConfig.email.enabled && process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  /**
   * Start all scheduled backup jobs
   */
  start(schedule: Partial<BackupSchedule> = {}): void {
    if (this.isRunning) {
      console.log('[BackupScheduler] Scheduler is already running');
      return;
    }

    const scheduleConfig: BackupSchedule = {
      ...DEFAULT_SCHEDULE,
      ...schedule,
    };

    console.log('[BackupScheduler] Starting backup scheduler...');
    console.log('[BackupScheduler] Schedule:', scheduleConfig);

    // Schedule daily incremental backups (database + files)
    this.schedules.set('daily', cron.schedule(scheduleConfig.daily, async () => {
      console.log('[BackupScheduler] Running daily incremental backup...');
      await this.runDailyBackup();
    }));

    // Schedule weekly full backups
    this.schedules.set('weekly', cron.schedule(scheduleConfig.weekly, async () => {
      console.log('[BackupScheduler] Running weekly full backup...');
      await this.runWeeklyBackup();
    }));

    // Schedule monthly archival backups
    this.schedules.set('monthly', cron.schedule(scheduleConfig.monthly, async () => {
      console.log('[BackupScheduler] Running monthly archival backup...');
      await this.runMonthlyBackup();
    }));

    // Schedule daily cleanup (retention policy)
    this.schedules.set('cleanup', cron.schedule('0 4 * * *', async () => {
      console.log('[BackupScheduler] Running backup cleanup...');
      await this.runCleanup();
    }));

    this.isRunning = true;
    console.log('[BackupScheduler] Scheduler started successfully');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    console.log('[BackupScheduler] Stopping backup scheduler...');

    for (const [name, task] of this.schedules.entries()) {
      task.stop();
      console.log(`[BackupScheduler] Stopped task: ${name}`);
    }

    this.schedules.clear();
    this.isRunning = false;

    console.log('[BackupScheduler] Scheduler stopped');
  }

  /**
   * Run a manual backup job
   */
  async runManualBackup(type: 'full' | 'incremental' = 'full'): Promise<{
    database: BackupMetadata;
    files: FileBackupMetadata;
  }> {
    console.log(`[BackupScheduler] Running manual ${type} backup...`);

    try {
      const startTime = Date.now();

      // Run database backup
      const dbBackup = type === 'full'
        ? await databaseBackupService.createFullBackup()
        : await databaseBackupService.createIncrementalBackup();

      // Run file backup
      const fileBackup = type === 'full'
        ? await fileBackupService.createFullBackup()
        : await fileBackupService.createIncrementalBackup();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      // Send success notification
      await this.sendSuccessNotification({
        type,
        database: dbBackup,
        files: fileBackup,
        duration,
      });

      console.log(`[BackupScheduler] Manual backup completed in ${duration}s`);

      return { database: dbBackup, files: fileBackup };

    } catch (error) {
      console.error('[BackupScheduler] Manual backup failed:', error);

      // Send failure notification
      await this.sendFailureNotification({
        type: 'manual',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    activeJobs: string[];
    nextRuns: Record<string, Date | null>;
  } {
    const nextRuns: Record<string, Date | null> = {};

    for (const [name, task] of this.schedules.entries()) {
      nextRuns[name] = task.nextDate()?.toJSDate() || null;
    }

    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.schedules.keys()),
      nextRuns,
    };
  }

  // Private methods for scheduled jobs

  private async runDailyBackup(): Promise<void> {
    try {
      const startTime = Date.now();

      console.log('[BackupScheduler] Starting daily incremental backup...');

      const dbBackup = await databaseBackupService.createIncrementalBackup();
      const fileBackup = await fileBackupService.createIncrementalBackup();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      await this.sendSuccessNotification({
        type: 'incremental',
        database: dbBackup,
        files: fileBackup,
        duration,
      });

      console.log(`[BackupScheduler] Daily backup completed in ${duration}s`);

    } catch (error) {
      console.error('[BackupScheduler] Daily backup failed:', error);

      await this.sendFailureNotification({
        type: 'daily',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async runWeeklyBackup(): Promise<void> {
    try {
      const startTime = Date.now();

      console.log('[BackupScheduler] Starting weekly full backup...');

      const dbBackup = await databaseBackupService.createFullBackup();
      const fileBackup = await fileBackupService.createFullBackup();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      await this.sendSuccessNotification({
        type: 'full',
        database: dbBackup,
        files: fileBackup,
        duration,
      });

      console.log(`[BackupScheduler] Weekly backup completed in ${duration}s`);

    } catch (error) {
      console.error('[BackupScheduler] Weekly backup failed:', error);

      await this.sendFailureNotification({
        type: 'weekly',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async runMonthlyBackup(): Promise<void> {
    try {
      const startTime = Date.now();

      console.log('[BackupScheduler] Starting monthly archival backup...');

      // Full backup with verification
      const dbBackup = await databaseBackupService.createFullBackup();
      const fileBackup = await fileBackupService.createFullBackup();

      // Verify backups
      await databaseBackupService.verifyBackup(dbBackup.id);
      await fileBackupService.verifyBackup(fileBackup.id);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      await this.sendSuccessNotification({
        type: 'full',
        database: dbBackup,
        files: fileBackup,
        duration,
        isMonthly: true,
      });

      console.log(`[BackupScheduler] Monthly backup completed in ${duration}s`);

    } catch (error) {
      console.error('[BackupScheduler] Monthly backup failed:', error);

      await this.sendFailureNotification({
        type: 'monthly',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async runCleanup(): Promise<void> {
    try {
      console.log('[BackupScheduler] Starting backup cleanup...');

      const dbDeleted = await databaseBackupService.applyRetentionPolicy();
      const fileDeleted = await fileBackupService.cleanupOldBackups(30);

      console.log(`[BackupScheduler] Cleanup completed: ${dbDeleted + fileDeleted} backups deleted`);

    } catch (error) {
      console.error('[BackupScheduler] Cleanup failed:', error);
    }
  }

  // Notification methods

  private async sendSuccessNotification(data: {
    type: string;
    database: BackupMetadata;
    files: FileBackupMetadata;
    duration: string;
    isMonthly?: boolean;
  }): Promise<void> {
    const subject = data.isMonthly
      ? '✅ Monthly Backup Completed Successfully'
      : `✅ ${data.type.charAt(0).toUpperCase() + data.type.slice(1)} Backup Completed`;

    const message = `
Backup completed successfully!

Type: ${data.type}
Duration: ${data.duration}s

Database Backup:
- ID: ${data.database.id}
- Size: ${(data.database.size / 1024 / 1024).toFixed(2)} MB
- Status: ${data.database.status}

File Backup:
- ID: ${data.files.id}
- Files: ${data.files.filesBackedUp}
- Size: ${(data.files.totalSize / 1024 / 1024).toFixed(2)} MB
- Status: ${data.files.status}

Timestamp: ${new Date().toISOString()}
    `.trim();

    await Promise.all([
      this.sendEmailNotification(subject, message, 'success'),
      this.sendSlackNotification(subject, message, 'success'),
    ]);
  }

  private async sendFailureNotification(data: {
    type: string;
    error: string;
  }): Promise<void> {
    const subject = `❌ Backup Failed - ${data.type}`;
    const message = `
BACKUP FAILURE ALERT!

Type: ${data.type}
Error: ${data.error}
Timestamp: ${new Date().toISOString()}

Please investigate immediately.
    `.trim();

    await Promise.all([
      this.sendEmailNotification(subject, message, 'error'),
      this.sendSlackNotification(subject, message, 'error'),
    ]);
  }

  private async sendEmailNotification(
    subject: string,
    message: string,
    type: 'success' | 'error'
  ): Promise<void> {
    if (!this.notificationConfig.email.enabled || !this.resend) {
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.notificationConfig.email.fromEmail,
        to: this.notificationConfig.email.recipients,
        subject: `[CARIS Backup] ${subject}`,
        text: message,
      });

      console.log('[BackupScheduler] Email notification sent');
    } catch (error) {
      console.error('[BackupScheduler] Failed to send email notification:', error);
    }
  }

  private async sendSlackNotification(
    title: string,
    message: string,
    type: 'success' | 'error'
  ): Promise<void> {
    if (!this.notificationConfig.slack.enabled || !this.notificationConfig.slack.webhookUrl) {
      return;
    }

    try {
      const color = type === 'success' ? '#36a64f' : '#ff0000';

      const payload = {
        attachments: [
          {
            color,
            title,
            text: message,
            footer: 'CARIS Backup System',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      const response = await fetch(this.notificationConfig.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API returned ${response.status}`);
      }

      console.log('[BackupScheduler] Slack notification sent');
    } catch (error) {
      console.error('[BackupScheduler] Failed to send Slack notification:', error);
    }
  }
}

// Export singleton instance
export const backupScheduler = new BackupScheduler();
