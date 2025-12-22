import { NextResponse } from "next/server"
import { db } from "@/db"
import { sessions, users, patientProfiles } from "@/db/schema"
import { eq, and, gte, lte, count, sql } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

/**
 * GET /api/psychologist/schedule/stats
 * Retorna estatísticas da agenda do psicólogo
 */
export async function GET(request: Request) {
  const psychologistId = await getUserIdFromRequest(request)
  if (!psychologistId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Estatísticas gerais
    const [totalSessions] = await db
      .select({ count: count() })
      .from(sessions)
      .where(eq(sessions.psychologistId, psychologistId))

    const [weekSessions] = await db
      .select({ count: count() })
      .from(sessions)
      .where(
        and(
          eq(sessions.psychologistId, psychologistId),
          gte(sessions.scheduledAt, startOfWeek),
          lte(sessions.scheduledAt, endOfWeek),
        ),
      )

    const [monthSessions] = await db
      .select({ count: count() })
      .from(sessions)
      .where(
        and(
          eq(sessions.psychologistId, psychologistId),
          gte(sessions.scheduledAt, startOfMonth),
          lte(sessions.scheduledAt, endOfMonth),
        ),
      )

    // Estatísticas por status
    const sessionsByStatus = await db
      .select({
        status: sessions.status,
        count: count(),
      })
      .from(sessions)
      .where(eq(sessions.psychologistId, psychologistId))
      .groupBy(sessions.status)

    // Estatísticas por tipo
    const sessionsByType = await db
      .select({
        type: sessions.type,
        count: count(),
      })
      .from(sessions)
      .where(eq(sessions.psychologistId, psychologistId))
      .groupBy(sessions.type)

    // Próximas sessões (próximos 7 dias)
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingSessions = await db
      .select({
        id: sessions.id,
        sessionDate: sessions.scheduledAt,
        durationMinutes: sessions.duration,
        type: sessions.type,
        status: sessions.status,
        patient: {
          id: users.id,
          name: users.name,
          currentCycle: patientProfiles.currentCycle,
        },
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.patientId, users.id))
      .leftJoin(patientProfiles, eq(users.id, patientProfiles.userId))
      .where(
        and(
          eq(sessions.psychologistId, psychologistId),
          gte(sessions.scheduledAt, now),
          lte(sessions.scheduledAt, nextWeek),
          // Apenas sessões agendadas e confirmadas
          sql`${sessions.status} IN ('agendada', 'confirmada')`,
        ),
      )
      .orderBy(sessions.scheduledAt)
      .limit(10)

    // Pacientes ativos (com sessões nos últimos 30 dias)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const activePatients = await db
      .select({
        patientId: sessions.patientId,
        patientName: users.name,
        lastSession: sql<Date>`MAX(${sessions.scheduledAt})`,
        totalSessions: count(),
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.patientId, users.id))
      .where(
        and(
          eq(sessions.psychologistId, psychologistId),
          gte(sessions.scheduledAt, thirtyDaysAgo),
          eq(sessions.status, "realizada"),
        ),
      )
      .groupBy(sessions.patientId, users.name)
      .orderBy(sql`MAX(${sessions.scheduledAt}) DESC`)

    // Horas trabalhadas no mês
    const [monthlyHours] = await db
      .select({
        totalMinutes: sql<number>`SUM(${sessions.duration})`,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.psychologistId, psychologistId),
          gte(sessions.scheduledAt, startOfMonth),
          lte(sessions.scheduledAt, endOfMonth),
          eq(sessions.status, "realizada"),
        ),
      )

    const hoursThisMonth = Math.round((monthlyHours?.totalMinutes || 0) / 60)

    // Sessões por dia da semana (últimos 30 dias)
    const sessionsByWeekday = await db
      .select({
        weekday: sql<number>`EXTRACT(DOW FROM ${sessions.scheduledAt})`,
        count: count(),
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.psychologistId, psychologistId),
          gte(sessions.scheduledAt, thirtyDaysAgo),
          eq(sessions.status, "realizada"),
        ),
      )
      .groupBy(sql`EXTRACT(DOW FROM ${sessions.scheduledAt})`)

    const weekdayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    const weekdayStats = weekdayNames.map((name, index) => ({
      day: name,
      count: sessionsByWeekday.find((s) => s.weekday === index)?.count || 0,
    }))

    return NextResponse.json({
      overview: {
        totalSessions: totalSessions.count,
        weekSessions: weekSessions.count,
        monthSessions: monthSessions.count,
        hoursThisMonth,
        activePatients: activePatients.length,
      },
      sessionsByStatus: sessionsByStatus.reduce(
        (acc, item) => {
          acc[item.status] = item.count
          return acc
        },
        {} as Record<string, number>,
      ),
      sessionsByType: sessionsByType.reduce(
        (acc, item) => {
          acc[item.type] = item.count
          return acc
        },
        {} as Record<string, number>,
      ),
      upcomingSessions,
      activePatients,
      weekdayStats,
    })
  } catch (error) {
    console.error("Erro ao buscar estatísticas da agenda:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
