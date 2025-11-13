/**
 * Real-Time Session Analysis Service
 *
 * Provides live analysis during therapy sessions:
 * - Sentiment analysis from chat messages
 * - Emotion detection
 * - Topic extraction
 * - Intervention recommendations
 * - Crisis detection
 * - Therapeutic alliance scoring
 */

import {
  openai,
  AI_MODELS,
  TEMPERATURE_SETTINGS,
  TOKEN_LIMITS,
  buildSystemPrompt,
  DISCLAIMERS,
} from './config'

export interface SentimentAnalysis {
  sentiment: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
  sentimentScore: number // -1 to 1
  confidence: number
  emotionalTone: string
  urgency: 'none' | 'low' | 'medium' | 'high' | 'critical'
}

export interface EmotionDetection {
  primaryEmotion: string
  secondaryEmotions: string[]
  emotionIntensity: number // 0-10
  emotionMix: Record<string, number> // Plutchik emotions
  emotionalShift?: {
    from: string
    to: string
    significance: 'minor' | 'moderate' | 'major'
  }
}

export interface TopicExtraction {
  mainTopics: string[]
  subTopics: string[]
  concerns: string[]
  positiveAspects: string[]
  actionItems: string[]
  recurring: boolean
}

export interface InterventionRecommendation {
  type: 'validation' | 'exploration' | 'coping_strategy' | 'reframing' | 'grounding' | 'safety_check'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  suggestion: string
  rationale: string
  timing: 'immediate' | 'soon' | 'later_in_session' | 'next_session'
}

export interface CrisisIndicators {
  crisisDetected: boolean
  crisisLevel: 'none' | 'mild' | 'moderate' | 'severe' | 'emergency'
  indicators: string[]
  immediateActions: string[]
  followUpRequired: boolean
}

export interface TherapeuticAlliance {
  allianceScore: number // 0-100
  rapport: 'poor' | 'developing' | 'good' | 'strong' | 'excellent'
  collaborationLevel: number // 0-10
  trustIndicators: string[]
  concerningSignals: string[]
  recommendations: string[]
}

export interface LiveSessionAnalysis {
  sentiment: SentimentAnalysis
  emotions: EmotionDetection
  topics: TopicExtraction
  interventions: InterventionRecommendation[]
  crisis: CrisisIndicators
  alliance: TherapeuticAlliance
  sessionQuality: {
    score: number // 0-100
    strengths: string[]
    areasForImprovement: string[]
  }
  timestamp: string
}

/**
 * Analyze sentiment from chat message in real-time
 */
export async function analyzeChatSentiment(message: string, context?: string[]): Promise<SentimentAnalysis> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    const conversationContext = context?.slice(-5).join('\n') || 'Sem contexto anterior'

    const prompt = `Analise o sentimento desta mensagem de chat em sessão terapêutica.

CONTEXTO DA CONVERSA:
${conversationContext}

MENSAGEM ATUAL:
"${message}"

Analise:
1. Sentimento geral (very_negative a very_positive)
2. Score de sentimento (-1 a 1)
3. Tom emocional dominante
4. Nível de urgência (se requer atenção imediata)

Retorne JSON:
{
  "sentiment": "very_negative|negative|neutral|positive|very_positive",
  "sentimentScore": number,
  "confidence": number,
  "emotionalTone": "string",
  "urgency": "none|low|medium|high|critical"
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('EMOTIONAL_ANALYST', [
            'Análise rápida e precisa para uso em tempo real.',
            'Identifique urgência - segurança é prioridade.',
          ]),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: TEMPERATURE_SETTINGS.FACTUAL,
      max_tokens: TOKEN_LIMITS.SHORT_RESPONSE,
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    return JSON.parse(aiResponse)
  } catch (error) {
    console.error('Error analyzing chat sentiment:', error)

    // Fallback: Basic sentiment detection
    const negativePhrases = ['triste', 'ansioso', 'deprimido', 'sozinho', 'desesperado', 'mal']
    const positivePhrases = ['feliz', 'bem', 'melhor', 'esperança', 'grato', 'alegre']

    const lowerMessage = message.toLowerCase()
    const negativeCount = negativePhrases.filter(phrase => lowerMessage.includes(phrase)).length
    const positiveCount = positivePhrases.filter(phrase => lowerMessage.includes(phrase)).length

    const score = (positiveCount - negativeCount) / 10

    return {
      sentiment: score > 0.3 ? 'positive' : score < -0.3 ? 'negative' : 'neutral',
      sentimentScore: score,
      confidence: 0.4,
      emotionalTone: 'análise básica',
      urgency: 'none',
    }
  }
}

/**
 * Detect emotions from session messages
 */
export async function detectEmotions(messages: string[], previousEmotions?: string[]): Promise<EmotionDetection> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    const combinedMessages = messages.slice(-3).join('\n')

    const prompt = `Identifique as emoções expressas nestas mensagens recentes de sessão.

MENSAGENS:
${combinedMessages}

EMOÇÕES ANTERIORES:
${previousEmotions?.join(', ') || 'Nenhuma detectada anteriormente'}

Use o modelo de emoções de Plutchik:
- Primárias: alegria, tristeza, raiva, medo, surpresa, aversão, confiança, expectativa
- Considere intensidade e combinações

Retorne JSON:
{
  "primaryEmotion": "string",
  "secondaryEmotions": ["string"],
  "emotionIntensity": number,
  "emotionMix": {
    "alegria": number,
    "tristeza": number,
    "raiva": number,
    "medo": number,
    "surpresa": number,
    "aversão": number,
    "confiança": number,
    "expectativa": number
  },
  "emotionalShift": {
    "from": "string",
    "to": "string",
    "significance": "minor|moderate|major"
  }
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('EMOTIONAL_ANALYST'),
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
    console.error('Error detecting emotions:', error)

    return {
      primaryEmotion: 'neutro',
      secondaryEmotions: [],
      emotionIntensity: 5,
      emotionMix: {
        alegria: 0,
        tristeza: 0,
        raiva: 0,
        medo: 0,
        surpresa: 0,
        aversão: 0,
        confiança: 0,
        expectativa: 0,
      },
    }
  }
}

/**
 * Extract topics and themes from session notes
 */
export async function extractTopics(sessionContent: string, previousTopics?: string[]): Promise<TopicExtraction> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    const prompt = `Extraia tópicos e temas desta sessão terapêutica.

CONTEÚDO DA SESSÃO:
${sessionContent}

TÓPICOS DE SESSÕES ANTERIORES:
${previousTopics?.join(', ') || 'Primeira sessão ou sem histórico'}

Identifique:
1. Tópicos principais discutidos
2. Sub-tópicos relacionados
3. Preocupações específicas mencionadas
4. Aspectos positivos/progressos
5. Itens de ação acordados
6. Se são temas recorrentes

Retorne JSON:
{
  "mainTopics": ["topic1", "topic2"],
  "subTopics": ["subtopic1", "subtopic2"],
  "concerns": ["concern1", "concern2"],
  "positiveAspects": ["positive1", "positive2"],
  "actionItems": ["action1", "action2"],
  "recurring": boolean
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('NLP_PROCESSOR'),
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
    console.error('Error extracting topics:', error)

    return {
      mainTopics: ['Tópico geral'],
      subTopics: [],
      concerns: [],
      positiveAspects: [],
      actionItems: [],
      recurring: false,
    }
  }
}

/**
 * Generate intervention recommendations
 */
export async function recommendInterventions(data: {
  currentSentiment: string
  emotions: string[]
  topics: string[]
  sessionPhase: 'opening' | 'middle' | 'closing'
  patientResponsiveness: 'high' | 'medium' | 'low'
}): Promise<InterventionRecommendation[]> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    const prompt = `Sugira intervenções terapêuticas adequadas para este momento da sessão.

CONTEXTO ATUAL:
- Sentimento: ${data.currentSentiment}
- Emoções detectadas: ${data.emotions.join(', ')}
- Tópicos: ${data.topics.join(', ')}
- Fase da sessão: ${data.sessionPhase}
- Responsividade do paciente: ${data.patientResponsiveness}

Sugira 2-4 intervenções apropriadas considerando:
- Fase da sessão
- Estado emocional atual
- Responsividade do paciente

Tipos de intervenção: validation, exploration, coping_strategy, reframing, grounding, safety_check

Retorne JSON array:
[
  {
    "type": "validation|exploration|coping_strategy|reframing|grounding|safety_check",
    "priority": "low|medium|high|urgent",
    "suggestion": "Descrição detalhada da intervenção",
    "rationale": "Por que esta intervenção é apropriada agora",
    "timing": "immediate|soon|later_in_session|next_session"
  }
]`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('TREATMENT_ADVISOR', [
            'Sugira intervenções baseadas em TCC e abordagens humanistas.',
            'Considere o timing e a prontidão do paciente.',
          ]),
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
    console.error('Error recommending interventions:', error)

    return [
      {
        type: 'validation',
        priority: 'medium',
        suggestion: 'Validar os sentimentos expressos pelo paciente',
        rationale: 'Sugestão padrão',
        timing: 'soon',
      },
    ]
  }
}

/**
 * Detect crisis indicators in real-time
 */
export async function detectCrisis(messages: string[], historicalRisk?: string): Promise<CrisisIndicators> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    const combinedMessages = messages.join('\n')

    const prompt = `AVALIAÇÃO DE CRISE - PRIORIDADE MÁXIMA

Analise estas mensagens para sinais de crise imediata:

${combinedMessages}

Histórico de risco: ${historicalRisk || 'Sem histórico disponível'}

INDICADORES DE CRISE:
- Ideação suicida ou autolesão
- Planos específicos de autolesão
- Desespero extremo ou desesperança
- Risco iminente de comportamento perigoso
- Crises de pânico severas
- Perda de contato com a realidade

Retorne JSON:
{
  "crisisDetected": boolean,
  "crisisLevel": "none|mild|moderate|severe|emergency",
  "indicators": ["indicator1", "indicator2"],
  "immediateActions": ["action1", "action2"],
  "followUpRequired": boolean
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.ADVANCED, // Use best model for crisis detection
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('RISK_ASSESSOR', [
            'MÁXIMA PRIORIDADE: Detectar risco de vida.',
            'Erre pelo lado da cautela - qualquer dúvida = alerta.',
            'Seja específico nos indicadores identificados.',
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
    console.error('Error detecting crisis:', error)

    // In case of error, be conservative
    return {
      crisisDetected: false,
      crisisLevel: 'none',
      indicators: ['Análise automática não disponível - avaliação manual recomendada'],
      immediateActions: [],
      followUpRequired: true,
    }
  }
}

/**
 * Score therapeutic alliance
 */
export async function scoreTherapeuticAlliance(data: {
  sessionTranscript: string
  patientEngagement: number // 0-10
  sessionCount: number
  previousAllianceScore?: number
}): Promise<TherapeuticAlliance> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    const prompt = `Avalie a aliança terapêutica baseada nesta interação.

TRANSCRIÇÃO DA SESSÃO (últimos minutos):
${data.sessionTranscript.slice(-2000)}

CONTEXTO:
- Engajamento observado: ${data.patientEngagement}/10
- Número de sessões: ${data.sessionCount}
- Score de aliança anterior: ${data.previousAllianceScore || 'Primeira avaliação'}

Avalie a aliança terapêutica considerando:
1. Rapport e conexão emocional
2. Colaboração em objetivos
3. Confiança e abertura
4. Acordo nas tarefas terapêuticas

Retorne JSON:
{
  "allianceScore": number,
  "rapport": "poor|developing|good|strong|excellent",
  "collaborationLevel": number,
  "trustIndicators": ["indicator1", "indicator2"],
  "concerningSignals": ["signal1", "signal2"],
  "recommendations": ["rec1", "rec2"]
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('EMOTIONAL_ANALYST', [
            'A aliança terapêutica é crucial para o sucesso do tratamento.',
            'Identifique sinais sutis de ruptura ou fortalecimento.',
          ]),
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
    console.error('Error scoring therapeutic alliance:', error)

    return {
      allianceScore: 50,
      rapport: 'developing',
      collaborationLevel: 5,
      trustIndicators: ['Em avaliação'],
      concerningSignals: [],
      recommendations: ['Continuar construindo rapport'],
    }
  }
}

/**
 * Comprehensive live session analysis
 */
export async function analyzeLiveSession(data: {
  recentMessages: string[]
  sessionPhase: 'opening' | 'middle' | 'closing'
  patientEngagement: number
  sessionCount: number
  historicalContext?: {
    topics: string[]
    emotions: string[]
    riskLevel: string
  }
}): Promise<LiveSessionAnalysis> {
  try {
    // Run analyses in parallel for speed
    const [sentiment, emotions, topics, crisis] = await Promise.all([
      analyzeChatSentiment(data.recentMessages[data.recentMessages.length - 1], data.recentMessages.slice(-5)),
      detectEmotions(data.recentMessages, data.historicalContext?.emotions),
      extractTopics(data.recentMessages.join('\n'), data.historicalContext?.topics),
      detectCrisis(data.recentMessages, data.historicalContext?.riskLevel),
    ])

    // Get interventions based on analysis
    const interventions = await recommendInterventions({
      currentSentiment: sentiment.sentiment,
      emotions: [emotions.primaryEmotion, ...emotions.secondaryEmotions],
      topics: topics.mainTopics,
      sessionPhase: data.sessionPhase,
      patientResponsiveness: data.patientEngagement > 7 ? 'high' : data.patientEngagement > 4 ? 'medium' : 'low',
    })

    // Score alliance
    const alliance = await scoreTherapeuticAlliance({
      sessionTranscript: data.recentMessages.join('\n'),
      patientEngagement: data.patientEngagement,
      sessionCount: data.sessionCount,
    })

    // Calculate session quality
    const qualityScore = calculateSessionQuality({
      sentiment,
      emotions,
      alliance,
      engagement: data.patientEngagement,
    })

    return {
      sentiment,
      emotions,
      topics,
      interventions,
      crisis,
      alliance,
      sessionQuality: qualityScore,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Error in live session analysis:', error)
    throw error
  }
}

// Helper function to calculate session quality
function calculateSessionQuality(data: {
  sentiment: SentimentAnalysis
  emotions: EmotionDetection
  alliance: TherapeuticAlliance
  engagement: number
}): {
  score: number
  strengths: string[]
  areasForImprovement: string[]
} {
  let score = 50 // baseline

  // Sentiment contribution
  if (data.sentiment.sentiment === 'positive' || data.sentiment.sentiment === 'very_positive') {
    score += 15
  } else if (data.sentiment.sentiment === 'negative' || data.sentiment.sentiment === 'very_negative') {
    score -= 10
  }

  // Alliance contribution
  score += (data.alliance.allianceScore / 100) * 30

  // Engagement contribution
  score += (data.engagement / 10) * 20

  // Emotion processing (deeper emotions = therapeutic work)
  if (data.emotions.emotionIntensity > 6) {
    score += 10 // Deep emotional work happening
  }

  score = Math.max(0, Math.min(100, score))

  const strengths: string[] = []
  const areasForImprovement: string[] = []

  if (data.alliance.allianceScore > 70) {
    strengths.push('Forte aliança terapêutica')
  } else if (data.alliance.allianceScore < 50) {
    areasForImprovement.push('Fortalecer aliança terapêutica')
  }

  if (data.engagement > 7) {
    strengths.push('Alto engajamento do paciente')
  } else if (data.engagement < 4) {
    areasForImprovement.push('Aumentar engajamento')
  }

  if (data.emotions.emotionIntensity > 5) {
    strengths.push('Trabalho emocional profundo')
  }

  return {
    score: Math.round(score),
    strengths,
    areasForImprovement,
  }
}
