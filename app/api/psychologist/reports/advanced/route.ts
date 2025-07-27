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
import { eq, and, gte, lte, count, avg, desc, asc } from "drizzle-orm"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Token não encontrado" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "psychologist") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const patientId = searchParams.get("patientId")

    const psychologistId = decoded.userId

    // Filtros de data
    const dateFilter =
      startDate && endDate
        ? and(gte(sessions.sessionDate, new Date(startDate)), lte(sessions.sessionDate, new Date(endDate)))
        : gte(sessions.sessionDate, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) // Últimos 90 dias

    // Filtro de paciente específico
    const patientFilter = patientId ? eq(sessions.patientId, Number.parseInt(patientId)) : undefined

    // 1. Estatísticas gerais de sessões
    const sessionStats = await db
      .select({
        total: count(),
        status: sessions.status,
        type: sessions.type,
      })
      .from(sessions)
      .where(and(eq(sessions.psychologistId, psychologistId), dateFilter, patientFilter))
      .groupBy(sessions.status, sessions.type)

    // 2. Evolução de sessões por mês
    const sessionEvolution = await db
      .select({
        month: sessions.sessionDate,
        count: count(),
        status: sessions.status,
      })
      .from(sessions)
      .where(and(eq(sessions.psychologistId, psychologistId), dateFilter, patientFilter))
      .groupBy(sessions.sessionDate, sessions.status)
      .orderBy(asc(sessions.sessionDate))

    // 3. Distribuição de humor dos pacientes
    const moodDistribution = await db
      .select({
        mood: moodTracking.mood,
        energy: moodTracking.energy,
        anxiety: moodTracking.anxiety,
        count: count(),
        date: moodTracking.date,
      })
      .from(moodTracking)
      .innerJoin(patientProfiles, eq(moodTracking.patientId, patientProfiles.userId))
      .where(
        and(
          eq(patientProfiles.psychologistId, psychologistId),
          patientFilter ? eq(moodTracking.patientId, Number.parseInt(patientId)) : undefined,
          startDate && endDate
            ? and(gte(moodTracking.date, startDate), lte(moodTracking.date, endDate))
            : gte(moodTracking.date, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
        ),
      )
      .groupBy(moodTracking.mood, moodTracking.energy, moodTracking.anxiety, moodTracking.date)
      .orderBy(asc(moodTracking.date))

    // 4. Uso de ferramentas SOS
    const sosStats = await db
      .select({
        toolName: sosUsages.toolName,
        count: count(),
        avgDuration: avg(sosUsages.durationMinutes),
        date: sosUsages.createdAt,
      })
      .from(sosUsages)
      .innerJoin(patientProfiles, eq(sosUsages.patientId, patientProfiles.userId))
      .where(
        and(
          eq(patientProfiles.psychologistId, psychologistId),
          patientFilter ? eq(sosUsages.patientId, Number.parseInt(patientId)) : undefined,
          dateFilter,
        ),
      )
      .groupBy(sosUsages.toolName, sosUsages.createdAt)
      .orderBy(desc(count()))

    // 5. Progresso das tarefas
    const taskProgress = await db
      .select({
        status: tasks.status,
        priority: tasks.priority,
        count: count(),
        completionRate: count(),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.psychologistId, psychologistId),
          patientFilter ? eq(tasks.patientId, Number.parseInt(patientId)) : undefined,
          dateFilter,
        ),
      )
      .groupBy(tasks.status, tasks.priority)

    // 6. Engajamento no diário
    const diaryEngagement = await db
      .select({
        patientId: diaryEntries.patientId,
        count: count(),
        avgMood: avg(diaryEntries.mood),
        date: diaryEntries.createdAt,
      })
      .from(diaryEntries)
      .innerJoin(patientProfiles, eq(diaryEntries.patientId, patientProfiles.userId))
      .where(
        and(
          eq(patientProfiles.psychologistId, psychologistId),
          patientFilter ? eq(diaryEntries.patientId, Number.parseInt(patientId)) : undefined,
          dateFilter,
        ),
      )
      .groupBy(diaryEntries.patientId, diaryEntries.createdAt)
      .orderBy(asc(diaryEntries.createdAt))

    // 7. Conquistas desbloqueadas
    const achievementStats = await db
      .select({
        type: achievements.type,
        count: count(),
        patientId: achievements.patientId,
      })
      .from(achievements)
      .innerJoin(patientProfiles, eq(achievements.patientId, patientProfiles.userId))
      .where(
        and(
          eq(patientProfiles.psychologistId, psychologistId),
          patientFilter ? eq(achievements.patientId, Number.parseInt(patientId)) : undefined,
          dateFilter,
        ),
      )
      .groupBy(achievements.type, achievements.patientId)

    // 8. Lista de pacientes para filtros
    const patientsList = await db
      .select({
        id: users.id,
        name: users.name,
        currentCycle: patientProfiles.currentCycle,
        avatar: patientProfiles.avatar,
      })
      .from(users)
      .innerJoin(patientProfiles, eq(users.id, patientProfiles.userId))
      .where(eq(patientProfiles.psychologistId, psychologistId))
      .orderBy(asc(users.name))

    // Processar dados para gráficos
    const processedData = {
      sessionStats: {
        total: sessionStats.reduce((acc, curr) => acc + curr.total, 0),
        byStatus: sessionStats.reduce(
          (acc, curr) => {
            acc[curr.status] = (acc[curr.status] || 0) + curr.total
            return acc
          },
          {} as Record<string, number>,
        ),
        byType: sessionStats.reduce(
          (acc, curr) => {
            acc[curr.type] = (acc[curr.type] || 0) + curr.total
            return acc
          },
          {} as Record<string, number>,
        ),
      },

      sessionEvolution: sessionEvolution.reduce(
        (acc, curr) => {
          const month = new Date(curr.month).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
          if (!acc[month]) acc[month] = { total: 0, realizadas: 0, canceladas: 0 }
          acc[month].total += curr.count
          acc[month][curr.status as keyof (typeof acc)[typeof month]] = curr.count
          return acc
        },
        {} as Record<string, any>,
      ),

      moodTrends: moodDistribution.reduce(
        (acc, curr) => {
          const date = new Date(curr.date).toLocaleDateString("pt-BR")
          if (!acc[date]) acc[date] = { mood: [], energy: [], anxiety: [] }
          for (let i = 0; i < curr.count; i++) {
            acc[date].mood.push(curr.mood)
            acc[date].energy.push(curr.energy)
            acc[date].anxiety.push(curr.anxiety)
          }
          return acc
        },
        {} as Record<string, any>,
      ),

      sosUsage: sosStats.reduce(
        (acc, curr) => {
          acc[curr.toolName] = {
            count: curr.count,
            avgDuration: Math.round(Number(curr.avgDuration) || 0),
          }
          return acc
        },
        {} as Record<string, any>,
      ),

      taskCompletion: {
        total: taskProgress.reduce((acc, curr) => acc + curr.count, 0),
        completed: taskProgress.filter((t) => t.status === "concluida").reduce((acc, curr) => acc + curr.count, 0),
        byPriority: taskProgress.reduce(
          (acc, curr) => {
            if (!acc[curr.priority]) acc[curr.priority] = { total: 0, completed: 0 }
            acc[curr.priority].total += curr.count
            if (curr.status === "concluida") acc[curr.priority].completed += curr.count
            return acc
          },
          {} as Record<string, any>,
        ),
      },

      diaryActivity: Object.entries(
        diaryEngagement.reduce(
          (acc, curr) => {
            const date = new Date(curr.date).toLocaleDateString("pt-BR")
            if (!acc[date]) acc[date] = { entries: 0, avgMood: 0, totalMood: 0 }
            acc[date].entries += curr.count
            acc[date].totalMood += Number(curr.avgMood) * curr.count
            acc[date].avgMood = acc[date].totalMood / acc[date].entries
            return acc
          },
          {} as Record<string, any>,
        ),
      ).map(([date, data]) => ({ date, ...data })),

      achievements: achievementStats.reduce(
        (acc, curr) => {
          acc[curr.type] = (acc[curr.type] || 0) + curr.count
          return acc
        },
        {} as Record<string, number>,
      ),

      patients: patientsList,
    }

    return NextResponse.json(processedData)
  } catch (error) {
    console.error("Erro ao buscar relatórios avançados:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
