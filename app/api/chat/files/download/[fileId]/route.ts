import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { chatFiles, chatMessages, chatRooms } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"
import { SecureFileUpload } from "@/lib/secure-file-upload"

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { fileId } = params
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")
    const expires = searchParams.get("expires")

    // Basic token validation (in production, use proper token verification)
    if (!token || !expires) {
      return new NextResponse("Invalid download link", { status: 400 })
    }

    const expirationTime = parseInt(expires)
    if (Date.now() > expirationTime) {
      return new NextResponse("Download link expired", { status: 410 })
    }

    // Get file information
    const fileData = await db
      .select({
        file: chatFiles,
        message: {
          id: chatMessages.id,
          roomId: chatMessages.roomId,
          senderId: chatMessages.senderId
        }
      })
      .from(chatFiles)
      .leftJoin(chatMessages, eq(chatFiles.messageId, chatMessages.id))
      .where(eq(chatFiles.id, fileId))
      .limit(1)

    if (fileData.length === 0) {
      return new NextResponse("File not found", { status: 404 })
    }

    const { file, message } = fileData[0]

    if (!message) {
      return new NextResponse("Associated message not found", { status: 404 })
    }

    // Verify user has access to the room
    const room = await db
      .select({ participantIds: chatRooms.participantIds })
      .from(chatRooms)
      .where(eq(chatRooms.id, message.roomId))
      .limit(1)

    if (room.length === 0) {
      return new NextResponse("Room not found", { status: 404 })
    }

    const participantIds = JSON.parse(room[0].participantIds)
    if (!participantIds.includes(userId)) {
      return new NextResponse("Access denied", { status: 403 })
    }

    // Check virus scan status
    if (file.virusScanStatus === 'infected') {
      return new NextResponse("File is infected and cannot be downloaded", { status: 403 })
    }

    if (file.virusScanStatus === 'pending') {
      return new NextResponse("File is still being scanned", { status: 202 })
    }

    // Update download count
    await db
      .update(chatFiles)
      .set({ 
        downloadCount: file.downloadCount + 1
      })
      .where(eq(chatFiles.id, fileId))

    // TODO: Implement actual file decryption and streaming
    // For now, return file metadata for client-side handling
    return NextResponse.json({
      success: true,
      data: {
        fileId: file.id,
        originalName: file.originalName,
        fileName: file.fileName,
        filePath: file.filePath,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        formattedSize: SecureFileUpload.formatFileSize(file.fileSize),
        downloadUrl: `/api/chat/files/stream/${fileId}?token=${token}&expires=${expires}`
      }
    })

  } catch (error) {
    console.error("[FILE_DOWNLOAD]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}