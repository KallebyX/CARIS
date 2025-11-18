import { NextRequest, NextResponse } from 'next/server'
import { analyzeLiveSession } from '@/lib/ai/session-analysis'
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
    const consentCheck = await requireAIConsent(userId, 'session_analysis')
    if (consentCheck) return consentCheck

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
    safeError('[AI_ANALYZE_SESSION]', 'Error in session analysis API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to analyze session' },
      { status: 500 }
    )
  }
}
