/**
 * Message expiration service for temporary messages
 * Handles auto-deletion and secure cleanup of expired messages
 */

import { db } from '@/db'
import { chatMessages, chatFiles } from '@/db/schema'
import { eq, and, lte, isNotNull } from 'drizzle-orm'

export interface ExpirationSettings {
  duration: number // in milliseconds
  deleteFiles: boolean
  secureWipe: boolean
}

export class MessageExpirationService {
  // Predefined expiration options
  static readonly EXPIRATION_OPTIONS = {
    '5min': { duration: 5 * 60 * 1000, label: '5 minutos' },
    '1hour': { duration: 60 * 60 * 1000, label: '1 hora' },
    '24hours': { duration: 24 * 60 * 60 * 1000, label: '24 horas' },
    '7days': { duration: 7 * 24 * 60 * 60 * 1000, label: '7 dias' },
    '30days': { duration: 30 * 24 * 60 * 60 * 1000, label: '30 dias' },
  } as const

  /**
   * Set expiration for a message
   */
  static async setMessageExpiration(
    messageId: string,
    expirationKey: keyof typeof MessageExpirationService.EXPIRATION_OPTIONS
  ): Promise<void> {
    const expiration = this.EXPIRATION_OPTIONS[expirationKey]
    const expiresAt = new Date(Date.now() + expiration.duration)

    await db
      .update(chatMessages)
      .set({
        isTemporary: true,
        expiresAt,
        updatedAt: new Date()
      })
      .where(eq(chatMessages.id, messageId))
  }

  /**
   * Find expired messages
   */
  static async findExpiredMessages(): Promise<Array<{
    id: string
    roomId: string
    senderId: number
    messageType: string
    expiresAt: Date
    hasFiles?: boolean
  }>> {
    const now = new Date()
    
    const expiredMessages = await db
      .select({
        id: chatMessages.id,
        roomId: chatMessages.roomId,
        senderId: chatMessages.senderId,
        messageType: chatMessages.messageType,
        expiresAt: chatMessages.expiresAt
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.isTemporary, true),
          isNotNull(chatMessages.expiresAt),
          lte(chatMessages.expiresAt, now),
          eq(chatMessages.deletedAt, null)
        )
      )

    // Check which messages have associated files
    const messagesWithFiles = await Promise.all(
      expiredMessages.map(async (msg) => {
        const files = await db
          .select({ id: chatFiles.id })
          .from(chatFiles)
          .where(eq(chatFiles.messageId, msg.id))
          .limit(1)

        return {
          ...msg,
          hasFiles: files.length > 0
        }
      })
    )

    return messagesWithFiles
  }

  /**
   * Securely delete expired messages
   */
  static async deleteExpiredMessages(): Promise<{
    deletedMessages: number
    deletedFiles: number
    errors: string[]
  }> {
    const errors: string[] = []
    let deletedMessages = 0
    let deletedFiles = 0

    try {
      const expiredMessages = await this.findExpiredMessages()
      
      for (const message of expiredMessages) {
        try {
          // Delete associated files first
          if (message.hasFiles) {
            const deletedFileCount = await this.deleteMessageFiles(message.id)
            deletedFiles += deletedFileCount
          }

          // Securely delete the message
          await this.secureDeleteMessage(message.id)
          deletedMessages++
          
          console.log(`Expired message deleted: ${message.id}`)
        } catch (error) {
          const errorMsg = `Failed to delete message ${message.id}: ${error}`
          errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      return { deletedMessages, deletedFiles, errors }
    } catch (error) {
      errors.push(`Failed to process expired messages: ${error}`)
      return { deletedMessages, deletedFiles, errors }
    }
  }

  /**
   * Delete files associated with a message
   */
  private static async deleteMessageFiles(messageId: string): Promise<number> {
    try {
      // Get file information before deletion
      const files = await db
        .select()
        .from(chatFiles)
        .where(eq(chatFiles.messageId, messageId))

      // Delete files from storage (implementation depends on storage service)
      for (const file of files) {
        try {
          await this.deleteFileFromStorage(file.filePath)
        } catch (error) {
          console.error(`Failed to delete file from storage: ${file.filePath}`, error)
        }
      }

      // Delete file records from database
      const result = await db
        .delete(chatFiles)
        .where(eq(chatFiles.messageId, messageId))

      return files.length
    } catch (error) {
      console.error(`Failed to delete files for message ${messageId}:`, error)
      throw error
    }
  }

  /**
   * Securely delete a message (overwrite then delete)
   */
  private static async secureDeleteMessage(messageId: string): Promise<void> {
    try {
      // First overwrite the content with random data for security
      const randomContent = this.generateRandomString(1000)
      
      await db
        .update(chatMessages)
        .set({
          content: randomContent,
          metadata: null,
          deletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(chatMessages.id, messageId))

      // Then actually delete the record after a brief delay
      setTimeout(async () => {
        try {
          await db
            .delete(chatMessages)
            .where(eq(chatMessages.id, messageId))
        } catch (error) {
          console.error(`Failed to permanently delete message ${messageId}:`, error)
        }
      }, 1000)
    } catch (error) {
      console.error(`Failed to securely delete message ${messageId}:`, error)
      throw error
    }
  }

  /**
   * Delete file from storage service
   */
  private static async deleteFileFromStorage(filePath: string): Promise<void> {
    // Implementation depends on storage service:
    // - AWS S3: s3.deleteObject()
    // - Cloudflare R2: r2.delete()
    // - Local storage: fs.unlink()
    
    // For now, log the action
    console.log(`Would delete file from storage: ${filePath}`)
  }

  /**
   * Generate random string for secure overwriting
   */
  private static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Schedule cleanup job (to be called by cron or background service)
   */
  static async runCleanupJob(): Promise<void> {
    console.log('Starting message expiration cleanup job...')
    
    try {
      const result = await this.deleteExpiredMessages()
      
      console.log(`Cleanup completed:`, {
        deletedMessages: result.deletedMessages,
        deletedFiles: result.deletedFiles,
        errors: result.errors.length
      })

      if (result.errors.length > 0) {
        console.error('Cleanup errors:', result.errors)
      }
    } catch (error) {
      console.error('Cleanup job failed:', error)
    }
  }

  /**
   * Get expiration status for a message
   */
  static getExpirationStatus(expiresAt: Date | null): {
    isExpired: boolean
    timeRemaining: number | null
    timeRemainingText: string | null
  } {
    if (!expiresAt) {
      return {
        isExpired: false,
        timeRemaining: null,
        timeRemainingText: null
      }
    }

    const now = Date.now()
    const expirationTime = expiresAt.getTime()
    const timeRemaining = expirationTime - now

    if (timeRemaining <= 0) {
      return {
        isExpired: true,
        timeRemaining: 0,
        timeRemainingText: 'Expirado'
      }
    }

    return {
      isExpired: false,
      timeRemaining,
      timeRemainingText: this.formatTimeRemaining(timeRemaining)
    }
  }

  /**
   * Format time remaining for display
   */
  private static formatTimeRemaining(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ${hours % 24}h`
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m`
    } else {
      return `${seconds}s`
    }
  }

  /**
   * Extend message expiration
   */
  static async extendMessageExpiration(
    messageId: string,
    additionalTime: number // in milliseconds
  ): Promise<void> {
    const message = await db
      .select({ expiresAt: chatMessages.expiresAt })
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1)

    if (message.length === 0) {
      throw new Error('Message not found')
    }

    const currentExpiration = message[0].expiresAt
    if (!currentExpiration) {
      throw new Error('Message is not temporary')
    }

    const newExpiration = new Date(currentExpiration.getTime() + additionalTime)

    await db
      .update(chatMessages)
      .set({
        expiresAt: newExpiration,
        updatedAt: new Date()
      })
      .where(eq(chatMessages.id, messageId))
  }

  /**
   * Cancel message expiration (make permanent)
   */
  static async cancelMessageExpiration(messageId: string): Promise<void> {
    await db
      .update(chatMessages)
      .set({
        isTemporary: false,
        expiresAt: null,
        updatedAt: new Date()
      })
      .where(eq(chatMessages.id, messageId))
  }
}

// Background job scheduler (to be integrated with your job queue)
export class ExpirationScheduler {
  private static intervalId: NodeJS.Timeout | null = null

  /**
   * Start the expiration cleanup scheduler
   */
  static start(intervalMinutes: number = 5): void {
    if (this.intervalId) {
      console.log('Expiration scheduler already running')
      return
    }

    console.log(`Starting expiration scheduler (every ${intervalMinutes} minutes)`)
    
    this.intervalId = setInterval(() => {
      MessageExpirationService.runCleanupJob()
    }, intervalMinutes * 60 * 1000)

    // Run immediately on start
    MessageExpirationService.runCleanupJob()
  }

  /**
   * Stop the expiration cleanup scheduler
   */
  static stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('Expiration scheduler stopped')
    }
  }
}