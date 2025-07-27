import { NextResponse } from "next/server"
import { db } from "@/db"
import { users, diaryEntries } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const patientId = Number.parseInt(params.id, 10)
  if (isNaN(patientId)) {
    return NextResponse.json({ error: "ID de paciente inválido" }, { status: 400 })
  }

  try {
    const patient = await db.query.users.findFirst({
      where: eq(users.id, patientId),
      with: {
        patientProfile: {
          where: eq(users.id, patientId), // This seems redundant, but shows intent
        },
      },
    })

    if (!patient || !patient.patientProfile || patient.patientProfile.psychologistId !== psychologistId) {
      return NextResponse.json({ error: "Paciente não encontrado ou não associado" }, { status: 404 })
    }

    const emotionalDataRaw = await db.query.diaryEntries.findMany({
      where: eq(diaryEntries.patientId, patientId),
      orderBy: (diaryEntries, { asc }) => [asc(diaryEntries.entryDate)],
      limit: 30,
    })

    const emotionalMapData = emotionalDataRaw.map((entry) => ({
      date: new Date(entry.entryDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      humor: entry.moodRating,
      intensidade: entry.intensityRating,
      evento: entry.content?.substring(0, 30) + "...",
    }))

    return NextResponse.json({ patient, emotionalMapData })
  } catch (error) {
    console.error(`Erro ao buscar paciente ${patientId}:`, error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
