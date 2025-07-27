import { NextResponse } from "next/server"
import { RealtimeNotificationService } from "@/lib/realtime-notifications"
import { getUserIdFromRequest } from "@/lib/auth"

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { notificationId, markAll } = await request.json()
    const realtimeService = RealtimeNotificationService.getInstance()

    if (markAll) {
      await realtimeService.markAllNotificationsAsRead(userId)
    } else if (notificationId) {
      await realtimeService.markNotificationAsRead(userId, notificationId)
    } else {
      return NextResponse.json({ error: "ID da notificação é obrigatório" }, { status: 400 })
    }

    return NextResponse.json({ message: "Notificação marcada como lida" })
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
