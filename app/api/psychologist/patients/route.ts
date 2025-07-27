import { NextResponse } from "next/server"
import { db } from "@/db"
import { patientProfiles } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: Request) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const patients = await db.query.patientProfiles.findMany({
      where: eq(patientProfiles.psychologistId, psychologistId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Em um app real, buscaríamos dados agregados como "última atividade" e "próxima sessão".
    // Por enquanto, retornaremos os dados básicos.
    const responseData = patients.map((p) => ({
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
      currentCycle: p.currentCycle,
      status: "Ativo", // Mockado por enquanto
      lastActivity: "1 dia atrás", // Mockado
      nextSession: new Date().toISOString(), // Mockado
    }))

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Erro ao buscar pacientes:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
