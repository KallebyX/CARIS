import { NextResponse } from "next/server"
import { db } from "@/db"
import { sessions } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const patientSessions = await db.query.sessions.findMany({
      where: eq(sessions.patientId, userId),
      orderBy: [desc(sessions.sessionDate)],
      with: {
        psychologist: {
          columns: {
            name: true,
          },
        },
      },
    })

    return NextResponse.json(patientSessions)
  } catch (error) {
    console.error("Erro ao buscar sessões do paciente:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
