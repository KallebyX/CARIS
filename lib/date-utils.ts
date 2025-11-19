/**
 * Date Utilities for CÁRIS Platform
 *
 * Standardized date handling to ensure consistency across the codebase.
 *
 * Conventions:
 * - All API requests/responses use ISO 8601 strings
 * - Database stores timestamps (PostgreSQL timestamptz)
 * - Internal calculations use Date objects
 * - Display formatting uses locale-specific functions
 *
 * @module lib/date-utils
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type DateInput = Date | string | number

export interface DateRange {
  start: Date
  end: Date
}

export interface DateRangeISO {
  start: string
  end: string
}

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Converts any date input to a Date object
 * @param input - Date, ISO string, or timestamp
 * @returns Date object
 */
export function toDate(input: DateInput): Date {
  if (input instanceof Date) {
    return input
  }
  return new Date(input)
}

/**
 * Converts date to ISO 8601 string (for API responses and DB storage)
 * @param date - Date input
 * @returns ISO string (e.g., "2025-11-19T12:00:00.000Z")
 */
export function toISOString(date: DateInput): string {
  return toDate(date).toISOString()
}

/**
 * Converts date to date-only string (YYYY-MM-DD)
 * Used for date inputs and date-only comparisons
 * @param date - Date input
 * @returns Date string (e.g., "2025-11-19")
 */
export function toDateString(date: DateInput): string {
  const d = toDate(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Converts date to timestamp (milliseconds since epoch)
 * Used for duration calculations and comparisons
 * @param date - Date input
 * @returns Unix timestamp in milliseconds
 */
export function toTimestamp(date: DateInput): number {
  return toDate(date).getTime()
}

// ============================================================================
// DATE ARITHMETIC
// ============================================================================

/**
 * Add days to a date
 * @param date - Starting date
 * @param days - Number of days to add (can be negative)
 * @returns New Date object
 */
export function addDays(date: DateInput, days: number): Date {
  const result = new Date(toDate(date))
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Add hours to a date
 * @param date - Starting date
 * @param hours - Number of hours to add (can be negative)
 * @returns New Date object
 */
export function addHours(date: DateInput, hours: number): Date {
  const result = new Date(toDate(date))
  result.setHours(result.getHours() + hours)
  return result
}

/**
 * Add minutes to a date
 * @param date - Starting date
 * @param minutes - Number of minutes to add (can be negative)
 * @returns New Date object
 */
export function addMinutes(date: DateInput, minutes: number): Date {
  const result = new Date(toDate(date))
  result.setMinutes(result.getMinutes() + minutes)
  return result
}

/**
 * Add weeks to a date
 * @param date - Starting date
 * @param weeks - Number of weeks to add (can be negative)
 * @returns New Date object
 */
export function addWeeks(date: DateInput, weeks: number): Date {
  return addDays(date, weeks * 7)
}

/**
 * Add months to a date
 * @param date - Starting date
 * @param months - Number of months to add (can be negative)
 * @returns New Date object
 */
export function addMonths(date: DateInput, months: number): Date {
  const result = new Date(toDate(date))
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * Subtract days from a date
 * @param date - Starting date
 * @param days - Number of days to subtract
 * @returns New Date object
 */
export function subtractDays(date: DateInput, days: number): Date {
  return addDays(date, -days)
}

/**
 * Subtract months from a date
 * @param date - Starting date
 * @param months - Number of months to subtract
 * @returns New Date object
 */
export function subtractMonths(date: DateInput, months: number): Date {
  return addMonths(date, -months)
}

// ============================================================================
// DATE RANGE UTILITIES
// ============================================================================

/**
 * Get start of day (00:00:00.000)
 * @param date - Date input
 * @returns Date at start of day
 */
export function startOfDay(date: DateInput): Date {
  const result = new Date(toDate(date))
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get end of day (23:59:59.999)
 * @param date - Date input
 * @returns Date at end of day
 */
export function endOfDay(date: DateInput): Date {
  const result = new Date(toDate(date))
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Get start of week (Sunday 00:00:00.000)
 * @param date - Date input
 * @returns Date at start of week
 */
export function startOfWeek(date: DateInput): Date {
  const result = new Date(toDate(date))
  result.setDate(result.getDate() - result.getDay())
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get end of week (Saturday 23:59:59.999)
 * @param date - Date input
 * @returns Date at end of week
 */
export function endOfWeek(date: DateInput): Date {
  const result = new Date(toDate(date))
  result.setDate(result.getDate() + (6 - result.getDay()))
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Get start of month (1st day 00:00:00.000)
 * @param date - Date input
 * @returns Date at start of month
 */
export function startOfMonth(date: DateInput): Date {
  const result = new Date(toDate(date))
  result.setDate(1)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get end of month (last day 23:59:59.999)
 * @param date - Date input
 * @returns Date at end of month
 */
export function endOfMonth(date: DateInput): Date {
  const result = new Date(toDate(date))
  result.setMonth(result.getMonth() + 1, 0)
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Create date range for the last N days
 * @param days - Number of days to look back
 * @param endDate - End date (defaults to now)
 * @returns DateRange object
 */
export function lastNDays(days: number, endDate: DateInput = new Date()): DateRange {
  const end = toDate(endDate)
  const start = subtractDays(end, days)
  return { start, end }
}

/**
 * Create date range as ISO strings
 * @param start - Start date
 * @param end - End date
 * @returns DateRangeISO object
 */
export function dateRangeToISO(start: DateInput, end: DateInput): DateRangeISO {
  return {
    start: toISOString(start),
    end: toISOString(end),
  }
}

// ============================================================================
// DATE COMPARISON
// ============================================================================

/**
 * Check if two dates are on the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if same day
 */
export function isSameDay(date1: DateInput, date2: DateInput): boolean {
  return toDateString(date1) === toDateString(date2)
}

/**
 * Check if date is in the past
 * @param date - Date to check
 * @returns True if in the past
 */
export function isPast(date: DateInput): boolean {
  return toTimestamp(date) < Date.now()
}

/**
 * Check if date is in the future
 * @param date - Date to check
 * @returns True if in the future
 */
export function isFuture(date: DateInput): boolean {
  return toTimestamp(date) > Date.now()
}

/**
 * Check if date is today
 * @param date - Date to check
 * @returns True if today
 */
export function isToday(date: DateInput): boolean {
  return isSameDay(date, new Date())
}

/**
 * Get difference between two dates in days
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days (can be negative)
 */
export function differenceInDays(date1: DateInput, date2: DateInput): number {
  const ms = toTimestamp(date1) - toTimestamp(date2)
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

/**
 * Get difference between two dates in hours
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of hours (can be negative)
 */
export function differenceInHours(date1: DateInput, date2: DateInput): number {
  const ms = toTimestamp(date1) - toTimestamp(date2)
  return Math.floor(ms / (1000 * 60 * 60))
}

/**
 * Get difference between two dates in minutes
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of minutes (can be negative)
 */
export function differenceInMinutes(date1: DateInput, date2: DateInput): number {
  const ms = toTimestamp(date1) - toTimestamp(date2)
  return Math.floor(ms / (1000 * 60))
}

// ============================================================================
// DISPLAY FORMATTING (for UI)
// ============================================================================

/**
 * Format date for display in Brazilian Portuguese
 * @param date - Date input
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted string (e.g., "19/11/2025")
 */
export function formatDateBR(
  date: DateInput,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }
): string {
  return toDate(date).toLocaleString('pt-BR', options)
}

/**
 * Format date and time for display in Brazilian Portuguese
 * @param date - Date input
 * @returns Formatted string (e.g., "19/11/2025 14:30")
 */
export function formatDateTimeBR(date: DateInput): string {
  return toDate(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format time only for display in Brazilian Portuguese
 * @param date - Date input
 * @returns Formatted string (e.g., "14:30")
 */
export function formatTimeBR(date: DateInput): string {
  return toDate(date).toLocaleString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - Date input
 * @returns Relative time string
 */
export function formatRelative(date: DateInput): string {
  const now = Date.now()
  const then = toTimestamp(date)
  const diffMs = then - now
  const diffMinutes = Math.abs(Math.floor(diffMs / (1000 * 60)))
  const diffHours = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)))
  const diffDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)))

  const isPastDate = diffMs < 0

  if (diffMinutes < 1) {
    return 'agora'
  } else if (diffMinutes < 60) {
    return isPastDate
      ? `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`
      : `em ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`
  } else if (diffHours < 24) {
    return isPastDate
      ? `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`
      : `em ${diffHours} hora${diffHours > 1 ? 's' : ''}`
  } else if (diffDays < 7) {
    return isPastDate
      ? `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`
      : `em ${diffDays} dia${diffDays > 1 ? 's' : ''}`
  } else {
    return formatDateBR(date)
  }
}

// ============================================================================
// EXPIRATION UTILITIES
// ============================================================================

/**
 * Create expiration date from duration in milliseconds
 * @param durationMs - Duration in milliseconds
 * @param startDate - Start date (defaults to now)
 * @returns Expiration date
 */
export function createExpiration(
  durationMs: number,
  startDate: DateInput = new Date()
): Date {
  return new Date(toTimestamp(startDate) + durationMs)
}

/**
 * Check if date has expired
 * @param expirationDate - Expiration date
 * @returns True if expired
 */
export function isExpired(expirationDate: DateInput): boolean {
  return isPast(expirationDate)
}

/**
 * Get time remaining until expiration in milliseconds
 * @param expirationDate - Expiration date
 * @returns Milliseconds remaining (negative if expired)
 */
export function timeUntilExpiration(expirationDate: DateInput): number {
  return toTimestamp(expirationDate) - Date.now()
}

// ============================================================================
// COMMON DATE RANGES (helpers)
// ============================================================================

/**
 * Get date range for today
 */
export function getToday(): DateRange {
  const now = new Date()
  return {
    start: startOfDay(now),
    end: endOfDay(now),
  }
}

/**
 * Get date range for this week
 */
export function getThisWeek(): DateRange {
  const now = new Date()
  return {
    start: startOfWeek(now),
    end: endOfWeek(now),
  }
}

/**
 * Get date range for this month
 */
export function getThisMonth(): DateRange {
  const now = new Date()
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  }
}

/**
 * Get date range for last 7 days
 */
export function getLast7Days(): DateRange {
  return lastNDays(7)
}

/**
 * Get date range for last 14 days
 */
export function getLast14Days(): DateRange {
  return lastNDays(14)
}

/**
 * Get date range for last 30 days
 */
export function getLast30Days(): DateRange {
  return lastNDays(30)
}

/**
 * Get date range for last 90 days
 */
export function getLast90Days(): DateRange {
  return lastNDays(90)
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if a string is a valid ISO 8601 date
 * @param str - String to validate
 * @returns True if valid ISO date
 */
export function isValidISOString(str: string): boolean {
  try {
    const date = new Date(str)
    return !isNaN(date.getTime()) && date.toISOString() === str
  } catch {
    return false
  }
}

/**
 * Check if a value is a valid date
 * @param value - Value to check
 * @returns True if valid date
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime())
}

// ============================================================================
// EXPORTS (re-export for convenience)
// ============================================================================

export const dateUtils = {
  // Conversion
  toDate,
  toISOString,
  toDateString,
  toTimestamp,

  // Arithmetic
  addDays,
  addHours,
  addMinutes,
  addWeeks,
  addMonths,
  subtractDays,
  subtractMonths,

  // Ranges
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  lastNDays,
  dateRangeToISO,

  // Comparison
  isSameDay,
  isPast,
  isFuture,
  isToday,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,

  // Formatting
  formatDateBR,
  formatDateTimeBR,
  formatTimeBR,
  formatRelative,

  // Expiration
  createExpiration,
  isExpired,
  timeUntilExpiration,

  // Common ranges
  getToday,
  getThisWeek,
  getThisMonth,
  getLast7Days,
  getLast14Days,
  getLast30Days,
  getLast90Days,

  // Validation
  isValidISOString,
  isValidDate,
}

export default dateUtils
