import { db } from "@/db"
import { diaryEntries, patientProfiles, users, pointActivities } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { NextResponse, NextRequest } from "next/server"
import { z } from "zod"
import { getUserIdFromRequest } from "@/lib/auth"
import { analyzeEmotionalContent } from "@/lib/ai-analysis"

// Helper function to award gamification points
async function awardGamificationPoints(userId: number, activityType: string, metadata?: any) {
  const pointsConfig = {
    diary_entry: { points: 10, xp: 15 },
    meditation_completed: { points: 15, xp: 20 },
    task_completed: { points: 20, xp: 25 },
    session_attended: { points: 25, xp: 30 },
  }

  const config = pointsConfig[activityType as keyof typeof pointsConfig]
  if (!config) return

  const description = `${activityType === 'diary_entry' ? 'Entrada no diário' : activityType}`

  // Insert point activity
  await db.insert(pointActivities).values({
    userId,
    activityType,
    points: config.points,
    xp: config.xp,
    description,
    metadata: metadata ? JSON.stringify(metadata) : null,
  })

  // Update user totals
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { totalXP: true, currentLevel: true, weeklyPoints: true, monthlyPoints: true }
  })

  if (user) {
    const newTotalXP = user.totalXP + config.xp
    const newLevel = calculateLevelFromXP(newTotalXP)

    await db
      .update(users)
      .set({
        totalXP: newTotalXP,
        currentLevel: newLevel,
        weeklyPoints: user.weeklyPoints + config.points,
        monthlyPoints: user.monthlyPoints + config.points,
      })
      .where(eq(users.id, userId))
  }
}

function calculateLevelFromXP(totalXP: number): number {
  let level = 1
  while (calculateXPForLevel(level + 1) <= totalXP) {
    level++
  }
  return level
}

function calculateXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5))
}

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
  try {
    const userId = await getUserIdFromRequest(req)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const json = await req.json()
    const body = entrySchema.parse(json)

    const { moodRating, intensityRating, content, cycle, emotions } = body

    // Análise de IA do conteúdo emocional (async, não bloqueia a resposta)
    let aiAnalysis = null
    try {
      if (content && content.length > 10) {
        aiAnalysis = await analyzeEmotionalContent(content)
      }
    } catch (error) {
      console.error('AI analysis failed:', error)
      // Continua sem análise de IA se falhar
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

    // Award gamification points for diary entry
    try {
      await awardGamificationPoints(userId, 'diary_entry', { entryId: entry.id })
    } catch (error) {
      console.error('Failed to award gamification points:', error)
      // Don't fail the diary entry if gamification fails
    }

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
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", issues: error.issues }, { status: 422 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET endpoint para buscar entradas do diário com análise de IA
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)

    if (!userId) {
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
