import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { meditationSessions } from '@/db/schema'
import { getUserIdFromRequest } from '@/lib/auth'
import { eq, desc, and } from 'drizzle-orm'
import { awardGamificationPoints } from '@/lib/gamification'
import { apiUnauthorized, apiBadRequest, apiSuccess, handleApiError } from '@/lib/api-response'
import { safeError } from '@/lib/safe-logger'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return apiUnauthorized('Não autorizado')
    }

    const sessions = await db
      .select()
      .from(meditationSessions)
      .where(eq(meditationSessions.userId, userId))
      .orderBy(desc(meditationSessions.startedAt))
      .limit(50)

    return apiSuccess({ sessions })
  } catch (error) {
    safeError('[MEDITATION_SESSIONS_GET]', 'Erro ao buscar sessões:', error)
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return apiUnauthorized('Não autorizado')
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
      return apiBadRequest('Meditation ID e duration são obrigatórios', {
        code: 'MISSING_REQUIRED_FIELDS',
        details: {
          required: ['meditationId', 'duration'],
          provided: { meditationId: !!meditationId, duration: typeof duration === 'number' }
        }
      })
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

    // Award gamification points for completed meditation using centralized service
    let gamificationResult = null
    if (wasCompleted) {
      try {
        const result = await awardGamificationPoints(userId, 'meditation_completed', {
          sessionId: newSession.id,
          duration: sessionData.duration,
          meditationId: sessionData.meditationId
        })

        if (result.success) {
          gamificationResult = {
            pointsEarned: result.points,
            xpEarned: result.xp,
            leveledUp: result.leveledUp,
            newLevel: result.newLevel,
          }
        } else {
          safeError('[MEDITATION_SESSIONS]', 'Gamification failed:', result.reason)
        }
      } catch (error) {
        safeError('[MEDITATION_SESSIONS]', 'Failed to award points:', error)
        // Don't fail the meditation entry if gamification fails
      }
    }

    return apiSuccess({
      session: newSession,
      gamification: gamificationResult
    })
  } catch (error) {
    safeError('[MEDITATION_SESSIONS_POST]', 'Erro ao criar sessão:', error)
    return handleApiError(error)
  }
}