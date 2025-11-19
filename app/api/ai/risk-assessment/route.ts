import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { diaryEntries, moodTracking, sessions } from '@/db/schema'
import { eq, desc, gte } from 'drizzle-orm'
import { predictRiskEscalation } from '@/lib/ai/predictive-analytics'
import { assessRelapseRisk } from '@/lib/ai/outcome-prediction'
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
    const consentCheck = await requireAIConsent(userId, 'risk_assessment')
    if (consentCheck) return consentCheck

    const body = await req.json()
    const { patientId, assessmentType = 'escalation' } = body

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID required' }, { status: 400 })
    }

    let result: any = {}

    if (assessmentType === 'escalation') {
      // Risk escalation assessment
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

      const recentEntries = await db
        .select()
        .from(diaryEntries)
        .where(eq(diaryEntries.patientId, patientId))
        .where(gte(diaryEntries.entryDate, fourteenDaysAgo))
        .orderBy(desc(diaryEntries.entryDate))

      const recentMoods = await db
        .select()
        .from(moodTracking)
        .where(eq(moodTracking.patientId, patientId))
        .where(gte(moodTracking.date, fourteenDaysAgo))
        .orderBy(desc(moodTracking.date))

      // Determine current risk level from recent entries
      const highRiskEntries = recentEntries.filter(
        (e) => e.riskLevel === 'high' || e.riskLevel === 'critical'
      )
      const currentRiskLevel =
        highRiskEntries.length > 2
          ? 'high'
          : recentEntries.some((e) => e.riskLevel === 'medium')
            ? 'medium'
            : 'low'

      const prediction = await predictRiskEscalation({
        currentRiskLevel,
        historicalRisk: recentEntries.map((e) => ({
          date: e.entryDate.toISOString().split('T')[0],
          level: e.riskLevel || 'low',
        })),
        recentMoods: recentMoods.map((m) => ({
          date: m.date.toISOString().split('T')[0],
          mood: m.mood || 5,
        })),
        diaryContent: recentEntries.map((e) => ({
          date: e.entryDate.toISOString().split('T')[0],
          content: e.content || '',
        })),
      })

      result = { riskEscalation: prediction }
    } else if (assessmentType === 'relapse') {
      // Relapse risk assessment
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const moodHistory = await db
        .select()
        .from(moodTracking)
        .where(eq(moodTracking.patientId, patientId))
        .where(gte(moodTracking.date, ninetyDaysAgo))
        .orderBy(desc(moodTracking.date))

      const recentDiaries = await db
        .select()
        .from(diaryEntries)
        .where(eq(diaryEntries.patientId, patientId))
        .orderBy(desc(diaryEntries.entryDate))
        .limit(5)

      const stressors = recentDiaries
        .map((d) => {
          const content = d.content?.toLowerCase() || ''
          if (content.includes('estresse') || content.includes('pressão')) return 'estresse'
          if (content.includes('conflito') || content.includes('briga')) return 'conflito'
          return null
        })
        .filter(Boolean) as string[]

      const assessment = await assessRelapseRisk({
        recoveryDuration: 3, // placeholder
        symptomHistory: moodHistory.map((m) => ({
          date: m.date.toISOString().split('T')[0],
          severity: 10 - (m.mood || 5), // Invert mood to get severity
        })),
        stressors: Array.from(new Set(stressors)),
        copingSkills: 6, // placeholder
        supportSystem: 7, // placeholder
        previousRelapses: 0, // placeholder
      })

      result = { relapseRisk: assessment }
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    safeError('[AI_RISK_ASSESSMENT]', 'Error in risk assessment API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to assess risk' },
      { status: 500 }
    )
  }
}
