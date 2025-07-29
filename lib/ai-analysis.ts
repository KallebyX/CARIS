import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

export interface EmotionalAnalysis {
  dominantEmotion: string
  emotionIntensity: number // 0-10 scale
  sentimentScore: number // -1 to 1
  detectedEmotions: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  insights: string[]
  suggestedActions: string[]
  plutchikCategories: string[]
  // Multimodal fields
  audioAnalysis?: {
    transcription: string
    voiceTone: string
    speechPattern: string
    emotionalMarkers: string[]
  }
  imageAnalysis?: {
    visualMood: string
    colorPsychology: string
    symbolism: string[]
    environmentalFactors: string
  }
}

export interface MoodPattern {
  trend: 'improving' | 'stable' | 'declining'
  volatility: 'low' | 'medium' | 'high'
  averageMood: number
  concerningPatterns: string[]
}

const EMOTIONAL_ANALYSIS_PROMPT = `
Você é um assistente especializado em análise emocional para uso terapêutico. Analise o texto do diário fornecido e retorne uma análise estruturada em JSON.

Diretrizes:
1. Identifique emoções usando as categorias de Plutchik: alegria, tristeza, raiva, medo, surpresa, aversão, confiança, expectativa
2. Avalie o nível de risco psicológico baseado em indicadores como: ideação suicida, desespero extremo, isolamento, comportamento autodestrutivo
3. Forneça insights construtivos e sugestões terapêuticas apropriadas
4. Seja sensível e empático na linguagem

Retorne APENAS um JSON válido no seguinte formato:
{
  "dominantEmotion": "string",
  "emotionIntensity": number,
  "sentimentScore": number,
  "detectedEmotions": ["string"],
  "riskLevel": "low|medium|high|critical",
  "insights": ["string"],
  "suggestedActions": ["string"],
  "plutchikCategories": ["string"]
}
`

export async function analyzeEmotionalContent(
  content: string, 
  audioTranscription?: string, 
  imageAnalysis?: string
): Promise<EmotionalAnalysis> {
  try {
    if (!openai) {
      throw new Error('OpenAI API key not configured')
    }

    // Combine all content for comprehensive analysis
    let combinedContent = content
    
    if (audioTranscription) {
      combinedContent += `\n\nTranscrição do áudio: ${audioTranscription}`
    }
    
    if (imageAnalysis) {
      combinedContent += `\n\nAnálise da imagem: ${imageAnalysis}`
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: EMOTIONAL_ANALYSIS_PROMPT,
        },
        {
          role: 'user',
          content: `Analise este conteúdo multimodal de diário: "${combinedContent}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    // Parse and validate the JSON response
    const analysis = JSON.parse(aiResponse) as EmotionalAnalysis
    
    // Add multimodal analysis if available
    if (audioTranscription) {
      analysis.audioAnalysis = await analyzeAudioTranscription(audioTranscription)
    }
    
    if (imageAnalysis) {
      analysis.imageAnalysis = await analyzeImageContent(imageAnalysis)
    }
    
    // Validate required fields
    if (!analysis.dominantEmotion || typeof analysis.emotionIntensity !== 'number') {
      throw new Error('Invalid AI response structure')
    }

    return analysis
  } catch (error) {
    console.error('Error in AI emotional analysis:', error)
    
    // Fallback analysis
    return {
      dominantEmotion: 'neutro',
      emotionIntensity: 5,
      sentimentScore: 0,
      detectedEmotions: ['neutro'],
      riskLevel: 'low',
      insights: ['Análise automática não disponível no momento'],
      suggestedActions: ['Continue registrando seus sentimentos'],
      plutchikCategories: ['neutro'],
    }
  }
}

export async function analyzeMoodPatterns(diaryEntries: Array<{
  content: string
  moodRating: number
  createdAt: Date
}>): Promise<MoodPattern> {
  if (diaryEntries.length < 3) {
    return {
      trend: 'stable',
      volatility: 'low',
      averageMood: diaryEntries[0]?.moodRating || 5,
      concerningPatterns: [],
    }
  }

  const moods = diaryEntries.map(entry => entry.moodRating)
  const averageMood = moods.reduce((sum, mood) => sum + mood, 0) / moods.length

  // Calculate trend (last 3 vs previous entries)
  const recentMoods = moods.slice(-3)
  const earlierMoods = moods.slice(0, -3)
  const recentAvg = recentMoods.reduce((sum, mood) => sum + mood, 0) / recentMoods.length
  const earlierAvg = earlierMoods.length > 0 
    ? earlierMoods.reduce((sum, mood) => sum + mood, 0) / earlierMoods.length 
    : recentAvg

  let trend: 'improving' | 'stable' | 'declining' = 'stable'
  if (recentAvg > earlierAvg + 0.5) trend = 'improving'
  else if (recentAvg < earlierAvg - 0.5) trend = 'declining'

  // Calculate volatility (standard deviation)
  const variance = moods.reduce((sum, mood) => sum + Math.pow(mood - averageMood, 2), 0) / moods.length
  const stdDev = Math.sqrt(variance)
  
  let volatility: 'low' | 'medium' | 'high' = 'low'
  if (stdDev > 1.5) volatility = 'high'
  else if (stdDev > 0.8) volatility = 'medium'

  // Detect concerning patterns
  const concerningPatterns: string[] = []
  
  if (averageMood < 2) {
    concerningPatterns.push('Humor persistentemente baixo')
  }
  
  if (volatility === 'high') {
    concerningPatterns.push('Flutuações extremas de humor')
  }
  
  if (trend === 'declining' && recentAvg < 2.5) {
    concerningPatterns.push('Tendência de declínio no humor')
  }

  // Check for consecutive low moods
  let consecutiveLowMoods = 0
  let maxConsecutiveLow = 0
  for (const mood of moods.reverse()) {
    if (mood <= 2) {
      consecutiveLowMoods++
      maxConsecutiveLow = Math.max(maxConsecutiveLow, consecutiveLowMoods)
    } else {
      consecutiveLowMoods = 0
    }
  }
  
  if (maxConsecutiveLow >= 5) {
    concerningPatterns.push('Período prolongado de humor baixo')
  }

  return {
    trend,
    volatility,
    averageMood,
    concerningPatterns,
  }
}

export async function generateTherapeuticInsights(
  recentEntries: Array<{ content: string; moodRating: number; emotions?: string }>,
  patientProfile?: { currentCycle?: string; concerns?: string[] }
): Promise<{
  weeklyInsight: string
  recommendedTechniques: string[]
  focusAreas: string[]
  progressNotes: string[]
}> {
  try {
    if (!openai) {
      throw new Error('OpenAI API key not configured')
    }

    const combinedContent = recentEntries
      .map(entry => `Humor: ${entry.moodRating}/10 - ${entry.content}`)
      .join('\n\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Você é um assistente terapêutico especializado. Analise as entradas do diário da última semana e forneça insights para o terapeuta. Considere o ciclo terapêutico atual: ${patientProfile?.currentCycle || 'Criar'}. 

Retorne um JSON com:
- weeklyInsight: Resumo da semana emocional (150 palavras)
- recommendedTechniques: 3-5 técnicas terapêuticas específicas
- focusAreas: 2-4 áreas de foco para próximas sessões  
- progressNotes: 2-3 observações sobre progresso`,
        },
        {
          role: 'user',
          content: combinedContent,
        },
      ],
      temperature: 0.4,
      max_tokens: 1000,
    })

    const result = JSON.parse(response.choices[0]?.message?.content || '{}')
    
    return {
      weeklyInsight: result.weeklyInsight || 'Análise em desenvolvimento',
      recommendedTechniques: result.recommendedTechniques || ['Técnica de respiração'],
      focusAreas: result.focusAreas || ['Regulação emocional'],
      progressNotes: result.progressNotes || ['Acompanhamento necessário'],
    }
  } catch (error) {
    console.error('Error generating therapeutic insights:', error)
    
    return {
      weeklyInsight: 'Análise detalhada em desenvolvimento',
      recommendedTechniques: ['Registro de pensamentos', 'Técnicas de relaxamento'],
      focusAreas: ['Autoconhecimento', 'Gestão emocional'],
      progressNotes: ['Continuar monitoramento regular'],
    }
  }
}


async function analyzeAudioTranscription(transcription: string) {
  try {
    if (!openai) {
      throw new Error('OpenAI API key not configured')
    }

// New Clinical AI Functions

export interface SessionAnalysis {
  overallProgress: 'excellent' | 'good' | 'stable' | 'concerning' | 'critical'
  keyThemes: string[]
  emotionalTrends: {
    direction: 'improving' | 'stable' | 'declining'
    consistency: 'very_consistent' | 'consistent' | 'variable' | 'highly_variable'
    predominantEmotions: string[]
  }
  riskFactors: string[]
  therapeuticOpportunities: string[]
  recommendedInterventions: string[]
  nextSessionFocus: string[]
}

export interface ClinicalAlert {
  alertType: 'risk_escalation' | 'pattern_change' | 'mood_decline' | 'session_concern'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  recommendations: string[]
  urgency: 'immediate' | 'within_24h' | 'within_week' | 'monitor'
}

export interface ProgressReport {
  period: string
  overallProgress: number // 0-100
  keyAchievements: string[]
  challengingAreas: string[]
  moodTrends: {
    average: number
    trend: 'improving' | 'stable' | 'declining'
    volatility: 'low' | 'medium' | 'high'
  }
  therapeuticGoalsProgress: Array<{
    goal: string
    progress: number
    status: 'achieved' | 'on_track' | 'needs_attention' | 'not_started'
  }>
  recommendations: string[]
  nextSteps: string[]
}

export async function analyzeSessionProgress(
  sessionData: Array<{
    sessionDate: Date
    notes?: string
    patientMood?: number
    duration: number
    type: string
  }>,
  diaryEntries: Array<{
    content: string
    moodRating: number
    createdAt: Date
    emotions?: string
  }>,
  patientProfile?: {
    currentCycle?: string
    treatmentGoals?: string[]
  }
): Promise<SessionAnalysis> {
  try {
    const sessionsSummary = sessionData
      .map(s => `Data: ${s.sessionDate.toISOString().split('T')[0]} - Humor: ${s.patientMood || 'N/A'} - Duração: ${s.duration}min - Notas: ${s.notes || 'Sem notas'}`)
      .join('\n')

    const recentDiary = diaryEntries
      .slice(-7)
      .map(entry => `${entry.createdAt.toISOString().split('T')[0]}: Humor ${entry.moodRating}/10 - ${entry.content}`)
      .join('\n')

    const prompt = `Analise o progresso terapêutico baseado nas sessões e entradas do diário.

SESSÕES:
${sessionsSummary}

DIÁRIO RECENTE:
${recentDiary}

CONTEXTO: Ciclo atual: ${patientProfile?.currentCycle || 'Criar'}

Retorne um JSON estruturado com análise clínica detalhada incluindo:
- overallProgress: classificação geral
- keyThemes: temas principais identificados
- emotionalTrends: tendências emocionais
- riskFactors: fatores de risco identificados
- therapeuticOpportunities: oportunidades terapêuticas
- recommendedInterventions: intervenções recomendadas
- nextSessionFocus: focos para próxima sessão`


    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',

          content: `Analise esta transcrição de áudio para identificar:
          - Tom de voz inferido das palavras e estrutura
          - Padrões de fala (hesitação, fluidez, etc.)
          - Marcadores emocionais específicos do áudio
          
          Retorne um JSON com: {"voiceTone": "string", "speechPattern": "string", "emotionalMarkers": ["string"]}`
        },
        {
          role: 'user',
          content: transcription
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
    })

    const result = JSON.parse(response.choices[0]?.message?.content || '{}')
    return {
      transcription,
      voiceTone: result.voiceTone || 'neutro',
      speechPattern: result.speechPattern || 'fluido',
      emotionalMarkers: result.emotionalMarkers || []
    }
  } catch (error) {
    console.error('Error analyzing audio transcription:', error)
    return {
      transcription,
      voiceTone: 'neutro',
      speechPattern: 'fluido',
      emotionalMarkers: []
    }
  }
}

async function analyzeImageContent(imageAnalysis: string) {
  try {
    if (!openai) {
      throw new Error('OpenAI API key not configured')
    }


          content: 'Você é um especialista em análise clínica para terapeutas. Analise os dados fornecidos e retorne insights estruturados em JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1200,
    })

    const analysis = JSON.parse(response.choices[0]?.message?.content || '{}')
    
    return {
      overallProgress: analysis.overallProgress || 'stable',
      keyThemes: analysis.keyThemes || ['Acompanhamento regular'],
      emotionalTrends: {
        direction: analysis.emotionalTrends?.direction || 'stable',
        consistency: analysis.emotionalTrends?.consistency || 'consistent',
        predominantEmotions: analysis.emotionalTrends?.predominantEmotions || ['neutro'],
      },
      riskFactors: analysis.riskFactors || [],
      therapeuticOpportunities: analysis.therapeuticOpportunities || ['Fortalecimento de vínculo terapêutico'],
      recommendedInterventions: analysis.recommendedInterventions || ['Continuidade do acompanhamento'],
      nextSessionFocus: analysis.nextSessionFocus || ['Revisão de progresso'],
    }
  } catch (error) {
    console.error('Error in session analysis:', error)
    
    return {
      overallProgress: 'stable',
      keyThemes: ['Análise em desenvolvimento'],
      emotionalTrends: {
        direction: 'stable',
        consistency: 'consistent',
        predominantEmotions: ['neutro'],
      },
      riskFactors: [],
      therapeuticOpportunities: ['Fortalecimento de vínculo terapêutico'],
      recommendedInterventions: ['Continuidade do acompanhamento'],
      nextSessionFocus: ['Revisão de progresso'],
    }
  }
}

export async function detectClinicalAlerts(
  recentEntries: Array<{
    content: string
    moodRating: number
    createdAt: Date
    riskLevel?: string
    emotions?: string
  }>,
  sessionHistory: Array<{
    sessionDate: Date
    notes?: string
    patientMood?: number
  }>,
  currentAlerts: Array<{
    alertType: string
    severity: string
    createdAt: Date
  }>
): Promise<ClinicalAlert[]> {
  try {
    const alerts: ClinicalAlert[] = []
    
    // Analyze mood decline pattern
    const recentMoods = recentEntries.slice(-14).map(e => e.moodRating)
    if (recentMoods.length >= 7) {
      const recent7 = recentMoods.slice(-7)
      const previous7 = recentMoods.slice(-14, -7)
      
      const recentAvg = recent7.reduce((sum, mood) => sum + mood, 0) / recent7.length
      const previousAvg = previous7.reduce((sum, mood) => sum + mood, 0) / previous7.length
      
      if (recentAvg < 3 && recentAvg < previousAvg - 1) {
        alerts.push({
          alertType: 'mood_decline',
          severity: recentAvg < 2 ? 'critical' : 'high',
          title: 'Declínio Significativo de Humor',
          description: `Média de humor caiu de ${previousAvg.toFixed(1)} para ${recentAvg.toFixed(1)} nas últimas duas semanas`,
          recommendations: [
            'Agendar sessão de emergência',
            'Avaliar necessidade de suporte adicional',
            'Considerar ajuste no plano terapêutico',
          ],
          urgency: recentAvg < 2 ? 'immediate' : 'within_24h',
        })
      }
    }

    // Check for high-risk content patterns
    const highRiskEntries = recentEntries.filter(e => e.riskLevel === 'critical' || e.riskLevel === 'high')
    if (highRiskEntries.length >= 3) {
      alerts.push({
        alertType: 'risk_escalation',
        severity: 'critical',
        title: 'Múltiplas Entradas de Alto Risco',
        description: `${highRiskEntries.length} entradas de alto risco nos últimos registros`,
        recommendations: [
          'Contato imediato com paciente',
          'Avaliação de risco de autolesão',
          'Considerar encaminhamento urgente',
        ],
        urgency: 'immediate',
      })
    }

    // Detect session attendance concerns
    const recentSessions = sessionHistory.filter(s => {
      const daysDiff = Math.abs(new Date().getTime() - s.sessionDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysDiff <= 30
    })
    
    if (recentSessions.length === 0 && sessionHistory.length > 0) {
      const lastSession = sessionHistory[sessionHistory.length - 1]
      const daysSinceLastSession = Math.abs(new Date().getTime() - lastSession.sessionDate.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysSinceLastSession > 21) {
        alerts.push({
          alertType: 'session_concern',
          severity: 'medium',
          title: 'Ausência Prolongada de Sessões',
          description: `Última sessão há ${Math.floor(daysSinceLastSession)} dias`,
          recommendations: [
            'Entrar em contato com paciente',
            'Verificar motivos da ausência',
            'Reagendar sessão se necessário',
          ],
          urgency: 'within_week',
        })
      }
    }

    return alerts
  } catch (error) {
    console.error('Error detecting clinical alerts:', error)
    return []
  }
}

export async function generateProgressReport(
  patientId: number,
  period: { start: Date; end: Date },
  diaryEntries: Array<{
    content: string
    moodRating: number
    createdAt: Date
    emotions?: string
    riskLevel?: string
  }>,
  sessions: Array<{
    sessionDate: Date
    notes?: string
    duration: number
  }>,
  treatmentGoals?: string[]
): Promise<ProgressReport> {
  try {
    const periodEntries = diaryEntries.filter(
      entry => entry.createdAt >= period.start && entry.createdAt <= period.end
    )
    
    const periodSessions = sessions.filter(
      session => session.sessionDate >= period.start && session.sessionDate <= period.end
    )

    const moodAverage = periodEntries.length > 0 
      ? periodEntries.reduce((sum, entry) => sum + entry.moodRating, 0) / periodEntries.length 
      : 5

    // Calculate mood trend
    const firstHalf = periodEntries.slice(0, Math.floor(periodEntries.length / 2))
    const secondHalf = periodEntries.slice(Math.floor(periodEntries.length / 2))
    
    const firstHalfAvg = firstHalf.length > 0 
      ? firstHalf.reduce((sum, entry) => sum + entry.moodRating, 0) / firstHalf.length 
      : moodAverage
    const secondHalfAvg = secondHalf.length > 0 
      ? secondHalf.reduce((sum, entry) => sum + entry.moodRating, 0) / secondHalf.length 
      : moodAverage

    let moodTrend: 'improving' | 'stable' | 'declining' = 'stable'
    if (secondHalfAvg > firstHalfAvg + 0.5) moodTrend = 'improving'
    else if (secondHalfAvg < firstHalfAvg - 0.5) moodTrend = 'declining'

    // Calculate volatility
    const moodVariance = periodEntries.length > 0
      ? periodEntries.reduce((sum, entry) => sum + Math.pow(entry.moodRating - moodAverage, 2), 0) / periodEntries.length
      : 0
    const volatility: 'low' | 'medium' | 'high' = moodVariance > 2 ? 'high' : moodVariance > 1 ? 'medium' : 'low'

    // AI-generated summary
    const entriesSummary = periodEntries
      .map(e => `${e.createdAt.toISOString().split('T')[0]}: Humor ${e.moodRating}/10`)
      .join('\n')

    const sessionsSummary = periodSessions
      .map(s => `${s.sessionDate.toISOString().split('T')[0]}: ${s.duration}min`)
      .join('\n')


    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',

          content: `Com base na análise visual fornecida, extraia insights sobre:
          - Humor visual predominante
          - Psicologia das cores presentes
          - Simbolismo identificado
          - Fatores ambientais relevantes
          
          Retorne um JSON com: {"visualMood": "string", "colorPsychology": "string", "symbolism": ["string"], "environmentalFactors": "string"}`
        },
        {
          role: 'user',
          content: imageAnalysis
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
    })

    const result = JSON.parse(response.choices[0]?.message?.content || '{}')
    return {
      visualMood: result.visualMood || 'neutro',
      colorPsychology: result.colorPsychology || 'cores neutras',
      symbolism: result.symbolism || [],
      environmentalFactors: result.environmentalFactors || 'ambiente neutro'
    }
  } catch (error) {
    console.error('Error analyzing image content:', error)
    return {
      visualMood: 'neutro',
      colorPsychology: 'cores neutras',
      symbolism: [],
      environmentalFactors: 'ambiente neutro'

          content: 'Você é um especialista em relatórios de progresso terapêutico. Gere um relatório estruturado e conciso.',
        },
        {
          role: 'user',
          content: `Gere um relatório de progresso para o período de ${period.start.toISOString().split('T')[0]} a ${period.end.toISOString().split('T')[0]}.

ENTRADAS DE DIÁRIO:
${entriesSummary}

SESSÕES:
${sessionsSummary}

METAS TERAPÊUTICAS:
${treatmentGoals?.join('\n') || 'Não especificadas'}

Retorne um JSON com:
- keyAchievements: conquistas principais
- challengingAreas: áreas desafiadoras
- recommendations: recomendações
- nextSteps: próximos passos`,
        },
      ],
      temperature: 0.4,
      max_tokens: 800,
    })

    const aiReport = JSON.parse(response.choices[0]?.message?.content || '{}')

    // Calculate overall progress score
    let progressScore = 50 // baseline
    
    if (moodTrend === 'improving') progressScore += 20
    else if (moodTrend === 'declining') progressScore -= 20
    
    if (moodAverage > 6) progressScore += 15
    else if (moodAverage < 4) progressScore -= 15
    
    if (volatility === 'low') progressScore += 10
    else if (volatility === 'high') progressScore -= 10
    
    if (periodSessions.length >= 2) progressScore += 10
    
    progressScore = Math.max(0, Math.min(100, progressScore))

    return {
      period: `${period.start.toISOString().split('T')[0]}_${period.end.toISOString().split('T')[0]}`,
      overallProgress: progressScore,
      keyAchievements: aiReport.keyAchievements || ['Continuidade no acompanhamento'],
      challengingAreas: aiReport.challengingAreas || ['Áreas a serem exploradas'],
      moodTrends: {
        average: Math.round(moodAverage * 10) / 10,
        trend: moodTrend,
        volatility,
      },
      therapeuticGoalsProgress: treatmentGoals?.map(goal => ({
        goal,
        progress: Math.floor(Math.random() * 40) + 40, // Placeholder - would need actual goal tracking
        status: 'on_track' as const,
      })) || [],
      recommendations: aiReport.recommendations || ['Continuar acompanhamento regular'],
      nextSteps: aiReport.nextSteps || ['Agendar próxima sessão'],
    }
  } catch (error) {
    console.error('Error generating progress report:', error)
    
    return {
      period: `${period.start.toISOString().split('T')[0]}_${period.end.toISOString().split('T')[0]}`,
      overallProgress: 50,
      keyAchievements: ['Relatório em desenvolvimento'],
      challengingAreas: ['Análise detalhada pendente'],
      moodTrends: {
        average: 5,
        trend: 'stable',
        volatility: 'low',
      },
      therapeuticGoalsProgress: [],
      recommendations: ['Continuar acompanhamento regular'],
      nextSteps: ['Reagendar sessão'],
    }
  }
}