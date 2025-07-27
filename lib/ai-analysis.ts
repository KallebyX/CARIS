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
    }
  }
}