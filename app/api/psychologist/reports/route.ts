import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { generatedReports, progressMetrics, therapeuticGoals, sessions, diaryEntries } from "@/db/schema"
import { eq, and, gte, sql } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const reports = await db.query.generatedReports.findMany({
      where: eq(generatedReports.psychologistId, psychologistId),
      with: {
        patient: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: (reports, { desc }) => [desc(reports.generatedAt)],
    })

    return NextResponse.json({ success: true, data: reports })
  } catch (error) {
    console.error("Erro ao buscar relatórios:", error)
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
    const { patientId, reportType, format, parameters } = body

    if (!reportType || !format) {
      return NextResponse.json({ error: "Tipo de relatório e formato são obrigatórios" }, { status: 400 })
    }

    // Gerar dados do relatório baseado no tipo
    let reportData = {}
    
    if (reportType === "patient_progress" && patientId) {
      // Buscar dados de progresso do paciente
      const patient = await db.query.users.findFirst({
        where: eq(generatedReports.patientId, parseInt(patientId)),
        with: {
          patientProfile: true,
        }
      })

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const recentMetrics = await db.query.progressMetrics.findMany({
        where: and(
          eq(progressMetrics.patientId, parseInt(patientId)),
          gte(progressMetrics.calculatedAt, thirtyDaysAgo)
        ),
      })

      const goals = await db.query.therapeuticGoals.findMany({
        where: eq(therapeuticGoals.patientId, parseInt(patientId)),
        with: {
          milestones: true,
        }
      })

      const recentSessions = await db.query.sessions.findMany({
        where: and(
          eq(sessions.patientId, parseInt(patientId)),
          gte(sessions.sessionDate, thirtyDaysAgo)
        ),
      })

      const recentDiaryEntries = await db.query.diaryEntries.findMany({
        where: and(
          eq(diaryEntries.patientId, parseInt(patientId)),
          gte(diaryEntries.entryDate, thirtyDaysAgo)
        ),
        orderBy: (entries, { desc }) => [desc(entries.entryDate)],
      })

      reportData = {
        patient,
        metrics: recentMetrics,
        goals,
        sessions: recentSessions,
        diaryEntries: recentDiaryEntries,
        reportType: "Relatório de Progresso do Paciente",
        generatedAt: new Date().toISOString(),
        period: "Últimos 30 dias"
      }
    } else if (reportType === "monthly_summary") {
      // Relatório mensal geral do psicólogo
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      const patientGoals = await db.query.therapeuticGoals.findMany({
        where: eq(therapeuticGoals.psychologistId, psychologistId),
        with: {
          patient: {
            columns: {
              id: true,
              name: true,
            }
          },
          milestones: true,
        }
      })

      const recentSessions = await db.query.sessions.findMany({
        where: and(
          eq(sessions.psychologistId, psychologistId),
          gte(sessions.sessionDate, lastMonth)
        ),
      })

      reportData = {
        reportType: "Resumo Mensal",
        goals: patientGoals,
        sessions: recentSessions,
        generatedAt: new Date().toISOString(),
        period: "Último mês"
      }
    }

    // Simular armazenamento do relatório (em produção, seria gerado o PDF/DOC real)
    const reportPath = `/reports/${reportType}_${Date.now()}.${format}`
    
    const [newReport] = await db.insert(generatedReports).values({
      psychologistId,
      patientId: patientId ? parseInt(patientId) : null,
      reportType,
      format,
      filePath: reportPath,
      parameters: parameters ? JSON.stringify(parameters) : null,
    }).returning()

    return NextResponse.json({ 
      success: true, 
      data: {
        report: newReport,
        reportData,
        downloadUrl: reportPath
      }
    })
  } catch (error) {
    console.error("Erro ao gerar relatório:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}