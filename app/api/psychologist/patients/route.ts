import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { patientProfiles } from "@/db/schema"
import { eq } from "drizzle-orm"
import { requireAnyRole, getAuthenticatedUser } from "@/lib/rbac"

export async function GET(request: NextRequest) {
  // SECURITY: Require psychologist or admin role using centralized RBAC middleware
  const authError = await requireAnyRole(request, ['psychologist', 'admin'])
  if (authError) return authError

  const user = await getAuthenticatedUser(request)
  const psychologistId = user!.id // Safe after requireAnyRole check

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
