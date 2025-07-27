import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { chatMessages, chatRooms, users, messageReadReceipts } from "@/db/schema"
import { eq, and, or, desc, asc } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"
import { RealtimeNotificationService } from "@/lib/realtime-notifications"
import { MessageExpirationService } from "@/lib/message-expiration"

// Get chat messages for a conversation
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const roomId = searchParams.get("roomId")
    const otherUserId = searchParams.get("otherUserId")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    let targetRoomId = roomId

    // If no roomId provided, find or create room with other user
    if (!roomId && otherUserId) {
      const participantIds = [userId, parseInt(otherUserId)].sort()
      
      // Find existing room
      const existingRooms = await db
        .select()
        .from(chatRooms)
        .where(eq(chatRooms.participantIds, JSON.stringify(participantIds)))
        .limit(1)

      if (existingRooms.length > 0) {
        targetRoomId = existingRooms[0].id
      } else {
        // Create new room
        const newRoom = await db
          .insert(chatRooms)
          .values({
            participantIds: JSON.stringify(participantIds),
            roomType: 'private',
            isEncrypted: true
          })
          .returning()

        targetRoomId = newRoom[0].id
      }
    }

    if (!targetRoomId) {
      return new NextResponse("Room ID or other user ID required", { status: 400 })
    }

    // Verify user has access to this room
    const room = await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.id, targetRoomId))
      .limit(1)

    if (room.length === 0) {
      return new NextResponse("Room not found", { status: 404 })
    }

    const participantIds = JSON.parse(room[0].participantIds)
    if (!participantIds.includes(userId)) {
      return new NextResponse("Access denied", { status: 403 })
    }

    // Get messages
    const messages = await db
      .select({
        id: chatMessages.id,
        roomId: chatMessages.roomId,
        senderId: chatMessages.senderId,
        content: chatMessages.content,
        messageType: chatMessages.messageType,
        encryptionVersion: chatMessages.encryptionVersion,
        isTemporary: chatMessages.isTemporary,
        expiresAt: chatMessages.expiresAt,
        metadata: chatMessages.metadata,
        createdAt: chatMessages.createdAt,
        editedAt: chatMessages.editedAt
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.roomId, targetRoomId),
          eq(chatMessages.deletedAt, null)
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .offset(offset)

    // Mark messages as delivered
    await db
      .insert(messageReadReceipts)
      .values(
        messages
          .filter(msg => msg.senderId !== userId)
          .map(msg => ({
            messageId: msg.id,
            userId,
            deliveredAt: new Date()
          }))
      )
      .onConflictDoNothing()

    return NextResponse.json({
      success: true,
      data: {
        roomId: targetRoomId,
        messages: messages.reverse(), // Return in chronological order
        isEncrypted: room[0].isEncrypted
      }
    })
  } catch (error) {
    console.error("[CHAT_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// Send a new message
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { 
      roomId, 
      otherUserId, 
      content, 
      messageType = 'text',
      isTemporary = false,
      expirationKey,
      metadata 
    } = body

    if (!content || content.trim() === '') {
      return new NextResponse("Content is required", { status: 400 })
    }

    let targetRoomId = roomId

    // If no roomId provided, find or create room with other user
    if (!roomId && otherUserId) {
      const participantIds = [userId, parseInt(otherUserId)].sort()
      
      // Find existing room
      const existingRooms = await db
        .select()
        .from(chatRooms)
        .where(eq(chatRooms.participantIds, JSON.stringify(participantIds)))
        .limit(1)

      if (existingRooms.length > 0) {
        targetRoomId = existingRooms[0].id
      } else {
        // Create new room
        const newRoom = await db
          .insert(chatRooms)
          .values({
            participantIds: JSON.stringify(participantIds),
            roomType: 'private',
            isEncrypted: true
          })
          .returning()

        targetRoomId = newRoom[0].id
      }
    }

    if (!targetRoomId) {
      return new NextResponse("Room ID or other user ID required", { status: 400 })
    }

    // Verify user has access to this room
    const room = await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.id, targetRoomId))
      .limit(1)

    if (room.length === 0) {
      return new NextResponse("Room not found", { status: 404 })
    }

    const participantIds = JSON.parse(room[0].participantIds)
    if (!participantIds.includes(userId)) {
      return new NextResponse("Access denied", { status: 403 })
    }

    // Calculate expiration if temporary
    let expiresAt: Date | null = null
    if (isTemporary && expirationKey) {
      const expiration = MessageExpirationService.EXPIRATION_OPTIONS[expirationKey as keyof typeof MessageExpirationService.EXPIRATION_OPTIONS]
      if (expiration) {
        expiresAt = new Date(Date.now() + expiration.duration)
      }
    }

    // Create message
    const newMessage = await db
      .insert(chatMessages)
      .values({
        roomId: targetRoomId,
        senderId: userId,
        content, // Content should be encrypted on client-side
        messageType,
        encryptionVersion: 'aes-256-v1',
        isTemporary,
        expiresAt,
        metadata: metadata ? JSON.stringify(metadata) : null
      })
      .returning()

    const message = newMessage[0]

    // Send real-time notification
    try {
      const realtimeService = RealtimeNotificationService.getInstance()
      const otherParticipants = participantIds.filter((id: number) => id !== userId)
      
      for (const participantId of otherParticipants) {
        await realtimeService.notifyNewChatMessage(
          userId.toString(), 
          participantId.toString(), 
          messageType === 'file' ? 'Arquivo enviado' : 'Nova mensagem'
        )
      }
    } catch (error) {
      console.error("Failed to send real-time notification:", error)
    }

    return NextResponse.json({
      success: true,
      data: message
    })
  } catch (error) {
    console.error("[CHAT_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
