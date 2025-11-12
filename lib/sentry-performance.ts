/**
 * Sentry Performance Monitoring Utilities
 *
 * This module provides utilities for performance monitoring including
 * API endpoint tracing, database query tracing, custom transaction tracking,
 * Web Vitals integration, and component render performance.
 */

import * as Sentry from "@sentry/nextjs"
import { isSentryEnabled } from "./sentry-helpers"

// ================================================================
// TYPE DEFINITIONS
// ================================================================

interface TransactionOptions {
  op: string
  name: string
  tags?: Record<string, string>
  data?: Record<string, any>
}

interface SpanOptions {
  op: string
  description: string
  tags?: Record<string, string>
  data?: Record<string, any>
}

interface ApiTraceOptions {
  endpoint: string
  method: string
  tags?: Record<string, string>
}

interface DatabaseQueryOptions {
  query: string
  table?: string
  operation?: "select" | "insert" | "update" | "delete" | "other"
  tags?: Record<string, string>
}

// ================================================================
// TRANSACTION MANAGEMENT
// ================================================================

/**
 * Start a custom transaction for performance monitoring
 */
export function startTransaction(
  options: TransactionOptions
): Sentry.Transaction | null {
  if (!isSentryEnabled()) {
    return null
  }

  const transaction = Sentry.startTransaction({
    op: options.op,
    name: options.name,
    tags: options.tags,
    data: options.data,
  })

  return transaction
}

/**
 * Start a child span within a transaction
 */
export function startSpan(
  parentSpan: Sentry.Span | Sentry.Transaction | null,
  options: SpanOptions
): Sentry.Span | null {
  if (!isSentryEnabled() || !parentSpan) {
    return null
  }

  const span = parentSpan.startChild({
    op: options.op,
    description: options.description,
    tags: options.tags,
    data: options.data,
  })

  return span
}

/**
 * Finish a transaction or span
 */
export function finishSpan(
  span: Sentry.Span | Sentry.Transaction | null,
  status?: Sentry.SpanStatusType
): void {
  if (!span) return

  if (status) {
    span.setStatus(status)
  }

  span.finish()
}

// ================================================================
// API ENDPOINT TRACING
// ================================================================

/**
 * Trace an API endpoint
 * Use this to wrap API route handlers
 */
export async function traceApi<T>(
  options: ApiTraceOptions,
  handler: (transaction: Sentry.Transaction | null) => Promise<T>
): Promise<T> {
  const transaction = startTransaction({
    op: "http.server",
    name: `${options.method} ${options.endpoint}`,
    tags: {
      "http.method": options.method,
      "http.route": options.endpoint,
      ...options.tags,
    },
  })

  try {
    const result = await handler(transaction)
    finishSpan(transaction, "ok")
    return result
  } catch (error) {
    finishSpan(transaction, "internal_error")
    throw error
  }
}

/**
 * Create a middleware wrapper for API tracing
 */
export function withApiTracing<T extends (...args: any[]) => Promise<any>>(
  endpoint: string,
  method: string,
  handler: T
): T {
  return (async (...args: any[]) => {
    return traceApi({ endpoint, method }, () => handler(...args))
  }) as T
}

/**
 * Trace an external API call
 */
export async function traceExternalApiCall<T>(
  url: string,
  method: string,
  handler: () => Promise<T>
): Promise<T> {
  const transaction = Sentry.getCurrentHub().getScope()?.getTransaction()

  const span = startSpan(transaction, {
    op: "http.client",
    description: `${method} ${url}`,
    tags: {
      "http.method": method,
      "http.url": url,
    },
  })

  const startTime = Date.now()

  try {
    const result = await handler()
    const duration = Date.now() - startTime

    if (span) {
      span.setData("duration_ms", duration)
      span.setStatus("ok")
    }

    return result
  } catch (error) {
    if (span) {
      span.setStatus("internal_error")
    }
    throw error
  } finally {
    finishSpan(span)
  }
}

// ================================================================
// DATABASE QUERY TRACING
// ================================================================

/**
 * Trace a database query
 */
export async function traceDatabaseQuery<T>(
  options: DatabaseQueryOptions,
  handler: () => Promise<T>
): Promise<T> {
  const transaction = Sentry.getCurrentHub().getScope()?.getTransaction()

  const span = startSpan(transaction, {
    op: "db.query",
    description: options.query.substring(0, 100), // Limit query length
    tags: {
      "db.operation": options.operation || "other",
      "db.table": options.table || "unknown",
      ...options.tags,
    },
    data: {
      query: options.query.substring(0, 500), // Store more of the query in data
    },
  })

  const startTime = Date.now()

  try {
    const result = await handler()
    const duration = Date.now() - startTime

    if (span) {
      span.setData("duration_ms", duration)
      span.setStatus("ok")

      // Warn about slow queries
      if (duration > 1000) {
        span.setTag("slow_query", "true")
      }
    }

    return result
  } catch (error) {
    if (span) {
      span.setStatus("internal_error")
    }
    throw error
  } finally {
    finishSpan(span)
  }
}

/**
 * Wrapper for database operations
 */
export function withDatabaseTracing<T extends (...args: any[]) => Promise<any>>(
  operation: DatabaseQueryOptions["operation"],
  table: string,
  handler: T
): T {
  return (async (...args: any[]) => {
    return traceDatabaseQuery(
      {
        query: `${operation?.toUpperCase()} ${table}`,
        table,
        operation,
      },
      () => handler(...args)
    )
  }) as T
}

// ================================================================
// CUSTOM TRANSACTION TRACKING
// ================================================================

/**
 * Trace a custom operation
 */
export async function traceOperation<T>(
  op: string,
  name: string,
  handler: (transaction: Sentry.Transaction | null) => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const transaction = startTransaction({
    op,
    name,
    tags,
  })

  try {
    const result = await handler(transaction)
    finishSpan(transaction, "ok")
    return result
  } catch (error) {
    finishSpan(transaction, "internal_error")
    throw error
  }
}

/**
 * Trace a synchronous operation
 */
export function traceSync<T>(
  op: string,
  name: string,
  handler: () => T,
  tags?: Record<string, string>
): T {
  const transaction = startTransaction({
    op,
    name,
    tags,
  })

  try {
    const result = handler()
    finishSpan(transaction, "ok")
    return result
  } catch (error) {
    finishSpan(transaction, "internal_error")
    throw error
  }
}

/**
 * Measure async function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now()
  const result = await fn()
  const duration = performance.now() - startTime

  // Record metric
  if (isSentryEnabled()) {
    Sentry.metrics.distribution(name, duration, {
      unit: "millisecond",
    })
  }

  return { result, duration }
}

/**
 * Measure sync function execution time
 */
export function measureSync<T>(
  name: string,
  fn: () => T
): { result: T; duration: number } {
  const startTime = performance.now()
  const result = fn()
  const duration = performance.now() - startTime

  // Record metric
  if (isSentryEnabled()) {
    Sentry.metrics.distribution(name, duration, {
      unit: "millisecond",
    })
  }

  return { result, duration }
}

// ================================================================
// WEB VITALS INTEGRATION
// ================================================================

/**
 * Report Web Vitals to Sentry
 * Call this in your _app.tsx or root layout
 */
export function reportWebVitals(metric: {
  id: string
  name: string
  value: number
  label: "web-vital" | "custom"
  startTime?: number
}): void {
  if (!isSentryEnabled()) {
    return
  }

  // Only report web vitals
  if (metric.label === "web-vital") {
    // Report to Sentry
    Sentry.metrics.distribution(`web_vitals.${metric.name.toLowerCase()}`, metric.value, {
      unit: "millisecond",
      tags: {
        metric_id: metric.id,
      },
    })

    // Also create a transaction for detailed analysis
    const transaction = Sentry.startTransaction({
      op: "web-vital",
      name: metric.name,
      data: {
        value: metric.value,
        id: metric.id,
      },
      tags: {
        "web-vital": metric.name,
      },
    })

    transaction.finish()
  }
}

/**
 * Track Core Web Vitals manually
 */
export function trackWebVital(
  name: "CLS" | "FID" | "FCP" | "LCP" | "TTFB" | "INP",
  value: number
): void {
  if (!isSentryEnabled()) {
    return
  }

  Sentry.metrics.distribution(`web_vitals.${name.toLowerCase()}`, value, {
    unit: "millisecond",
    tags: {
      vital: name,
    },
  })
}

// ================================================================
// COMPONENT RENDER PERFORMANCE
// ================================================================

/**
 * Track React component render performance
 * Use this in component lifecycle methods or effects
 */
export function trackComponentRender(
  componentName: string,
  phase: "mount" | "update" | "unmount",
  actualDuration: number
): void {
  if (!isSentryEnabled()) {
    return
  }

  // Only track slow renders
  if (actualDuration > 16) {
    // More than one frame (16.67ms at 60fps)
    Sentry.metrics.distribution("component.render_duration", actualDuration, {
      unit: "millisecond",
      tags: {
        component: componentName,
        phase,
      },
    })

    // Create breadcrumb for very slow renders
    if (actualDuration > 100) {
      Sentry.addBreadcrumb({
        category: "performance",
        message: `Slow render: ${componentName} (${phase})`,
        level: "warning",
        data: {
          component: componentName,
          phase,
          duration_ms: actualDuration,
        },
      })
    }
  }
}

/**
 * React Profiler callback for Sentry
 */
export function onRenderCallback(
  id: string,
  phase: "mount" | "update",
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
): void {
  trackComponentRender(id, phase, actualDuration)

  // Track performance degradation
  if (actualDuration > baseDuration * 2) {
    Sentry.addBreadcrumb({
      category: "performance",
      message: `Performance degradation in ${id}`,
      level: "warning",
      data: {
        component: id,
        actual_duration: actualDuration,
        base_duration: baseDuration,
        degradation_factor: actualDuration / baseDuration,
      },
    })
  }
}

// ================================================================
// ROUTE CHANGE PERFORMANCE
// ================================================================

/**
 * Track Next.js route change performance
 */
export function trackRouteChange(url: string, duration: number): void {
  if (!isSentryEnabled()) {
    return
  }

  Sentry.metrics.distribution("route.change_duration", duration, {
    unit: "millisecond",
    tags: {
      route: url,
    },
  })

  // Create transaction for detailed analysis
  const transaction = Sentry.startTransaction({
    op: "navigation",
    name: url,
    data: {
      duration,
    },
  })

  transaction.finish()
}

// ================================================================
// RESOURCE TIMING
// ================================================================

/**
 * Track resource loading performance
 */
export function trackResourceTiming(
  resource: PerformanceResourceTiming
): void {
  if (!isSentryEnabled()) {
    return
  }

  const duration = resource.responseEnd - resource.fetchStart

  // Only track significant resources
  if (duration > 100) {
    Sentry.metrics.distribution("resource.load_duration", duration, {
      unit: "millisecond",
      tags: {
        resource_type: resource.initiatorType,
        resource_name: resource.name.split("/").pop() || "unknown",
      },
    })
  }
}

/**
 * Monitor all resource timings
 */
export function monitorResourceTimings(): void {
  if (typeof window === "undefined" || !isSentryEnabled()) {
    return
  }

  // Monitor resource timings
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === "resource") {
        trackResourceTiming(entry as PerformanceResourceTiming)
      }
    }
  })

  observer.observe({ entryTypes: ["resource"] })
}

// ================================================================
// CUSTOM METRICS
// ================================================================

/**
 * Track a custom metric counter
 */
export function trackCounter(
  name: string,
  value: number = 1,
  tags?: Record<string, string>
): void {
  if (!isSentryEnabled()) {
    return
  }

  Sentry.metrics.increment(name, value, {
    tags,
  })
}

/**
 * Track a custom metric gauge
 */
export function trackGauge(
  name: string,
  value: number,
  tags?: Record<string, string>
): void {
  if (!isSentryEnabled()) {
    return
  }

  Sentry.metrics.gauge(name, value, {
    tags,
  })
}

/**
 * Track a custom metric distribution
 */
export function trackDistribution(
  name: string,
  value: number,
  unit?: string,
  tags?: Record<string, string>
): void {
  if (!isSentryEnabled()) {
    return
  }

  Sentry.metrics.distribution(name, value, {
    unit: unit as any,
    tags,
  })
}

/**
 * Track a custom metric set
 */
export function trackSet(
  name: string,
  value: string | number,
  tags?: Record<string, string>
): void {
  if (!isSentryEnabled()) {
    return
  }

  Sentry.metrics.set(name, value, {
    tags,
  })
}

// ================================================================
// BUSINESS METRICS
// ================================================================

/**
 * Track user engagement metrics
 */
export function trackUserEngagement(
  action: string,
  metadata?: Record<string, string>
): void {
  trackCounter("user.engagement", 1, {
    action,
    ...metadata,
  })
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(
  feature: string,
  userId: string
): void {
  trackCounter("feature.usage", 1, {
    feature,
  })

  trackSet("feature.unique_users", userId, {
    feature,
  })
}

/**
 * Track conversion events
 */
export function trackConversion(
  event: string,
  value?: number
): void {
  trackCounter("conversion.event", 1, {
    event,
  })

  if (value !== undefined) {
    trackDistribution("conversion.value", value, "dollar", {
      event,
    })
  }
}

/**
 * Track therapy session metrics
 */
export function trackSessionMetrics(
  sessionType: string,
  duration: number,
  participantCount: number
): void {
  trackCounter("session.completed", 1, {
    type: sessionType,
  })

  trackDistribution("session.duration", duration, "minute", {
    type: sessionType,
  })

  trackGauge("session.participants", participantCount, {
    type: sessionType,
  })
}

// ================================================================
// INITIALIZATION
// ================================================================

/**
 * Initialize performance monitoring
 * Call this in your app initialization
 */
export function initializePerformanceMonitoring(): void {
  if (typeof window === "undefined" || !isSentryEnabled()) {
    return
  }

  // Monitor resource timings
  monitorResourceTimings()

  // Track route changes (Next.js)
  let routeChangeStart: number | null = null

  const handleRouteChangeStart = () => {
    routeChangeStart = performance.now()
  }

  const handleRouteChangeComplete = (url: string) => {
    if (routeChangeStart !== null) {
      const duration = performance.now() - routeChangeStart
      trackRouteChange(url, duration)
      routeChangeStart = null
    }
  }

  // Add event listeners if Next.js router is available
  if (typeof window !== "undefined" && (window as any).next) {
    const router = (window as any).next.router
    if (router) {
      router.events.on("routeChangeStart", handleRouteChangeStart)
      router.events.on("routeChangeComplete", handleRouteChangeComplete)
    }
  }

  console.log("Performance monitoring initialized")
}
