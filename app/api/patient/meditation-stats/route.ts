import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { meditationSessions } from '@/db/schema'
import { getUserIdFromRequest } from '@/lib/auth'
import { eq, and, gte, sql, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Estatísticas gerais
    const totalStatsQuery = await db
      .select({
        totalSessions: sql<number>`count(*)`,
        totalMinutes: sql<number>`sum(${meditationSessions.duration}) / 60`,
        averageRating: sql<number>`avg(${meditationSessions.rating})`,
        completedSessions: sql<number>`sum(case when ${meditationSessions.wasCompleted} then 1 else 0 end)`
      })
      .from(meditationSessions)
      .where(eq(meditationSessions.userId, userId))

    const totalStats = totalStatsQuery[0] || {
      totalSessions: 0,
      totalMinutes: 0,
      averageRating: 0,
      completedSessions: 0
    }

    // Sessões dos últimos 30 dias
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentSessionsQuery = await db
      .select({
        totalSessions: sql<number>`count(*)`,
        totalMinutes: sql<number>`sum(${meditationSessions.duration}) / 60`
      })
      .from(meditationSessions)
      .where(
        and(
          eq(meditationSessions.userId, userId),
          gte(meditationSessions.startedAt, thirtyDaysAgo)
        )
      )

    const recentStats = recentSessionsQuery[0] || {
      totalSessions: 0,
      totalMinutes: 0
    }

    // Calcular streak atual
    const allSessions = await db
      .select({
        startedAt: meditationSessions.startedAt,
        wasCompleted: meditationSessions.wasCompleted
      })
      .from(meditationSessions)
      .where(
        and(
          eq(meditationSessions.userId, userId),
          eq(meditationSessions.wasCompleted, true)
        )
      )
      .orderBy(desc(meditationSessions.startedAt))

    // Calcular streak
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    let lastDate: Date | null = null

    const sessionDates = allSessions.map(session => {
      const date = new Date(session.startedAt)
      return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    })

    // Remover duplicatas e ordenar
    const uniqueDates = Array.from(new Set(sessionDates.map(d => d.getTime())))
      .map(timestamp => new Date(timestamp))
      .sort((a, b) => b.getTime() - a.getTime())

    for (let i = 0; i < uniqueDates.length; i++) {
      const currentDate = uniqueDates[i]
      
      if (i === 0) {
        // Primeiro dia
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        
        if (currentDate.getTime() === today.getTime() || 
            currentDate.getTime() === yesterday.getTime()) {
          currentStreak = 1
          tempStreak = 1
        }
      } else {
        const previousDate = uniqueDates[i - 1]
        const dayDifference = Math.floor((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (dayDifference === 1) {
          tempStreak++
          if (i === 1 || currentStreak > 0) {
            currentStreak = tempStreak
          }
        } else {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak
          }
          tempStreak = 1
          if (currentStreak === 0) {
            currentStreak = 0
          }
        }
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak
    }

    // Meditações favoritas (mais praticadas)
    const favoriteMeditationsQuery = await db
      .select({
        meditationId: meditationSessions.meditationId,
        count: sql<number>`count(*)`,
        averageRating: sql<number>`avg(${meditationSessions.rating})`
      })
      .from(meditationSessions)
      .where(eq(meditationSessions.userId, userId))
      .groupBy(meditationSessions.meditationId)
      .orderBy(sql`count(*) desc`)
      .limit(5)

    const favoriteMeditations = favoriteMeditationsQuery.map(item => item.meditationId)

    // Sessões recentes para gráfico
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      
      const sessionsInDay = await db
        .select({
          count: sql<number>`count(*)`,
          totalMinutes: sql<number>`sum(${meditationSessions.duration}) / 60`
        })
        .from(meditationSessions)
        .where(
          and(
            eq(meditationSessions.userId, userId),
            gte(meditationSessions.startedAt, date),
            sql`${meditationSessions.startedAt} < ${nextDay}`
          )
        )
      
      last7Days.push({
        date: date.toISOString().split('T')[0],
        sessions: sessionsInDay[0]?.count || 0,
        minutes: Math.round(sessionsInDay[0]?.totalMinutes || 0)
      })
    }

    const stats = {
      totalSessions: Number(totalStats.totalSessions) || 0,
      totalMinutes: Math.round(Number(totalStats.totalMinutes) || 0),
      averageRating: Number(Number(totalStats.averageRating || 0).toFixed(1)),
      completedSessions: Number(totalStats.completedSessions) || 0,
      currentStreak,
      longestStreak,
      recentSessions: Number(recentStats.totalSessions) || 0,
      recentMinutes: Math.round(Number(recentStats.totalMinutes) || 0),
      favoriteMeditations,
      last7Days
    }

    return NextResponse.json({ 
      success: true, 
      data: stats 
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas de meditação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}