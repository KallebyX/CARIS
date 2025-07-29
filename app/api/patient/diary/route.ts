import { db } from "@/db"
import { diaryEntries, patientProfiles } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { NextResponse, NextRequest } from "next/server"
import { z } from "zod"
import { getUserIdFromRequest } from "@/lib/auth"
import { analyzeEmotionalContent } from "@/lib/ai-analysis"
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES, getRequestInfo } from "@/lib/audit"
import { hasValidConsent, CONSENT_TYPES } from "@/lib/consent"

const entrySchema = z.object({
  moodRating: z.number().min(0).max(4),
  intensityRating: z.number().min(1).max(10),
  content: z.string().min(1, {
    message: "Content must be at least 1 character.",
  }),
  cycle: z.enum(["criar", "cuidar", "crescer", "curar"]),
  emotions: z.array(z.string()).optional(),
})

export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = getRequestInfo(req)
  
  try {
    const userId = await getUserIdFromRequest(req)

    if (!userId) {
      await logAuditEvent({
        action: 'diary_entry_failed',
        resourceType: AUDIT_RESOURCES.DIARY_ENTRY,
        severity: 'warning',
        metadata: { error: 'unauthorized' },
        ipAddress,
        userAgent,
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Verifica consentimento para processamento de dados
    const hasConsent = await hasValidConsent(userId, CONSENT_TYPES.DATA_PROCESSING)
    if (!hasConsent) {
      await logAuditEvent({
        userId,
        action: 'diary_entry_failed',
        resourceType: AUDIT_RESOURCES.DIARY_ENTRY,
        severity: 'warning',
        metadata: { error: 'no_data_processing_consent' },
        ipAddress,
        userAgent,
      })
      return NextResponse.json({ error: "Data processing consent required" }, { status: 403 })
    }

    const json = await req.json()
    const body = entrySchema.parse(json)

    const { moodRating, intensityRating, content, cycle, emotions } = body

    // Análise de IA do conteúdo emocional (async, não bloqueia a resposta)
    let aiAnalysis = null
    const hasAiConsent = await hasValidConsent(userId, CONSENT_TYPES.AI_ANALYSIS)
    
    try {
      if (content && content.length > 10 && hasAiConsent) {
        aiAnalysis = await analyzeEmotionalContent(content)
        
        await logAuditEvent({
          userId,
          action: 'ai_analysis',
          resourceType: AUDIT_RESOURCES.DIARY_ENTRY,
          complianceRelated: true,
          metadata: {
            contentLength: content.length,
            analysisResult: aiAnalysis?.riskLevel,
          },
          ipAddress,
          userAgent,
        })
      }
    } catch (error) {
      console.error('AI analysis failed:', error)
      await logAuditEvent({
        userId,
        action: 'ai_analysis_failed',
        resourceType: AUDIT_RESOURCES.DIARY_ENTRY,
        severity: 'warning',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        ipAddress,
        userAgent,
      })
    }

    // Inserir entrada do diário com análise de IA
    const [entry] = await db.insert(diaryEntries).values({
      patientId: userId,
      moodRating,
      intensityRating,
      content,
      cycle,
      emotions: emotions ? JSON.stringify(emotions) : null,
      // Campos de IA
      aiAnalyzed: aiAnalysis ? true : false,
      dominantEmotion: aiAnalysis?.dominantEmotion || null,
      emotionIntensity: aiAnalysis?.emotionIntensity || null,
      sentimentScore: aiAnalysis ? Math.round(aiAnalysis.sentimentScore * 100) : null,
      riskLevel: aiAnalysis?.riskLevel || null,
      aiInsights: aiAnalysis?.insights ? JSON.stringify(aiAnalysis.insights) : null,
      suggestedActions: aiAnalysis?.suggestedActions ? JSON.stringify(aiAnalysis.suggestedActions) : null,
      plutchikCategories: aiAnalysis?.plutchikCategories ? JSON.stringify(aiAnalysis.plutchikCategories) : null,
    }).returning()

    // Log da criação da entrada
    await logAuditEvent({
      userId,
      action: AUDIT_ACTIONS.CREATE,
      resourceType: AUDIT_RESOURCES.DIARY_ENTRY,
      resourceId: entry.id.toString(),
      complianceRelated: true,
      metadata: {
        cycle,
        moodRating,
        intensityRating,
        hasAiAnalysis: !!aiAnalysis,
        contentLength: content.length,
        riskLevel: aiAnalysis?.riskLevel,
      },
      ipAddress,
      userAgent,
    })

    // Retornar entrada com análise de IA incluída
    const response = {
      success: true,
      entry: {
        ...entry,
        aiAnalysis: aiAnalysis ? {
          dominantEmotion: aiAnalysis.dominantEmotion,
          emotionIntensity: aiAnalysis.emotionIntensity,
          sentimentScore: aiAnalysis.sentimentScore,
          riskLevel: aiAnalysis.riskLevel,
          insights: aiAnalysis.insights,
          suggestedActions: aiAnalysis.suggestedActions,
          plutchikCategories: aiAnalysis.plutchikCategories,
        } : null
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Diary entry error:', error)
    
    await logAuditEvent({
      userId: await getUserIdFromRequest(req),
      action: 'diary_entry_failed',
      resourceType: AUDIT_RESOURCES.DIARY_ENTRY,
      severity: 'critical',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof z.ZodError ? 'validation' : 'internal',
      },
      ipAddress,
      userAgent,
    })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", issues: error.issues }, { status: 422 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET endpoint para buscar entradas do diário com análise de IA
export async function GET(req: NextRequest) {
  const { ipAddress, userAgent } = getRequestInfo(req)
  
  try {
    const userId = await getUserIdFromRequest(req)

    if (!userId) {
      await logAuditEvent({
        action: 'diary_read_failed',
        resourceType: AUDIT_RESOURCES.DIARY_ENTRY,
        severity: 'warning',
        metadata: { error: 'unauthorized' },
        ipAddress,
        userAgent,
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const entries = await db
      .select()
      .from(diaryEntries)
      .where(eq(diaryEntries.patientId, userId))
      .orderBy(desc(diaryEntries.entryDate))
      .limit(limit)
      .offset(offset)

    // Log de acesso aos dados sensíveis
    await logAuditEvent({
      userId,
      action: AUDIT_ACTIONS.READ,
      resourceType: AUDIT_RESOURCES.DIARY_ENTRY,
      complianceRelated: true,
      metadata: {
        entriesCount: entries.length,
        limit,
        offset,
        accessType: 'paginated_list',
      },
      ipAddress,
      userAgent,
    })

    // Processar entradas para incluir análise de IA parseada
    const processedEntries = entries.map(entry => ({
      ...entry,
      emotions: entry.emotions ? JSON.parse(entry.emotions) : null,
      aiAnalysis: entry.aiAnalyzed ? {
        dominantEmotion: entry.dominantEmotion,
        emotionIntensity: entry.emotionIntensity,
        sentimentScore: entry.sentimentScore ? entry.sentimentScore / 100 : null,
        riskLevel: entry.riskLevel,
        insights: entry.aiInsights ? JSON.parse(entry.aiInsights) : null,
        suggestedActions: entry.suggestedActions ? JSON.parse(entry.suggestedActions) : null,
        plutchikCategories: entry.plutchikCategories ? JSON.parse(entry.plutchikCategories) : null,
      } : null
    }))

    return NextResponse.json({ 
      success: true, 
      entries: processedEntries,
      pagination: {
        limit,
        offset,
        hasMore: entries.length === limit
      }
    })
  } catch (error) {
    console.error('Diary entries fetch error:', error)
    
    await logAuditEvent({
      userId: await getUserIdFromRequest(req),
      action: 'diary_read_failed',
      resourceType: AUDIT_RESOURCES.DIARY_ENTRY,
      severity: 'critical',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress,
      userAgent,
    })
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
