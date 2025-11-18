/**
 * Server-side encryption utilities for CÁRIS Platform
 *
 * Provides encryption for data at rest (database storage).
 * Uses Node.js crypto module with AES-256-GCM for authenticated encryption.
 *
 * IMPORTANT: This is server-side encryption for data-at-rest protection.
 * For true E2E encryption, use the client-side encryption library (/lib/encryption.ts)
 * where encryption/decryption happens entirely in the browser.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

/**
 * Configuration constants
 */
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits
const SALT_LENGTH = 32

/**
 * Get encryption key from environment or generate deterministic key
 * In production, this MUST be a strong secret stored in environment variables
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET

  if (!secret) {
    throw new Error('ENCRYPTION_SECRET or JWT_SECRET must be set in environment')
  }

  // Derive a 256-bit key from the secret using scrypt
  const salt = Buffer.from('caris-platform-salt-v1') // Static salt for deterministic key
  return scryptSync(secret, salt, KEY_LENGTH)
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  encrypted: string // base64 encoded ciphertext
  iv: string // base64 encoded initialization vector
  authTag: string // base64 encoded authentication tag
  version: string // encryption version for future compatibility
}

/**
 * Encrypt sensitive text data
 *
 * @param plaintext - Text to encrypt
 * @returns Encrypted data object with IV and auth tag
 *
 * @example
 * ```ts
 * const encrypted = encryptText("Sensitive patient data")
 * await db.insert(records).values({
 *   content: encrypted.encrypted,
 *   iv: encrypted.iv,
 *   authTag: encrypted.authTag
 * })
 * ```
 */
export function encryptText(plaintext: string): EncryptedData {
  try {
    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH)

    const cipher = createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()

    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      version: 'aes-256-gcm-v1',
    }
  } catch (error) {
    console.error('[Encryption] Failed to encrypt:', error)
    throw new Error('Encryption failed')
  }
}

/**
 * Decrypt encrypted text data
 *
 * @param encryptedData - Encrypted data object
 * @returns Decrypted plaintext
 *
 * @example
 * ```ts
 * const record = await db.select().from(records).where(...)
 * const plaintext = decryptText({
 *   encrypted: record.content,
 *   iv: record.iv,
 *   authTag: record.authTag,
 *   version: 'aes-256-gcm-v1'
 * })
 * ```
 */
export function decryptText(encryptedData: EncryptedData): string {
  try {
    const key = getEncryptionKey()
    const iv = Buffer.from(encryptedData.iv, 'base64')
    const authTag = Buffer.from(encryptedData.authTag, 'base64')

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('[Encryption] Failed to decrypt:', error)
    throw new Error('Decryption failed - data may be corrupted or key is invalid')
  }
}

/**
 * Encrypt text and return simplified format for single DB column storage
 *
 * Format: {encrypted}.{iv}.{authTag}
 * This allows storing encrypted data in a single column if needed
 *
 * @param plaintext - Text to encrypt
 * @returns Combined encrypted string
 */
export function encryptTextCompact(plaintext: string): string {
  const encrypted = encryptText(plaintext)
  return `${encrypted.encrypted}.${encrypted.iv}.${encrypted.authTag}`
}

/**
 * Decrypt compact format encrypted text
 *
 * @param compactEncrypted - Combined encrypted string
 * @returns Decrypted plaintext
 */
export function decryptTextCompact(compactEncrypted: string): string {
  const parts = compactEncrypted.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid compact encrypted format')
  }

  return decryptText({
    encrypted: parts[0],
    iv: parts[1],
    authTag: parts[2],
    version: 'aes-256-gcm-v1',
  })
}

/**
 * Check if text is encrypted (compact format)
 */
export function isEncrypted(text: string): boolean {
  const parts = text.split('.')
  // Basic heuristic: has 3 parts and they look like base64
  if (parts.length !== 3) return false

  const base64Regex = /^[A-Za-z0-9+/]+=*$/
  return parts.every(part => base64Regex.test(part) && part.length > 10)
}

/**
 * Encrypt object as JSON
 *
 * @param data - Object to encrypt
 * @returns Encrypted data
 */
export function encryptObject(data: Record<string, any>): EncryptedData {
  const json = JSON.stringify(data)
  return encryptText(json)
}

/**
 * Decrypt object from encrypted JSON
 *
 * @param encryptedData - Encrypted data object
 * @returns Decrypted object
 */
export function decryptObject<T = any>(encryptedData: EncryptedData): T {
  const json = decryptText(encryptedData)
  return JSON.parse(json)
}

/**
 * Hash sensitive data for search/indexing without storing plaintext
 * Uses HMAC-SHA256 for deterministic hashing
 *
 * @param data - Data to hash
 * @returns Hex encoded hash
 */
export function hashForSearch(data: string): string {
  const crypto = require('crypto')
  const key = getEncryptionKey()

  return crypto
    .createHmac('sha256', key)
    .update(data.toLowerCase().trim())
    .digest('hex')
}

/**
 * Generate secure random ID
 *
 * @param length - Length of ID (default 32)
 * @returns URL-safe random ID
 */
export function generateSecureId(length: number = 32): string {
  return randomBytes(length)
    .toString('base64')
    .replace(/[+/=]/g, '')
    .substring(0, length)
}

/**
 * Validate encryption secret strength
 * Should be called on application startup
 */
export function validateEncryptionConfig(): void {
  const secret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET

  if (!secret) {
    throw new Error(
      'ENCRYPTION_SECRET or JWT_SECRET must be set. ' +
      'Set strong secret in environment variables.'
    )
  }

  if (secret.length < 32) {
    throw new Error(
      `Encryption secret is too weak (${secret.length} chars). ` +
      'Use at least 32 characters for production.'
    )
  }

  if (secret === 'your-secret-key' || secret === 'change-me') {
    throw new Error(
      'Default encryption secret detected. ' +
      'Set a strong unique secret in production.'
    )
  }

  console.log('[Encryption] Configuration validated successfully')
}

/**
 * Encrypt chat message content
 * Specialized function for chat messages with metadata preservation
 *
 * @param content - Message content
 * @returns Encrypted content and metadata
 */
export function encryptChatMessage(content: string): {
  encryptedContent: string
  encryptionIV: string
  encryptionAuthTag: string
  encryptionVersion: string
  isEncrypted: boolean
} {
  const encrypted = encryptText(content)

  return {
    encryptedContent: encrypted.encrypted,
    encryptionIV: encrypted.iv,
    encryptionAuthTag: encrypted.authTag,
    encryptionVersion: encrypted.version,
    isEncrypted: true,
  }
}

/**
 * Decrypt chat message content
 *
 * @param encryptedContent - Encrypted message content
 * @param iv - Initialization vector
 * @param authTag - Authentication tag
 * @returns Decrypted content
 */
export function decryptChatMessage(
  encryptedContent: string,
  iv: string,
  authTag: string
): string {
  return decryptText({
    encrypted: encryptedContent,
    iv,
    authTag,
    version: 'aes-256-gcm-v1',
  })
}
