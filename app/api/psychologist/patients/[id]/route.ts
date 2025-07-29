import { NextResponse } from "next/server"
import { db } from "@/db"
import { users, diaryEntries, customFieldValues, progressMetrics, therapeuticGoals } from "@/db/schema"
import { eq, and, gte } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  const patientId = Number.parseInt(id, 10)
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

    // Buscar campos customizados
    const customFields = await db.query.customFieldValues.findMany({
      where: eq(customFieldValues.patientId, patientId),
      with: {
        customField: true,
      },
    })

    // Buscar métricas de progresso recentes
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentMetrics = await db.query.progressMetrics.findMany({
      where: and(
        eq(progressMetrics.patientId, patientId),
        gte(progressMetrics.calculatedAt, thirtyDaysAgo)
      ),
      orderBy: (metrics, { desc }) => [desc(metrics.calculatedAt)],
    })

    // Buscar metas terapêuticas
    const goals = await db.query.therapeuticGoals.findMany({
      where: eq(therapeuticGoals.patientId, patientId),
      with: {
        milestones: true,
      },
      orderBy: (goals, { desc }) => [desc(goals.createdAt)],
    })

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

    return NextResponse.json({ 
      patient, 
      emotionalMapData,
      customFields,
      recentMetrics,
      goals
    })
  } catch (error) {
    console.error(`Erro ao buscar paciente ${patientId}:`, error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
