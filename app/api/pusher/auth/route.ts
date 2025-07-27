import { NextResponse } from "next/server"
import { pusherServer } from "@/lib/pusher"
import { getUserIdFromRequest } from "@/lib/auth"

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return new Response("Não autorizado", { status: 401 })
  }

  const data = await request.formData()
  const socketId = data.get("socket_id") as string
  const channel = data.get("channel_name") as string

  // O canal deve ser no formato 'private-chat-userId1-userId2'
  const channelUsers = channel.replace("private-chat-", "").split("-")
  const authorized = channelUsers.includes(userId.toString())

  if (!authorized) {
    return new Response("Proibido", { status: 403 })
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channel)
  return NextResponse.json(authResponse)
}
