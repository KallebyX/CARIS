import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { progressMetrics, diaryEntries, sessions } from "@/db/schema"
import { eq, and, gte, sql } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get("patientId")
  const period = searchParams.get("period") || "monthly"

  if (!patientId) {
    return NextResponse.json({ error: "ID do paciente é obrigatório" }, { status: 400 })
  }

  try {
    // Buscar métricas existentes
    const existingMetrics = await db.query.progressMetrics.findMany({
      where: and(
        eq(progressMetrics.patientId, parseInt(patientId)),
        eq(progressMetrics.period, period)
      ),
      orderBy: (metrics, { desc }) => [desc(metrics.calculatedAt)],
    })

    // Calcular métricas em tempo real se necessário
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Consistência do diário (últimos 30 dias)
    const diaryConsistency = await db
      .select({ count: sql<number>`count(*)` })
      .from(diaryEntries)
      .where(and(
        eq(diaryEntries.patientId, parseInt(patientId)),
        gte(diaryEntries.entryDate, thirtyDaysAgo)
      ))

    // Tendência de humor (média dos últimos 30 dias)
    const moodTrend = await db
      .select({ 
        avgMood: sql<number>`avg(${diaryEntries.moodRating})`,
        avgIntensity: sql<number>`avg(${diaryEntries.intensityRating})`
      })
      .from(diaryEntries)
      .where(and(
        eq(diaryEntries.patientId, parseInt(patientId)),
        gte(diaryEntries.entryDate, thirtyDaysAgo)
      ))

    // Frequência de sessões (últimos 30 dias)
    const sessionFrequency = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .where(and(
        eq(sessions.patientId, parseInt(patientId)),
        gte(sessions.sessionDate, thirtyDaysAgo),
        eq(sessions.status, "realizada")
      ))

    // Compilar métricas calculadas
    const calculatedMetrics = {
      diaryConsistency: diaryConsistency[0]?.count || 0,
      averageMood: Math.round((moodTrend[0]?.avgMood || 0) * 10) / 10,
      averageIntensity: Math.round((moodTrend[0]?.avgIntensity || 0) * 10) / 10,
      sessionFrequency: sessionFrequency[0]?.count || 0,
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        existingMetrics,
        calculatedMetrics,
        period
      }
    })
  } catch (error) {
    console.error("Erro ao buscar métricas de progresso:", error)
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
    const { patientId, action } = body

    if (!patientId) {
      return NextResponse.json({ error: "ID do paciente é obrigatório" }, { status: 400 })
    }

    if (action === "recalculate") {
      // Recalcular e armazenar métricas de progresso
      const now = new Date()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Calcular métricas
      const diaryConsistency = await db
        .select({ count: sql<number>`count(*)` })
        .from(diaryEntries)
        .where(and(
          eq(diaryEntries.patientId, parseInt(patientId)),
          gte(diaryEntries.entryDate, thirtyDaysAgo)
        ))

      const moodTrend = await db
        .select({ avgMood: sql<number>`avg(${diaryEntries.moodRating})` })
        .from(diaryEntries)
        .where(and(
          eq(diaryEntries.patientId, parseInt(patientId)),
          gte(diaryEntries.entryDate, thirtyDaysAgo)
        ))

      const sessionFrequency = await db
        .select({ count: sql<number>`count(*)` })
        .from(sessions)
        .where(and(
          eq(sessions.patientId, parseInt(patientId)),
          gte(sessions.sessionDate, thirtyDaysAgo),
          eq(sessions.status, "realizada")
        ))

      // Armazenar métricas calculadas
      const metricsToInsert = [
        {
          patientId: parseInt(patientId),
          metricType: "diary_consistency",
          value: diaryConsistency[0]?.count || 0,
          period: "monthly",
        },
        {
          patientId: parseInt(patientId),
          metricType: "mood_trend",
          value: Math.round((moodTrend[0]?.avgMood || 0) * 10),
          period: "monthly",
        },
        {
          patientId: parseInt(patientId),
          metricType: "session_frequency",
          value: sessionFrequency[0]?.count || 0,
          period: "monthly",
        }
      ]

      await db.insert(progressMetrics).values(metricsToInsert)

      return NextResponse.json({ 
        success: true, 
        message: "Métricas recalculadas com sucesso",
        data: metricsToInsert
      })
    }

    return NextResponse.json({ error: "Ação não reconhecida" }, { status: 400 })
  } catch (error) {
    console.error("Erro ao processar métricas de progresso:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}