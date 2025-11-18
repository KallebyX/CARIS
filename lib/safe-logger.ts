/**
 * Safe Logger - Sanitizes sensitive data before logging
 *
 * HIPAA/LGPD Compliance: Prevents sensitive data exposure in logs
 * - Redacts passwords, tokens, API keys
 * - Masks personal information (CPF, email, phone)
 * - Sanitizes error objects
 *
 * Usage:
 *   import { safeLog, safeError, safeWarn } from '@/lib/safe-logger'
 *   safeError('Login failed', { email: 'user@example.com', password: 'secret' })
 *   // Output: Login failed { email: '[REDACTED]', password: '[REDACTED]' }
 */

// Sensitive field patterns to redact
const SENSITIVE_KEYS = [
  'password',
  'senha',
  'token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'session',
  'jwt',
  'bearer',
  'credentials',
  'credit_card',
  'creditcard',
  'cvv',
  'ssn',
  'social_security',
]

// Personal information patterns (LGPD/HIPAA)
const PII_KEYS = [
  'cpf',
  'rg',
  'cnpj',
  'email',
  'phone',
  'telefone',
  'celular',
  'address',
  'endereco',
  'birth_date',
  'data_nascimento',
  'medical_record',
  'prontuario',
]

// Pattern to detect JWT tokens
const JWT_PATTERN = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/

// Pattern to detect API keys (common formats)
const API_KEY_PATTERN = /^[A-Za-z0-9_-]{32,}$/

// CPF pattern (Brazilian tax ID)
const CPF_PATTERN = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/

// Email pattern
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Phone pattern (Brazilian)
const PHONE_PATTERN = /^\+?55?\s?\(?(\d{2})\)?\s?9?\d{4}-?\d{4}$/

/**
 * Checks if a key name indicates sensitive data
 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase()
  return SENSITIVE_KEYS.some(pattern => lowerKey.includes(pattern))
}

/**
 * Checks if a key name indicates personal information
 */
function isPIIKey(key: string): boolean {
  const lowerKey = key.toLowerCase()
  return PII_KEYS.some(pattern => lowerKey.includes(pattern))
}

/**
 * Checks if a value looks like sensitive data
 */
function isSensitiveValue(value: unknown): boolean {
  if (typeof value !== 'string') return false

  return (
    JWT_PATTERN.test(value) ||
    API_KEY_PATTERN.test(value) ||
    CPF_PATTERN.test(value) ||
    EMAIL_PATTERN.test(value) ||
    PHONE_PATTERN.test(value)
  )
}

/**
 * Masks email addresses (show first 2 chars + domain)
 * Example: user@example.com -> us***@example.com
 */
function maskEmail(email: string): string {
  if (!EMAIL_PATTERN.test(email)) return '[REDACTED]'
  const [local, domain] = email.split('@')
  const maskedLocal = local.length > 2 ? local.substring(0, 2) + '***' : '***'
  return `${maskedLocal}@${domain}`
}

/**
 * Masks CPF (show first 3 digits)
 * Example: 123.456.789-00 -> 123.***.***-**
 */
function maskCPF(cpf: string): string {
  if (cpf.length === 11) {
    return cpf.substring(0, 3) + '.***.***-**'
  }
  return cpf.substring(0, 3) + '.***.***-**'
}

/**
 * Masks phone numbers (show area code only)
 * Example: (11) 99999-9999 -> (11) *****-****
 */
function maskPhone(phone: string): string {
  const match = phone.match(/\((\d{2})\)/)
  if (match) {
    return `(${match[1]}) *****-****`
  }
  return '(**) *****-****'
}

/**
 * Redacts a sensitive value based on its type
 */
function redactValue(value: unknown, key?: string): unknown {
  if (value === null || value === undefined) {
    return value
  }

  // Handle email masking
  if (key && key.toLowerCase().includes('email') && typeof value === 'string') {
    return maskEmail(value)
  }

  // Handle CPF masking
  if (key && key.toLowerCase().includes('cpf') && typeof value === 'string') {
    return maskCPF(value)
  }

  // Handle phone masking
  if (key && (key.toLowerCase().includes('phone') || key.toLowerCase().includes('telefone')) && typeof value === 'string') {
    return maskPhone(value)
  }

  // Complete redaction for sensitive fields
  if (key && isSensitiveKey(key)) {
    return '[REDACTED]'
  }

  // Mask PII but show partial data
  if (key && isPIIKey(key)) {
    if (typeof value === 'string') {
      if (EMAIL_PATTERN.test(value)) return maskEmail(value)
      if (CPF_PATTERN.test(value)) return maskCPF(value)
      if (PHONE_PATTERN.test(value)) return maskPhone(value)
      return '[PII_REDACTED]'
    }
    return '[PII_REDACTED]'
  }

  // Check value patterns
  if (isSensitiveValue(value)) {
    return '[REDACTED]'
  }

  return value
}

/**
 * Recursively sanitizes an object, redacting sensitive fields
 */
function sanitizeObject(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH_EXCEEDED]'
  }

  if (obj === null || obj === undefined) {
    return obj
  }

  // Handle Error objects
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: process.env.NODE_ENV === 'development' ? obj.stack : '[REDACTED_IN_PRODUCTION]',
    }
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString()
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1))
  }

  // Handle plain objects
  if (typeof obj === 'object') {
    const sanitized: any = {}

    for (const [key, value] of Object.entries(obj)) {
      // Redact sensitive keys
      if (isSensitiveKey(key) || isPIIKey(key)) {
        sanitized[key] = redactValue(value, key)
      }
      // Recursively sanitize nested objects
      else if (value !== null && typeof value === 'object') {
        sanitized[key] = sanitizeObject(value, depth + 1)
      }
      // Check if value itself is sensitive
      else if (isSensitiveValue(value)) {
        sanitized[key] = '[REDACTED]'
      }
      else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  // Primitive values
  return obj
}

/**
 * Sanitizes arguments before logging
 */
function sanitizeArgs(args: any[]): any[] {
  return args.map(arg => {
    if (typeof arg === 'string') {
      return arg
    }
    if (typeof arg === 'number' || typeof arg === 'boolean') {
      return arg
    }
    return sanitizeObject(arg)
  })
}

/**
 * Safe console.log replacement
 */
export function safeLog(...args: any[]): void {
  const sanitized = sanitizeArgs(args)
  console.log(...sanitized)
}

/**
 * Safe console.error replacement
 */
export function safeError(...args: any[]): void {
  const sanitized = sanitizeArgs(args)
  console.error(...sanitized)
}

/**
 * Safe console.warn replacement
 */
export function safeWarn(...args: any[]): void {
  const sanitized = sanitizeArgs(args)
  console.warn(...sanitized)
}

/**
 * Safe console.info replacement
 */
export function safeInfo(...args: any[]): void {
  const sanitized = sanitizeArgs(args)
  console.info(...sanitized)
}

/**
 * Safe console.debug replacement
 */
export function safeDebug(...args: any[]): void {
  const sanitized = sanitizeArgs(args)
  console.debug(...sanitized)
}

/**
 * Creates a tagged logger with automatic context
 */
export function createLogger(context: string) {
  return {
    log: (...args: any[]) => safeLog(`[${context}]`, ...args),
    error: (...args: any[]) => safeError(`[${context}]`, ...args),
    warn: (...args: any[]) => safeWarn(`[${context}]`, ...args),
    info: (...args: any[]) => safeInfo(`[${context}]`, ...args),
    debug: (...args: any[]) => safeDebug(`[${context}]`, ...args),
  }
}

/**
 * Export sanitization function for custom use cases
 */
export { sanitizeObject }
