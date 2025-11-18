import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { chatRooms, chatMessages, messageReadReceipts } from "@/db/schema"
import { getUserIdFromRequest } from "@/lib/auth"
import { eq, and, or, desc, isNull } from "drizzle-orm"
import { pusherServer } from "@/lib/pusher"
import { sanitizePlainText } from "@/lib/sanitize"
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit"

/**
 * GET /api/chat - Get messages for a chat room
 * Query params: roomId (optional) OR otherUserId (required if no roomId)
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const roomId = searchParams.get('roomId')
    const otherUserId = searchParams.get('otherUserId')

    let targetRoomId = roomId

    // If no roomId provided, find or create room with other user
    if (!roomId && otherUserId) {
      const otherUserIdNum = parseInt(otherUserId, 10)

      // Find existing room between these two users
      const existingRooms = await db
        .select()
        .from(chatRooms)
        .where(eq(chatRooms.roomType, 'private'))

      // Filter rooms that have both users
      const matchingRoom = existingRooms.find(room => {
        const participants = JSON.parse(room.participantIds)
        return participants.includes(userId) && participants.includes(otherUserIdNum)
      })

      if (matchingRoom) {
        targetRoomId = matchingRoom.id
      } else {
        // Create new room
        const newRoom = await db
          .insert(chatRooms)
          .values({
            participantIds: JSON.stringify([userId, otherUserIdNum]),
            roomType: 'private',
            isEncrypted: true
          })
          .returning()

        targetRoomId = newRoom[0].id
      }
    }

    if (!targetRoomId) {
      return NextResponse.json({
        error: "roomId ou otherUserId é obrigatório"
      }, { status: 400 })
    }

    // Verify user has access to this room
    const room = await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.id, targetRoomId))
      .limit(1)

    if (room.length === 0) {
      return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 })
    }

    const participants = JSON.parse(room[0].participantIds)
    if (!participants.includes(userId)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    // Get messages for this room
    const messages = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.roomId, targetRoomId),
          isNull(chatMessages.deletedAt)
        )
      )
      .orderBy(chatMessages.createdAt)
      .limit(100)

    // Get read receipts
    const messagesWithReceipts = await Promise.all(
      messages.map(async (message) => {
        const receipts = await db
          .select()
          .from(messageReadReceipts)
          .where(eq(messageReadReceipts.messageId, message.id))

        return {
          ...message,
          readReceipts: receipts
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        roomId: targetRoomId,
        messages: messagesWithReceipts,
        participants
      }
    })
  } catch (error) {
    console.error("[CHAT_GET]", error)
    return NextResponse.json({
      error: "Erro interno do servidor"
    }, { status: 500 })
  }
}

/**
 * POST /api/chat - Send a new message
 * Body: { roomId?, receiverId?, content, messageType?, isTemporary?, expiresAt?, metadata? }
 */
export async function POST(req: NextRequest) {
  // Apply rate limiting for chat messages to prevent spam
  const rateLimitResult = await rateLimit(req, RateLimitPresets.CHAT)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const {
      roomId,
      receiverId,
      messageType = 'text',
      isTemporary = false,
      expiresAt = null,
      metadata = null
    } = body

    // Sanitize message content to prevent XSS attacks
    const content = sanitizePlainText(body.content)

    if (!content) {
      return NextResponse.json({
        error: "Conteúdo da mensagem é obrigatório"
      }, { status: 400 })
    }

    let targetRoomId = roomId

    // If no roomId, find or create room with receiverId
    if (!roomId) {
      if (!receiverId) {
        return NextResponse.json({
          error: "roomId ou receiverId é obrigatório"
        }, { status: 400 })
      }

      const receiverIdNum = parseInt(receiverId, 10)

      // Find existing room
      const existingRooms = await db
        .select()
        .from(chatRooms)
        .where(eq(chatRooms.roomType, 'private'))

      const matchingRoom = existingRooms.find(room => {
        const participants = JSON.parse(room.participantIds)
        return participants.includes(userId) && participants.includes(receiverIdNum)
      })

      if (matchingRoom) {
        targetRoomId = matchingRoom.id
      } else {
        // Create new room
        const newRoom = await db
          .insert(chatRooms)
          .values({
            participantIds: JSON.stringify([userId, receiverIdNum]),
            roomType: 'private',
            isEncrypted: true
          })
          .returning()

        targetRoomId = newRoom[0].id
      }
    }

    // Verify user has access to room
    const room = await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.id, targetRoomId))
      .limit(1)

    if (room.length === 0) {
      return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 })
    }

    const participants = JSON.parse(room[0].participantIds)
    if (!participants.includes(userId)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    // Insert message
    const newMessage = await db
      .insert(chatMessages)
      .values({
        roomId: targetRoomId,
        senderId: userId,
        content,
        messageType,
        encryptionVersion: 'aes-256',
        isTemporary,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        metadata: metadata ? JSON.stringify(metadata) : null
      })
      .returning()

    const message = newMessage[0]

    // Create read receipt for sender
    await db
      .insert(messageReadReceipts)
      .values({
        messageId: message.id,
        userId: userId,
        deliveredAt: new Date(),
        readAt: new Date()
      })

    // Trigger Pusher event for real-time delivery
    try {
      await pusherServer.trigger(
        `chat-room-${targetRoomId}`,
        'new-message',
        {
          id: message.id,
          senderId: message.senderId,
          content: message.content,
          messageType: message.messageType,
          createdAt: message.createdAt,
          metadata: message.metadata
        }
      )

      // Send individual notifications to other participants
      const otherParticipants = participants.filter((p: number) => p !== userId)
      for (const participantId of otherParticipants) {
        await pusherServer.trigger(
          `user-${participantId}`,
          'new-chat-message',
          {
            roomId: targetRoomId,
            messageId: message.id,
            senderId: userId,
            preview: content.substring(0, 50)
          }
        )
      }
    } catch (pusherError) {
      console.error('Pusher notification failed:', pusherError)
      // Continue even if Pusher fails
    }

    return NextResponse.json({
      success: true,
      data: {
        message,
        roomId: targetRoomId
      }
    })
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    return NextResponse.json({
      error: "Erro interno do servidor"
    }, { status: 500 })
  }
}

/**
 * PATCH /api/chat - Mark message as read
 * Body: { messageId }
 */
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const { messageId } = body

    if (!messageId) {
      return NextResponse.json({
        error: "messageId é obrigatório"
      }, { status: 400 })
    }

    // Check if receipt already exists
    const existingReceipt = await db
      .select()
      .from(messageReadReceipts)
      .where(
        and(
          eq(messageReadReceipts.messageId, messageId),
          eq(messageReadReceipts.userId, userId)
        )
      )
      .limit(1)

    if (existingReceipt.length === 0) {
      // Create new receipt
      await db
        .insert(messageReadReceipts)
        .values({
          messageId,
          userId,
          deliveredAt: new Date(),
          readAt: new Date()
        })
    } else {
      // Update existing receipt
      await db
        .update(messageReadReceipts)
        .set({
          readAt: new Date()
        })
        .where(
          and(
            eq(messageReadReceipts.messageId, messageId),
            eq(messageReadReceipts.userId, userId)
          )
        )
    }

    // Notify sender via Pusher
    const message = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1)

    if (message.length > 0 && message[0].senderId !== userId) {
      try {
        await pusherServer.trigger(
          `user-${message[0].senderId}`,
          'message-read',
          {
            messageId,
            roomId: message[0].roomId,
            readBy: userId,
            readAt: new Date()
          }
        )
      } catch (pusherError) {
        console.error('Pusher read receipt failed:', pusherError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CHAT_PATCH]", error)
    return NextResponse.json({
      error: "Erro interno do servidor"
    }, { status: 500 })
  }
}

/**
 * DELETE /api/chat - Delete a message (soft delete)
 * Query params: messageId
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json({
        error: "messageId é obrigatório"
      }, { status: 400 })
    }

    // Verify user owns this message
    const message = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1)

    if (message.length === 0) {
      return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 })
    }

    if (message[0].senderId !== userId) {
      return NextResponse.json({
        error: "Você só pode deletar suas próprias mensagens"
      }, { status: 403 })
    }

    // Soft delete
    await db
      .update(chatMessages)
      .set({
        deletedAt: new Date()
      })
      .where(eq(chatMessages.id, messageId))

    // Notify room via Pusher
    try {
      await pusherServer.trigger(
        `chat-room-${message[0].roomId}`,
        'message-deleted',
        {
          messageId,
          deletedBy: userId
        }
      )
    } catch (pusherError) {
      console.error('Pusher delete notification failed:', pusherError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CHAT_DELETE]", error)
    return NextResponse.json({
      error: "Erro interno do servidor"
    }, { status: 500 })
  }
}
