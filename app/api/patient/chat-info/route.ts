import { NextResponse } from "next/server"
import { db } from "@/db"
import { users, patientProfiles } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

/**
 * GET /api/patient/chat-info
 * Busca as informações do psicólogo associado ao paciente logado.
 */
export async function GET(request: Request) {
  const patientId = await getUserIdFromRequest(request)
  if (!patientId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    // Encontra o perfil do paciente para obter o ID do psicólogo
    const patientProfile = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, patientId),
    })

    if (!patientProfile || !patientProfile.psychologistId) {
      return NextResponse.json({ error: "Nenhum psicólogo associado a este paciente." }, { status: 404 })
    }

    // Busca os dados do psicólogo
    const psychologist = await db.query.users.findFirst({
      where: eq(users.id, patientProfile.psychologistId),
      columns: {
        id: true,
        name: true,
      },
    })

    if (!psychologist) {
      return NextResponse.json({ error: "Psicólogo não encontrado." }, { status: 404 })
    }

    return NextResponse.json({
      counterpartId: psychologist.id,
      counterpartName: psychologist.name,
    })
  } catch (error) {
    console.error("Erro ao buscar informações do chat do paciente:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
