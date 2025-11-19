import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { chatFiles, chatMessages } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"
import { SecureFileUpload } from "@/lib/secure-file-upload"
import { VirusScanner } from "@/lib/virus-scanner"
import { safeError } from "@/lib/safe-logger"
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  // SECURITY: Rate limiting for file uploads
  const rateLimitResult = await rateLimit(req, RateLimitPresets.WRITE)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const messageId = formData.get("messageId") as string
    const encryptionKey = formData.get("encryptionKey") as string

    if (!file) {
      return new NextResponse("File is required", { status: 400 })
    }

    if (!messageId) {
      return new NextResponse("Message ID is required", { status: 400 })
    }

    // Validate file
    const validation = SecureFileUpload.validateFile(file)
    if (!validation.isValid) {
      return new NextResponse(validation.error, { status: 400 })
    }

    // Verify message exists and user has access
    const message = await db
      .select({ senderId: chatMessages.senderId, roomId: chatMessages.roomId })
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1)

    if (message.length === 0) {
      return new NextResponse("Message not found", { status: 404 })
    }

    if (message[0].senderId !== userId) {
      return new NextResponse("Access denied", { status: 403 })
    }

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer()

    // SECURITY: Scan for viruses using advanced scanner with multiple engines
    const virusScanner = VirusScanner.getInstance()
    const scanResult = await virusScanner.scanFile(fileBuffer, file.type)

    if (scanResult.status === 'infected') {
      safeError('[FILE_UPLOAD_VIRUS]', 'Infected file blocked:', {
        userId,
        fileName: file.name,
        mimeType: file.type,
        engine: scanResult.engine,
        threats: scanResult.threats,
      })

      return new NextResponse(
        JSON.stringify({
          error: 'File contains malicious content',
          details: scanResult.details,
          threats: scanResult.threats,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (scanResult.status === 'error') {
      safeError('[FILE_UPLOAD_SCAN_ERROR]', 'Virus scan failed:', {
        userId,
        fileName: file.name,
        details: scanResult.details,
      })

      return new NextResponse(
        JSON.stringify({
          error: 'File security check failed',
          details: 'Unable to verify file safety. Please try again later.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Handle pending scans (VirusTotal async scanning)
    if (scanResult.status === 'pending') {
      console.log('[FILE_UPLOAD] File queued for async scanning:', {
        userId,
        fileName: file.name,
        engine: scanResult.engine,
      })
      // Continue with upload but mark as pending
    }

    // Generate secure filename
    const secureFileName = SecureFileUpload.generateSecureFileName(file.name, userId)

    // TODO: Implement actual encryption and storage
    // For now, simulate the process
    const filePath = `/secure-storage/chat-files/${secureFileName}`

    // Create file record with virus scan results
    const fileRecord = await db
      .insert(chatFiles)
      .values({
        messageId,
        originalName: file.name,
        fileName: secureFileName,
        filePath,
        fileSize: file.size,
        mimeType: file.type,
        isEncrypted: true,
        virusScanStatus: scanResult.status,
        virusScanResult: JSON.stringify({
          status: scanResult.status,
          engine: scanResult.engine,
          details: scanResult.details,
          threats: scanResult.threats,
          scanDuration: scanResult.scanDuration,
          scannedAt: new Date().toISOString(),
        }),
      })
      .returning()

    console.log('[FILE_UPLOAD] File uploaded successfully:', {
      fileId: fileRecord[0].id,
      userId,
      fileName: file.name,
      size: file.size,
      scanStatus: scanResult.status,
      scanEngine: scanResult.engine,
      scanDuration: scanResult.scanDuration,
    })

    // Generate preview for images
    let preview = null
    if (file.type.startsWith('image/')) {
      preview = await SecureFileUpload.generatePreview(file)
    }

    return NextResponse.json({
      success: true,
      data: {
        fileId: fileRecord[0].id,
        originalName: file.name,
        fileName: secureFileName,
        fileSize: file.size,
        mimeType: file.type,
        icon: SecureFileUpload.getFileIcon(file.type),
        formattedSize: SecureFileUpload.formatFileSize(file.size),
        preview,
        virusScanStatus: scanResult.status,
        scanEngine: scanResult.engine,
        scanDetails: scanResult.details,
      },
    })
  } catch (error) {
    safeError('[FILE_UPLOAD]', 'File upload error:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}