/**
 * Predictive Analytics Service for CÁRIS Platform
 *
 * Provides AI-powered predictions for:
 * - Mood trends (next 7 days)
 * - Risk escalation patterns
 * - Session attendance likelihood
 * - Therapy engagement levels
 * - Medication adherence forecasts
 */

import {
  openai,
  AI_MODELS,
  TEMPERATURE_SETTINGS,
  TOKEN_LIMITS,
  CONFIDENCE_THRESHOLDS,
  buildSystemPrompt,
  DISCLAIMERS,
} from './config'

export interface MoodPrediction {
  date: string
  predictedMood: number // 1-10 scale
  confidence: number // 0-1
  factors: string[]
  explanation: string
}

export interface MoodTrendPrediction {
  predictions: MoodPrediction[]
  overallTrend: 'improving' | 'stable' | 'declining'
  trendConfidence: number
  keyInfluencingFactors: string[]
  recommendations: string[]
  disclaimer: string
}

export interface RiskEscalation {
  currentRiskLevel: 'low' | 'medium' | 'high' | 'critical'
  predictedRiskLevel: 'low' | 'medium' | 'high' | 'critical'
  escalationProbability: number
  timeframe: string
  warningSignals: string[]
  preventiveActions: string[]
  confidence: number
}

export interface SessionAttendancePrediction {
  sessionDate: string
  attendanceProbability: number
  confidence: number
  riskFactors: string[]
  recommendations: string[]
}

export interface EngagementPrediction {
  engagementLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
  engagementScore: number // 0-100
  confidence: number
  positiveIndicators: string[]
  concerningIndicators: string[]
  improvementSuggestions: string[]
}

export interface MedicationAdherenceForecast {
  predictedAdherence: number // 0-100%
  adherenceTrend: 'improving' | 'stable' | 'declining'
  confidence: number
  riskFactors: string[]
  supportStrategies: string[]
}

/**
 * Predict patient mood trends for the next 7 days
 */
export async function predictMoodTrends(data: {
  historicalMoods: Array<{ date: string; mood: number }>
  diaryEntries: Array<{ date: string; content: string; emotions?: string }>
  recentEvents?: string[]
  sessionHistory?: Array<{ date: string; outcome?: string }>
}): Promise<MoodTrendPrediction> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    // Prepare historical data summary
    const moodSummary = data.historicalMoods
      .slice(-30) // Last 30 days
      .map((m) => `${m.date}: ${m.mood}/10`)
      .join('\n')

    const recentDiary = data.diaryEntries
      .slice(-7)
      .map((e) => `${e.date}: ${e.content.substring(0, 200)}`)
      .join('\n\n')

    const prompt = `Analise o histórico de humor do paciente e preveja as tendências para os próximos 7 dias.

DADOS HISTÓRICOS DE HUMOR (últimos 30 dias):
${moodSummary}

ENTRADAS DE DIÁRIO RECENTES:
${recentDiary}

EVENTOS RECENTES:
${data.recentEvents?.join('\n') || 'Nenhum evento significativo reportado'}

Com base nos padrões identificados, preveja:
1. Humor esperado para cada um dos próximos 7 dias (escala 1-10)
2. Tendência geral (melhorando, estável, ou em declínio)
3. Fatores que influenciam as previsões
4. Recomendações para manter/melhorar o humor

Retorne um JSON com esta estrutura:
{
  "predictions": [
    {
      "date": "YYYY-MM-DD",
      "predictedMood": number,
      "confidence": number,
      "factors": ["factor1", "factor2"],
      "explanation": "string"
    }
  ],
  "overallTrend": "improving|stable|declining",
  "trendConfidence": number,
  "keyInfluencingFactors": ["factor1", "factor2", "factor3"],
  "recommendations": ["rec1", "rec2", "rec3"]
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.ADVANCED,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('PREDICTOR', [
            'Baseie suas previsões em padrões observados nos dados históricos.',
            'Considere tanto tendências de longo prazo quanto flutuações recentes.',
            'Seja honesto sobre o nível de confiança - previsões de humor são probabilísticas.',
          ]),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: TEMPERATURE_SETTINGS.FACTUAL,
      max_tokens: TOKEN_LIMITS.COMPREHENSIVE,
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    const result = JSON.parse(aiResponse)

    return {
      ...result,
      disclaimer: DISCLAIMERS.AI_PREDICTION,
    }
  } catch (error) {
    console.error('Error predicting mood trends:', error)

    // Fallback: Simple linear projection
    return generateFallbackMoodPrediction(data.historicalMoods)
  }
}

/**
 * Identify potential risk escalation patterns
 */
export async function predictRiskEscalation(data: {
  currentRiskLevel: string
  historicalRisk: Array<{ date: string; level: string; factors?: string[] }>
  recentMoods: Array<{ date: string; mood: number }>
  diaryContent: Array<{ date: string; content: string; riskIndicators?: string[] }>
  sessionNotes?: string[]
}): Promise<RiskEscalation> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    const riskHistory = data.historicalRisk
      .slice(-14)
      .map((r) => `${r.date}: ${r.level}`)
      .join('\n')

    const moodHistory = data.recentMoods
      .slice(-14)
      .map((m) => `${m.date}: ${m.mood}/10`)
      .join('\n')

    const recentContent = data.diaryContent
      .slice(-5)
      .map((d) => `${d.date}: ${d.content.substring(0, 250)}`)
      .join('\n\n')

    const prompt = `Avalie o risco de escalação de risco psicológico.

NÍVEL DE RISCO ATUAL: ${data.currentRiskLevel}

HISTÓRICO DE RISCO (últimas 2 semanas):
${riskHistory}

HISTÓRICO DE HUMOR:
${moodHistory}

CONTEÚDO RECENTE DO DIÁRIO:
${recentContent}

NOTAS DE SESSÕES:
${data.sessionNotes?.join('\n') || 'Sem notas disponíveis'}

Analise e preveja:
1. Probabilidade de escalação do risco (0-1)
2. Nível de risco previsto nas próximas 2 semanas
3. Sinais de alerta identificados
4. Ações preventivas recomendadas

Retorne JSON:
{
  "currentRiskLevel": "low|medium|high|critical",
  "predictedRiskLevel": "low|medium|high|critical",
  "escalationProbability": number,
  "timeframe": "string",
  "warningSignals": ["signal1", "signal2"],
  "preventiveActions": ["action1", "action2"],
  "confidence": number
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.ADVANCED,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('RISK_ASSESSOR', [
            'PRIORIDADE MÁXIMA: Segurança do paciente.',
            'Erre pelo lado da cautela - melhor um falso positivo que um falso negativo.',
            'Identifique padrões sutis que possam indicar deterioração.',
          ]),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: TEMPERATURE_SETTINGS.FACTUAL,
      max_tokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    return JSON.parse(aiResponse)
  } catch (error) {
    console.error('Error predicting risk escalation:', error)

    // Fallback: Conservative risk assessment
    return {
      currentRiskLevel: data.currentRiskLevel as any,
      predictedRiskLevel: data.currentRiskLevel as any,
      escalationProbability: 0.3,
      timeframe: '2 semanas',
      warningSignals: ['Análise automática não disponível'],
      preventiveActions: ['Monitoramento manual recomendado'],
      confidence: 0.3,
    }
  }
}

/**
 * Predict session attendance likelihood
 */
export async function predictSessionAttendance(data: {
  sessionDate: string
  attendanceHistory: Array<{ date: string; attended: boolean; cancelReason?: string }>
  recentMoods: Array<{ date: string; mood: number }>
  engagementIndicators: {
    diaryConsistency: number // 0-1
    appUsage: number // 0-1
    taskCompletion: number // 0-1
  }
  patientContext?: string
}): Promise<SessionAttendancePrediction> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    const attendanceRate =
      data.attendanceHistory.filter((s) => s.attended).length / data.attendanceHistory.length

    const recentAttendance = data.attendanceHistory
      .slice(-10)
      .map((s) => `${s.date}: ${s.attended ? 'Presente' : `Faltou (${s.cancelReason || 'Sem motivo'})`}`)
      .join('\n')

    const avgMood =
      data.recentMoods.reduce((sum, m) => sum + m.mood, 0) / data.recentMoods.length

    const prompt = `Preveja a probabilidade de comparecimento à sessão agendada.

DATA DA SESSÃO: ${data.sessionDate}

HISTÓRICO DE COMPARECIMENTO (últimas 10 sessões):
${recentAttendance}
Taxa de comparecimento geral: ${(attendanceRate * 100).toFixed(1)}%

HUMOR RECENTE: Média de ${avgMood.toFixed(1)}/10

INDICADORES DE ENGAJAMENTO:
- Consistência no diário: ${(data.engagementIndicators.diaryConsistency * 100).toFixed(0)}%
- Uso do app: ${(data.engagementIndicators.appUsage * 100).toFixed(0)}%
- Conclusão de tarefas: ${(data.engagementIndicators.taskCompletion * 100).toFixed(0)}%

CONTEXTO:
${data.patientContext || 'Sem contexto adicional'}

Preveja:
1. Probabilidade de comparecimento (0-1)
2. Fatores de risco para não comparecimento
3. Recomendações para aumentar probabilidade

Retorne JSON:
{
  "sessionDate": "${data.sessionDate}",
  "attendanceProbability": number,
  "confidence": number,
  "riskFactors": ["factor1", "factor2"],
  "recommendations": ["rec1", "rec2"]
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('PREDICTOR'),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: TEMPERATURE_SETTINGS.FACTUAL,
      max_tokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    return JSON.parse(aiResponse)
  } catch (error) {
    console.error('Error predicting session attendance:', error)

    // Fallback: Simple statistical prediction
    const attendanceRate =
      data.attendanceHistory.filter((s) => s.attended).length /
      Math.max(data.attendanceHistory.length, 1)

    return {
      sessionDate: data.sessionDate,
      attendanceProbability: attendanceRate,
      confidence: 0.4,
      riskFactors: ['Análise detalhada não disponível'],
      recommendations: ['Enviar lembrete com antecedência'],
    }
  }
}

/**
 * Detect and predict therapy engagement levels
 */
export async function predictEngagementLevel(data: {
  diaryFrequency: number // entries per week
  taskCompletionRate: number // 0-1
  sessionAttendanceRate: number // 0-1
  appUsageMinutesPerDay: number
  lastActivityDays: number
  qualitativeIndicators?: string[]
}): Promise<EngagementPrediction> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    // Calculate base engagement score
    const baseScore =
      data.diaryFrequency * 15 +
      data.taskCompletionRate * 30 +
      data.sessionAttendanceRate * 35 +
      Math.min(data.appUsageMinutesPerDay / 10, 20)

    const prompt = `Avalie o nível de engajamento do paciente na terapia.

MÉTRICAS QUANTITATIVAS:
- Frequência de diário: ${data.diaryFrequency} entradas/semana
- Taxa de conclusão de tarefas: ${(data.taskCompletionRate * 100).toFixed(0)}%
- Taxa de comparecimento: ${(data.sessionAttendanceRate * 100).toFixed(0)}%
- Uso diário do app: ${data.appUsageMinutesPerDay} minutos
- Última atividade: ${data.lastActivityDays} dias atrás

INDICADORES QUALITATIVOS:
${data.qualitativeIndicators?.join('\n') || 'Sem indicadores qualitativos'}

Score base calculado: ${baseScore.toFixed(1)}/100

Determine:
1. Nível de engajamento (very_low, low, medium, high, very_high)
2. Score de engajamento refinado (0-100)
3. Indicadores positivos
4. Indicadores preocupantes
5. Sugestões de melhoria

Retorne JSON:
{
  "engagementLevel": "very_low|low|medium|high|very_high",
  "engagementScore": number,
  "confidence": number,
  "positiveIndicators": ["indicator1", "indicator2"],
  "concerningIndicators": ["concern1", "concern2"],
  "improvementSuggestions": ["suggestion1", "suggestion2"]
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('PREDICTOR'),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: TEMPERATURE_SETTINGS.BALANCED,
      max_tokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    return JSON.parse(aiResponse)
  } catch (error) {
    console.error('Error predicting engagement:', error)

    // Fallback: Rule-based engagement assessment
    const score =
      data.diaryFrequency * 15 +
      data.taskCompletionRate * 30 +
      data.sessionAttendanceRate * 35 +
      Math.min(data.appUsageMinutesPerDay / 10, 20)

    let level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
    if (score >= 80) level = 'very_high'
    else if (score >= 60) level = 'high'
    else if (score >= 40) level = 'medium'
    else if (score >= 20) level = 'low'
    else level = 'very_low'

    return {
      engagementLevel: level,
      engagementScore: Math.round(score),
      confidence: 0.5,
      positiveIndicators: ['Análise em andamento'],
      concerningIndicators: [],
      improvementSuggestions: ['Manter regularidade nas atividades'],
    }
  }
}

/**
 * Forecast medication adherence (if applicable)
 */
export async function forecastMedicationAdherence(data: {
  historicalAdherence: Array<{ date: string; adherence: number }>
  sideEffectsReported: string[]
  moodCorrelation?: {
    withMedication: number // avg mood when adherent
    withoutMedication: number // avg mood when non-adherent
  }
  supportSystem: 'strong' | 'moderate' | 'weak'
}): Promise<MedicationAdherenceForecast> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    const avgAdherence =
      data.historicalAdherence.reduce((sum, a) => sum + a.adherence, 0) /
      data.historicalAdherence.length

    const adherenceHistory = data.historicalAdherence
      .slice(-30)
      .map((a) => `${a.date}: ${(a.adherence * 100).toFixed(0)}%`)
      .join('\n')

    const prompt = `Preveja a aderência à medicação nas próximas semanas.

HISTÓRICO DE ADERÊNCIA (últimos 30 dias):
${adherenceHistory}
Média geral: ${(avgAdherence * 100).toFixed(0)}%

EFEITOS COLATERAIS REPORTADOS:
${data.sideEffectsReported.join('\n') || 'Nenhum efeito colateral reportado'}

CORRELAÇÃO COM HUMOR:
${data.moodCorrelation ? `Com medicação: ${data.moodCorrelation.withMedication}/10\nSem medicação: ${data.moodCorrelation.withoutMedication}/10` : 'Dados insuficientes'}

SISTEMA DE SUPORTE: ${data.supportSystem}

Preveja:
1. Aderência esperada (0-100%)
2. Tendência (melhorando, estável, em declínio)
3. Fatores de risco para não aderência
4. Estratégias de suporte

Retorne JSON:
{
  "predictedAdherence": number,
  "adherenceTrend": "improving|stable|declining",
  "confidence": number,
  "riskFactors": ["factor1", "factor2"],
  "supportStrategies": ["strategy1", "strategy2"]
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('PREDICTOR'),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: TEMPERATURE_SETTINGS.FACTUAL,
      max_tokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    return JSON.parse(aiResponse)
  } catch (error) {
    console.error('Error forecasting medication adherence:', error)

    // Fallback
    const avgAdherence =
      data.historicalAdherence.reduce((sum, a) => sum + a.adherence, 0) /
      Math.max(data.historicalAdherence.length, 1)

    return {
      predictedAdherence: Math.round(avgAdherence * 100),
      adherenceTrend: 'stable',
      confidence: 0.4,
      riskFactors: ['Análise detalhada não disponível'],
      supportStrategies: ['Lembretes regulares', 'Acompanhamento com prescritor'],
    }
  }
}

// Fallback function for mood prediction
function generateFallbackMoodPrediction(
  historicalMoods: Array<{ date: string; mood: number }>
): MoodTrendPrediction {
  const recentMoods = historicalMoods.slice(-7)
  const avgMood = recentMoods.reduce((sum, m) => sum + m.mood, 0) / recentMoods.length

  // Simple linear trend
  const firstHalf = recentMoods.slice(0, 3)
  const secondHalf = recentMoods.slice(-3)
  const trend1 = firstHalf.reduce((sum, m) => sum + m.mood, 0) / firstHalf.length
  const trend2 = secondHalf.reduce((sum, m) => sum + m.mood, 0) / secondHalf.length
  const trendDiff = trend2 - trend1

  const predictions: MoodPrediction[] = []
  const today = new Date()

  for (let i = 1; i <= 7; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)

    predictions.push({
      date: date.toISOString().split('T')[0],
      predictedMood: Math.max(1, Math.min(10, avgMood + trendDiff * (i / 7))),
      confidence: 0.4,
      factors: ['Baseado em tendência recente'],
      explanation: 'Previsão baseada em análise estatística simples',
    })
  }

  return {
    predictions,
    overallTrend: trendDiff > 0.5 ? 'improving' : trendDiff < -0.5 ? 'declining' : 'stable',
    trendConfidence: 0.4,
    keyInfluencingFactors: ['Padrão histórico de humor'],
    recommendations: ['Continue monitorando o humor diariamente'],
    disclaimer: DISCLAIMERS.AI_PREDICTION,
  }
}
