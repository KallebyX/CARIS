import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { diaryEntries } from '@/db/schema'
import { eq, desc, gte } from 'drizzle-orm'
import {
  analyzeMultiModalEmotion,
  trackEmotionTrajectory,
  identifyEmotionalTriggers,
  suggestCopingStrategies,
} from '@/lib/ai/emotional-intelligence'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, analysisType = 'current', entryId } = body

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID required' }, { status: 400 })
    }

    let result: any = {}

    if (analysisType === 'current' && entryId) {
      // Analyze specific entry
      const entry = await db
        .select()
        .from(diaryEntries)
        .where(eq(diaryEntries.id, entryId))
        .limit(1)

      if (entry[0]) {
        const analysis = await analyzeMultiModalEmotion({
          text: entry[0].content || '',
          audioTranscription: entry[0].audioTranscription || undefined,
          imageDescription: entry[0].imageDescription || undefined,
        })
        result = { analysis }
      }
    } else if (analysisType === 'trajectory') {
      // Track emotion trajectory
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentEntries = await db
        .select()
        .from(diaryEntries)
        .where(eq(diaryEntries.patientId, patientId))
        .where(gte(diaryEntries.entryDate, sevenDaysAgo))
        .orderBy(desc(diaryEntries.entryDate))

      const emotionSequence = recentEntries.map((e) => ({
        timestamp: e.entryDate.toISOString(),
        emotion: e.dominantEmotion || 'neutro',
        intensity: e.emotionIntensity || 5,
        context: (e.content || '').substring(0, 100),
      }))

      const trajectory = await trackEmotionTrajectory(emotionSequence)
      result = { trajectory }
    } else if (analysisType === 'triggers') {
      // Identify emotional triggers
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const entries = await db
        .select()
        .from(diaryEntries)
        .where(eq(diaryEntries.patientId, patientId))
        .where(gte(diaryEntries.entryDate, thirtyDaysAgo))
        .orderBy(desc(diaryEntries.entryDate))
        .limit(20)

      const triggerData = entries.map((e) => ({
        date: e.entryDate.toISOString().split('T')[0],
        content: e.content || '',
        emotionBefore: 'neutro',
        emotionAfter: e.dominantEmotion || 'neutro',
        intensity: e.emotionIntensity || 5,
      }))

      const triggers = await identifyEmotionalTriggers(triggerData)
      result = { triggers }
    } else if (analysisType === 'coping') {
      // Get coping strategies
      const latestEntry = await db
        .select()
        .from(diaryEntries)
        .where(eq(diaryEntries.patientId, patientId))
        .orderBy(desc(diaryEntries.entryDate))
        .limit(1)

      if (latestEntry[0]) {
        const strategies = await suggestCopingStrategies({
          currentEmotion: latestEntry[0].dominantEmotion || 'ansioso',
          intensity: latestEntry[0].emotionIntensity || 5,
          situation: (latestEntry[0].content || '').substring(0, 200),
        })
        result = { strategies }
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Error in emotional insights API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate emotional insights' },
      { status: 500 }
    )
  }
}
