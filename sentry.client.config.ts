// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in the browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || "development"
const RELEASE = process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

// Determine if Sentry should be enabled
const isSentryEnabled = SENTRY_DSN && ENVIRONMENT !== "development"

if (isSentryEnabled) {
  Sentry.init({
    // ================================================================
    // CORE CONFIGURATION
    // ================================================================

    // Data Source Name - connects to your Sentry project
    dsn: SENTRY_DSN,

    // Release tracking - ties errors to specific deployments
    // This helps identify when bugs were introduced
    release: RELEASE,

    // Environment (production, staging, development)
    environment: ENVIRONMENT,

    // ================================================================
    // SAMPLING CONFIGURATION
    // ================================================================

    // Percentage of error events to send (1.0 = 100%)
    // For high-traffic apps, you might want to lower this
    sampleRate: ENVIRONMENT === "production" ? 1.0 : 1.0,

    // Percentage of transactions to send for performance monitoring
    // Lower this in production to reduce costs while still getting insights
    tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 0.5,

    // ================================================================
    // SESSION REPLAY CONFIGURATION
    // ================================================================

    // Captures user session recordings when errors occur
    // Helps debug issues by seeing what the user did
    replaysSessionSampleRate: ENVIRONMENT === "production" ? 0.1 : 0.5,

    // Capture more replays when errors happen
    replaysOnErrorSampleRate: 1.0,

    // ================================================================
    // INTEGRATIONS
    // ================================================================

    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration({
        // Trace navigation (route changes)
        tracePropagationTargets: [
          "localhost",
          /^https:\/\/[^/]*\.vercel\.app/,
          /^https:\/\/caris\..*\.com/,
        ],

        // Enable automatic instrumentation
        enableInp: true,
      }),

      // Session replay for debugging
      Sentry.replayIntegration({
        // Mask all text content for privacy (mental health app)
        maskAllText: true,

        // Block all media (images, videos) for privacy
        blockAllMedia: true,

        // Privacy settings for sensitive mental health data
        mask: [".sensitive", "[data-sensitive]", "input", "textarea"],
        block: [".pii", "[data-pii]"],

        // Network details to capture
        networkDetailAllowUrls: [
          window.location.origin,
          /^https:\/\/[^/]*\.vercel\.app/,
        ],

        // Capture console logs in replays
        networkCaptureBodies: true,
      }),

      // Browser Profiling (optional - for performance analysis)
      Sentry.browserProfilingIntegration(),

      // Feedback integration for user-reported issues
      Sentry.feedbackIntegration({
        colorScheme: "system",
        showBranding: false,
        autoInject: false, // Manually control when to show
      }),
    ],

    // ================================================================
    // PRIVACY & DATA SCRUBBING
    // ================================================================

    // Before sending any event, scrub sensitive data
    beforeSend(event, hint) {
      // Don't send events in development
      if (ENVIRONMENT === "development") {
        console.log("Sentry event (not sent in dev):", event)
        return null
      }

      // Scrub sensitive data from event
      if (event.request) {
        // Remove sensitive headers
        if (event.request.headers) {
          delete event.request.headers.Authorization
          delete event.request.headers.Cookie
          delete event.request.headers["X-Auth-Token"]
        }

        // Remove sensitive query params
        if (event.request.url) {
          const url = new URL(event.request.url, window.location.origin)
          url.searchParams.delete("token")
          url.searchParams.delete("session")
          url.searchParams.delete("password")
          url.searchParams.delete("email")
          event.request.url = url.toString()
        }
      }

      // Scrub PII from extra data
      if (event.extra) {
        const scrubKeys = ["password", "token", "secret", "apiKey", "email", "phone"]
        scrubKeys.forEach((key) => {
          if (event.extra && key in event.extra) {
            event.extra[key] = "[REDACTED]"
          }
        })
      }

      // Log to console in staging
      if (ENVIRONMENT === "staging") {
        console.log("Sentry event:", event, hint)
      }

      return event
    },

    // Before sending breadcrumbs (user actions), scrub sensitive data
    beforeBreadcrumb(breadcrumb, hint) {
      // Don't track console logs in breadcrumbs (too noisy)
      if (breadcrumb.category === "console") {
        return null
      }

      // Scrub sensitive data from breadcrumbs
      if (breadcrumb.data) {
        const scrubKeys = ["password", "token", "secret", "apiKey"]
        scrubKeys.forEach((key) => {
          if (breadcrumb.data && key in breadcrumb.data) {
            breadcrumb.data[key] = "[REDACTED]"
          }
        })
      }

      return breadcrumb
    },

    // ================================================================
    // ERROR FILTERING
    // ================================================================

    // Ignore certain errors that are not actionable
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      "Can't find variable: ZiteReader",
      "jigsaw is not defined",
      "ComboSearch is not defined",

      // Network errors
      "NetworkError",
      "Network request failed",
      "Failed to fetch",
      "Load failed",

      // Browser quirks
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",

      // Aborted operations (user navigated away)
      "AbortError",
      "The operation was aborted",

      // Non-errors
      "Non-Error promise rejection captured",
      "Non-Error exception captured",

      // Ad blockers
      "adsbygoogle",
    ],

    // Don't capture errors from certain URLs (browser extensions, etc.)
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],

    // ================================================================
    // PERFORMANCE MONITORING
    // ================================================================

    // Track long tasks that block the main thread
    enableLongTaskInstrumentation: true,

    // ================================================================
    // CUSTOM TAGS
    // ================================================================

    // Add default tags to all events
    initialScope: {
      tags: {
        platform: "client",
        runtime: "browser",
      },
    },

    // ================================================================
    // DEBUG OPTIONS
    // ================================================================

    // Enable debug mode in non-production environments
    debug: ENVIRONMENT === "staging",

    // ================================================================
    // TRANSPORT OPTIONS
    // ================================================================

    // How long to wait before sending events (batching)
    transportOptions: {
      // Fetch is more reliable than XHR
      fetchOptions: {
        keepalive: true,
      },
    },
  })

  // ================================================================
  // SET GLOBAL CONTEXT
  // ================================================================

  // Set user context (will be enriched by app code)
  Sentry.setContext("app", {
    name: "CÁRIS SaaS Pro",
    version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    platform: "mental-health",
  })

  // Set device context
  Sentry.setContext("device", {
    online: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
    language: navigator.language,
    platform: navigator.platform,
    userAgent: navigator.userAgent,
  })

  // ================================================================
  // PERFORMANCE MONITORING
  // ================================================================

  // Track Web Vitals
  if (typeof window !== "undefined" && "performance" in window) {
    // CLS - Cumulative Layout Shift
    Sentry.metrics.increment("web_vitals.cls", {
      tags: { environment: ENVIRONMENT },
    })

    // LCP - Largest Contentful Paint
    Sentry.metrics.increment("web_vitals.lcp", {
      tags: { environment: ENVIRONMENT },
    })

    // FID - First Input Delay
    Sentry.metrics.increment("web_vitals.fid", {
      tags: { environment: ENVIRONMENT },
    })
  }
}

// Export a flag to check if Sentry is enabled
export const sentryEnabled = isSentryEnabled

// Export Sentry instance for use in app code
export { Sentry }
