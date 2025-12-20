import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { diaryEntries, moodTracking, users } from '@/db/schema'
import { eq, desc, gte, and } from 'drizzle-orm'
import { predictMoodTrends } from '@/lib/ai/predictive-analytics'
import { getUserIdFromRequest } from '@/lib/auth'
import { requireAIConsent } from '@/lib/consent'
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit'
import { safeError } from '@/lib/safe-logger'

export async function POST(req: NextRequest) {
  // SECURITY: Rate limiting for AI endpoints
  const rateLimitResult = await rateLimit(req, RateLimitPresets.WRITE)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    // SECURITY: Authenticate user
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // COMPLIANCE: Check AI consent (LGPD/GDPR requirement)
    const consentCheck = await requireAIConsent(userId, 'mood_prediction')
    if (consentCheck) return consentCheck

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
      .where(and(
        gte(moodTracking.date, thirtyDaysAgo),
        eq(moodTracking.patientId, patientId)
      ))
      .orderBy(desc(moodTracking.date))
      .limit(30)

    const diaryHistory = await db
      .select()
      .from(diaryEntries)
      .where(and(
        gte(diaryEntries.entryDate, thirtyDaysAgo),
        eq(diaryEntries.patientId, patientId)
      ))
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
    safeError('[AI_PREDICT_MOOD]', 'Error in mood prediction API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate mood prediction' },
      { status: 500 }
    )
  }
}
