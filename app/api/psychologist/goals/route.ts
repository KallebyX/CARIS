import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { therapeuticGoals, goalMilestones } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get("patientId")

  try {
    const whereCondition = patientId 
      ? and(eq(therapeuticGoals.psychologistId, psychologistId), eq(therapeuticGoals.patientId, parseInt(patientId)))
      : eq(therapeuticGoals.psychologistId, psychologistId)

    const goals = await db.query.therapeuticGoals.findMany({
      where: whereCondition,
      with: {
        patient: {
          columns: {
            id: true,
            name: true,
          }
        },
        milestones: true,
      },
      orderBy: (goals, { desc }) => [desc(goals.createdAt)],
    })

    return NextResponse.json({ success: true, data: goals })
  } catch (error) {
    console.error("Erro ao buscar metas terapêuticas:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { patientId, title, description, targetValue, unit, dueDate, milestones } = body

    if (!patientId || !title) {
      return NextResponse.json({ error: "ID do paciente e título são obrigatórios" }, { status: 400 })
    }

    const [newGoal] = await db.insert(therapeuticGoals).values({
      patientId: parseInt(patientId),
      psychologistId,
      title,
      description,
      targetValue,
      unit,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "active",
    }).returning()

    // Criar marcos se fornecidos
    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      await db.insert(goalMilestones).values(
        milestones.map(milestone => ({
          goalId: newGoal.id,
          title: milestone.title,
          description: milestone.description,
          targetValue: milestone.targetValue,
        }))
      )
    }

    return NextResponse.json({ success: true, data: newGoal })
  } catch (error) {
    console.error("Erro ao criar meta terapêutica:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}