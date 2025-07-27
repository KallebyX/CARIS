import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs"
import { db } from "@/db"
import { sessions } from "@/db/schema"
import { RealtimeNotificationService } from "@/lib/realtime-notifications"

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    const body = await req.json()

    const { patientId, sessionDate, durationMinutes, type, notes } = body

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!patientId) {
      return new NextResponse("Patient ID is required", { status: 400 })
    }

    if (!sessionDate) {
      return new NextResponse("Session date is required", {
        status: 400,
      })
    }

    const [newSession] = await db.insert(sessions).values({
      psychologistId: parseInt(userId),
      patientId: parseInt(patientId),
      sessionDate: new Date(sessionDate),
      durationMinutes: durationMinutes || 50,
      type: type || 'online',
      status: 'agendada',
      notes: notes || null,
    }).returning()

    const realtimeService = RealtimeNotificationService.getInstance()
    await realtimeService.notifySessionScheduled(userId, patientId, newSession)

    return NextResponse.json(newSession)
  } catch (error) {
    console.log("[SESSIONS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
