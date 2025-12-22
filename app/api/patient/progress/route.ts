import { NextResponse } from "next/server"
import { db } from "@/db"
import { diaryEntries, tasks, sosUsages, sessions, userAchievements, achievements, moodTracking } from "@/db/schema"
import { eq, and, gte, desc, count, sql } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Buscar estatísticas do diário
    const diaryStats = await db
      .select({
        total: count(),
        recent: sql<number>`COUNT(CASE WHEN created_at >= ${thirtyDaysAgo} THEN 1 END)`,
      })
      .from(diaryEntries)
      .where(eq(diaryEntries.patientId, userId))

    // Buscar estatísticas de tarefas
    const taskStats = await db
      .select({
        total: count(),
        completed: sql<number>`COUNT(CASE WHEN status = 'concluida' THEN 1 END)`,
        pending: sql<number>`COUNT(CASE WHEN status = 'pendente' THEN 1 END)`,
        inProgress: sql<number>`COUNT(CASE WHEN status = 'em_progresso' THEN 1 END)`,
      })
      .from(tasks)
      .where(eq(tasks.patientId, userId))

    // Buscar estatísticas de SOS
    const sosStats = await db
      .select({
        total: count(),
        recent: sql<number>`COUNT(CASE WHEN created_at >= ${thirtyDaysAgo} THEN 1 END)`,
        totalMinutes: sql<number>`COALESCE(SUM(duration_minutes), 0)`,
      })
      .from(sosUsages)
      .where(eq(sosUsages.patientId, userId))

    // Buscar estatísticas de sessões
    const sessionStats = await db
      .select({
        total: count(),
        completed: sql<number>`COUNT(CASE WHEN status = 'realizada' THEN 1 END)`,
        upcoming: sql<number>`COUNT(CASE WHEN status IN ('agendada', 'confirmada') AND session_date > NOW() THEN 1 END)`,
      })
      .from(sessions)
      .where(eq(sessions.patientId, userId))

    // Buscar conquistas
    const userAchievementsData = await db.query.userAchievements.findMany({
      where: eq(userAchievements.userId, userId),
      orderBy: [desc(userAchievements.unlockedAt)],
      with: {
        achievement: true,
      },
    })

    // Buscar dados do mapa emocional dos últimos 30 dias
    const emotionalMapData = await db.query.moodTracking.findMany({
      where: and(eq(moodTracking.patientId, userId), gte(moodTracking.date, thirtyDaysAgo)),
      orderBy: [desc(moodTracking.date)],
      limit: 30,
    })

    // Buscar tarefas recentes
    const recentTasks = await db.query.tasks.findMany({
      where: eq(tasks.patientId, userId),
      orderBy: [desc(tasks.createdAt)],
      limit: 5,
      with: {
        psychologist: {
          columns: {
            name: true,
          },
        },
      },
    })

    // Calcular progresso das conquistas
    const achievementProgress = {
      firstEntry: userAchievementsData.some((a) => a.achievement?.type === "first_entry"),
      weekStreak: userAchievementsData.some((a) => a.achievement?.type === "week_streak"),
      sosUsage: userAchievementsData.some((a) => a.achievement?.type === "sos_usage"),
      taskCompletion: userAchievementsData.some((a) => a.achievement?.type === "task_completion"),
      monthlyGoal: userAchievementsData.some((a) => a.achievement?.type === "monthly_goal"),
    }

    return NextResponse.json({
      stats: {
        diary: diaryStats[0] || { total: 0, recent: 0 },
        tasks: taskStats[0] || { total: 0, completed: 0, pending: 0, inProgress: 0 },
        sos: sosStats[0] || { total: 0, recent: 0, totalMinutes: 0 },
        sessions: sessionStats[0] || { total: 0, completed: 0, upcoming: 0 },
      },
      achievements: userAchievementsData,
      achievementProgress,
      emotionalMapData,
      recentTasks,
    })
  } catch (error) {
    console.error("Erro ao buscar progresso:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
