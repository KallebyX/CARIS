/**
 * XSS Sanitization Utilities for CÁRIS Platform
 *
 * Provides server-side HTML sanitization to prevent XSS attacks.
 * Uses DOMPurify with isomorphic support for Node.js environments.
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Configuration for DOMPurify
 */
const SANITIZE_CONFIG = {
  // Allow only safe tags and attributes
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
    'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  // Ensure links open safely
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
}

/**
 * Strict configuration for sensitive fields (no HTML at all)
 */
const STRICT_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
}

/**
 * Sanitize HTML content to prevent XSS attacks
 *
 * @param dirty - Potentially unsafe HTML string
 * @param allowBasicFormatting - If true, allows basic HTML tags for formatting
 * @returns Sanitized HTML string safe for storage and display
 *
 * @example
 * ```ts
 * // Diary entry with basic formatting
 * const safeContent = sanitizeHtml(userInput, true)
 *
 * // Chat message - strip all HTML
 * const safeMessage = sanitizeHtml(userInput, false)
 * ```
 */
export function sanitizeHtml(
  dirty: string | null | undefined,
  allowBasicFormatting: boolean = false
): string {
  if (!dirty) return ''

  const config = allowBasicFormatting ? SANITIZE_CONFIG : STRICT_CONFIG

  try {
    return DOMPurify.sanitize(dirty, config)
  } catch (error) {
    console.error('[Sanitize] Error sanitizing HTML:', error)
    // On error, return empty string for safety
    return ''
  }
}

/**
 * Sanitize plain text input (removes all HTML tags)
 *
 * @param text - User input text
 * @returns Plain text with all HTML stripped
 */
export function sanitizePlainText(text: string | null | undefined): string {
  return sanitizeHtml(text, false)
}

/**
 * Sanitize an object's string fields recursively
 * Useful for sanitizing entire API request bodies
 *
 * @param obj - Object with potentially unsafe string values
 * @param allowFormatting - Whether to allow basic HTML formatting
 * @returns Object with sanitized string values
 *
 * @example
 * ```ts
 * const safeData = sanitizeObject({
 *   title: userInput.title,
 *   content: userInput.content,
 *   tags: ['tag1', 'tag2']
 * })
 * ```
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  allowFormatting: boolean = false
): T {
  const sanitized: any = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value, allowFormatting)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeHtml(item, allowFormatting) : item
      )
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, allowFormatting)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized as T
}

/**
 * Sanitize specific fields in an object
 * More efficient than sanitizing entire object
 *
 * @param obj - Object to sanitize
 * @param fields - Array of field names to sanitize
 * @param allowFormatting - Whether to allow basic HTML formatting
 * @returns Object with specified fields sanitized
 *
 * @example
 * ```ts
 * const safeData = sanitizeFields(data, ['content', 'notes'], true)
 * ```
 */
export function sanitizeFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  allowFormatting: boolean = false
): T {
  const result = { ...obj }

  for (const field of fields) {
    const value = obj[field]
    if (typeof value === 'string') {
      result[field] = sanitizeHtml(value, allowFormatting) as any
    }
  }

  return result
}

/**
 * Validate and sanitize URL
 * Ensures URL is safe and not a javascript: or data: URI
 *
 * @param url - URL to validate
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return ''

  const trimmed = url.trim()

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    console.warn('[Sanitize] Blocked dangerous URL:', trimmed.substring(0, 50))
    return ''
  }

  try {
    // Validate URL format
    const urlObj = new URL(trimmed)

    // Only allow http, https, mailto
    if (!['http:', 'https:', 'mailto:'].includes(urlObj.protocol)) {
      return ''
    }

    return trimmed
  } catch {
    // Invalid URL format
    return ''
  }
}

/**
 * Sanitize email address
 * Basic validation and XSS prevention
 *
 * @param email - Email address to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return ''

  const sanitized = sanitizePlainText(email).toLowerCase().trim()

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(sanitized)) {
    return ''
  }

  return sanitized
}

/**
 * Sanitize file name
 * Removes path traversal attempts and dangerous characters
 *
 * @param filename - File name to sanitize
 * @returns Safe file name
 */
export function sanitizeFilename(filename: string | null | undefined): string {
  if (!filename) return ''

  // Remove path traversal attempts
  let safe = filename.replace(/\.\./g, '')

  // Remove path separators
  safe = safe.replace(/[\/\\]/g, '')

  // Remove null bytes
  safe = safe.replace(/\0/g, '')

  // Remove control characters
  safe = safe.replace(/[\x00-\x1F\x7F]/g, '')

  // Trim and limit length
  safe = safe.trim().substring(0, 255)

  return safe
}
