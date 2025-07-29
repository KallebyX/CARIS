import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { chatMessages } from "@/db/schema"
import { getUserIdFromRequest } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const { receiverId, content } = body

    if (!receiverId) {
      return NextResponse.json({ error: "ID do destinatário é obrigatório" }, { status: 400 })
    }

    if (!content) {
      return NextResponse.json({ error: "Conteúdo da mensagem é obrigatório" }, { status: 400 })
    }

    const [message] = await db
      .insert(chatMessages)
      .values({
        senderId: userId,
        receiverId: parseInt(receiverId),
        content,
        sentAt: new Date(),
      })
      .returning()

    // TODO: Implementar notificação em tempo real via Pusher
    // const realtimeService = RealtimeNotificationService.getInstance()
    // await realtimeService.notifyNewChatMessage(userId, receiverId, content)

    return NextResponse.json({ success: true, data: message })
  } catch (error) {
    console.error("[CHAT_POST]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const partnerId = searchParams.get('partnerId')

    if (!partnerId) {
      return NextResponse.json({ error: "ID do parceiro é obrigatório" }, { status: 400 })
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(
        // Messages between current user and partner
        // TODO: Add proper filtering logic for chat messages between two users
      )
      .orderBy(chatMessages.sentAt)
      .limit(100)

    return NextResponse.json({ success: true, data: messages })
  } catch (error) {
    console.error("[CHAT_GET]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}