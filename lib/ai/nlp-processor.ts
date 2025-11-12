/**
 * NLP Processor for Mental Health Content
 *
 * Advanced text processing:
 * - Enhanced sentiment analysis
 * - Named entity recognition
 * - Key phrase extraction
 * - Text summarization
 * - Writing style analysis
 * - Therapeutic language detection
 */

import { openai, AI_MODELS, TEMPERATURE_SETTINGS, TOKEN_LIMITS, buildSystemPrompt } from './config'

export interface SentimentAnalysis {
  overallSentiment: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
  sentimentScore: number // -1 to 1
  confidence: number
  aspectSentiments: Record<string, number> // sentiment per topic
  sentimentShifts: Array<{ from: string; to: string; trigger?: string }>
}

export interface NamedEntities {
  people: string[]
  places: string[]
  events: string[]
  organizations: string[]
  temporalExpressions: string[]
  emotionalEvents: Array<{ entity: string; emotion: string }>
}

export interface KeyPhrases {
  phrases: Array<{ phrase: string; importance: number; category: string }>
  themes: string[]
  concerns: string[]
  strengths: string[]
}

export interface TextSummary {
  briefSummary: string // 1-2 sentences
  detailedSummary: string // 1 paragraph
  keyPoints: string[]
  emotionalArc: string
  clinicalNotes: string
}

export interface WritingStyle {
  complexity: 'simple' | 'moderate' | 'complex'
  emotionalExpressiveness: 'reserved' | 'moderate' | 'expressive'
  coherence: number // 0-10
  selfAwareness: number // 0-10
  insightLevel: 'low' | 'medium' | 'high'
  linguisticMarkers: {
    firstPersonUsage: number
    negativeLanguage: number
    absoluteThinking: number // all/nothing words
    tentativeLanguage: number
  }
}

export interface TherapeuticLanguage {
  therapeuticElements: string[]
  growthLanguage: string[]
  copingReferences: string[]
  insightStatements: string[]
  resistanceIndicators: string[]
  changeReadiness: 'precontemplation' | 'contemplation' | 'preparation' | 'action' | 'maintenance'
}

export async function analyzeSentimentEnhanced(text: string, context?: string): Promise<SentimentAnalysis> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const prompt = `Análise de sentimento avançada para conteúdo terapêutico.

TEXTO: "${text}"
${context ? `CONTEXTO: ${context}` : ''}

Analise:
1. Sentimento geral e score (-1 a 1)
2. Sentimento por aspecto/tópico mencionado
3. Mudanças de sentimento ao longo do texto

Retorne JSON:
{
  "overallSentiment": "very_negative|negative|neutral|positive|very_positive",
  "sentimentScore": number,
  "confidence": number,
  "aspectSentiments": {"aspect1": number},
  "sentimentShifts": [{"from": "string", "to": "string", "trigger": "string"}]
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        { role: 'system', content: buildSystemPrompt('NLP_PROCESSOR') },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.FACTUAL,
      max_tokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Error in sentiment analysis:', error)
    throw error
  }
}

export async function extractNamedEntities(text: string): Promise<NamedEntities> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const prompt = `Extraia entidades nomeadas deste texto de diário terapêutico.

TEXTO: "${text}"

Identifique:
- Pessoas (relaciones, amigos, familiares)
- Lugares significativos
- Eventos importantes
- Organizações/Instituições
- Expressões temporais
- Eventos emocionalmente carregados

Retorne JSON:
{
  "people": ["person1"],
  "places": ["place1"],
  "events": ["event1"],
  "organizations": ["org1"],
  "temporalExpressions": ["tempo1"],
  "emotionalEvents": [{"entity": "string", "emotion": "string"}]
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        { role: 'system', content: buildSystemPrompt('NLP_PROCESSOR') },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.FACTUAL,
      max_tokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Error extracting entities:', error)
    return { people: [], places: [], events: [], organizations: [], temporalExpressions: [], emotionalEvents: [] }
  }
}

export async function extractKeyPhrases(text: string): Promise<KeyPhrases> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const prompt = `Extraia frases-chave e temas deste texto.

TEXTO: "${text}"

Identifique:
1. Frases mais importantes (com score de importância)
2. Temas centrais
3. Preocupações expressas
4. Forças/recursos mencionados

Retorne JSON:
{
  "phrases": [{"phrase": "string", "importance": number, "category": "string"}],
  "themes": ["theme1"],
  "concerns": ["concern1"],
  "strengths": ["strength1"]
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        { role: 'system', content: buildSystemPrompt('NLP_PROCESSOR') },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.FACTUAL,
      max_tokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Error extracting key phrases:', error)
    return { phrases: [], themes: [], concerns: [], strengths: [] }
  }
}

export async function summarizeDiaryEntry(text: string, detailLevel: 'brief' | 'detailed' = 'detailed'): Promise<TextSummary> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const prompt = `Resuma esta entrada de diário para uso clínico.

TEXTO: "${text}"

Crie:
1. Resumo breve (1-2 frases)
2. Resumo detalhado (1 parágrafo)
3. Pontos-chave
4. Arco emocional da entrada
5. Notas clínicas relevantes

Retorne JSON:
{
  "briefSummary": "string",
  "detailedSummary": "string",
  "keyPoints": ["point1"],
  "emotionalArc": "string",
  "clinicalNotes": "string"
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('NLP_PROCESSOR', [
            'Mantenha fidelidade ao conteúdo original.',
            'Preserve informações clinicamente relevantes.',
          ]),
        },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.BALANCED,
      max_tokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Error summarizing text:', error)
    return {
      briefSummary: 'Resumo não disponível',
      detailedSummary: text.substring(0, 200),
      keyPoints: [],
      emotionalArc: 'Não analisado',
      clinicalNotes: '',
    }
  }
}

export async function analyzeWritingStyle(texts: string[]): Promise<WritingStyle> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const combinedText = texts.join('\n\n')

    const prompt = `Analise o estilo de escrita destas entradas de diário.

TEXTOS: "${combinedText.substring(0, 2000)}"

Avalie:
1. Complexidade linguística
2. Expressividade emocional
3. Coerência e estrutura
4. Auto-consciência
5. Nível de insight
6. Marcadores linguísticos específicos

Retorne JSON:
{
  "complexity": "simple|moderate|complex",
  "emotionalExpressiveness": "reserved|moderate|expressive",
  "coherence": number,
  "selfAwareness": number,
  "insightLevel": "low|medium|high",
  "linguisticMarkers": {
    "firstPersonUsage": number,
    "negativeLanguage": number,
    "absoluteThinking": number,
    "tentativeLanguage": number
  }
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.ADVANCED,
      messages: [
        { role: 'system', content: buildSystemPrompt('NLP_PROCESSOR') },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.FACTUAL,
      max_tokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Error analyzing writing style:', error)
    return {
      complexity: 'moderate',
      emotionalExpressiveness: 'moderate',
      coherence: 5,
      selfAwareness: 5,
      insightLevel: 'medium',
      linguisticMarkers: {
        firstPersonUsage: 0,
        negativeLanguage: 0,
        absoluteThinking: 0,
        tentativeLanguage: 0,
      },
    }
  }
}

export async function detectTherapeuticLanguage(text: string): Promise<TherapeuticLanguage> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const prompt = `Identifique linguagem terapêutica e indicadores de mudança.

TEXTO: "${text}"

Detecte:
1. Elementos terapêuticos (reflexão, aceitação, etc.)
2. Linguagem de crescimento/mudança
3. Referências a estratégias de coping
4. Declarações de insight
5. Indicadores de resistência
6. Estágio de prontidão para mudança (modelo transteórico)

Retorne JSON:
{
  "therapeuticElements": ["element1"],
  "growthLanguage": ["growth1"],
  "copingReferences": ["coping1"],
  "insightStatements": ["insight1"],
  "resistanceIndicators": ["resistance1"],
  "changeReadiness": "precontemplation|contemplation|preparation|action|maintenance"
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.ADVANCED,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('NLP_PROCESSOR', [
            'Use o Modelo Transteórico de Mudança (Prochaska & DiClemente).',
            'Identifique sinais sutis de progresso terapêutico.',
          ]),
        },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.BALANCED,
      max_tokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Error detecting therapeutic language:', error)
    return {
      therapeuticElements: [],
      growthLanguage: [],
      copingReferences: [],
      insightStatements: [],
      resistanceIndicators: [],
      changeReadiness: 'contemplation',
    }
  }
}

export async function batchProcessTexts(
  texts: string[]
): Promise<{
  sentiments: SentimentAnalysis[]
  entities: NamedEntities[]
  keyPhrases: KeyPhrases[]
  summaries: TextSummary[]
}> {
  const results = await Promise.allSettled([
    Promise.all(texts.map((t) => analyzeSentimentEnhanced(t))),
    Promise.all(texts.map((t) => extractNamedEntities(t))),
    Promise.all(texts.map((t) => extractKeyPhrases(t))),
    Promise.all(texts.map((t) => summarizeDiaryEntry(t))),
  ])

  return {
    sentiments: results[0].status === 'fulfilled' ? results[0].value : [],
    entities: results[1].status === 'fulfilled' ? results[1].value : [],
    keyPhrases: results[2].status === 'fulfilled' ? results[2].value : [],
    summaries: results[3].status === 'fulfilled' ? results[3].value : [],
  }
}
