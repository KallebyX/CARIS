/**
 * Secure file upload service with virus scanning and encryption
 */

import { NextRequest } from 'next/server'
import { ChatEncryption } from './encryption'

export interface FileUploadResult {
  success: boolean
  fileId?: string
  fileName?: string
  originalName?: string
  fileSize?: number
  mimeType?: string
  virusScanStatus?: 'pending' | 'clean' | 'infected'
  error?: string
}

export interface FileValidationResult {
  isValid: boolean
  error?: string
  fileSize?: number
  mimeType?: string
}

export class SecureFileUpload {
  // Allowed file types for mental health platform
  private static readonly ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Audio (for voice notes)
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    // Video (limited)
    'video/mp4',
    'video/webm'
  ]

  // Maximum file size: 50MB
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024

  // File extensions mapping
  private static readonly EXTENSION_MAP: { [key: string]: string[] } = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'],
    'audio/webm': ['.webm'],
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm']
  }

  /**
   * Validate uploaded file
   */
  static validateFile(file: File): FileValidationResult {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `Arquivo muito grande. Tamanho máximo permitido: ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
      }
    }

    // Check file type
    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `Tipo de arquivo não permitido: ${file.type}`
      }
    }

    // Check file extension matches MIME type
    const fileName = file.name.toLowerCase()
    const allowedExtensions = this.EXTENSION_MAP[file.type] || []
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))

    if (!hasValidExtension) {
      return {
        isValid: false,
        error: 'Extensão do arquivo não corresponde ao tipo detectado'
      }
    }

    return {
      isValid: true,
      fileSize: file.size,
      mimeType: file.type
    }
  }

  /**
   * Basic virus scanning (placeholder for integration with antivirus service)
   */
  static async scanFile(fileBuffer: ArrayBuffer): Promise<{ 
    status: 'clean' | 'infected' | 'error', 
    details?: string 
  }> {
    try {
      // In a real implementation, this would integrate with:
      // - ClamAV
      // - VirusTotal API
      // - AWS GuardDuty
      // - Microsoft Defender
      
      // For now, implement basic heuristics
      const suspiciousPatterns = [
        // Executable signatures
        new Uint8Array([0x4D, 0x5A]), // MZ header (PE executable)
        new Uint8Array([0x7F, 0x45, 0x4C, 0x46]), // ELF header
        new Uint8Array([0xCE, 0xFA, 0xED, 0xFE]), // Mach-O header
        // Script patterns that could be dangerous
        new Uint8Array([0x3C, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74]), // <script
      ]

      const fileArray = new Uint8Array(fileBuffer)
      
      for (const pattern of suspiciousPatterns) {
        if (this.containsPattern(fileArray, pattern)) {
          return {
            status: 'infected',
            details: 'Arquivo contém padrão suspeito'
          }
        }
      }

      // Check for excessive null bytes (could indicate padding/obfuscation)
      const nullByteCount = fileArray.filter(byte => byte === 0).length
      if (nullByteCount > fileArray.length * 0.7) {
        return {
          status: 'infected',
          details: 'Arquivo com padrão suspeito de bytes nulos'
        }
      }

      return { status: 'clean' }
    } catch (error) {
      console.error('Virus scan error:', error)
      return { 
        status: 'error', 
        details: 'Erro durante verificação de segurança' 
      }
    }
  }

  /**
   * Helper method to find byte patterns
   */
  private static containsPattern(data: Uint8Array, pattern: Uint8Array): boolean {
    for (let i = 0; i <= data.length - pattern.length; i++) {
      let found = true
      for (let j = 0; j < pattern.length; j++) {
        if (data[i + j] !== pattern[j]) {
          found = false
          break
        }
      }
      if (found) return true
    }
    return false
  }

  /**
   * Generate secure filename
   */
  static generateSecureFileName(originalName: string, userId: number): string {
    const extension = originalName.substring(originalName.lastIndexOf('.'))
    const timestamp = Date.now()
    const randomId = ChatEncryption.generateSecureId(16)
    return `${userId}_${timestamp}_${randomId}${extension}`
  }

  /**
   * Encrypt and store file
   */
  static async encryptAndStoreFile(
    fileBuffer: ArrayBuffer,
    encryptionKey: CryptoKey,
    secureFileName: string
  ): Promise<{ success: boolean, filePath?: string, error?: string }> {
    try {
      // Encrypt file
      const encryptedFile = await ChatEncryption.encryptFile(fileBuffer, encryptionKey)
      
      // In a real implementation, store to secure storage:
      // - AWS S3 with encryption
      // - Cloudflare R2
      // - Azure Blob Storage
      // For now, simulate storage path
      const filePath = `/secure-storage/chat-files/${secureFileName}`
      
      // Here you would actually save the encrypted file to your storage service
      // await saveToSecureStorage(encryptedFile.data, filePath)
      
      return {
        success: true,
        filePath
      }
    } catch (error) {
      console.error('File encryption/storage error:', error)
      return {
        success: false,
        error: 'Falha ao processar arquivo'
      }
    }
  }

  /**
   * Create file metadata for database
   */
  static createFileMetadata(
    originalName: string,
    secureFileName: string,
    filePath: string,
    fileSize: number,
    mimeType: string,
    virusScanResult: { status: string, details?: string }
  ) {
    return {
      originalName,
      fileName: secureFileName,
      filePath,
      fileSize,
      mimeType,
      isEncrypted: true,
      virusScanStatus: virusScanResult.status,
      virusScanResult: JSON.stringify(virusScanResult),
      downloadCount: 0
    }
  }

  /**
   * Generate file preview for images
   */
  static async generatePreview(
    file: File,
    maxWidth: number = 300,
    maxHeight: number = 300
  ): Promise<string | null> {
    if (!file.type.startsWith('image/')) {
      return null
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate dimensions maintaining aspect ratio
        let { width, height } = img
        if (width > height) {
          if (width > maxWidth) {
            height = height * (maxWidth / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = width * (maxHeight / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)
        
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }

      img.onerror = () => resolve(null)
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Get file icon based on MIME type
   */
  static getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('audio/')) return '🎵'
    if (mimeType.startsWith('video/')) return '🎥'
    if (mimeType === 'application/pdf') return '📄'
    if (mimeType.includes('word')) return '📝'
    if (mimeType === 'text/plain') return '📝'
    return '📎'
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// File download service
export class SecureFileDownload {
  /**
   * Decrypt and serve file for download
   */
  static async decryptFile(
    encryptedData: ArrayBuffer,
    iv: string,
    encryptionKey: CryptoKey
  ): Promise<ArrayBuffer> {
    const encryptedFile = {
      data: encryptedData,
      iv,
      algorithm: 'AES-GCM',
      version: 'v1'
    }

    return await ChatEncryption.decryptFile(encryptedFile, encryptionKey)
  }

  /**
   * Create secure download URL with time-limited access
   */
  static generateSecureDownloadUrl(
    fileId: string,
    userId: number,
    expirationMinutes: number = 60
  ): string {
    const expiresAt = Date.now() + (expirationMinutes * 60 * 1000)
    const token = ChatEncryption.generateSecureId(32)
    
    // In real implementation, store this token temporarily in Redis/database
    // with expiration and associate with fileId and userId
    
    return `/api/chat/files/download/${fileId}?token=${token}&expires=${expiresAt}`
  }
}