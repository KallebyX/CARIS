import { NextResponse } from "next/server"
import { RealtimeNotificationService } from "@/lib/realtime-notifications"
import { getUserIdFromRequest } from "@/lib/auth"

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { type, data } = await request.json()
    const realtimeService = RealtimeNotificationService.getInstance()

    switch (type) {
      case "new-message":
        await realtimeService.notifyNewChatMessage(data.senderId, data.receiverId, data.messageContent)
        break

      case "sos-alert":
        await realtimeService.notifySOSActivated(data.patientId, data.psychologistId, data.toolName)
        break

      case "diary-entry":
        await realtimeService.notifyNewDiaryEntry(data.patientId, data.psychologistId, data.entryTitle, data.mood)
        break

      case "session-update":
        await realtimeService.notifySessionUpdate(data.sessionId, data.updateType, data.updatedBy)
        break

      case "task-assigned":
        await realtimeService.notifyTaskAssigned(data.taskId, data.patientId, data.psychologistId, data.taskTitle)
        break

      case "session-reminder":
        await realtimeService.notifySessionReminder(data.patientId, new Date(data.sessionDate), data.psychologistName)
        break

      default:
        return NextResponse.json({ error: "Tipo de notificação inválido" }, { status: 400 })
    }

    return NextResponse.json({ message: "Notificação enviada com sucesso" })
  } catch (error) {
    console.error("Erro ao enviar notificação em tempo real:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
