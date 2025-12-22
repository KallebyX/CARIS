/**
 * Cron Jobs Initialization
 * Central file to initialize and manage all cron jobs in the application
 */

import sessionReminderCronJobs from "./session-reminders"

export { sessionReminderCronJobs }

/**
 * Initialize all cron jobs
 * Call this function once when the application starts
 */
export function initializeCronJobs(): void {
  console.log("🕐 Initializing all application cron jobs...")

  // Initialize session reminder cron jobs
  sessionReminderCronJobs.initializeJobs()
  sessionReminderCronJobs.start()

  console.log("✓ All cron jobs initialized and started successfully")
}

/**
 * Stop all cron jobs
 * Call this during application shutdown
 */
export function stopCronJobs(): void {
  console.log("⏸️  Stopping all cron jobs...")

  sessionReminderCronJobs.stop()

  console.log("✓ All cron jobs stopped")
}

// Auto-initialize in production runtime only (not during build)
// During Vercel/Next.js build, NODE_ENV is production but we shouldn't start cron jobs
const isVercelBuild = process.env.VERCEL === "1" && process.env.NEXT_PHASE === "phase-production-build"
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build"
const shouldInitCron =
  !isBuildPhase &&
  !isVercelBuild &&
  (process.env.NODE_ENV === "production" || process.env.ENABLE_CRON === "true")

if (shouldInitCron) {
  initializeCronJobs()
}
