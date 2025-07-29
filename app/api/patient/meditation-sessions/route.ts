import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { meditationSessions, users, pointActivities } from '@/db/schema'
import { getUserIdFromRequest } from '@/lib/auth'
import { eq, desc, and } from 'drizzle-orm'

// Helper function to award gamification points
async function awardGamificationPoints(userId: number, activityType: string, metadata?: any) {
  const pointsConfig = {
    meditation_completed: { points: 15, xp: 20 },
    diary_entry: { points: 10, xp: 15 },
    task_completed: { points: 20, xp: 25 },
    session_attended: { points: 25, xp: 30 },
  }

  const config = pointsConfig[activityType as keyof typeof pointsConfig]
  if (!config) return

  const description = `${activityType === 'meditation_completed' ? 'Sessão de meditação concluída' : activityType}`

  // Insert point activity
  await db.insert(pointActivities).values({
    userId,
    activityType,
    points: config.points,
    xp: config.xp,
    description,
    metadata: metadata ? JSON.stringify(metadata) : null,
  })

  // Update user totals
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { totalXP: true, currentLevel: true, weeklyPoints: true, monthlyPoints: true }
  })

  if (user) {
    const newTotalXP = user.totalXP + config.xp
    const newLevel = calculateLevelFromXP(newTotalXP)

    await db
      .update(users)
      .set({
        totalXP: newTotalXP,
        currentLevel: newLevel,
        weeklyPoints: user.weeklyPoints + config.points,
        monthlyPoints: user.monthlyPoints + config.points,
      })
      .where(eq(users.id, userId))
  }
}

function calculateLevelFromXP(totalXP: number): number {
  let level = 1
  while (calculateXPForLevel(level + 1) <= totalXP) {
    level++
  }
  return level
}

function calculateXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5))
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sessions = await db
      .select()
      .from(meditationSessions)
      .where(eq(meditationSessions.userId, userId))
      .orderBy(desc(meditationSessions.startedAt))
      .limit(50)

    return NextResponse.json({ 
      success: true, 
      data: sessions 
    })
  } catch (error) {
    console.error('Erro ao buscar sessões de meditação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      meditationId,
      duration,
      wasCompleted,
      rating,
      feedback,
      moodBefore,
      moodAfter,
      personalNotes
    } = body

    // Validar dados obrigatórios
    if (!meditationId || typeof duration !== 'number') {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    // Criar nova sessão de meditação
    const sessionData = {
      userId,
      meditationId,
      startedAt: new Date(),
      completedAt: wasCompleted ? new Date() : null,
      duration: Math.round(duration),
      wasCompleted: wasCompleted || false,
      rating: rating || null,
      feedback: feedback || null,
      moodBefore: moodBefore || null,
      moodAfter: moodAfter || null,
      notes: personalNotes || null
    }

    const [newSession] = await db
      .insert(meditationSessions)
      .values(sessionData)
      .returning()

    // Award gamification points for completed meditation
    if (wasCompleted) {
      try {
        await awardGamificationPoints(userId, 'meditation_completed', { 
          sessionId: newSession.id,
          duration: sessionData.duration,
          meditationId: sessionData.meditationId
        })
      } catch (error) {
        console.error('Failed to award gamification points:', error)
        // Don't fail the meditation entry if gamification fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: newSession 
    })
  } catch (error) {
    console.error('Erro ao criar sessão de meditação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}