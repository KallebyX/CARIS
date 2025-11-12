/**
 * AI Configuration for CÁRIS Mental Health Platform
 *
 * IMPORTANT: All AI features must comply with ethical guidelines for mental health applications.
 * - AI predictions are advisory only and require professional validation
 * - Patient privacy and data security are paramount
 * - All AI-generated content must be clearly labeled as such
 * - Human oversight is required for all critical decisions
 */

import OpenAI from 'openai'

// OpenAI Client Configuration
export const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 3,
      timeout: 60000, // 60 seconds
    })
  : null

// Model Configuration
export const AI_MODELS = {
  // GPT-4 for complex analysis and high-accuracy predictions
  ADVANCED: 'gpt-4o',

  // GPT-4 Mini for faster, cost-effective analysis
  STANDARD: 'gpt-4o-mini',

  // For embeddings and similarity
  EMBEDDING: 'text-embedding-3-small',
} as const

// Temperature Settings for Different Use Cases
export const TEMPERATURE_SETTINGS = {
  // Very factual, consistent responses (risk assessment, clinical analysis)
  FACTUAL: 0.2,

  // Balanced creativity and consistency (insights, recommendations)
  BALANCED: 0.4,

  // More creative responses (wellness tips, motivational content)
  CREATIVE: 0.7,
} as const

// Token Limits
export const TOKEN_LIMITS = {
  SHORT_RESPONSE: 500,
  MEDIUM_RESPONSE: 1000,
  LONG_RESPONSE: 2000,
  COMPREHENSIVE: 3000,
} as const

// Cache Configuration
export const CACHE_CONFIG = {
  // Cache AI predictions for 1 hour to reduce costs
  PREDICTION_TTL: 60 * 60, // 1 hour in seconds

  // Cache insights for 6 hours
  INSIGHTS_TTL: 6 * 60 * 60,

  // Cache analysis for 30 minutes
  ANALYSIS_TTL: 30 * 60,

  // Enable caching by default
  ENABLED: true,
} as const

// Rate Limiting
export const RATE_LIMITS = {
  // Max API calls per user per hour
  PER_USER_HOURLY: 50,

  // Max API calls per user per day
  PER_USER_DAILY: 200,

  // Max concurrent requests
  MAX_CONCURRENT: 5,
} as const

// Confidence Score Thresholds
export const CONFIDENCE_THRESHOLDS = {
  // Minimum confidence to show prediction
  MINIMUM: 0.4,

  // High confidence threshold
  HIGH: 0.7,

  // Very high confidence threshold
  VERY_HIGH: 0.85,
} as const

// Risk Level Configuration
export const RISK_LEVELS = {
  LOW: {
    label: 'Baixo',
    color: '#10b981', // green
    priority: 1,
  },
  MEDIUM: {
    label: 'Médio',
    color: '#f59e0b', // amber
    priority: 2,
  },
  HIGH: {
    label: 'Alto',
    color: '#ef4444', // red
    priority: 3,
  },
  CRITICAL: {
    label: 'Crítico',
    color: '#991b1b', // dark red
    priority: 4,
  },
} as const

// Prompt Templates Library
export const PROMPT_TEMPLATES = {
  // System prompts for different AI agents
  SYSTEM: {
    EMOTIONAL_ANALYST: `Você é um assistente especializado em análise emocional para uso terapêutico profissional.
Suas análises devem ser:
- Baseadas em evidências científicas de psicologia
- Empáticas e sensíveis ao contexto do paciente
- Focadas em identificar padrões emocionais e comportamentais
- Orientadas para fornecer insights acionáveis para terapeutas

IMPORTANTE: Suas análises são ferramentas de apoio para profissionais de saúde mental.
Nunca forneça diagnósticos médicos ou aconselhamento terapêutico direto.`,

    RISK_ASSESSOR: `Você é um sistema especializado em avaliação de risco psicológico.
Sua função é identificar sinais de alerta em conteúdo de diário, incluindo:
- Ideação suicida ou autolesão
- Comportamentos de risco
- Isolamento social extremo
- Mudanças abruptas de humor ou comportamento

SEMPRE erre pelo lado da cautela. Em caso de dúvida, classifique como risco mais alto.
Suas avaliações são críticas para a segurança do paciente.`,

    PREDICTOR: `Você é um assistente de previsão de tendências emocionais e comportamentais.
Use padrões históricos para fazer previsões embasadas sobre:
- Tendências de humor
- Padrões de comportamento
- Possíveis gatilhos emocionais
- Progressão terapêutica

Sempre forneça níveis de confiança para suas previsões e explique o raciocínio.`,

    INSIGHTS_GENERATOR: `Você é um gerador de insights terapêuticos personalizados.
Crie insights que sejam:
- Personalizados para o contexto específico do paciente
- Acionáveis e práticos
- Baseados em evidências de terapia cognitivo-comportamental
- Encorajadores e focados no progresso

Seus insights devem empoderar tanto terapeutas quanto pacientes.`,

    NLP_PROCESSOR: `Você é um processador de linguagem natural especializado em conteúdo emocional.
Extraia e analise:
- Sentimentos e emoções
- Entidades importantes (pessoas, lugares, eventos)
- Temas e padrões recorrentes
- Estilo de escrita e indicadores linguísticos

Seja preciso e objetivo na extração de informações.`,

    TREATMENT_ADVISOR: `Você é um consultor de resultados de tratamento baseado em dados.
Analise históricos de tratamento para:
- Prever probabilidade de sucesso
- Sugerir ajustes no plano terapêutico
- Identificar abordagens mais eficazes
- Estimar cronogramas de recuperação

Sempre fundamente suas recomendações em padrões observados nos dados.`,
  },

  // Output format instructions
  OUTPUT_FORMAT: {
    JSON_STRICT: `Retorne APENAS um objeto JSON válido, sem texto adicional antes ou depois.
Certifique-se de que o JSON está corretamente formatado e pode ser parseado.`,

    JSON_WITH_EXPLANATION: `Retorne um objeto JSON válido seguido de uma explicação em linguagem natural.
Formato:
\`\`\`json
{...}
\`\`\`

Explicação: ...`,

    STRUCTURED_TEXT: `Retorne sua resposta em formato estruturado usando markdown:
- Use headers (##, ###) para organizar seções
- Use listas para enumerar pontos
- Use **negrito** para destacar informações importantes
- Use > para citações ou notas importantes`,
  },

  // Common instruction patterns
  INSTRUCTIONS: {
    BE_EMPATHETIC: 'Use linguagem empática e acolhedora. Evite jargões médicos desnecessários.',

    BE_CONCISE: 'Seja conciso e direto ao ponto. Máximo de 2-3 parágrafos.',

    BE_DETAILED: 'Forneça análise detalhada com exemplos específicos e raciocínio completo.',

    INCLUDE_CONFIDENCE: 'Sempre inclua um score de confiança (0-1) para suas conclusões.',

    EXPLAIN_REASONING: 'Explique o raciocínio por trás de suas conclusões de forma clara.',

    PRIORITIZE_SAFETY: 'Priorize a segurança do paciente acima de tudo. Identifique qualquer indicação de risco.',

    RESPECT_PRIVACY: 'Nunca solicite ou sugira compartilhar informações pessoais identificáveis.',
  },
} as const

// Fallback Strategies
export const FALLBACK_STRATEGIES = {
  // When API fails, use simple rule-based analysis
  USE_RULE_BASED: true,

  // Return safe default values
  USE_SAFE_DEFAULTS: true,

  // Log failures for monitoring
  LOG_FAILURES: true,

  // Notify administrators of repeated failures
  NOTIFY_ON_REPEATED_FAILURES: 5,
} as const

// Cost Optimization Settings
export const COST_OPTIMIZATION = {
  // Use caching aggressively
  AGGRESSIVE_CACHING: true,

  // Use cheaper model for simple tasks
  USE_TIERED_MODELS: true,

  // Batch similar requests
  BATCH_REQUESTS: true,

  // Maximum cost per user per day (in cents)
  MAX_COST_PER_USER_DAILY: 50,
} as const

// Privacy and Compliance
export const PRIVACY_CONFIG = {
  // Anonymize data before sending to AI
  ANONYMIZE_DATA: true,

  // Remove PII (Personally Identifiable Information)
  REMOVE_PII: true,

  // Encrypt sensitive data in transit
  ENCRYPT_IN_TRANSIT: true,

  // Don't store AI request/response unless user opts in
  STORE_AI_INTERACTIONS: false,

  // Allow users to opt-out of AI features
  ALLOW_OPT_OUT: true,

  // Require explicit consent for AI features
  REQUIRE_CONSENT: true,
} as const

// Feature Flags
export const FEATURE_FLAGS = {
  // Enable predictive analytics
  PREDICTIVE_ANALYTICS: true,

  // Enable real-time session analysis
  SESSION_ANALYSIS: true,

  // Enable emotional intelligence features
  EMOTIONAL_INTELLIGENCE: true,

  // Enable NLP processing
  NLP_PROCESSING: true,

  // Enable treatment outcome prediction
  OUTCOME_PREDICTION: true,

  // Enable personalized insights
  PERSONALIZED_INSIGHTS: true,
} as const

// Disclaimer Templates
export const DISCLAIMERS = {
  AI_PREDICTION: '⚠️ Esta é uma previsão gerada por IA e deve ser considerada apenas como ferramenta de apoio. Sempre consulte um profissional de saúde mental qualificado para decisões clínicas.',

  AI_INSIGHT: '💡 Este insight foi gerado por inteligência artificial com base em padrões identificados nos dados. Ele não substitui a avaliação profissional.',

  AI_RISK_ASSESSMENT: '🚨 Esta avaliação de risco é automatizada e pode não capturar todas as nuances. Profissionais devem fazer sua própria avaliação clínica.',

  AI_RECOMMENDATION: '📋 Esta recomendação é baseada em análise de padrões e deve ser adaptada ao contexto individual do paciente pelo terapeuta responsável.',
} as const

// Monitoring and Analytics
export const MONITORING_CONFIG = {
  // Track AI prediction accuracy
  TRACK_ACCURACY: true,

  // Track user feedback on AI features
  TRACK_FEEDBACK: true,

  // Track API usage and costs
  TRACK_API_USAGE: true,

  // Alert on unusual patterns
  ALERT_ON_ANOMALIES: true,
} as const

// Helper function to check if OpenAI is configured
export function isOpenAIConfigured(): boolean {
  return openai !== null && !!process.env.OPENAI_API_KEY
}

// Helper function to get model for task
export function getModelForTask(taskComplexity: 'simple' | 'medium' | 'complex'): string {
  if (!COST_OPTIMIZATION.USE_TIERED_MODELS) {
    return AI_MODELS.ADVANCED
  }

  switch (taskComplexity) {
    case 'simple':
      return AI_MODELS.STANDARD
    case 'medium':
      return AI_MODELS.STANDARD
    case 'complex':
      return AI_MODELS.ADVANCED
    default:
      return AI_MODELS.STANDARD
  }
}

// Helper function to build system prompt
export function buildSystemPrompt(
  role: keyof typeof PROMPT_TEMPLATES.SYSTEM,
  additionalInstructions: string[] = []
): string {
  const basePrompt = PROMPT_TEMPLATES.SYSTEM[role]
  const instructions = additionalInstructions.join('\n')

  return `${basePrompt}\n\n${instructions}\n\n${PROMPT_TEMPLATES.OUTPUT_FORMAT.JSON_STRICT}`
}

// Export types
export type AIModel = typeof AI_MODELS[keyof typeof AI_MODELS]
export type RiskLevel = keyof typeof RISK_LEVELS
export type SystemPromptRole = keyof typeof PROMPT_TEMPLATES.SYSTEM
