import { NextResponse } from "next/server"
import { NotificationService } from "@/lib/notification-service"
import { getUserIdFromRequest } from "@/lib/auth"

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { type, data } = await request.json()
    const notificationService = NotificationService.getInstance()

    switch (type) {
      case "session-reminder":
        await notificationService.sendSessionReminder(
          data.patientId,
          new Date(data.sessionDate),
          data.psychologistName,
          data.sessionType,
        )
        break

      case "session-confirmation":
        await notificationService.sendSessionConfirmation(
          data.patientId,
          new Date(data.sessionDate),
          data.psychologistName,
          data.sessionType,
        )
        break

      case "diary-entry":
        await notificationService.sendDiaryEntryNotification(data.psychologistId, data.patientName, data.entryTitle)
        break

      case "sos-alert":
        await notificationService.sendSOSAlert(data.psychologistId, data.patientName, data.patientPhone)
        break

      default:
        return NextResponse.json({ error: "Tipo de notificação inválido" }, { status: 400 })
    }

    return NextResponse.json({ message: "Notificação de teste enviada com sucesso" })
  } catch (error) {
    console.error("Erro ao enviar notificação de teste:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
