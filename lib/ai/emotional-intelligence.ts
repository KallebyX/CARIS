/**
 * Advanced Emotional Intelligence Service
 *
 * Multi-modal emotion recognition and analysis:
 * - Text + Audio + Image analysis
 * - Emotion trajectory tracking
 * - Emotional pattern clustering
 * - Coping strategy suggestions
 * - Personalized meditation recommendations
 * - Emotional triggers identification
 */

import {
  openai,
  AI_MODELS,
  TEMPERATURE_SETTINGS,
  TOKEN_LIMITS,
  buildSystemPrompt,
} from './config'

export interface MultiModalEmotion {
  textEmotion: EmotionAnalysis
  audioEmotion?: AudioEmotionAnalysis
  imageEmotion?: ImageEmotionAnalysis
  combinedEmotion: {
    dominantEmotion: string
    emotionIntensity: number // 0-10
    confidence: number
    emotionSpectrum: Record<string, number>
    modalityConflicts: string[]
  }
}

export interface EmotionAnalysis {
  emotion: string
  intensity: number
  valence: number // -1 (negative) to 1 (positive)
  arousal: number // 0 (calm) to 1 (excited)
  plutchikWheel: {
    primary: string[]
    secondary: string[]
  }
}

export interface AudioEmotionAnalysis {
  voiceTone: 'calm' | 'anxious' | 'sad' | 'angry' | 'excited' | 'neutral'
  speechRate: 'slow' | 'normal' | 'fast'
  volume: 'quiet' | 'normal' | 'loud'
  emotionalMarkers: string[]
  stressLevel: number // 0-10
}

export interface ImageEmotionAnalysis {
  visualMood: string
  colorPsychology: {
    dominantColors: string[]
    emotionalImpact: string
  }
  symbolism: string[]
  environmentalContext: string
}

export interface EmotionTrajectory {
  startEmotion: string
  endEmotion: string
  journeyPoints: Array<{
    timestamp: string
    emotion: string
    intensity: number
  }>
  triggers: string[]
  pattern: 'escalating' | 'de-escalating' | 'cyclical' | 'stable' | 'erratic'
  interventionPoints: Array<{
    timestamp: string
    suggestion: string
  }>
}

export interface EmotionalPatternCluster {
  clusterId: string
  pattern: string
  frequency: number
  typicalTriggers: string[]
  emotionalSequence: string[]
  copingStrategiesUsed: string[]
  effectiveness: number // 0-10
  recommendations: string[]
}

export interface CopingStrategy {
  strategy: string
  type: 'immediate' | 'short_term' | 'long_term'
  difficulty: 'easy' | 'moderate' | 'challenging'
  effectiveness: number // 0-10 based on emotion
  steps: string[]
  whenToUse: string
  contraindications?: string[]
}

export interface MeditationRecommendation {
  meditationId: string
  title: string
  duration: number // minutes
  type: 'breathing' | 'body_scan' | 'visualization' | 'mindfulness' | 'loving_kindness'
  matchScore: number // 0-100
  rationale: string
  expectedBenefits: string[]
}

export interface EmotionalTrigger {
  trigger: string
  category: 'person' | 'place' | 'event' | 'thought' | 'physical' | 'time'
  frequency: number
  intensity: number // 0-10
  resultingEmotions: string[]
  copingStrategies: string[]
  avoidanceLevel: number // 0-10
}

/**
 * Analyze emotions from multiple modalities
 */
export async function analyzeMultiModalEmotion(data: {
  text: string
  audioTranscription?: string
  audioMetadata?: {
    tone: string
    pace: string
    volume: string
  }
  imageDescription?: string
}): Promise<MultiModalEmotion> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    // Analyze text emotion
    const textEmotion = await analyzeTextEmotion(data.text)

    // Analyze audio if available
    let audioEmotion: AudioEmotionAnalysis | undefined
    if (data.audioTranscription && data.audioMetadata) {
      audioEmotion = await analyzeAudioEmotion(data.audioTranscription, data.audioMetadata)
    }

    // Analyze image if available
    let imageEmotion: ImageEmotionAnalysis | undefined
    if (data.imageDescription) {
      imageEmotion = await analyzeImageEmotion(data.imageDescription)
    }

    // Combine all modalities
    const combinedEmotion = await combineEmotionalModalities({
      text: textEmotion,
      audio: audioEmotion,
      image: imageEmotion,
    })

    return {
      textEmotion,
      audioEmotion,
      imageEmotion,
      combinedEmotion,
    }
  } catch (error) {
    console.error('Error in multi-modal emotion analysis:', error)
    throw error
  }
}

async function analyzeTextEmotion(text: string): Promise<EmotionAnalysis> {
  const prompt = `Analise as emoções neste texto usando o modelo dimensional (valência e ativação) e Plutchik.

TEXTO: "${text}"

Retorne JSON:
{
  "emotion": "string",
  "intensity": number,
  "valence": number,
  "arousal": number,
  "plutchikWheel": {
    "primary": ["emotion1"],
    "secondary": ["emotion2"]
  }
}`

  const response = await openai!.chat.completions.create({
    model: AI_MODELS.STANDARD,
    messages: [
      { role: 'system', content: buildSystemPrompt('EMOTIONAL_ANALYST') },
      { role: 'user', content: prompt },
    ],
    temperature: TEMPERATURE_SETTINGS.FACTUAL,
    max_tokens: TOKEN_LIMITS.SHORT_RESPONSE,
  })

  return JSON.parse(response.choices[0]?.message?.content || '{}')
}

async function analyzeAudioEmotion(
  transcription: string,
  metadata: { tone: string; pace: string; volume: string }
): Promise<AudioEmotionAnalysis> {
  const prompt = `Analise a emoção do áudio baseado na transcrição e metadados.

TRANSCRIÇÃO: "${transcription}"
TOM: ${metadata.tone}
RITMO: ${metadata.pace}
VOLUME: ${metadata.volume}

Retorne JSON:
{
  "voiceTone": "calm|anxious|sad|angry|excited|neutral",
  "speechRate": "slow|normal|fast",
  "volume": "quiet|normal|loud",
  "emotionalMarkers": ["marker1"],
  "stressLevel": number
}`

  const response = await openai!.chat.completions.create({
    model: AI_MODELS.STANDARD,
    messages: [
      { role: 'system', content: buildSystemPrompt('EMOTIONAL_ANALYST') },
      { role: 'user', content: prompt },
    ],
    temperature: TEMPERATURE_SETTINGS.FACTUAL,
    max_tokens: TOKEN_LIMITS.SHORT_RESPONSE,
  })

  return JSON.parse(response.choices[0]?.message?.content || '{}')
}

async function analyzeImageEmotion(imageDescription: string): Promise<ImageEmotionAnalysis> {
  const prompt = `Analise a emoção transmitida por esta imagem.

DESCRIÇÃO: "${imageDescription}"

Considere psicologia das cores, simbolismo, contexto ambiental.

Retorne JSON:
{
  "visualMood": "string",
  "colorPsychology": {
    "dominantColors": ["color1"],
    "emotionalImpact": "string"
  },
  "symbolism": ["symbol1"],
  "environmentalContext": "string"
}`

  const response = await openai!.chat.completions.create({
    model: AI_MODELS.STANDARD,
    messages: [
      { role: 'system', content: buildSystemPrompt('EMOTIONAL_ANALYST') },
      { role: 'user', content: prompt },
    ],
    temperature: TEMPERATURE_SETTINGS.FACTUAL,
    max_tokens: TOKEN_LIMITS.SHORT_RESPONSE,
  })

  return JSON.parse(response.choices[0]?.message?.content || '{}')
}

async function combineEmotionalModalities(data: {
  text: EmotionAnalysis
  audio?: AudioEmotionAnalysis
  image?: ImageEmotionAnalysis
}): Promise<any> {
  const prompt = `Combine análises emocionais de diferentes modalidades em uma avaliação unificada.

TEXTO: ${JSON.stringify(data.text)}
ÁUDIO: ${JSON.stringify(data.audio || 'N/A')}
IMAGEM: ${JSON.stringify(data.image || 'N/A')}

Se houver conflitos entre modalidades, identifique-os e explique.

Retorne JSON:
{
  "dominantEmotion": "string",
  "emotionIntensity": number,
  "confidence": number,
  "emotionSpectrum": {},
  "modalityConflicts": ["conflict1"]
}`

  const response = await openai!.chat.completions.create({
    model: AI_MODELS.ADVANCED,
    messages: [
      { role: 'system', content: buildSystemPrompt('EMOTIONAL_ANALYST') },
      { role: 'user', content: prompt },
    ],
    temperature: TEMPERATURE_SETTINGS.FACTUAL,
    max_tokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
  })

  return JSON.parse(response.choices[0]?.message?.content || '{}')
}

/**
 * Track emotion trajectory over time
 */
export async function trackEmotionTrajectory(
  emotionSequence: Array<{ timestamp: string; emotion: string; intensity: number; context: string }>
): Promise<EmotionTrajectory> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    const sequenceStr = emotionSequence
      .map((e) => `${e.timestamp}: ${e.emotion} (${e.intensity}/10) - ${e.context}`)
      .join('\n')

    const prompt = `Analise a trajetória emocional ao longo do tempo.

SEQUÊNCIA EMOCIONAL:
${sequenceStr}

Identifique:
1. Padrão da trajetória (escalada, desescalada, cíclico, etc.)
2. Gatilhos identificados
3. Pontos críticos onde intervenção seria útil

Retorne JSON:
{
  "startEmotion": "string",
  "endEmotion": "string",
  "journeyPoints": [],
  "triggers": ["trigger1"],
  "pattern": "escalating|de-escalating|cyclical|stable|erratic",
  "interventionPoints": [{"timestamp": "string", "suggestion": "string"}]
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.ADVANCED,
      messages: [
        { role: 'system', content: buildSystemPrompt('EMOTIONAL_ANALYST') },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.BALANCED,
      max_tokens: TOKEN_LIMITS.COMPREHENSIVE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Error tracking emotion trajectory:', error)
    throw error
  }
}

/**
 * Suggest personalized coping strategies
 */
export async function suggestCopingStrategies(data: {
  currentEmotion: string
  intensity: number
  situation: string
  pastEffectiveStrategies?: string[]
}): Promise<CopingStrategy[]> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    const prompt = `Sugira estratégias de enfrentamento personalizadas.

EMOÇÃO ATUAL: ${data.currentEmotion} (intensidade: ${data.intensity}/10)
SITUAÇÃO: ${data.situation}
ESTRATÉGIAS EFETIVAS NO PASSADO: ${data.pastEffectiveStrategies?.join(', ') || 'Nenhuma registrada'}

Sugira 3-5 estratégias práticas, incluindo:
- Imediatas (pode fazer agora)
- Curto prazo (próximas horas)
- Longo prazo (desenvolvimento contínuo)

Retorne JSON array:
[{
  "strategy": "string",
  "type": "immediate|short_term|long_term",
  "difficulty": "easy|moderate|challenging",
  "effectiveness": number,
  "steps": ["step1"],
  "whenToUse": "string",
  "contraindications": ["contra1"]
}]`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('INSIGHTS_GENERATOR', [
            'Sugira estratégias baseadas em TCC, DBT e mindfulness.',
            'Considere a intensidade emocional e viabilidade prática.',
          ]),
        },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.BALANCED,
      max_tokens: TOKEN_LIMITS.COMPREHENSIVE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '[]')
  } catch (error) {
    console.error('Error suggesting coping strategies:', error)
    return []
  }
}

/**
 * Recommend personalized meditations
 */
export async function recommendMeditations(data: {
  currentEmotion: string
  intensity: number
  availableTime: number // minutes
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  preferences?: string[]
}): Promise<MeditationRecommendation[]> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    const prompt = `Recomende meditações personalizadas.

EMOÇÃO ATUAL: ${data.currentEmotion} (${data.intensity}/10)
TEMPO DISPONÍVEL: ${data.availableTime} minutos
NÍVEL: ${data.experienceLevel}
PREFERÊNCIAS: ${data.preferences?.join(', ') || 'Nenhuma especificada'}

Recomende 3-5 meditações adequadas, considerando:
- Estado emocional atual
- Tempo disponível
- Nível de experiência

Retorne JSON array:
[{
  "meditationId": "string",
  "title": "string",
  "duration": number,
  "type": "breathing|body_scan|visualization|mindfulness|loving_kindness",
  "matchScore": number,
  "rationale": "string",
  "expectedBenefits": ["benefit1"]
}]`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        { role: 'system', content: buildSystemPrompt('INSIGHTS_GENERATOR') },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.BALANCED,
      max_tokens: TOKEN_LIMITS.COMPREHENSIVE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '[]')
  } catch (error) {
    console.error('Error recommending meditations:', error)
    return []
  }
}

/**
 * Identify emotional triggers
 */
export async function identifyEmotionalTriggers(
  diaryEntries: Array<{
    date: string
    content: string
    emotionBefore: string
    emotionAfter: string
    intensity: number
  }>
): Promise<EmotionalTrigger[]> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    const entriesStr = diaryEntries
      .map((e) => `${e.date}: ${e.emotionBefore} → ${e.emotionAfter} (${e.intensity}/10)\n${e.content}`)
      .join('\n\n')

    const prompt = `Identifique gatilhos emocionais recorrentes nestas entradas de diário.

ENTRADAS:
${entriesStr}

Analise padrões e identifique:
1. Gatilhos recorrentes (pessoas, lugares, eventos, pensamentos)
2. Frequência e intensidade
3. Emoções resultantes
4. Padrões de enfrentamento observados

Retorne JSON array:
[{
  "trigger": "string",
  "category": "person|place|event|thought|physical|time",
  "frequency": number,
  "intensity": number,
  "resultingEmotions": ["emotion1"],
  "copingStrategies": ["strategy1"],
  "avoidanceLevel": number
}]`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.ADVANCED,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('EMOTIONAL_ANALYST', [
            'Identifique padrões sutis que o paciente pode não perceber.',
            'Seja específico e concreto nos gatilhos identificados.',
          ]),
        },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.BALANCED,
      max_tokens: TOKEN_LIMITS.COMPREHENSIVE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '[]')
  } catch (error) {
    console.error('Error identifying triggers:', error)
    return []
  }
}

/**
 * Cluster emotional patterns
 */
export async function clusterEmotionalPatterns(
  emotionalData: Array<{
    date: string
    emotions: string[]
    triggers: string[]
    copingUsed: string[]
    outcome: string
  }>
): Promise<EmotionalPatternCluster[]> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured')
    }

    const dataStr = emotionalData
      .map(
        (d) =>
          `${d.date}: ${d.emotions.join('→')} | Gatilho: ${d.triggers.join(', ')} | Coping: ${d.copingUsed.join(', ')} | Resultado: ${d.outcome}`
      )
      .join('\n')

    const prompt = `Identifique clusters de padrões emocionais recorrentes.

DADOS:
${dataStr}

Agrupe padrões similares e identifique:
1. Sequências emocionais típicas
2. Gatilhos comuns
3. Estratégias de coping usadas
4. Efetividade dos padrões

Retorne JSON array de clusters:
[{
  "clusterId": "string",
  "pattern": "string",
  "frequency": number,
  "typicalTriggers": ["trigger1"],
  "emotionalSequence": ["emotion1"],
  "copingStrategiesUsed": ["strategy1"],
  "effectiveness": number,
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
    console.error('Error clustering patterns:', error)
    return []
  }
}
