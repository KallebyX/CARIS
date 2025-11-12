import { NextRequest, NextResponse } from 'next/server'
import { analyzeLiveSession } from '@/lib/ai/session-analysis'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      recentMessages,
      sessionPhase = 'middle',
      patientEngagement = 5,
      sessionCount = 1,
      historicalContext,
    } = body

    if (!recentMessages || !Array.isArray(recentMessages)) {
      return NextResponse.json({ success: false, error: 'Recent messages required' }, { status: 400 })
    }

    const analysis = await analyzeLiveSession({
      recentMessages,
      sessionPhase,
      patientEngagement,
      sessionCount,
      historicalContext,
    })

    return NextResponse.json({
      success: true,
      data: analysis,
    })
  } catch (error) {
    console.error('Error in session analysis API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to analyze session' },
      { status: 500 }
    )
  }
}
