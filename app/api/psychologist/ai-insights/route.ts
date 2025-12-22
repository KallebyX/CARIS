import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { db } from '@/db'
import { users, diaryEntries, sessions, clinicalInsights } from '@/db/schema'
import { eq, and, desc, gte, sql } from 'drizzle-orm'
import { analyzeSessionProgress, detectClinicalAlerts, generateProgressReport } from '@/lib/ai-analysis'
import { requireAIConsent } from '@/lib/consent'
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit'
import { safeError } from '@/lib/safe-logger'

export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting for AI endpoints
  const rateLimitResult = await rateLimit(request, RateLimitPresets.READ)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // COMPLIANCE: Check AI consent (LGPD/GDPR requirement)
    const consentCheck = await requireAIConsent(userId, 'psychologist_ai_insights')
    if (consentCheck) return consentCheck

    // Verify user is a psychologist
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user[0] || user[0].role !== 'psychologist') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const patientId = url.searchParams.get('patientId')
    const type = url.searchParams.get('type') || 'all'

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 })
    }

    // Get patient data
    const patient = await db.select().from(users).where(eq(users.id, parseInt(patientId))).limit(1)
    if (!patient[0]) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Get recent diary entries (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentEntries = await db
      .select()
      .from(diaryEntries)
      .where(and(
        eq(diaryEntries.patientId, parseInt(patientId)),
        gte(diaryEntries.entryDate, thirtyDaysAgo)
      ))
      .orderBy(desc(diaryEntries.entryDate))

    // Get recent sessions (last 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const recentSessions = await db
      .select()
      .from(sessions)
      .where(and(
        eq(sessions.patientId, parseInt(patientId)),
        eq(sessions.psychologistId, userId),
        gte(sessions.scheduledAt, ninetyDaysAgo)
      ))
      .orderBy(desc(sessions.scheduledAt))

    let insights: any = {}

    if (type === 'session_analysis' || type === 'all') {
      // Generate session analysis
      const sessionAnalysis = await analyzeSessionProgress(
        recentSessions.map(s => ({
          sessionDate: s.scheduledAt,
          notes: s.notes || '',
          patientMood: 5, // Would need to get from session feedback
          duration: s.duration,
          type: s.type,
        })),
        recentEntries.map(e => ({
          content: e.content || '',
          moodRating: e.moodRating || 5,
          createdAt: e.entryDate,
          emotions: e.emotions || '',
        }))
      )

      insights.sessionAnalysis = sessionAnalysis

      // Save insight to database
      await db.insert(clinicalInsights).values({
        patientId: parseInt(patientId),
        psychologistId: userId,
        type: 'session_analysis',
        title: 'Análise de Progresso da Sessão',
        content: JSON.stringify(sessionAnalysis),
        severity: sessionAnalysis.overallProgress === 'critical' ? 'critical' 
                 : sessionAnalysis.overallProgress === 'concerning' ? 'warning' 
                 : 'info',
      })
    }

    if (type === 'clinical_alerts' || type === 'all') {
      // Detect clinical alerts
      const alerts = await detectClinicalAlerts(
        recentEntries.map(e => ({
          content: e.content || '',
          moodRating: e.moodRating || 5,
          createdAt: e.entryDate,
          riskLevel: e.riskLevel || 'low',
          emotions: e.emotions || '',
        })),
        recentSessions.map(s => ({
          sessionDate: s.scheduledAt,
          notes: s.notes || '',
          patientMood: 5,
        })),
        [] // Current alerts - would need to fetch from clinicalAlerts table
      )

      insights.clinicalAlerts = alerts
    }

    if (type === 'progress_report' || type === 'all') {
      // Generate progress report for last 30 days
      const progressReport = await generateProgressReport(
        parseInt(patientId),
        {
          start: thirtyDaysAgo,
          end: new Date(),
        },
        recentEntries.map(e => ({
          content: e.content || '',
          moodRating: e.moodRating || 5,
          createdAt: e.entryDate,
          emotions: e.emotions || '',
          riskLevel: e.riskLevel || 'low',
        })),
        recentSessions.map(s => ({
          sessionDate: s.scheduledAt,
          notes: s.notes || '',
          duration: s.duration,
        }))
      )

      insights.progressReport = progressReport
    }

    return NextResponse.json({
      success: true,
      data: insights,
    })
  } catch (error) {
    safeError('[PSYCHOLOGIST_AI_INSIGHTS_GET]', 'Error generating AI insights:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // SECURITY: Rate limiting for AI endpoints
  const rateLimitResult = await rateLimit(request, RateLimitPresets.WRITE)
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // COMPLIANCE: Check AI consent (LGPD/GDPR requirement)
    const consentCheck = await requireAIConsent(userId, 'psychologist_ai_insights')
    if (consentCheck) return consentCheck

    // Verify user is a psychologist
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user[0] || user[0].role !== 'psychologist') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { patientId, type, customAnalysis } = body

    if (!patientId || !type) {
      return NextResponse.json({ error: 'Patient ID and type required' }, { status: 400 })
    }

    // Save custom insight
    const insight = await db.insert(clinicalInsights).values({
      patientId: parseInt(patientId),
      psychologistId: userId,
      type,
      title: customAnalysis?.title || 'Insight Personalizado',
      content: JSON.stringify(customAnalysis || {}),
      severity: customAnalysis?.severity || 'info',
    }).returning()

    return NextResponse.json({
      success: true,
      data: insight[0],
    })
  } catch (error) {
    safeError('[PSYCHOLOGIST_AI_INSIGHTS_POST]', 'Error saving AI insight:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}