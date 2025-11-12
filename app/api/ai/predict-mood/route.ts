import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { diaryEntries, moodTracking, users } from '@/db/schema'
import { eq, desc, gte } from 'drizzle-orm'
import { predictMoodTrends } from '@/lib/ai/predictive-analytics'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, days = 7 } = body

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID required' }, { status: 400 })
    }

    // Get historical mood data
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const moodHistory = await db
      .select()
      .from(moodTracking)
      .where(gte(moodTracking.date, thirtyDaysAgo))
      .where(eq(moodTracking.patientId, patientId))
      .orderBy(desc(moodTracking.date))
      .limit(30)

    const diaryHistory = await db
      .select()
      .from(diaryEntries)
      .where(gte(diaryEntries.entryDate, thirtyDaysAgo))
      .where(eq(diaryEntries.patientId, patientId))
      .orderBy(desc(diaryEntries.entryDate))
      .limit(14)

    // Prepare data for prediction
    const historicalMoods = moodHistory.map((m) => ({
      date: m.date.toISOString().split('T')[0],
      mood: m.mood || 5,
    }))

    const diaryData = diaryHistory.map((d) => ({
      date: d.entryDate.toISOString().split('T')[0],
      content: d.content || '',
      emotions: d.emotions || '',
    }))

    // Get prediction
    const prediction = await predictMoodTrends({
      historicalMoods,
      diaryEntries: diaryData,
    })

    return NextResponse.json({
      success: true,
      data: prediction,
    })
  } catch (error) {
    console.error('Error in mood prediction API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate mood prediction' },
      { status: 500 }
    )
  }
}
