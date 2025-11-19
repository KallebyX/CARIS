import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { pusherServer } from "@/lib/pusher"
import { db } from "@/db"
import { users, chatRooms } from "@/db/schema"
import { eq } from "drizzle-orm"
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit"
import { safeError } from "@/lib/safe-logger"

/**
 * Pusher Channel Authorization Endpoint
 *
 * SECURITY: This endpoint validates whether a user has permission to subscribe
 * to private and presence channels in Pusher.
 *
 * Channel naming conventions:
 * - private-user-{userId}: User-specific notifications
 * - private-chat-room-{roomId}: Chat room messages
 * - private-role-{role}: Role-specific broadcasts
 * - presence-online-users: Online user presence
 *
 * @see https://pusher.com/docs/channels/server_api/authenticating-users/
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting - this endpoint is called frequently
  const rateLimitResult = await rateLimit(request, RateLimitPresets.READ)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    // Authenticate user
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Get request body - Pusher sends either JSON or form data
    let socket_id: string
    let channel_name: string

    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      const body = await request.json()
      socket_id = body.socket_id
      channel_name = body.channel_name
    } else {
      // Form data (Pusher's default)
      const formData = await request.formData()
      socket_id = formData.get("socket_id") as string
      channel_name = formData.get("channel_name") as string
    }

    if (!socket_id || !channel_name) {
      return NextResponse.json(
        { error: "socket_id e channel_name são obrigatórios" },
        { status: 400 }
      )
    }

    // Get user details for authorization checks
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        role: true,
        name: true,
        email: true,
      }
    })

    if (!user) {
      safeError("[PUSHER_AUTH]", "User not found for authorization:", { userId })
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // AUTHORIZATION LOGIC based on channel name
    const authorized = await authorizeChannel(channel_name, user)

    if (!authorized) {
      safeError("[PUSHER_AUTH]", "Unauthorized channel access attempt:", {
        userId,
        channel: channel_name,
        role: user.role
      })
      return NextResponse.json(
        { error: "Você não tem permissão para acessar este canal" },
        { status: 403 }
      )
    }

    // For presence channels, include user data
    if (channel_name.startsWith("presence-")) {
      const presenceData = {
        user_id: user.id.toString(),
        user_info: {
          name: user.name,
          role: user.role,
          // Don't include email for privacy
        }
      }

      const auth = pusherServer.authorizeChannel(socket_id, channel_name, presenceData)
      return NextResponse.json(auth)
    }

    // For private channels, just authorize
    const auth = pusherServer.authorizeChannel(socket_id, channel_name)
    return NextResponse.json(auth)

  } catch (error) {
    safeError("[PUSHER_AUTH]", "Pusher authorization error:", error)
    return NextResponse.json(
      { error: "Erro ao autorizar canal" },
      { status: 500 }
    )
  }
}

/**
 * Authorize channel access based on channel name and user
 */
async function authorizeChannel(
  channelName: string,
  user: { id: number; role: string; name: string; email: string }
): Promise<boolean> {
  // PUBLIC CHANNELS (no authorization needed)
  // Note: In production, minimize public channels for security
  if (!channelName.startsWith("private-") && !channelName.startsWith("presence-")) {
    return false // Force all channels to be private/presence
  }

  // PRIVATE USER CHANNELS: private-user-{userId}
  if (channelName.startsWith("private-user-")) {
    const channelUserId = channelName.replace("private-user-", "")
    return channelUserId === user.id.toString()
  }

  // PRIVATE CHAT CHANNELS: private-chat-{userId1}-{userId2} (legacy)
  if (channelName.startsWith("private-chat-") && !channelName.includes("room")) {
    const channelUsers = channelName.replace("private-chat-", "").split("-")
    return channelUsers.includes(user.id.toString())
  }

  // PRIVATE CHAT ROOM CHANNELS: private-chat-room-{roomId}
  if (channelName.startsWith("private-chat-room-")) {
    const roomId = channelName.replace("private-chat-room-", "")
    return await isUserInChatRoom(user.id, roomId)
  }

  // PRIVATE ROLE CHANNELS: private-role-{role}
  if (channelName.startsWith("private-role-")) {
    const channelRole = channelName.replace("private-role-", "")
    return user.role === channelRole
  }

  // PRESENCE CHANNELS: presence-online-users, presence-chat-room-{roomId}
  if (channelName.startsWith("presence-")) {
    if (channelName === "presence-online-users") {
      return true // All authenticated users can see who's online
    }

    if (channelName.startsWith("presence-chat-room-")) {
      const roomId = channelName.replace("presence-chat-room-", "")
      return await isUserInChatRoom(user.id, roomId)
    }

    if (channelName.startsWith("presence-role-")) {
      const channelRole = channelName.replace("presence-role-", "")
      return user.role === channelRole
    }
  }

  // ADMIN CHANNELS: private-admin-*
  if (channelName.startsWith("private-admin-")) {
    return user.role === "admin" || user.role === "clinic_admin"
  }

  // PSYCHOLOGIST CHANNELS: private-psychologist-*
  if (channelName.startsWith("private-psychologist-")) {
    return user.role === "psychologist" || user.role === "admin"
  }

  // PATIENT CHANNELS: private-patient-*
  if (channelName.startsWith("private-patient-")) {
    return user.role === "patient" || user.role === "psychologist" || user.role === "admin"
  }

  // Default deny - unknown channel pattern
  safeError("[PUSHER_AUTH]", "Unknown channel pattern:", { channelName })
  return false
}

/**
 * Check if user is a participant in the chat room
 */
async function isUserInChatRoom(userId: number, roomId: string): Promise<boolean> {
  try {
    const room = await db.query.chatRooms.findFirst({
      where: eq(chatRooms.id, roomId),
      columns: {
        participantIds: true,
      }
    })

    if (!room) {
      return false
    }

    // participantIds is stored as JSON array string
    const participants = JSON.parse(room.participantIds) as number[]
    return participants.includes(userId)
  } catch (error) {
    safeError("[PUSHER_AUTH]", "Error checking chat room membership:", error)
    return false
  }
}
