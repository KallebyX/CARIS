/**
 * Sentry Helper Utilities
 *
 * This module provides helper functions for working with Sentry,
 * including user identification, context enrichment, custom fingerprinting,
 * and error grouping logic.
 */

import * as Sentry from "@sentry/nextjs"

// ================================================================
// TYPE DEFINITIONS
// ================================================================

interface UserContext {
  id: string
  email?: string
  username?: string
  role?: string
  subscription?: string
  ip_address?: string
}

interface CustomContext {
  [key: string]: any
}

interface BreadcrumbData {
  category: string
  message: string
  level?: Sentry.SeverityLevel
  data?: Record<string, any>
}

// ================================================================
// USER IDENTIFICATION
// ================================================================

/**
 * Set user context in Sentry
 * This helps identify which users are experiencing errors
 *
 * IMPORTANT: Only call this with non-PII data or in compliance with privacy policies
 */
export function identifyUser(user: UserContext) {
  // Don't identify users if Sentry is not initialized
  if (!Sentry.getCurrentHub().getClient()) {
    return
  }

  // Scrub sensitive data from email (for mental health privacy)
  const scrubbedEmail = user.email
    ? user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : undefined

  Sentry.setUser({
    id: user.id,
    email: scrubbedEmail, // Partially redacted for privacy
    username: user.username,
    ip_address: user.ip_address,
  })

  // Set additional user context as tags
  if (user.role) {
    Sentry.setTag("user.role", user.role)
  }

  if (user.subscription) {
    Sentry.setTag("user.subscription", user.subscription)
  }
}

/**
 * Clear user context
 * Call this on logout
 */
export function clearUser() {
  if (!Sentry.getCurrentHub().getClient()) {
    return
  }

  Sentry.setUser(null)
}

// ================================================================
// CONTEXT ENRICHMENT
// ================================================================

/**
 * Set custom context for better debugging
 */
export function setCustomContext(name: string, context: CustomContext) {
  if (!Sentry.getCurrentHub().getClient()) {
    return
  }

  Sentry.setContext(name, context)
}

/**
 * Set session context (therapy session, video call, etc.)
 */
export function setSessionContext(sessionData: {
  sessionId: string
  sessionType: string
  participantCount?: number
  duration?: number
  status?: string
}) {
  setCustomContext("session", {
    id: sessionData.sessionId,
    type: sessionData.sessionType,
    participants: sessionData.participantCount,
    duration: sessionData.duration,
    status: sessionData.status,
  })
}

/**
 * Set payment context for checkout errors
 */
export function setPaymentContext(paymentData: {
  amount?: number
  currency?: string
  paymentMethod?: string
  subscriptionPlan?: string
}) {
  setCustomContext("payment", {
    amount: paymentData.amount,
    currency: paymentData.currency,
    method: paymentData.paymentMethod,
    plan: paymentData.subscriptionPlan,
  })
}

/**
 * Set API request context
 */
export function setApiContext(apiData: {
  endpoint: string
  method: string
  statusCode?: number
  responseTime?: number
}) {
  setCustomContext("api", {
    endpoint: apiData.endpoint,
    method: apiData.method,
    status_code: apiData.statusCode,
    response_time_ms: apiData.responseTime,
  })
}

// ================================================================
// BREADCRUMBS
// ================================================================

/**
 * Add a custom breadcrumb
 * Breadcrumbs help trace user actions leading up to an error
 */
export function addBreadcrumb(breadcrumb: BreadcrumbData) {
  if (!Sentry.getCurrentHub().getClient()) {
    return
  }

  Sentry.addBreadcrumb({
    category: breadcrumb.category,
    message: breadcrumb.message,
    level: breadcrumb.level || "info",
    data: breadcrumb.data,
    timestamp: Date.now() / 1000,
  })
}

/**
 * Add navigation breadcrumb
 */
export function addNavigationBreadcrumb(from: string, to: string) {
  addBreadcrumb({
    category: "navigation",
    message: `Navigated from ${from} to ${to}`,
    level: "info",
    data: { from, to },
  })
}

/**
 * Add user action breadcrumb
 */
export function addUserActionBreadcrumb(
  action: string,
  data?: Record<string, any>
) {
  addBreadcrumb({
    category: "user-action",
    message: action,
    level: "info",
    data,
  })
}

/**
 * Add API call breadcrumb
 */
export function addApiCallBreadcrumb(
  endpoint: string,
  method: string,
  status: number
) {
  addBreadcrumb({
    category: "http",
    message: `${method} ${endpoint}`,
    level: status >= 400 ? "error" : "info",
    data: {
      url: endpoint,
      method,
      status_code: status,
    },
  })
}

// ================================================================
// TAGS
// ================================================================

/**
 * Set custom tags for better filtering in Sentry
 */
export function setTag(key: string, value: string) {
  if (!Sentry.getCurrentHub().getClient()) {
    return
  }

  Sentry.setTag(key, value)
}

/**
 * Set multiple tags at once
 */
export function setTags(tags: Record<string, string>) {
  if (!Sentry.getCurrentHub().getClient()) {
    return
  }

  Sentry.setTags(tags)
}

/**
 * Set feature flag tags
 */
export function setFeatureFlags(flags: Record<string, boolean>) {
  if (!Sentry.getCurrentHub().getClient()) {
    return
  }

  Object.entries(flags).forEach(([flag, enabled]) => {
    Sentry.setTag(`feature.${flag}`, enabled ? "enabled" : "disabled")
  })
}

// ================================================================
// ERROR FINGERPRINTING
// ================================================================

/**
 * Custom fingerprinting for better error grouping
 * Groups similar errors together in Sentry
 */
export function customFingerprint(
  error: Error,
  additionalContext?: string[]
): string[] {
  const fingerprint: string[] = ["{{ default }}"]

  // Group by error type
  if (error.name) {
    fingerprint.push(error.name)
  }

  // Group by error message pattern
  if (error.message) {
    // Remove dynamic parts from error messages
    const normalizedMessage = error.message
      .replace(/\d+/g, "N") // Replace numbers with N
      .replace(/[a-f0-9]{32}/gi, "HASH") // Replace hashes
      .replace(/[a-f0-9-]{36}/gi, "UUID") // Replace UUIDs
      .replace(/https?:\/\/[^\s]+/gi, "URL") // Replace URLs

    fingerprint.push(normalizedMessage)
  }

  // Add additional context
  if (additionalContext) {
    fingerprint.push(...additionalContext)
  }

  return fingerprint
}

/**
 * Set custom fingerprint for an error
 */
export function setErrorFingerprint(fingerprint: string[]) {
  if (!Sentry.getCurrentHub().getClient()) {
    return
  }

  Sentry.getCurrentScope().setFingerprint(fingerprint)
}

// ================================================================
// ERROR GROUPING
// ================================================================

/**
 * Group database errors
 */
export function groupDatabaseError(error: Error): string[] {
  return [
    "database",
    error.name,
    // Remove specific values from error messages
    error.message.replace(/'[^']*'/g, "'VALUE'"),
  ]
}

/**
 * Group API errors
 */
export function groupApiError(error: Error, endpoint: string): string[] {
  return ["api", endpoint, error.name]
}

/**
 * Group authentication errors
 */
export function groupAuthError(error: Error): string[] {
  return ["auth", error.name]
}

/**
 * Group validation errors
 */
export function groupValidationError(error: Error): string[] {
  return ["validation", error.name]
}

// ================================================================
// PERFORMANCE MONITORING
// ================================================================

/**
 * Create a custom transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Transaction | undefined {
  if (!Sentry.getCurrentHub().getClient()) {
    return undefined
  }

  return Sentry.startTransaction({
    name,
    op,
    tags: {
      custom: "true",
    },
  })
}

/**
 * Create a child span for detailed performance tracking
 */
export function startSpan(
  transaction: Sentry.Transaction | undefined,
  op: string,
  description: string
): Sentry.Span | undefined {
  if (!transaction) {
    return undefined
  }

  return transaction.startChild({
    op,
    description,
  })
}

/**
 * Measure the execution time of an async function
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  op: string = "function"
): Promise<T> {
  const transaction = startTransaction(name, op)

  try {
    const result = await fn()
    transaction?.setStatus("ok")
    return result
  } catch (error) {
    transaction?.setStatus("internal_error")
    throw error
  } finally {
    transaction?.finish()
  }
}

/**
 * Measure the execution time of a sync function
 */
export function measure<T>(
  name: string,
  fn: () => T,
  op: string = "function"
): T {
  const transaction = startTransaction(name, op)

  try {
    const result = fn()
    transaction?.setStatus("ok")
    return result
  } catch (error) {
    transaction?.setStatus("internal_error")
    throw error
  } finally {
    transaction?.finish()
  }
}

// ================================================================
// SOURCE MAP CONFIGURATION
// ================================================================

/**
 * Configure source map handling
 * This is typically done in build configuration, but can be adjusted at runtime
 */
export function configureSourceMaps() {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    // Source maps are uploaded to Sentry and removed from production
    // This prevents users from seeing your source code
    console.log("Source maps configured for Sentry")
  }
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

/**
 * Check if Sentry is initialized
 */
export function isSentryEnabled(): boolean {
  return !!Sentry.getCurrentHub().getClient()
}

/**
 * Get the last event ID
 * Useful for showing error reports to users
 */
export function getLastEventId(): string | undefined {
  return Sentry.lastEventId()
}

/**
 * Show user feedback dialog
 */
export function showFeedbackDialog(eventId?: string) {
  if (!isSentryEnabled()) {
    return
  }

  Sentry.showReportDialog({
    eventId: eventId || getLastEventId(),
    title: "Parece que encontramos um problema",
    subtitle: "Nossa equipe foi notificada.",
    subtitle2:
      "Se você gostaria de nos ajudar, conte-nos o que aconteceu abaixo.",
    labelName: "Nome",
    labelEmail: "Email",
    labelComments: "O que aconteceu?",
    labelClose: "Fechar",
    labelSubmit: "Enviar",
    successMessage: "Seu feedback foi enviado. Obrigado!",
  })
}

/**
 * Flush events to Sentry
 * Useful before page unload or app termination
 */
export async function flushEvents(timeout: number = 2000): Promise<boolean> {
  if (!isSentryEnabled()) {
    return true
  }

  return Sentry.flush(timeout)
}

/**
 * Close the Sentry client
 * Call this on app shutdown
 */
export async function closeSentry(timeout: number = 2000): Promise<boolean> {
  if (!isSentryEnabled()) {
    return true
  }

  return Sentry.close(timeout)
}
