/**
 * Client-side encryption utilities for secure chat
 * Implements AES-256 encryption for end-to-end message security
 */

export class ChatEncryption {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12 // 96 bits for GCM
  private static readonly TAG_LENGTH = 16 // 128 bits for GCM

  /**
   * Generate a new encryption key for a chat room
   */
  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Export a key to base64 string for storage
   */
  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key)
    return btoa(String.fromCharCode(...new Uint8Array(exported)))
  }

  /**
   * Import a key from base64 string
   */
  static async importKey(keyData: string): Promise<CryptoKey> {
    const keyBytes = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))
    return await crypto.subtle.importKey(
      'raw',
      keyBytes,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypt a message
   */
  static async encryptMessage(message: string, key: CryptoKey): Promise<EncryptedMessage> {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    
    // Generate random IV for each message
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      data
    )

    return {
      content: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
      algorithm: this.ALGORITHM,
      version: 'v1'
    }
  }

  /**
   * Decrypt a message
   */
  static async decryptMessage(encryptedMessage: EncryptedMessage, key: CryptoKey): Promise<string> {
    try {
      const content = Uint8Array.from(atob(encryptedMessage.content), c => c.charCodeAt(0))
      const iv = Uint8Array.from(atob(encryptedMessage.iv), c => c.charCodeAt(0))

      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        content
      )

      const decoder = new TextDecoder()
      return decoder.decode(decrypted)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt message')
    }
  }

  /**
   * Encrypt file data
   */
  static async encryptFile(fileData: ArrayBuffer, key: CryptoKey): Promise<EncryptedFile> {
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      fileData
    )

    return {
      data: encrypted,
      iv: btoa(String.fromCharCode(...iv)),
      algorithm: this.ALGORITHM,
      version: 'v1'
    }
  }

  /**
   * Decrypt file data
   */
  static async decryptFile(encryptedFile: EncryptedFile, key: CryptoKey): Promise<ArrayBuffer> {
    try {
      const iv = Uint8Array.from(atob(encryptedFile.iv), c => c.charCodeAt(0))

      return await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        encryptedFile.data
      )
    } catch (error) {
      console.error('File decryption failed:', error)
      throw new Error('Failed to decrypt file')
    }
  }

  /**
   * Generate key pair for user (for key exchange)
   */
  static async generateKeyPair(): Promise<CryptoKeyPair> {
    return await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Export public key for sharing
   */
  static async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('spki', publicKey)
    return btoa(String.fromCharCode(...new Uint8Array(exported)))
  }

  /**
   * Import public key from string
   */
  static async importPublicKey(keyData: string): Promise<CryptoKey> {
    const keyBytes = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))
    return await crypto.subtle.importKey(
      'spki',
      keyBytes,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['encrypt']
    )
  }

  /**
   * Encrypt symmetric key with public key (for key exchange)
   */
  static async encryptKeyForUser(symmetricKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
    const keyData = await crypto.subtle.exportKey('raw', symmetricKey)
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      publicKey,
      keyData
    )
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  }

  /**
   * Create searchable hash for encrypted content (preserves privacy)
   */
  static async createSearchHash(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content.toLowerCase().trim())
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
  }

  /**
   * Secure random string generation for IDs
   */
  static generateSecureId(length: number = 32): string {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
      .replace(/[+/=]/g, '')
      .substring(0, length)
  }
}

// Types for encrypted data
export interface EncryptedMessage {
  content: string
  iv: string
  algorithm: string
  version: string
}

export interface EncryptedFile {
  data: ArrayBuffer
  iv: string
  algorithm: string
  version: string
}

export interface ChatRoom {
  id: string
  participantIds: number[]
  roomType: 'private' | 'group'
  name?: string
  isEncrypted: boolean
  encryptionKey?: CryptoKey
  createdAt: Date
  updatedAt: Date
}

export interface SecureChatMessage {
  id: string
  roomId: string
  senderId: number
  content: string // encrypted
  messageType: 'text' | 'file' | 'system'
  encryptionVersion: string
  isTemporary: boolean
  expiresAt?: Date
  metadata?: Record<string, any>
  createdAt: Date
  decryptedContent?: string // client-side only
}

// Key management store (client-side)
export class KeyManager {
  private static keys = new Map<string, CryptoKey>()
  private static userKeyPair: CryptoKeyPair | null = null

  static async getRoomKey(roomId: string): Promise<CryptoKey | null> {
    return this.keys.get(roomId) || null
  }

  static async setRoomKey(roomId: string, key: CryptoKey): Promise<void> {
    this.keys.set(roomId, key)
  }

  static async getUserKeyPair(): Promise<CryptoKeyPair> {
    if (!this.userKeyPair) {
      this.userKeyPair = await ChatEncryption.generateKeyPair()
    }
    return this.userKeyPair
  }

  static clearKeys(): void {
    this.keys.clear()
    this.userKeyPair = null
  }
}