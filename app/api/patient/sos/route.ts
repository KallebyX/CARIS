import { db } from "@/db"
import { sos } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { RealtimeNotificationService } from "@/lib/realtime-notifications"
import { patientProfiles } from "@/db/schema"

export async function POST(req: Request) {
  try {
    const { userId, toolName } = await req.json()

    if (!userId || !toolName) {
      return new NextResponse("Missing fields", { status: 400 })
    }

    const existingSOS = await db.select().from(sos).where(eq(sos.userId, userId))

    if (existingSOS.length > 0) {
      return new NextResponse("SOS already registered", { status: 400 })
    }

    await db.insert(sos).values({
      userId: userId,
      toolName: toolName,
    })

    // Buscar o psicólogo responsável
    const patientProfile = await db
      .select({ psychologistId: patientProfiles.psychologistId })
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1)

    if (patientProfile.length > 0) {
      const realtimeService = RealtimeNotificationService.getInstance()
      await realtimeService.notifySOSActivated(userId, patientProfile[0].psychologistId, toolName)
    }

    return NextResponse.json({ message: "SOS registrado com sucesso!" })
  } catch (error) {
    console.log("[SOS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
