import { db } from "@/db"
import { diaryEntries, patientProfiles } from "@/db/schema"
import { eq, desc, gte } from "drizzle-orm"
import { NextResponse, NextRequest } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { analyzeMoodPatterns, generateTherapeuticInsights } from "@/lib/ai-analysis"

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const url = new URL(req.url)
    const period = url.searchParams.get('period') || 'week' // week, month, all

    // Calcular data de início baseado no período
    let startDate = new Date()
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7)
    } else if (period === 'month') {
      startDate.setDate(startDate.getDate() - 30)
    } else {
      startDate = new Date('2020-01-01') // Para "all"
    }

    // Buscar entradas do diário do período
    const entries = await db
      .select()
      .from(diaryEntries)
      .where(
        eq(diaryEntries.patientId, userId)
      )
      .orderBy(desc(diaryEntries.entryDate))
      .limit(50)

    // Filtrar por período
    const filteredEntries = entries.filter(entry => 
      new Date(entry.entryDate) >= startDate
    )

    if (filteredEntries.length === 0) {
      return NextResponse.json({
        success: true,
        insights: {
          message: "Não há dados suficientes para análise",
          period,
          entryCount: 0
        }
      })
    }

    // Buscar perfil do paciente para contexto
    const patientProfile = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1)

    // Análise de padrões de humor
    const moodPatterns = await analyzeMoodPatterns(
      filteredEntries.map(entry => ({
        content: entry.content || '',
        moodRating: entry.moodRating || 5,
        createdAt: new Date(entry.entryDate)
      }))
    )

    // Análise terapêutica com IA
    const therapeuticInsights = await generateTherapeuticInsights(
      filteredEntries.map(entry => ({
        content: entry.content || '',
        moodRating: entry.moodRating || 5,
        emotions: entry.emotions || null
      })),
      {
        currentCycle: patientProfile[0]?.currentCycle || 'Criar',
        concerns: [] // Pode ser expandido futuramente
      }
    )

    // Detectar entradas de alto risco
    const highRiskEntries = filteredEntries.filter(entry => 
      entry.riskLevel === 'high' || entry.riskLevel === 'critical'
    )

    // Calcular estatísticas
    const averageMood = filteredEntries.reduce((sum, entry) => 
      sum + (entry.moodRating || 5), 0
    ) / filteredEntries.length

    const emotionDistribution = {}
    filteredEntries.forEach(entry => {
      if (entry.dominantEmotion) {
        emotionDistribution[entry.dominantEmotion] = 
          (emotionDistribution[entry.dominantEmotion] || 0) + 1
      }
    })

    // Sugestões baseadas em padrões
    const suggestions = []
    
    if (moodPatterns.trend === 'declining') {
      suggestions.push("Considere conversar com seu terapeuta sobre as mudanças recentes em seu humor")
    }
    
    if (moodPatterns.volatility === 'high') {
      suggestions.push("Técnicas de regulação emocional podem ajudar com as flutuações de humor")
    }
    
    if (highRiskEntries.length > 0) {
      suggestions.push("Algumas entradas indicam momentos difíceis - não hesite em buscar apoio")
    }

    if (averageMood < 3) {
      suggestions.push("Atividades de autocuidado podem ser benéficas neste momento")
    }

    const insights = {
      period,
      entryCount: filteredEntries.length,
      dateRange: {
        start: startDate.toISOString(),
        end: new Date().toISOString()
      },
      moodAnalysis: {
        average: Math.round(averageMood * 10) / 10,
        trend: moodPatterns.trend,
        volatility: moodPatterns.volatility,
        concerningPatterns: moodPatterns.concerningPatterns
      },
      emotionAnalysis: {
        distribution: emotionDistribution,
        mostFrequent: Object.keys(emotionDistribution).sort(
          (a, b) => emotionDistribution[b] - emotionDistribution[a]
        )[0] || 'neutro'
      },
      riskAssessment: {
        highRiskDays: highRiskEntries.length,
        lastHighRisk: highRiskEntries[0]?.entryDate || null,
        level: highRiskEntries.length > 0 ? 'attention' : 'normal'
      },
      therapeuticInsights: {
        weeklyInsight: therapeuticInsights.weeklyInsight,
        recommendedTechniques: therapeuticInsights.recommendedTechniques,
        focusAreas: therapeuticInsights.focusAreas,
        progressNotes: therapeuticInsights.progressNotes
      },
      suggestions,
      aiGenerated: true,
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      insights
    })

  } catch (error) {
    console.error('Insights generation error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}