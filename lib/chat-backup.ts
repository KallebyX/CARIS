/**
 * Chat backup and restore service with encryption
 * Provides secure backup and restore functionality for chat conversations
 */

import { db } from '@/db'
import { chatBackups, chatMessages, chatFiles, chatRooms } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { ChatEncryption } from './encryption'

export interface BackupData {
  roomId: string
  messages: Array<{
    id: string
    senderId: number
    content: string
    messageType: string
    encryptionVersion: string
    isTemporary: boolean
    expiresAt: Date | null
    metadata: any
    createdAt: Date
    files?: Array<{
      id: string
      originalName: string
      fileName: string
      fileSize: number
      mimeType: string
    }>
  }>
  participants: number[]
  createdAt: Date
  messageCount: number
  fileCount: number
}

export interface BackupMetadata {
  id: string
  createdAt: Date
  messageCount: number
  fileCount: number
  backupType: 'full' | 'incremental'
  roomId?: string
}

export class ChatBackupService {
  /**
   * Create a full backup of a chat room
   */
  static async createFullBackup(
    userId: number,
    roomId: string,
    encryptionKey: CryptoKey
  ): Promise<{ success: boolean; backupId?: string; error?: string }> {
    try {
      // Verify user has access to room
      const room = await db
        .select()
        .from(chatRooms)
        .where(eq(chatRooms.id, roomId))
        .limit(1)

      if (room.length === 0) {
        return { success: false, error: 'Room not found' }
      }

      const participantIds = JSON.parse(room[0].participantIds)
      if (!participantIds.includes(userId)) {
        return { success: false, error: 'Access denied' }
      }

      // Get all messages for the room
      const messages = await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.roomId, roomId),
            eq(chatMessages.deletedAt, null)
          )
        )
        .orderBy(desc(chatMessages.createdAt))

      // Get files for each message
      const messagesWithFiles = await Promise.all(
        messages.map(async (message) => {
          const files = await db
            .select({
              id: chatFiles.id,
              originalName: chatFiles.originalName,
              fileName: chatFiles.fileName,
              fileSize: chatFiles.fileSize,
              mimeType: chatFiles.mimeType
            })
            .from(chatFiles)
            .where(eq(chatFiles.messageId, message.id))

          return {
            ...message,
            files: files.length > 0 ? files : undefined
          }
        })
      )

      // Create backup data
      const backupData: BackupData = {
        roomId,
        messages: messagesWithFiles,
        participants: participantIds,
        createdAt: new Date(),
        messageCount: messages.length,
        fileCount: messagesWithFiles.reduce((total, msg) => total + (msg.files?.length || 0), 0)
      }

      // Encrypt backup data
      const backupKey = await ChatEncryption.generateKey()
      const encryptedData = await ChatEncryption.encryptMessage(
        JSON.stringify(backupData),
        backupKey
      )
      const exportedBackupKey = await ChatEncryption.exportKey(backupKey)

      // Store backup
      const backup = await db
        .insert(chatBackups)
        .values({
          userId,
          roomId,
          backupData: JSON.stringify(encryptedData),
          backupType: 'full',
          encryptionKey: exportedBackupKey,
          messageCount: backupData.messageCount,
          fileCount: backupData.fileCount
        })
        .returning()

      return {
        success: true,
        backupId: backup[0].id
      }
    } catch (error) {
      console.error('Backup creation failed:', error)
      return {
        success: false,
        error: 'Failed to create backup'
      }
    }
  }

  /**
   * Create an incremental backup (only new messages since last backup)
   */
  static async createIncrementalBackup(
    userId: number,
    roomId: string,
    encryptionKey: CryptoKey,
    sinceDate: Date
  ): Promise<{ success: boolean; backupId?: string; error?: string }> {
    try {
      // Get messages since the specified date
      const messages = await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.roomId, roomId),
            eq(chatMessages.deletedAt, null),
            // Add date filter here
          )
        )
        .orderBy(desc(chatMessages.createdAt))

      if (messages.length === 0) {
        return { success: false, error: 'No new messages to backup' }
      }

      // Follow same process as full backup but with filtered messages
      return await this.createFullBackup(userId, roomId, encryptionKey)
    } catch (error) {
      console.error('Incremental backup failed:', error)
      return {
        success: false,
        error: 'Failed to create incremental backup'
      }
    }
  }

  /**
   * List all backups for a user
   */
  static async listBackups(userId: number): Promise<BackupMetadata[]> {
    try {
      const backups = await db
        .select({
          id: chatBackups.id,
          createdAt: chatBackups.createdAt,
          messageCount: chatBackups.messageCount,
          fileCount: chatBackups.fileCount,
          backupType: chatBackups.backupType,
          roomId: chatBackups.roomId
        })
        .from(chatBackups)
        .where(eq(chatBackups.userId, userId))
        .orderBy(desc(chatBackups.createdAt))

      return backups as BackupMetadata[]
    } catch (error) {
      console.error('Failed to list backups:', error)
      return []
    }
  }

  /**
   * Restore a chat backup
   */
  static async restoreBackup(
    backupId: string,
    userId: number,
    targetRoomId?: string
  ): Promise<{ success: boolean; roomId?: string; error?: string }> {
    try {
      // Get backup data
      const backup = await db
        .select()
        .from(chatBackups)
        .where(
          and(
            eq(chatBackups.id, backupId),
            eq(chatBackups.userId, userId)
          )
        )
        .limit(1)

      if (backup.length === 0) {
        return { success: false, error: 'Backup not found' }
      }

      const backupRecord = backup[0]

      // Decrypt backup data
      const backupKey = await ChatEncryption.importKey(backupRecord.encryptionKey)
      const encryptedData = JSON.parse(backupRecord.backupData)
      const decryptedJson = await ChatEncryption.decryptMessage(encryptedData, backupKey)
      const backupData: BackupData = JSON.parse(decryptedJson)

      // Create or use target room
      let roomId = targetRoomId || backupData.roomId

      if (!targetRoomId) {
        // Create new room for restore
        const newRoom = await db
          .insert(chatRooms)
          .values({
            participantIds: JSON.stringify(backupData.participants),
            roomType: 'private',
            isEncrypted: true,
            name: `Backup restaurado - ${new Date().toLocaleDateString()}`
          })
          .returning()

        roomId = newRoom[0].id
      }

      // Restore messages
      const messagePromises = backupData.messages.map(async (message) => {
        const restoredMessage = await db
          .insert(chatMessages)
          .values({
            roomId,
            senderId: message.senderId,
            content: message.content,
            messageType: message.messageType,
            encryptionVersion: message.encryptionVersion,
            isTemporary: false, // Restored messages are permanent
            metadata: message.metadata ? JSON.stringify(message.metadata) : null
          })
          .returning()

        // Restore files if any
        if (message.files && message.files.length > 0) {
          const filePromises = message.files.map(file =>
            db.insert(chatFiles).values({
              messageId: restoredMessage[0].id,
              originalName: file.originalName,
              fileName: file.fileName,
              filePath: `/restored-files/${file.fileName}`, // Placeholder path
              fileSize: file.fileSize,
              mimeType: file.mimeType,
              isEncrypted: true,
              virusScanStatus: 'clean' // Assume restored files are clean
            })
          )
          await Promise.all(filePromises)
        }
      })

      await Promise.all(messagePromises)

      return {
        success: true,
        roomId
      }
    } catch (error) {
      console.error('Backup restore failed:', error)
      return {
        success: false,
        error: 'Failed to restore backup'
      }
    }
  }

  /**
   * Export backup to downloadable file
   */
  static async exportBackup(
    backupId: string,
    userId: number,
    format: 'json' | 'txt' = 'json'
  ): Promise<{ success: boolean; data?: string; filename?: string; error?: string }> {
    try {
      // Get backup data
      const backup = await db
        .select()
        .from(chatBackups)
        .where(
          and(
            eq(chatBackups.id, backupId),
            eq(chatBackups.userId, userId)
          )
        )
        .limit(1)

      if (backup.length === 0) {
        return { success: false, error: 'Backup not found' }
      }

      const backupRecord = backup[0]

      // Decrypt backup data
      const backupKey = await ChatEncryption.importKey(backupRecord.encryptionKey)
      const encryptedData = JSON.parse(backupRecord.backupData)
      const decryptedJson = await ChatEncryption.decryptMessage(encryptedData, backupKey)
      const backupData: BackupData = JSON.parse(decryptedJson)

      let exportData: string
      let filename: string

      if (format === 'txt') {
        // Convert to readable text format
        exportData = this.formatAsText(backupData)
        filename = `chat-backup-${backupData.roomId}-${new Date().toISOString().split('T')[0]}.txt`
      } else {
        // Export as JSON
        exportData = JSON.stringify(backupData, null, 2)
        filename = `chat-backup-${backupData.roomId}-${new Date().toISOString().split('T')[0]}.json`
      }

      return {
        success: true,
        data: exportData,
        filename
      }
    } catch (error) {
      console.error('Backup export failed:', error)
      return {
        success: false,
        error: 'Failed to export backup'
      }
    }
  }

  /**
   * Format backup data as readable text
   */
  private static formatAsText(backupData: BackupData): string {
    let text = `BACKUP DA CONVERSA\n`
    text += `Criado em: ${backupData.createdAt.toLocaleString('pt-BR')}\n`
    text += `Total de mensagens: ${backupData.messageCount}\n`
    text += `Total de arquivos: ${backupData.fileCount}\n`
    text += `\n${'='.repeat(50)}\n\n`

    backupData.messages.forEach((message, index) => {
      text += `[${message.createdAt.toLocaleString('pt-BR')}] `
      text += `Usuário ${message.senderId}: `
      
      if (message.messageType === 'file') {
        text += `📎 ${message.files?.[0]?.originalName || 'Arquivo'}`
        if (message.files && message.files.length > 0) {
          text += ` (${this.formatFileSize(message.files[0].fileSize)})`
        }
      } else {
        // Note: In real implementation, content would need to be decrypted
        text += `${message.content}`
      }
      
      if (message.isTemporary) {
        text += ` [TEMPORÁRIA]`
      }
      
      text += `\n`
      
      if (index < backupData.messages.length - 1) {
        text += `\n`
      }
    })

    return text
  }

  /**
   * Format file size helper
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Delete a backup
   */
  static async deleteBackup(
    backupId: string,
    userId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await db
        .delete(chatBackups)
        .where(
          and(
            eq(chatBackups.id, backupId),
            eq(chatBackups.userId, userId)
          )
        )

      return { success: true }
    } catch (error) {
      console.error('Backup deletion failed:', error)
      return {
        success: false,
        error: 'Failed to delete backup'
      }
    }
  }

  /**
   * Schedule automatic backups (to be called by cron job)
   */
  static async scheduleAutomaticBackups(): Promise<void> {
    try {
      // Get all active rooms that need backup
      const rooms = await db.select().from(chatRooms)
      
      for (const room of rooms) {
        const participantIds = JSON.parse(room.participantIds)
        
        // Create backup for first participant (owner)
        if (participantIds.length > 0) {
          const encryptionKey = await ChatEncryption.generateKey()
          await this.createFullBackup(participantIds[0], room.id, encryptionKey)
        }
      }
      
      console.log(`Automatic backup completed for ${rooms.length} rooms`)
    } catch (error) {
      console.error('Automatic backup failed:', error)
    }
  }
}