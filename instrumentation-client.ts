/**
 * Client Instrumentation - Next.js 15+ Turbopack Compatible
 *
 * This file is automatically loaded by Next.js on the client side.
 * It's the recommended way to initialize Sentry for Turbopack support.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
 */

import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || "development"
const RELEASE = process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

// Determine if Sentry should be enabled
const isSentryEnabled = SENTRY_DSN && ENVIRONMENT !== "development"

if (isSentryEnabled && typeof window !== "undefined") {
  Sentry.init({
    // ================================================================
    // CORE CONFIGURATION
    // ================================================================
    dsn: SENTRY_DSN,
    release: RELEASE,
    environment: ENVIRONMENT,

    // ================================================================
    // SAMPLING CONFIGURATION
    // ================================================================
    sampleRate: ENVIRONMENT === "production" ? 1.0 : 1.0,
    tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 0.5,

    // ================================================================
    // SESSION REPLAY CONFIGURATION
    // ================================================================
    replaysSessionSampleRate: ENVIRONMENT === "production" ? 0.1 : 0.5,
    replaysOnErrorSampleRate: 1.0,

    // ================================================================
    // INTEGRATIONS
    // ================================================================
    integrations: [
      Sentry.browserTracingIntegration({
        tracePropagationTargets: [
          "localhost",
          /^https:\/\/[^/]*\.vercel\.app/,
          /^https:\/\/caris\..*\.com/,
        ],
        enableInp: true,
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        mask: [".sensitive", "[data-sensitive]", "input", "textarea"],
        block: [".pii", "[data-pii]"],
        networkDetailAllowUrls: [
          window.location.origin,
          /^https:\/\/[^/]*\.vercel\.app/,
        ],
        networkCaptureBodies: true,
      }),
      Sentry.browserProfilingIntegration(),
      Sentry.feedbackIntegration({
        colorScheme: "system",
        showBranding: false,
        autoInject: false,
      }),
    ],

    // ================================================================
    // PRIVACY & DATA SCRUBBING
    // ================================================================
    beforeSend(event, hint) {
      if (ENVIRONMENT === "development") {
        return null
      }

      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers.Authorization
          delete event.request.headers.Cookie
          delete event.request.headers["X-Auth-Token"]
        }

        if (event.request.url) {
          const url = new URL(event.request.url, window.location.origin)
          url.searchParams.delete("token")
          url.searchParams.delete("session")
          url.searchParams.delete("password")
          url.searchParams.delete("email")
          event.request.url = url.toString()
        }
      }

      if (event.extra) {
        const scrubKeys = ["password", "token", "secret", "apiKey", "email", "phone"]
        scrubKeys.forEach((key) => {
          if (event.extra && key in event.extra) {
            event.extra[key] = "[REDACTED]"
          }
        })
      }

      return event
    },

    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "console") {
        return null
      }

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
    ignoreErrors: [
      "top.GLOBALS",
      "Can't find variable: ZiteReader",
      "jigsaw is not defined",
      "ComboSearch is not defined",
      "NetworkError",
      "Network request failed",
      "Failed to fetch",
      "Load failed",
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "AbortError",
      "The operation was aborted",
      "Non-Error promise rejection captured",
      "Non-Error exception captured",
      "adsbygoogle",
    ],

    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],

    // ================================================================
    // PERFORMANCE MONITORING
    // ================================================================
    enableLongTaskInstrumentation: true,

    // ================================================================
    // CUSTOM TAGS
    // ================================================================
    initialScope: {
      tags: {
        platform: "client",
        runtime: "browser",
      },
    },

    debug: ENVIRONMENT === "staging",

    transportOptions: {
      fetchOptions: {
        keepalive: true,
      },
    },
  })

  // Set global context
  Sentry.setContext("app", {
    name: "CARIS SaaS Pro",
    version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    platform: "mental-health",
  })

  Sentry.setContext("device", {
    online: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
    language: navigator.language,
    platform: navigator.platform,
    userAgent: navigator.userAgent,
  })
}

export const sentryEnabled = isSentryEnabled
export { Sentry }
