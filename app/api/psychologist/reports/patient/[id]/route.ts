import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import {
  users,
  patientProfiles,
  sessions,
  diaryEntries,
  moodTracking,
  sosUsages,
  tasks,
  achievements,
} from "@/db/schema"
import { eq, and, gte, desc, asc } from "drizzle-orm"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Token não encontrado" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "psychologist") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const patientId = Number.parseInt(params.id)
    const psychologistId = decoded.userId

    // Verificar se o paciente pertence ao psicólogo
    const patient = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        currentCycle: patientProfiles.currentCycle,
        avatar: patientProfiles.avatar,
        birthDate: patientProfiles.birthDate,
        phone: patientProfiles.phone,
        createdAt: patientProfiles.createdAt,
      })
      .from(users)
      .innerJoin(patientProfiles, eq(users.id, patientProfiles.userId))
      .where(and(eq(users.id, patientId), eq(patientProfiles.psychologistId, psychologistId)))
      .limit(1)

    if (patient.length === 0) {
      return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 })
    }

    const patientData = patient[0]

    // Últimos 6 meses de dados
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // 1. Histórico de sessões
    const sessionHistory = await db
      .select({
        id: sessions.id,
        sessionDate: sessions.sessionDate,
        type: sessions.type,
        status: sessions.status,
        notes: sessions.notes,
        durationMinutes: sessions.durationMinutes,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.patientId, patientId),
          eq(sessions.psychologistId, psychologistId),
          gte(sessions.sessionDate, sixMonthsAgo),
        ),
      )
      .orderBy(desc(sessions.sessionDate))

    // 2. Evolução do humor
    const moodEvolution = await db
      .select({
        date: moodTracking.date,
        mood: moodTracking.mood,
        energy: moodTracking.energy,
        anxiety: moodTracking.anxiety,
        notes: moodTracking.notes,
      })
      .from(moodTracking)
      .where(
        and(eq(moodTracking.patientId, patientId), gte(moodTracking.date, sixMonthsAgo.toISOString().split("T")[0])),
      )
      .orderBy(asc(moodTracking.date))

    // 3. Atividade no diário
    const diaryActivity = await db
      .select({
        id: diaryEntries.id,
        title: diaryEntries.title,
        mood: diaryEntries.mood,
        tags: diaryEntries.tags,
        createdAt: diaryEntries.createdAt,
        isPrivate: diaryEntries.isPrivate,
      })
      .from(diaryEntries)
      .where(and(eq(diaryEntries.patientId, patientId), gte(diaryEntries.createdAt, sixMonthsAgo)))
      .orderBy(desc(diaryEntries.createdAt))

    // 4. Uso de ferramentas SOS
    const sosActivity = await db
      .select({
        toolName: sosUsages.toolName,
        durationMinutes: sosUsages.durationMinutes,
        createdAt: sosUsages.createdAt,
      })
      .from(sosUsages)
      .where(and(eq(sosUsages.patientId, patientId), gte(sosUsages.createdAt, sixMonthsAgo)))
      .orderBy(desc(sosUsages.createdAt))

    // 5. Progresso das tarefas
    const taskProgress = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.patientId, patientId),
          eq(tasks.psychologistId, psychologistId),
          gte(tasks.createdAt, sixMonthsAgo),
        ),
      )
      .orderBy(desc(tasks.createdAt))

    // 6. Conquistas desbloqueadas
    const patientAchievements = await db
      .select({
        type: achievements.type,
        title: achievements.title,
        description: achievements.description,
        unlockedAt: achievements.unlockedAt,
      })
      .from(achievements)
      .where(and(eq(achievements.patientId, patientId), gte(achievements.unlockedAt, sixMonthsAgo)))
      .orderBy(desc(achievements.unlockedAt))

    // Calcular estatísticas
    const stats = {
      totalSessions: sessionHistory.length,
      completedSessions: sessionHistory.filter((s) => s.status === "realizada").length,
      cancelledSessions: sessionHistory.filter((s) => s.status === "cancelada").length,
      avgSessionDuration:
        sessionHistory.length > 0
          ? Math.round(sessionHistory.reduce((acc, s) => acc + s.durationMinutes, 0) / sessionHistory.length)
          : 0,

      diaryEntries: diaryActivity.length,
      avgDiaryMood:
        diaryActivity.length > 0
          ? Math.round((diaryActivity.reduce((acc, d) => acc + d.mood, 0) / diaryActivity.length) * 10) / 10
          : 0,

      sosUsages: sosActivity.length,
      mostUsedSosTool:
        sosActivity.length > 0
          ? sosActivity.reduce(
              (acc, curr) => {
                acc[curr.toolName] = (acc[curr.toolName] || 0) + 1
                return acc
              },
              {} as Record<string, number>,
            )
          : {},

      tasksCompleted: taskProgress.filter((t) => t.status === "concluida").length,
      tasksTotal: taskProgress.length,
      taskCompletionRate:
        taskProgress.length > 0
          ? Math.round((taskProgress.filter((t) => t.status === "concluida").length / taskProgress.length) * 100)
          : 0,

      achievementsUnlocked: patientAchievements.length,

      currentMood: moodEvolution.length > 0 ? moodEvolution[moodEvolution.length - 1] : null,
      moodTrend:
        moodEvolution.length >= 2
          ? moodEvolution[moodEvolution.length - 1].mood - moodEvolution[moodEvolution.length - 2].mood
          : 0,
    }

    // Processar dados para gráficos
    const chartData = {
      moodChart: moodEvolution.map((m) => ({
        date: new Date(m.date).toLocaleDateString("pt-BR"),
        humor: m.mood,
        energia: m.energy,
        ansiedade: m.anxiety,
      })),

      diaryChart: diaryActivity.reduce(
        (acc, entry) => {
          const week = getWeekNumber(new Date(entry.createdAt))
          if (!acc[week]) acc[week] = { week, entries: 0, avgMood: 0, totalMood: 0 }
          acc[week].entries += 1
          acc[week].totalMood += entry.mood
          acc[week].avgMood = acc[week].totalMood / acc[week].entries
          return acc
        },
        {} as Record<string, any>,
      ),

      sosChart: sosActivity.reduce(
        (acc, usage) => {
          const month = new Date(usage.createdAt).toLocaleDateString("pt-BR", { month: "short" })
          if (!acc[month]) acc[month] = {}
          acc[month][usage.toolName] = (acc[month][usage.toolName] || 0) + 1
          return acc
        },
        {} as Record<string, any>,
      ),

      taskChart: taskProgress.reduce(
        (acc, task) => {
          const month = new Date(task.createdAt).toLocaleDateString("pt-BR", { month: "short" })
          if (!acc[month]) acc[month] = { created: 0, completed: 0 }
          acc[month].created += 1
          if (task.status === "concluida") acc[month].completed += 1
          return acc
        },
        {} as Record<string, any>,
      ),
    }

    return NextResponse.json({
      patient: patientData,
      stats,
      history: {
        sessions: sessionHistory,
        mood: moodEvolution,
        diary: diaryActivity,
        sos: sosActivity,
        tasks: taskProgress,
        achievements: patientAchievements,
      },
      charts: chartData,
    })
  } catch (error) {
    console.error("Erro ao buscar relatório do paciente:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

function getWeekNumber(date: Date): string {
  const startDate = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
  const weekNumber = Math.ceil(days / 7)
  return `${date.getFullYear()}-W${weekNumber}`
}
