import { db } from "@/db"
import { sessions, users } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { NextResponse, NextRequest } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Buscar sessões do paciente com informações do psicólogo
    const patientSessions = await db
      .select({
        id: sessions.id,
        sessionDate: sessions.sessionDate,
        durationMinutes: sessions.durationMinutes,
        type: sessions.type,
        status: sessions.status,
        notes: sessions.notes,
        patientId: sessions.patientId,
        psychologistId: sessions.psychologistId,
        psychologistName: users.name,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.psychologistId, users.id))
      .where(eq(sessions.patientId, userId))
      .orderBy(desc(sessions.sessionDate))
      .limit(50)

    return NextResponse.json({ 
      success: true, 
      sessions: patientSessions 
    })

  } catch (error) {
    console.error('Error fetching patient sessions:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}