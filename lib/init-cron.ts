/**
 * Initialize Cron Jobs
 * Import this file in your main application entry point (e.g., app/layout.tsx or instrumentation.ts)
 * to automatically start cron jobs when the application starts
 */

import { initializeCronJobs } from "./cron"

// Auto-initialize cron jobs when this module is imported
if (typeof window === "undefined") {
  // Only run on server-side
  console.log("🚀 Initializing CÁRIS cron jobs...")
  initializeCronJobs()
}

export { initializeCronJobs }
