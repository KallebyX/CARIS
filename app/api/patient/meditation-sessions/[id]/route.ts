import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { meditationSessions } from '@/db/schema'
import { getUserIdFromRequest } from '@/lib/auth'
import { eq, and } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id: sessionId } = await params

    const session = await db
      .select()
      .from(meditationSessions)
      .where(
        and(
          eq(meditationSessions.id, sessionId),
          eq(meditationSessions.userId, userId)
        )
      )
      .limit(1)

    if (session.length === 0) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      data: session[0] 
    })
  } catch (error) {
    console.error('Erro ao buscar sessão de meditação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id: sessionId } = await params
    const body = await request.json()
    const {
      rating,
      feedback,
      moodAfter,
      notes,
      wasCompleted
    } = body

    // Verificar se a sessão existe e pertence ao usuário
    const existingSession = await db
      .select()
      .from(meditationSessions)
      .where(
        and(
          eq(meditationSessions.id, sessionId),
          eq(meditationSessions.userId, userId)
        )
      )
      .limit(1)

    if (existingSession.length === 0) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    // Atualizar sessão
    const updateData: any = {}
    
    if (rating !== undefined) updateData.rating = rating
    if (feedback !== undefined) updateData.feedback = feedback
    if (moodAfter !== undefined) updateData.moodAfter = moodAfter
    if (notes !== undefined) updateData.notes = notes
    if (wasCompleted !== undefined) {
      updateData.wasCompleted = wasCompleted
      if (wasCompleted && !existingSession[0].completedAt) {
        updateData.completedAt = new Date()
      }
    }

    const [updatedSession] = await db
      .update(meditationSessions)
      .set(updateData)
      .where(
        and(
          eq(meditationSessions.id, sessionId),
          eq(meditationSessions.userId, userId)
        )
      )
      .returning()

    return NextResponse.json({ 
      success: true, 
      data: updatedSession 
    })
  } catch (error) {
    console.error('Erro ao atualizar sessão de meditação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id: sessionId } = await params

    // Verificar se a sessão existe e pertence ao usuário
    const existingSession = await db
      .select()
      .from(meditationSessions)
      .where(
        and(
          eq(meditationSessions.id, sessionId),
          eq(meditationSessions.userId, userId)
        )
      )
      .limit(1)

    if (existingSession.length === 0) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    await db
      .delete(meditationSessions)
      .where(
        and(
          eq(meditationSessions.id, sessionId),
          eq(meditationSessions.userId, userId)
        )
      )

    return NextResponse.json({ 
      success: true, 
      message: 'Sessão excluída com sucesso' 
    })
  } catch (error) {
    console.error('Erro ao excluir sessão de meditação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}