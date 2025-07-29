import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { chatFiles, chatMessages } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"
import { SecureFileUpload } from "@/lib/secure-file-upload"

export async function POST(req: NextRequest) {
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

    // Scan for viruses
    const scanResult = await SecureFileUpload.scanFile(fileBuffer)
    if (scanResult.status === 'infected') {
      return new NextResponse("File contains malicious content", { status: 400 })
    }

    if (scanResult.status === 'error') {
      return new NextResponse("File security check failed", { status: 500 })
    }

    // Generate secure filename
    const secureFileName = SecureFileUpload.generateSecureFileName(file.name, userId)

    // TODO: Implement actual encryption and storage
    // For now, simulate the process
    const filePath = `/secure-storage/chat-files/${secureFileName}`

    // Create file record
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
        virusScanResult: JSON.stringify(scanResult)
      })
      .returning()

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
        virusScanStatus: scanResult.status
      }
    })
  } catch (error) {
    console.error("[FILE_UPLOAD]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}