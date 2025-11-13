/**
 * Performance Monitoring for CÁRIS Platform
 *
 * Provides comprehensive performance tracking including:
 * - Web Vitals (LCP, FID, CLS, FCP, TTFB)
 * - Custom performance marks and measures
 * - API response time tracking
 * - Database query performance logging
 * - Real User Monitoring (RUM)
 * - Integration with analytics providers
 *
 * @see https://web.dev/vitals/
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/analytics
 */

'use client'

// ================================================================
// TYPES & INTERFACES
// ================================================================

export interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta?: number
  id?: string
  navigationType?: string
}

export interface CustomMetric {
  name: string
  value: number
  unit?: string
  tags?: Record<string, string>
  timestamp?: number
}

export interface APIMetric {
  endpoint: string
  method: string
  duration: number
  status: number
  timestamp: number
  userId?: string
}

export interface DatabaseMetric {
  query: string
  duration: number
  rows?: number
  timestamp: number
}

// ================================================================
// WEB VITALS THRESHOLDS
// ================================================================

/**
 * Web Vitals thresholds based on Google recommendations
 * @see https://web.dev/defining-core-web-vitals-thresholds/
 */
export const VITALS_THRESHOLDS = {
  // Largest Contentful Paint (LCP)
  LCP: {
    good: 2500,
    needsImprovement: 4000,
  },
  // First Input Delay (FID)
  FID: {
    good: 100,
    needsImprovement: 300,
  },
  // Cumulative Layout Shift (CLS)
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
  },
  // First Contentful Paint (FCP)
  FCP: {
    good: 1800,
    needsImprovement: 3000,
  },
  // Time to First Byte (TTFB)
  TTFB: {
    good: 800,
    needsImprovement: 1800,
  },
  // Interaction to Next Paint (INP)
  INP: {
    good: 200,
    needsImprovement: 500,
  },
}

/**
 * Determine metric rating based on value and thresholds
 */
function getRating(
  metricName: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = VITALS_THRESHOLDS[metricName as keyof typeof VITALS_THRESHOLDS]

  if (!thresholds) return 'good'

  if (value <= thresholds.good) return 'good'
  if (value <= thresholds.needsImprovement) return 'needs-improvement'
  return 'poor'
}

// ================================================================
// WEB VITALS TRACKING
// ================================================================

/**
 * Track Web Vitals metrics using Next.js built-in support
 * Call this in your root layout or _app.tsx
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { trackWebVitals } from '@/lib/performance'
 *
 * export function reportWebVitals(metric) {
 *   trackWebVitals(metric)
 * }
 * ```
 */
export function trackWebVitals(metric: PerformanceMetric): void {
  const { name, value, id, rating } = metric

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${name}:`, {
      value: Math.round(value),
      rating,
      id,
    })
  }

  // Send to analytics
  sendToAnalytics({
    event: 'web_vitals',
    metric_name: name,
    metric_value: Math.round(value),
    metric_rating: rating,
    metric_id: id,
  })

  // Send to custom monitoring endpoint
  if (process.env.NEXT_PUBLIC_MONITORING_ENDPOINT) {
    sendToMonitoring({
      type: 'web_vital',
      name,
      value,
      rating,
      timestamp: Date.now(),
      url: window.location.pathname,
      userAgent: navigator.userAgent,
    })
  }

  // Check for poor ratings and alert
  if (rating === 'poor') {
    console.warn(`[Performance Alert] Poor ${name}: ${Math.round(value)}`)

    // Could send alert to monitoring service
    if (process.env.NEXT_PUBLIC_ENABLE_ALERTS === 'true') {
      sendAlert({
        severity: 'warning',
        message: `Poor ${name} performance detected`,
        value: Math.round(value),
        url: window.location.pathname,
      })
    }
  }
}

/**
 * Initialize Web Vitals tracking
 * Uses web-vitals library for accurate measurements
 */
export async function initWebVitals(): Promise<void> {
  try {
    // Dynamically import web-vitals to reduce initial bundle size
    const { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals')

    // Track Core Web Vitals
    onCLS((metric) => trackWebVitals({ ...metric, rating: getRating('CLS', metric.value) }))
    onFID((metric) => trackWebVitals({ ...metric, rating: getRating('FID', metric.value) }))
    onFCP((metric) => trackWebVitals({ ...metric, rating: getRating('FCP', metric.value) }))
    onLCP((metric) => trackWebVitals({ ...metric, rating: getRating('LCP', metric.value) }))
    onTTFB((metric) => trackWebVitals({ ...metric, rating: getRating('TTFB', metric.value) }))

    // Track INP (replacing FID)
    if (typeof onINP === 'function') {
      onINP((metric) => trackWebVitals({ ...metric, rating: getRating('INP', metric.value) }))
    }
  } catch (error) {
    console.error('[Performance] Failed to initialize Web Vitals:', error)
  }
}

// ================================================================
// CUSTOM PERFORMANCE MARKS & MEASURES
// ================================================================

/**
 * Create a performance mark
 * Use this to mark important points in your application
 *
 * @example
 * ```tsx
 * // Mark when data fetching starts
 * performanceMark('fetch-start')
 *
 * // ... fetch data ...
 *
 * // Mark when data fetching ends and measure duration
 * performanceMark('fetch-end')
 * const duration = performanceMeasure('data-fetch', 'fetch-start', 'fetch-end')
 * ```
 */
export function performanceMark(name: string): void {
  if (typeof window === 'undefined' || !performance.mark) return

  try {
    performance.mark(name)
  } catch (error) {
    console.error('[Performance] Failed to create mark:', error)
  }
}

/**
 * Measure duration between two performance marks
 *
 * @param name - Name for this measurement
 * @param startMark - Start mark name
 * @param endMark - End mark name (optional, defaults to now)
 * @returns Duration in milliseconds
 */
export function performanceMeasure(
  name: string,
  startMark: string,
  endMark?: string
): number | null {
  if (typeof window === 'undefined' || !performance.measure) return null

  try {
    const measure = performance.measure(name, startMark, endMark)
    const duration = Math.round(measure.duration)

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${duration}ms`)
    }

    // Send to analytics
    trackCustomMetric({
      name,
      value: duration,
      unit: 'ms',
      tags: { type: 'measure' },
    })

    return duration
  } catch (error) {
    console.error('[Performance] Failed to measure:', error)
    return null
  }
}

/**
 * Clear performance marks and measures
 */
export function clearPerformanceMarks(name?: string): void {
  if (typeof window === 'undefined') return

  try {
    if (name) {
      performance.clearMarks(name)
      performance.clearMeasures(name)
    } else {
      performance.clearMarks()
      performance.clearMeasures()
    }
  } catch (error) {
    console.error('[Performance] Failed to clear marks:', error)
  }
}

// ================================================================
// API PERFORMANCE TRACKING
// ================================================================

/**
 * Track API request performance
 * Use this in API route handlers or fetch wrappers
 *
 * @example
 * ```ts
 * const start = Date.now()
 * const response = await fetch('/api/data')
 * const duration = Date.now() - start
 *
 * trackAPIPerformance({
 *   endpoint: '/api/data',
 *   method: 'GET',
 *   duration,
 *   status: response.status
 * })
 * ```
 */
export function trackAPIPerformance(metric: APIMetric): void {
  const { endpoint, method, duration, status, userId } = metric

  // Log slow API calls
  if (duration > 1000) {
    console.warn(`[API Performance] Slow ${method} ${endpoint}: ${duration}ms`)
  }

  // Send to analytics
  sendToAnalytics({
    event: 'api_performance',
    endpoint,
    method,
    duration: Math.round(duration),
    status,
    userId,
  })

  // Store in performance buffer for monitoring
  if (typeof window !== 'undefined') {
    const buffer = getPerformanceBuffer('api')
    buffer.push({ ...metric, timestamp: Date.now() })

    // Keep only last 100 entries
    if (buffer.length > 100) {
      buffer.shift()
    }
  }
}

/**
 * API Performance wrapper for fetch
 * Automatically tracks all API calls
 *
 * @example
 * ```ts
 * const data = await performanceFetch('/api/users', { method: 'GET' })
 * ```
 */
export async function performanceFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const startTime = Date.now()
  const method = options?.method || 'GET'

  try {
    const response = await fetch(url, options)
    const duration = Date.now() - startTime

    trackAPIPerformance({
      endpoint: url,
      method,
      duration,
      status: response.status,
      timestamp: startTime,
    })

    return response
  } catch (error) {
    const duration = Date.now() - startTime

    trackAPIPerformance({
      endpoint: url,
      method,
      duration,
      status: 0, // Network error
      timestamp: startTime,
    })

    throw error
  }
}

// ================================================================
// DATABASE PERFORMANCE TRACKING
// ================================================================

/**
 * Track database query performance
 * Use this in database query wrappers
 *
 * @example
 * ```ts
 * const start = Date.now()
 * const result = await db.query.users.findMany()
 * const duration = Date.now() - start
 *
 * trackDatabaseQuery({
 *   query: 'users.findMany',
 *   duration,
 *   rows: result.length
 * })
 * ```
 */
export function trackDatabaseQuery(metric: DatabaseMetric): void {
  const { query, duration, rows } = metric

  // Log slow queries
  if (duration > 500) {
    console.warn(`[Database] Slow query: ${query} (${duration}ms)`)
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Database] ${query}: ${duration}ms (${rows || 0} rows)`)
  }

  // Send to monitoring
  sendToMonitoring({
    type: 'database_query',
    query,
    duration,
    rows,
    timestamp: Date.now(),
  })
}

/**
 * Database query wrapper with performance tracking
 *
 * @example
 * ```ts
 * const users = await withQueryTracking(
 *   'users.findMany',
 *   () => db.query.users.findMany()
 * )
 * ```
 */
export async function withQueryTracking<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await queryFn()
    const duration = Date.now() - startTime

    // Track performance
    trackDatabaseQuery({
      query: queryName,
      duration,
      rows: Array.isArray(result) ? result.length : undefined,
      timestamp: startTime,
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    // Track failed query
    trackDatabaseQuery({
      query: `${queryName} (FAILED)`,
      duration,
      timestamp: startTime,
    })

    throw error
  }
}

// ================================================================
// CUSTOM METRICS
// ================================================================

/**
 * Track custom performance metric
 *
 * @example
 * ```ts
 * trackCustomMetric({
 *   name: 'component-render',
 *   value: 150,
 *   unit: 'ms',
 *   tags: { component: 'Dashboard' }
 * })
 * ```
 */
export function trackCustomMetric(metric: CustomMetric): void {
  const { name, value, unit = 'ms', tags, timestamp = Date.now() } = metric

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Custom Metric] ${name}: ${value}${unit}`, tags)
  }

  // Send to analytics
  sendToAnalytics({
    event: 'custom_metric',
    metric_name: name,
    metric_value: value,
    metric_unit: unit,
    ...tags,
  })
}

// ================================================================
// PERFORMANCE BUFFER
// ================================================================

const performanceBuffers: Record<string, any[]> = {}

/**
 * Get or create performance buffer for a specific type
 */
function getPerformanceBuffer(type: string): any[] {
  if (!performanceBuffers[type]) {
    performanceBuffers[type] = []
  }
  return performanceBuffers[type]
}

/**
 * Get performance statistics from buffer
 *
 * @example
 * ```ts
 * const stats = getPerformanceStats('api')
 * console.log(`Average API response time: ${stats.average}ms`)
 * ```
 */
export function getPerformanceStats(type: string): {
  count: number
  average: number
  min: number
  max: number
  p50: number
  p95: number
  p99: number
} {
  const buffer = getPerformanceBuffer(type)

  if (buffer.length === 0) {
    return { count: 0, average: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 }
  }

  const values = buffer.map((m) => m.duration).sort((a, b) => a - b)
  const sum = values.reduce((a, b) => a + b, 0)

  return {
    count: buffer.length,
    average: Math.round(sum / buffer.length),
    min: values[0],
    max: values[values.length - 1],
    p50: values[Math.floor(values.length * 0.5)],
    p95: values[Math.floor(values.length * 0.95)],
    p99: values[Math.floor(values.length * 0.99)],
  }
}

/**
 * Clear performance buffer
 */
export function clearPerformanceBuffer(type?: string): void {
  if (type) {
    delete performanceBuffers[type]
  } else {
    Object.keys(performanceBuffers).forEach((key) => {
      delete performanceBuffers[key]
    })
  }
}

// ================================================================
// ANALYTICS INTEGRATION
// ================================================================

/**
 * Send data to analytics provider (Google Analytics, Plausible, etc.)
 */
function sendToAnalytics(data: Record<string, any>): void {
  // Google Analytics 4
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', data.event, data)
  }

  // Plausible Analytics
  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible(data.event, { props: data })
  }

  // Custom analytics endpoint
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch((error) => {
      console.error('[Analytics] Failed to send event:', error)
    })
  }
}

/**
 * Send data to monitoring service (Sentry, DataDog, etc.)
 */
function sendToMonitoring(data: Record<string, any>): void {
  if (!process.env.NEXT_PUBLIC_MONITORING_ENDPOINT) return

  // Batch monitoring data to reduce requests
  const buffer = getPerformanceBuffer('monitoring')
  buffer.push(data)

  // Send batch every 10 seconds or when buffer reaches 50 items
  if (buffer.length >= 50) {
    flushMonitoringBuffer()
  }
}

/**
 * Flush monitoring buffer to endpoint
 */
function flushMonitoringBuffer(): void {
  const buffer = getPerformanceBuffer('monitoring')

  if (buffer.length === 0) return

  const data = [...buffer]
  buffer.length = 0 // Clear buffer

  fetch(process.env.NEXT_PUBLIC_MONITORING_ENDPOINT!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metrics: data }),
  }).catch((error) => {
    console.error('[Monitoring] Failed to send metrics:', error)
  })
}

// Flush monitoring buffer every 10 seconds
if (typeof window !== 'undefined') {
  setInterval(flushMonitoringBuffer, 10000)
}

/**
 * Send alert to monitoring service
 */
function sendAlert(alert: {
  severity: 'info' | 'warning' | 'error'
  message: string
  value?: number
  url?: string
}): void {
  console.warn('[Performance Alert]', alert)

  // Could integrate with Sentry, PagerDuty, etc.
  if (process.env.NEXT_PUBLIC_ALERT_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ALERT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    }).catch((error) => {
      console.error('[Alert] Failed to send alert:', error)
    })
  }
}

// ================================================================
// INITIALIZATION
// ================================================================

/**
 * Initialize performance monitoring
 * Call this once in your application (e.g., in root layout)
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { initPerformanceMonitoring } from '@/lib/performance'
 *
 * export default function RootLayout({ children }) {
 *   useEffect(() => {
 *     initPerformanceMonitoring()
 *   }, [])
 *
 *   return <html>...</html>
 * }
 * ```
 */
export function initPerformanceMonitoring(): void {
  if (typeof window === 'undefined') return

  // Initialize Web Vitals
  initWebVitals()

  // Log initialization
  console.log('[Performance] Monitoring initialized')
}

// ================================================================
// REACT COMPONENT PERFORMANCE
// ================================================================

/**
 * Higher-order component for performance tracking
 *
 * @example
 * ```tsx
 * const Dashboard = withPerformanceTracking(
 *   'Dashboard',
 *   function Dashboard() {
 *     return <div>Dashboard content</div>
 *   }
 * )
 * ```
 */
export function withPerformanceTracking<P extends object>(
  componentName: string,
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function PerformanceTrackedComponent(props: P) {
    const startTime = Date.now()

    React.useEffect(() => {
      const renderTime = Date.now() - startTime

      trackCustomMetric({
        name: 'component-render',
        value: renderTime,
        unit: 'ms',
        tags: { component: componentName },
      })
    }, [])

    return React.createElement(Component, props)
  }
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  // Wait for page load
  if (document.readyState === 'complete') {
    initPerformanceMonitoring()
  } else {
    window.addEventListener('load', initPerformanceMonitoring)
  }
}
