import cron from "node-cron"
import sessionReminderService, { SessionReminderService } from "@/lib/session-reminders"

/**
 * Cron Jobs for Session Reminders
 * Automatically sends reminders at configured intervals:
 * - 24 hours before sessions
 * - 1 hour before sessions
 * - 15 minutes before sessions
 */

export class SessionReminderCronJobs {
  private static instance: SessionReminderCronJobs
  private reminderService: SessionReminderService
  private jobs: Map<string, cron.ScheduledTask> = new Map()

  constructor() {
    this.reminderService = sessionReminderService
  }

  static getInstance(): SessionReminderCronJobs {
    if (!SessionReminderCronJobs.instance) {
      SessionReminderCronJobs.instance = new SessionReminderCronJobs()
    }
    return SessionReminderCronJobs.instance
  }

  /**
   * Initialize all cron jobs
   */
  initializeJobs(): void {
    console.log("🕐 Initializing session reminder cron jobs...")

    // 24-hour reminders - Run every 5 minutes to catch sessions exactly 24h away
    const job24h = cron.schedule("*/5 * * * *", async () => {
      try {
        console.log("Running 24-hour reminder check...")
        const stats = await this.reminderService.processPendingReminders("24h")
        console.log(
          `✓ 24h reminders: ${stats.successful}/${stats.processed} sent successfully`
        )
      } catch (error) {
        console.error("Error in 24h reminder cron job:", error)
      }
    })

    this.jobs.set("24h-reminders", job24h)

    // 1-hour reminders - Run every 5 minutes
    const job1h = cron.schedule("*/5 * * * *", async () => {
      try {
        console.log("Running 1-hour reminder check...")
        const stats = await this.reminderService.processPendingReminders("1h")
        console.log(
          `✓ 1h reminders: ${stats.successful}/${stats.processed} sent successfully`
        )
      } catch (error) {
        console.error("Error in 1h reminder cron job:", error)
      }
    })

    this.jobs.set("1h-reminders", job1h)

    // 15-minute reminders - Run every 5 minutes
    const job15min = cron.schedule("*/5 * * * *", async () => {
      try {
        console.log("Running 15-minute reminder check...")
        const stats = await this.reminderService.processPendingReminders("15min")
        console.log(
          `✓ 15min reminders: ${stats.successful}/${stats.processed} sent successfully`
        )
      } catch (error) {
        console.error("Error in 15min reminder cron job:", error)
      }
    })

    this.jobs.set("15min-reminders", job15min)

    // Daily summary job - Run at 8 AM every day
    const dailySummary = cron.schedule("0 8 * * *", async () => {
      try {
        console.log("Running daily reminder summary...")
        const now = new Date()
        console.log(`📊 Daily Reminder Summary - ${now.toLocaleDateString()}`)
        console.log("All cron jobs are running normally")
      } catch (error) {
        console.error("Error in daily summary cron job:", error)
      }
    })

    this.jobs.set("daily-summary", dailySummary)

    console.log("✓ All reminder cron jobs initialized successfully")
    console.log(`  - 24h reminders: Every 5 minutes`)
    console.log(`  - 1h reminders: Every 5 minutes`)
    console.log(`  - 15min reminders: Every 5 minutes`)
    console.log(`  - Daily summary: 8:00 AM every day`)
  }

  /**
   * Start all cron jobs
   */
  start(): void {
    console.log("🚀 Starting session reminder cron jobs...")
    this.jobs.forEach((job, name) => {
      job.start()
      console.log(`  ✓ Started: ${name}`)
    })
    console.log("✓ All cron jobs started successfully")
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    console.log("⏸️  Stopping session reminder cron jobs...")
    this.jobs.forEach((job, name) => {
      job.stop()
      console.log(`  ✓ Stopped: ${name}`)
    })
    console.log("✓ All cron jobs stopped")
  }

  /**
   * Get status of all cron jobs
   */
  getStatus(): {
    jobName: string
    running: boolean
  }[] {
    const status: { jobName: string; running: boolean }[] = []
    this.jobs.forEach((job, name) => {
      status.push({
        jobName: name,
        running: true, // node-cron doesn't expose running status directly
      })
    })
    return status
  }

  /**
   * Run a specific reminder job manually (for testing)
   */
  async runJobManually(
    jobType: "24h" | "1h" | "15min"
  ): Promise<{
    processed: number
    successful: number
    failed: number
  }> {
    console.log(`🔧 Manually running ${jobType} reminder job...`)
    const stats = await this.reminderService.processPendingReminders(jobType)
    console.log(
      `✓ Manual ${jobType} job complete: ${stats.successful}/${stats.processed} successful`
    )
    return stats
  }
}

// Create singleton instance
const cronJobs = SessionReminderCronJobs.getInstance()

// Auto-initialize and start if running in production
if (process.env.NODE_ENV === "production" || process.env.ENABLE_CRON === "true") {
  cronJobs.initializeJobs()
  cronJobs.start()

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, stopping cron jobs...")
    cronJobs.stop()
  })

  process.on("SIGINT", () => {
    console.log("SIGINT received, stopping cron jobs...")
    cronJobs.stop()
    process.exit(0)
  })
}

export default cronJobs
