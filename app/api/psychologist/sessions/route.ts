import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs"
import { db } from "@/db"
import { sessions } from "@/db/schema"
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

    const newSession = await db.insert(sessions).values({
      psychologistId: parseInt(userId),
      patientId: parseInt(patientId),
      sessionDate: new Date(startTime),
      durationMinutes: Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60)),
      type: 'online', // Default to online
      status: 'agendada', // Default status
      notes: notes,
    }).returning()

    const realtimeService = RealtimeNotificationService.getInstance()
    await realtimeService.notifySessionUpdate(newSession[0].id, "created", userId)

    return NextResponse.json(newSession[0])
  } catch (error) {
    console.log("[SESSIONS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
