import { NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { db } from "@/db"
import { RealtimeNotificationService } from "@/lib/realtime-notifications"

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    const body = await req.json()

    const { patientId, startTime, endTime, notes } = body

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!patientId) {
      return new NextResponse("Patient ID is required", { status: 400 })
    }

    if (!startTime || !endTime) {
      return new NextResponse("Start and end times are required", {
        status: 400,
      })
    }

    const newSession = await prisma.session.createMany({
      data: [
        {
          psychologistId: userId,
          patientId: patientId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          notes: notes,
        },
      ],
    })

    const realtimeService = RealtimeNotificationService.getInstance()
    await realtimeService.notifySessionUpdate(newSession[0].id, "created", userId)

    return NextResponse.json(newSession)
  } catch (error) {
    console.log("[SESSIONS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
