import { db } from "@/db"
import { sosUsages } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { RealtimeNotificationService } from "@/lib/realtime-notifications"
import { patientProfiles } from "@/db/schema"
import { getUserIdFromRequest } from "@/lib/auth"
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting for sensitive SOS operations
    const rateLimitResult = await rateLimit(req, RateLimitPresets.SENSITIVE)
    if (!rateLimitResult.success) {
      return rateLimitResult.response
    }

    // Authenticate user - CRITICAL: prevent unauthorized SOS activation
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { toolName } = await req.json()

    if (!toolName) {
      return NextResponse.json({ error: "Missing toolName field" }, { status: 400 })
    }

    const existingSOS = await db.select().from(sosUsages).where(eq(sosUsages.patientId, userId))

    if (existingSOS.length > 0) {
      return new NextResponse("SOS already registered", { status: 400 })
    }

    await db.insert(sosUsages).values({
      patientId: userId,
      level: 'mild', // Padrão
      notes: `SOS ativado: ${toolName}`,
    })

    // Buscar o psicólogo responsável
    const patientProfile = await db
      .select({ psychologistId: patientProfiles.psychologistId })
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1)

    if (patientProfile.length > 0 && patientProfile[0].psychologistId) {
      const realtimeService = RealtimeNotificationService.getInstance()
      await realtimeService.notifySOSActivated(userId, patientProfile[0].psychologistId, toolName)
    }

    return NextResponse.json({ message: "SOS registrado com sucesso!" })
  } catch (error) {
    console.log("[SOS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
