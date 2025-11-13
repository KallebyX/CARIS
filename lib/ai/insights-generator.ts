/**
 * Personalized Insights Generator
 *
 * Generates:
 * - Weekly progress insights with AI commentary
 * - Personalized wellness tips
 * - Pattern recognition in behavior
 * - Goal achievement predictions
 * - Motivational message generation
 * - Adaptive feedback based on progress
 */

import { openai, AI_MODELS, TEMPERATURE_SETTINGS, TOKEN_LIMITS, buildSystemPrompt, DISCLAIMERS } from './config'

export interface WeeklyInsight {
  period: { start: string; end: string }
  overallSummary: string
  emotionalHighlights: {
    positivePatterns: string[]
    challenges: string[]
    emotionalRange: { min: number; max: number; avg: number }
  }
  behavioralInsights: string[]
  progressIndicators: Array<{ metric: string; change: string; significance: string }>
  aiCommentary: string
  disclaimer: string
}

export interface PersonalizedWellnessTip {
  category: 'nutrition' | 'exercise' | 'sleep' | 'mindfulness' | 'social' | 'creativity'
  tip: string
  rationale: string
  difficulty: 'easy' | 'moderate' | 'challenging'
  timeRequired: string
  expectedBenefit: string
  personalizedReason: string
}

export interface BehaviorPattern {
  patternId: string
  pattern: string
  frequency: string
  triggers: string[]
  outcomes: string[]
  isHealthy: boolean
  confidence: number
  recommendations: string[]
}

export interface GoalPrediction {
  goal: string
  currentProgress: number // 0-100%
  predictedCompletion: string
  achievementProbability: number // 0-100%
  accelerators: string[]
  obstacles: string[]
  nextSteps: string[]
  motivationalMessage: string
}

export interface MotivationalMessage {
  message: string
  tone: 'encouraging' | 'celebratory' | 'empathetic' | 'challenging' | 'supportive'
  context: string
  personalized: boolean
}

export interface AdaptiveFeedback {
  feedbackType: 'progress' | 'challenge' | 'celebration' | 'redirection'
  message: string
  specificObservations: string[]
  suggestedActions: string[]
  encouragement: string
  adaptedTo: {
    emotionalState: string
    progressPhase: string
    recentEvents: string[]
  }
}

export async function generateWeeklyInsight(data: {
  weekData: {
    diaryEntries: number
    avgMood: number
    moodRange: { min: number; max: number }
    sessionsAttended: number
    tasksCompleted: number
    totalTasks: number
  }
  emotionalData: Array<{ date: string; mood: number; emotions: string[] }>
  significantEvents: string[]
  previousWeekComparison?: {
    avgMood: number
    diaryEntries: number
  }
}): Promise<WeeklyInsight> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const moodTrend =
      data.previousWeekComparison && data.weekData.avgMood > data.previousWeekComparison.avgMood
        ? 'melhorando'
        : 'estável'

    const prompt = `Gere insight semanal personalizado e encorajador.

DADOS DA SEMANA:
- Entradas de diário: ${data.weekData.diaryEntries}
- Humor médio: ${data.weekData.avgMood.toFixed(1)}/10
- Variação de humor: ${data.weekData.moodRange.min}-${data.weekData.moodRange.max}
- Sessões realizadas: ${data.weekData.sessionsAttended}
- Tarefas concluídas: ${data.weekData.tasksCompleted}/${data.weekData.totalTasks}

COMPARAÇÃO COM SEMANA ANTERIOR:
${data.previousWeekComparison ? `Humor: ${data.previousWeekComparison.avgMood.toFixed(1)} → ${data.weekData.avgMood.toFixed(1)} (${moodTrend})` : 'Primeira semana de registro'}

EVENTOS SIGNIFICATIVOS:
${data.significantEvents.join('\n') || 'Nenhum evento especial registrado'}

Crie um insight rico, personalizado e encorajador que:
1. Reconheça padrões positivos
2. Valide desafios enfrentados
3. Identifique indicadores de progresso
4. Forneça comentário AI empático e motivador

Retorne JSON:
{
  "period": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"},
  "overallSummary": "string (2-3 frases)",
  "emotionalHighlights": {
    "positivePatterns": ["pattern1"],
    "challenges": ["challenge1"],
    "emotionalRange": {"min": number, "max": number, "avg": number}
  },
  "behavioralInsights": ["insight1", "insight2"],
  "progressIndicators": [{"metric": "string", "change": "string", "significance": "string"}],
  "aiCommentary": "string (parágrafo personalizado e encorajador)"
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.ADVANCED,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('INSIGHTS_GENERATOR', [
            'Seja genuinamente encorajador, mas honesto.',
            'Celebre pequenas vitórias.',
            'Normalize desafios como parte do processo.',
            'Use linguagem calorosa e pessoal.',
          ]),
        },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.CREATIVE,
      max_tokens: TOKEN_LIMITS.COMPREHENSIVE,
    })

    const result = JSON.parse(response.choices[0]?.message?.content || '{}')
    return { ...result, disclaimer: DISCLAIMERS.AI_INSIGHT }
  } catch (error) {
    console.error('Error generating weekly insight:', error)
    throw error
  }
}

export async function generateWellnessTips(data: {
  currentMood: number
  recentEmotions: string[]
  sleepQuality?: number
  energyLevel?: number
  stressLevel?: number
  preferences?: string[]
}): Promise<PersonalizedWellnessTip[]> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const prompt = `Gere dicas de bem-estar personalizadas.

ESTADO ATUAL:
- Humor: ${data.currentMood}/10
- Emoções recentes: ${data.recentEmotions.join(', ')}
- Qualidade do sono: ${data.sleepQuality || 'Não informado'}/10
- Nível de energia: ${data.energyLevel || 'Não informado'}/10
- Nível de estresse: ${data.stressLevel || 'Não informado'}/10
- Preferências: ${data.preferences?.join(', ') || 'Nenhuma especificada'}

Sugira 3-5 dicas de bem-estar práticas e personalizadas em diferentes categorias.

Retorne JSON array:
[{
  "category": "nutrition|exercise|sleep|mindfulness|social|creativity",
  "tip": "string (dica específica e acionável)",
  "rationale": "string (por que esta dica é relevante agora)",
  "difficulty": "easy|moderate|challenging",
  "timeRequired": "string",
  "expectedBenefit": "string",
  "personalizedReason": "string (conexão com estado atual)"
}]`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('INSIGHTS_GENERATOR', [
            'Dicas devem ser específicas, não genéricas.',
            'Considere o estado emocional atual.',
            'Balance desafio com viabilidade.',
          ]),
        },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.CREATIVE,
      max_tokens: TOKEN_LIMITS.COMPREHENSIVE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '[]')
  } catch (error) {
    console.error('Error generating wellness tips:', error)
    return []
  }
}

export async function identifyBehaviorPatterns(data: {
  activities: Array<{ date: string; activity: string; mood: number; outcome: string }>
  timeframe: string
}): Promise<BehaviorPattern[]> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const activitiesStr = data.activities
      .map((a) => `${a.date}: ${a.activity} → Humor: ${a.mood}/10, Resultado: ${a.outcome}`)
      .join('\n')

    const prompt = `Identifique padrões comportamentais recorrentes.

PERÍODO: ${data.timeframe}

ATIVIDADES E RESULTADOS:
${activitiesStr}

Identifique:
1. Padrões comportamentais recorrentes (saudáveis e não saudáveis)
2. Gatilhos comuns
3. Resultados típicos
4. Frequência dos padrões

Retorne JSON array:
[{
  "patternId": "string",
  "pattern": "string (descrição clara do padrão)",
  "frequency": "string",
  "triggers": ["trigger1"],
  "outcomes": ["outcome1"],
  "isHealthy": boolean,
  "confidence": number,
  "recommendations": ["rec1"]
}]`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.ADVANCED,
      messages: [
        { role: 'system', content: buildSystemPrompt('PREDICTOR') },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.BALANCED,
      max_tokens: TOKEN_LIMITS.COMPREHENSIVE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '[]')
  } catch (error) {
    console.error('Error identifying behavior patterns:', error)
    return []
  }
}

export async function predictGoalAchievement(data: {
  goal: string
  targetDate: string
  currentProgress: number
  progressHistory: Array<{ date: string; progress: number }>
  obstacles: string[]
  supportFactors: string[]
}): Promise<GoalPrediction> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const progressTrend = data.progressHistory
      .map((p) => `${p.date}: ${p.progress}%`)
      .join(', ')

    const prompt = `Preveja probabilidade de alcançar meta.

META: ${data.goal}
DATA ALVO: ${data.targetDate}
PROGRESSO ATUAL: ${data.currentProgress}%

HISTÓRICO DE PROGRESSO:
${progressTrend}

OBSTÁCULOS: ${data.obstacles.join(', ')}
FATORES DE SUPORTE: ${data.supportFactors.join(', ')}

Analise tendência de progresso e preveja probabilidade de sucesso.

Retorne JSON:
{
  "goal": "${data.goal}",
  "currentProgress": ${data.currentProgress},
  "predictedCompletion": "YYYY-MM-DD",
  "achievementProbability": number,
  "accelerators": ["acc1"],
  "obstacles": ["obs1"],
  "nextSteps": ["step1"],
  "motivationalMessage": "string (mensagem encorajadora e específica)"
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        { role: 'system', content: buildSystemPrompt('PREDICTOR') },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.BALANCED,
      max_tokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Error predicting goal achievement:', error)
    throw error
  }
}

export async function generateMotivationalMessage(data: {
  context: 'achievement' | 'challenge' | 'progress' | 'setback' | 'milestone'
  specificDetails: string
  emotionalState?: string
  personalityPreference?: 'gentle' | 'direct' | 'humorous'
}): Promise<MotivationalMessage> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const toneMap = {
      achievement: 'celebratory',
      challenge: 'supportive',
      progress: 'encouraging',
      setback: 'empathetic',
      milestone: 'celebratory',
    }

    const prompt = `Gere mensagem motivacional personalizada.

CONTEXTO: ${data.context}
DETALHES: ${data.specificDetails}
ESTADO EMOCIONAL: ${data.emotionalState || 'Não especificado'}
PREFERÊNCIA: ${data.personalityPreference || 'gentle'}

Crie mensagem que:
1. Seja genuína e pessoal
2. Reconheça o contexto específico
3. Seja motivadora sem ser clichê
4. Reflita a preferência de comunicação

Retorne JSON:
{
  "message": "string (mensagem calorosa e específica)",
  "tone": "${toneMap[data.context]}",
  "context": "${data.context}",
  "personalized": true
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('INSIGHTS_GENERATOR', [
            'Evite clichês motivacionais genéricos.',
            'Seja autêntico e específico ao contexto.',
            'Use linguagem calorosa e pessoal.',
          ]),
        },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.CREATIVE,
      max_tokens: TOKEN_LIMITS.SHORT_RESPONSE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Error generating motivational message:', error)
    return {
      message: 'Continue fazendo o seu melhor. Cada passo conta.',
      tone: 'encouraging',
      context: data.context,
      personalized: false,
    }
  }
}

export async function generateAdaptiveFeedback(data: {
  progressData: {
    metric: string
    current: number
    previous: number
    target: number
  }
  emotionalState: string
  recentChallenges: string[]
  recentSuccesses: string[]
}): Promise<AdaptiveFeedback> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const change = data.progressData.current - data.progressData.previous
    const changePercent = ((change / data.progressData.previous) * 100).toFixed(1)

    let feedbackType: 'progress' | 'challenge' | 'celebration' | 'redirection'
    if (change > 0 && data.progressData.current >= data.progressData.target * 0.8) {
      feedbackType = 'celebration'
    } else if (change > 0) {
      feedbackType = 'progress'
    } else if (change < 0) {
      feedbackType = 'challenge'
    } else {
      feedbackType = 'redirection'
    }

    const prompt = `Gere feedback adaptativo ao progresso e estado emocional.

MÉTRICA: ${data.progressData.metric}
PROGRESSO: ${data.progressData.previous} → ${data.progressData.current} (meta: ${data.progressData.target})
MUDANÇA: ${change > 0 ? '+' : ''}${changePercent}%

ESTADO EMOCIONAL: ${data.emotionalState}

DESAFIOS RECENTES:
${data.recentChallenges.join('\n') || 'Nenhum registrado'}

SUCESSOS RECENTES:
${data.recentSuccesses.join('\n') || 'Nenhum registrado'}

Crie feedback que:
1. Reconheça o contexto emocional atual
2. Valide desafios
3. Celebre progressos (mesmo pequenos)
4. Sugira próximos passos adaptativos

Retorne JSON:
{
  "feedbackType": "${feedbackType}",
  "message": "string (feedback principal)",
  "specificObservations": ["obs1", "obs2"],
  "suggestedActions": ["action1", "action2"],
  "encouragement": "string",
  "adaptedTo": {
    "emotionalState": "${data.emotionalState}",
    "progressPhase": "string",
    "recentEvents": ["event1"]
  }
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('INSIGHTS_GENERATOR', [
            'Adapte tom e conteúdo ao estado emocional.',
            'Balance validação com encorajamento.',
            'Seja específico sobre observações.',
          ]),
        },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.BALANCED,
      max_tokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Error generating adaptive feedback:', error)
    throw error
  }
}
