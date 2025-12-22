/**
 * Initialize Cron Jobs
 * Import this file in your main application entry point (e.g., app/layout.tsx or instrumentation.ts)
 * to automatically start cron jobs when the application starts
 */

import { initializeCronJobs } from "./cron"

// Auto-initialize cron jobs when this module is imported
// Skip during build phase - only initialize at runtime
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build"

if (typeof window === "undefined" && !isBuildPhase) {
  // Only run on server-side at runtime (not during build)
  console.log("🚀 Initializing CÁRIS cron jobs...")
  initializeCronJobs()
}

export { initializeCronJobs }
