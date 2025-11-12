// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || "development"
const RELEASE = process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA

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
    release: RELEASE,

    // Environment (production, staging, development)
    environment: ENVIRONMENT,

    // ================================================================
    // SAMPLING CONFIGURATION
    // ================================================================

    // Percentage of error events to send (1.0 = 100%)
    sampleRate: ENVIRONMENT === "production" ? 1.0 : 1.0,

    // Percentage of transactions to send for performance monitoring
    // Lower this in production to reduce costs
    tracesSampleRate: ENVIRONMENT === "production" ? 0.2 : 1.0,

    // Sample rate for profiling
    profilesSampleRate: ENVIRONMENT === "production" ? 0.1 : 0.5,

    // ================================================================
    // INTEGRATIONS
    // ================================================================

    integrations: [
      // HTTP instrumentation for tracking API calls
      Sentry.httpIntegration({
        // Don't capture request/response bodies (may contain PII)
        tracing: {
          shouldCreateSpanForRequest: (url) => {
            // Don't trace health checks
            if (url.includes("/api/health")) return false
            // Don't trace internal Next.js requests
            if (url.includes("/_next/")) return false
            return true
          },
        },
      }),

      // Node profiling for performance analysis
      Sentry.nodeProfilingIntegration(),

      // Prisma instrumentation (if using Prisma)
      Sentry.prismaIntegration(),

      // Postgres instrumentation
      Sentry.postgresIntegration(),

      // Automatically capture console errors
      Sentry.captureConsoleIntegration({
        levels: ["error"],
      }),

      // Context lines around errors
      Sentry.contextLinesIntegration(),

      // Module metadata
      Sentry.modulesIntegration(),
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

      // Scrub sensitive data from request
      if (event.request) {
        // Remove sensitive headers
        if (event.request.headers) {
          delete event.request.headers.authorization
          delete event.request.headers.cookie
          delete event.request.headers["x-auth-token"]
          delete event.request.headers["x-api-key"]
        }

        // Remove sensitive query params
        if (event.request.query_string) {
          const scrubParams = ["token", "session", "password", "email", "apiKey"]
          scrubParams.forEach((param) => {
            if (typeof event.request?.query_string === "string") {
              event.request.query_string = event.request.query_string.replace(
                new RegExp(`${param}=[^&]*`, "gi"),
                `${param}=[REDACTED]`
              )
            }
          })
        }

        // Remove request body (may contain sensitive patient data)
        delete event.request.data
      }

      // Scrub PII from extra data
      if (event.extra) {
        const scrubKeys = [
          "password",
          "token",
          "secret",
          "apiKey",
          "email",
          "phone",
          "ssn",
          "creditCard",
          "patientData",
          "medicalInfo",
        ]
        scrubKeys.forEach((key) => {
          if (event.extra && key in event.extra) {
            event.extra[key] = "[REDACTED]"
          }
        })
      }

      // Scrub sensitive data from exception messages
      if (event.exception?.values) {
        event.exception.values = event.exception.values.map((exception) => {
          if (exception.value) {
            // Redact email addresses
            exception.value = exception.value.replace(
              /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
              "[EMAIL_REDACTED]"
            )
            // Redact JWT tokens
            exception.value = exception.value.replace(
              /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
              "[TOKEN_REDACTED]"
            )
          }
          return exception
        })
      }

      // Add server context
      event.contexts = {
        ...event.contexts,
        server: {
          node_version: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: process.uptime(),
          memory: {
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          },
        },
      }

      // Log to console in staging
      if (ENVIRONMENT === "staging") {
        console.log("Sentry event:", event, hint)
      }

      return event
    },

    // Before sending breadcrumbs, scrub sensitive data
    beforeBreadcrumb(breadcrumb, hint) {
      // Don't track console logs in breadcrumbs (too noisy)
      if (breadcrumb.category === "console" && breadcrumb.level !== "error") {
        return null
      }

      // Scrub sensitive data from HTTP breadcrumbs
      if (breadcrumb.category === "http") {
        // Remove sensitive headers
        if (breadcrumb.data?.headers) {
          delete breadcrumb.data.headers.authorization
          delete breadcrumb.data.headers.cookie
        }

        // Redact sensitive URLs
        if (breadcrumb.data?.url) {
          const url = new URL(breadcrumb.data.url, "http://localhost")
          url.searchParams.delete("token")
          url.searchParams.delete("session")
          url.searchParams.delete("password")
          breadcrumb.data.url = url.pathname + url.search
        }
      }

      // Scrub sensitive data from breadcrumb data
      if (breadcrumb.data) {
        const scrubKeys = ["password", "token", "secret", "apiKey", "email"]
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
      // Database connection errors (handled by health checks)
      "Connection terminated unexpectedly",
      "Connection terminated",

      // Network timeouts (handled by retry logic)
      "ETIMEDOUT",
      "ECONNREFUSED",
      "ENOTFOUND",

      // Aborted operations
      "AbortError",
      "The operation was aborted",

      // Non-errors
      "Non-Error promise rejection captured",
      "Non-Error exception captured",

      // JWT errors (handled by auth middleware)
      "jwt malformed",
      "jwt expired",
      "invalid signature",
    ],

    // ================================================================
    // PERFORMANCE MONITORING
    // ================================================================

    // Enable tracing for database queries
    enableTracing: true,

    // ================================================================
    // CUSTOM TAGS
    // ================================================================

    // Add default tags to all events
    initialScope: {
      tags: {
        platform: "server",
        runtime: "node",
      },
    },

    // ================================================================
    // DEBUG OPTIONS
    // ================================================================

    // Enable debug mode in non-production environments
    debug: ENVIRONMENT === "staging",

    // ================================================================
    // SPOTLIGHT (LOCAL DEVELOPMENT)
    // ================================================================

    // Enable Sentry Spotlight in development for debugging
    spotlight: ENVIRONMENT === "development",

    // ================================================================
    // MAX BREADCRUMBS
    // ================================================================

    // Maximum number of breadcrumbs to keep (default is 100)
    maxBreadcrumbs: 50,

    // ================================================================
    // ATTACH STACKTRACE
    // ================================================================

    // Attach stack traces to non-error events
    attachStacktrace: true,
  })

  // ================================================================
  // SET GLOBAL CONTEXT
  // ================================================================

  // Set app context
  Sentry.setContext("app", {
    name: "CÁRIS SaaS Pro",
    version: process.env.npm_package_version || "1.0.0",
    platform: "mental-health",
    type: "server",
  })

  // Set runtime context
  Sentry.setContext("runtime", {
    name: "Node.js",
    version: process.version,
  })

  // ================================================================
  // UNCAUGHT EXCEPTION HANDLERS
  // ================================================================

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error)
    Sentry.captureException(error, {
      level: "fatal",
      tags: {
        handler: "uncaughtException",
      },
    })
  })

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason)
    Sentry.captureException(reason, {
      level: "error",
      tags: {
        handler: "unhandledRejection",
      },
      extra: {
        promise: String(promise),
      },
    })
  })

  // Handle warnings
  process.on("warning", (warning) => {
    // Only capture critical warnings
    if (warning.name === "DeprecationWarning") {
      Sentry.captureMessage(warning.message, {
        level: "warning",
        tags: {
          handler: "warning",
          warningName: warning.name,
        },
      })
    }
  })
}

// Export a flag to check if Sentry is enabled
export const sentryEnabled = isSentryEnabled

// Export Sentry instance for use in app code
export { Sentry }
