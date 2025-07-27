import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { meditationSessions, users } from '@/db/schema'
import { getUserIdFromRequest } from '@/lib/auth'
import { eq, desc, and } from 'drizzle-orm'

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