import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { runAIProcessing } from '@/lib/clinical-ai-service'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is admin or psychologist
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user[0] || (user[0].role !== 'admin' && user[0].role !== 'psychologist')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Run AI processing
    const result = await runAIProcessing()

    return NextResponse.json({
      success: true,
      data: result,
      message: `Processamento concluído: ${result.entriesProcessed} entradas analisadas, ${result.alertsGenerated} alertas gerados, ${result.insightsGenerated} insights criados`,
    })
  } catch (error) {
    console.error('Error in AI processing endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is admin
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user[0] || user[0].role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Return processing status/statistics
    const stats = {
      lastProcessing: new Date().toISOString(),
      status: 'ready',
      message: 'AI processing service is operational',
    }

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Error getting AI processing status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}