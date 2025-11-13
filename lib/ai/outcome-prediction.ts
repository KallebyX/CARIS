/**
 * Treatment Outcome Prediction Service
 *
 * Predicts and analyzes:
 * - Treatment success probability
 * - Optimal session frequency
 * - Relapse risk
 * - Recovery timeline
 * - Treatment plan effectiveness
 * - Alternative approach suggestions
 */

import { openai, AI_MODELS, TEMPERATURE_SETTINGS, TOKEN_LIMITS, buildSystemPrompt, DISCLAIMERS } from './config'

export interface TreatmentOutcomePrediction {
  successProbability: number // 0-100%
  confidence: number
  timeframe: string
  keySuccessFactors: string[]
  riskFactors: string[]
  recommendations: string[]
  disclaimer: string
}

export interface SessionFrequencyRecommendation {
  recommendedFrequency: 'weekly' | 'biweekly' | 'monthly' | 'as_needed'
  sessionsPerMonth: number
  rationale: string
  expectedDuration: string
  adjustmentTriggers: string[]
}

export interface RelapseRiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'very_high'
  riskScore: number // 0-100
  protectiveFactors: string[]
  vulnerabilityFactors: string[]
  earlyWarningSign: string[]
  preventionStrategies: string[]
  monitoringRecommendations: string[]
}

export interface RecoveryTimeline {
  estimatedDuration: string
  milestones: Array<{
    phase: string
    timeframe: string
    goals: string[]
    indicators: string[]
  }>
  factors: {
    accelerating: string[]
    delaying: string[]
  }
  confidence: number
}

export interface TreatmentEffectiveness {
  effectivenessScore: number // 0-100
  strengths: string[]
  weaknesses: string[]
  patientResponse: 'excellent' | 'good' | 'fair' | 'poor'
  recommendedAdjustments: string[]
  continueOrModify: 'continue' | 'minor_adjustments' | 'major_revision' | 'alternative_approach'
}

export interface AlternativeApproaches {
  currentApproach: string
  alternatives: Array<{
    approach: string
    matchScore: number
    rationale: string
    expectedBenefits: string[]
    considerations: string[]
  }>
}

export async function predictTreatmentSuccess(data: {
  diagnosis?: string
  treatmentDuration: number // weeks
  sessionAttendance: number // 0-1
  homeworkCompletion: number // 0-1
  symptomReduction: number // 0-100%
  therapeuticAlliance: number // 0-10
  supportSystem: 'strong' | 'moderate' | 'weak'
  previousTreatments?: Array<{ type: string; outcome: string }>
  currentSymptoms: string[]
}): Promise<TreatmentOutcomePrediction> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const prompt = `Preveja a probabilidade de sucesso do tratamento baseado nos dados.

DADOS DO PACIENTE:
- Diagnóstico: ${data.diagnosis || 'Não especificado'}
- Duração do tratamento: ${data.treatmentDuration} semanas
- Comparecimento às sessões: ${(data.sessionAttendance * 100).toFixed(0)}%
- Conclusão de tarefas: ${(data.homeworkCompletion * 100).toFixed(0)}%
- Redução de sintomas: ${data.symptomReduction}%
- Aliança terapêutica: ${data.therapeuticAlliance}/10
- Sistema de suporte: ${data.supportSystem}
- Tratamentos anteriores: ${JSON.stringify(data.previousTreatments || [])}
- Sintomas atuais: ${data.currentSymptoms.join(', ')}

Preveja:
1. Probabilidade de sucesso (0-100%)
2. Fatores-chave de sucesso
3. Fatores de risco
4. Recomendações para otimizar resultado

Retorne JSON:
{
  "successProbability": number,
  "confidence": number,
  "timeframe": "string",
  "keySuccessFactors": ["factor1"],
  "riskFactors": ["risk1"],
  "recommendations": ["rec1"]
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.ADVANCED,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('TREATMENT_ADVISOR', [
            'Base previsões em evidências de pesquisa em psicoterapia.',
            'Considere a aliança terapêutica como preditor crucial.',
          ]),
        },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.FACTUAL,
      max_tokens: TOKEN_LIMITS.COMPREHENSIVE,
    })

    const result = JSON.parse(response.choices[0]?.message?.content || '{}')
    return { ...result, disclaimer: DISCLAIMERS.AI_PREDICTION }
  } catch (error) {
    console.error('Error predicting treatment success:', error)
    throw error
  }
}

export async function recommendSessionFrequency(data: {
  currentPhase: 'initial' | 'middle' | 'maintenance'
  symptomSeverity: number // 0-10
  progressRate: 'rapid' | 'steady' | 'slow' | 'plateaued'
  patientAvailability: string
  financialConstraints: boolean
}): Promise<SessionFrequencyRecommendation> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const prompt = `Recomende frequência ideal de sessões.

CONTEXTO:
- Fase do tratamento: ${data.currentPhase}
- Severidade de sintomas: ${data.symptomSeverity}/10
- Taxa de progresso: ${data.progressRate}
- Disponibilidade: ${data.patientAvailability}
- Restrições financeiras: ${data.financialConstraints ? 'Sim' : 'Não'}

Recomende frequência otimizada considerando eficácia clínica e viabilidade prática.

Retorne JSON:
{
  "recommendedFrequency": "weekly|biweekly|monthly|as_needed",
  "sessionsPerMonth": number,
  "rationale": "string",
  "expectedDuration": "string",
  "adjustmentTriggers": ["trigger1"]
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.STANDARD,
      messages: [
        { role: 'system', content: buildSystemPrompt('TREATMENT_ADVISOR') },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.BALANCED,
      max_tokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Error recommending session frequency:', error)
    throw error
  }
}

export async function assessRelapseRisk(data: {
  recoveryDuration: number // months
  symptomHistory: Array<{ date: string; severity: number }>
  stressors: string[]
  copingSkills: number // 0-10
  supportSystem: number // 0-10
  medicationAdherence?: number // 0-100%
  previousRelapses: number
}): Promise<RelapseRiskAssessment> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const recentSymptoms = data.symptomHistory.slice(-10).map((s) => `${s.date}: ${s.severity}/10`).join(', ')

    const prompt = `Avalie risco de recaída.

HISTÓRICO:
- Tempo em recuperação: ${data.recoveryDuration} meses
- Sintomas recentes: ${recentSymptoms}
- Estressores atuais: ${data.stressors.join(', ')}
- Habilidades de coping: ${data.copingSkills}/10
- Sistema de suporte: ${data.supportSystem}/10
- Aderência à medicação: ${data.medicationAdherence || 'N/A'}%
- Recaídas anteriores: ${data.previousRelapses}

Avalie risco de recaída e estratégias preventivas.

Retorne JSON:
{
  "riskLevel": "low|medium|high|very_high",
  "riskScore": number,
  "protectiveFactors": ["factor1"],
  "vulnerabilityFactors": ["factor1"],
  "earlyWarningSign": ["sign1"],
  "preventionStrategies": ["strategy1"],
  "monitoringRecommendations": ["rec1"]
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.ADVANCED,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('RISK_ASSESSOR', [
            'Use evidências sobre prevenção de recaída.',
            'Identifique sinais precoces de alerta.',
          ]),
        },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.FACTUAL,
      max_tokens: TOKEN_LIMITS.COMPREHENSIVE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Error assessing relapse risk:', error)
    throw error
  }
}

export async function estimateRecoveryTimeline(data: {
  diagnosis: string
  treatmentType: string
  currentProgress: number // 0-100%
  weeksSinceStart: number
  patientFactors: {
    motivation: number // 0-10
    severity: number // 0-10
    chronicity: number // years
    comorbidities: string[]
  }
}): Promise<RecoveryTimeline> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const prompt = `Estime linha do tempo de recuperação.

INFORMAÇÕES:
- Diagnóstico: ${data.diagnosis}
- Tipo de tratamento: ${data.treatmentType}
- Progresso atual: ${data.currentProgress}%
- Semanas desde início: ${data.weeksSinceStart}
- Motivação: ${data.patientFactors.motivation}/10
- Severidade: ${data.patientFactors.severity}/10
- Cronicidade: ${data.patientFactors.chronicity} anos
- Comorbidades: ${data.patientFactors.comorbidities.join(', ')}

Estime duração total e marcos do tratamento.

Retorne JSON:
{
  "estimatedDuration": "string",
  "milestones": [{
    "phase": "string",
    "timeframe": "string",
    "goals": ["goal1"],
    "indicators": ["indicator1"]
  }],
  "factors": {
    "accelerating": ["factor1"],
    "delaying": ["factor1"]
  },
  "confidence": number
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.ADVANCED,
      messages: [
        { role: 'system', content: buildSystemPrompt('PREDICTOR') },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.BALANCED,
      max_tokens: TOKEN_LIMITS.COMPREHENSIVE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Error estimating recovery timeline:', error)
    throw error
  }
}

export async function evaluateTreatmentEffectiveness(data: {
  treatmentPlan: string
  duration: number // weeks
  outcomeMetrics: {
    symptomReduction: number // 0-100%
    functioningImprovement: number // 0-100%
    satisfactionScore: number // 0-10
  }
  adherenceRate: number // 0-100%
  sideEffects?: string[]
}): Promise<TreatmentEffectiveness> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const prompt = `Avalie efetividade do plano de tratamento.

PLANO: ${data.treatmentPlan}
DURAÇÃO: ${data.duration} semanas

RESULTADOS:
- Redução de sintomas: ${data.outcomeMetrics.symptomReduction}%
- Melhora funcional: ${data.outcomeMetrics.functioningImprovement}%
- Satisfação: ${data.outcomeMetrics.satisfactionScore}/10
- Taxa de aderência: ${data.adherenceRate}%
- Efeitos colaterais: ${data.sideEffects?.join(', ') || 'Nenhum'}

Avalie efetividade e recomende ajustes se necessário.

Retorne JSON:
{
  "effectivenessScore": number,
  "strengths": ["strength1"],
  "weaknesses": ["weakness1"],
  "patientResponse": "excellent|good|fair|poor",
  "recommendedAdjustments": ["adj1"],
  "continueOrModify": "continue|minor_adjustments|major_revision|alternative_approach"
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.ADVANCED,
      messages: [
        { role: 'system', content: buildSystemPrompt('TREATMENT_ADVISOR') },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.BALANCED,
      max_tokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Error evaluating treatment effectiveness:', error)
    throw error
  }
}

export async function suggestAlternativeApproaches(data: {
  currentApproach: string
  treatmentResponse: 'poor' | 'partial' | 'good'
  patientPreferences: string[]
  contraindications: string[]
  availableResources: string[]
}): Promise<AlternativeApproaches> {
  try {
    if (!openai) throw new Error('OpenAI not configured')

    const prompt = `Sugira abordagens alternativas de tratamento.

ABORDAGEM ATUAL: ${data.currentApproach}
RESPOSTA AO TRATAMENTO: ${data.treatmentResponse}
PREFERÊNCIAS DO PACIENTE: ${data.patientPreferences.join(', ')}
CONTRAINDICAÇÕES: ${data.contraindications.join(', ')}
RECURSOS DISPONÍVEIS: ${data.availableResources.join(', ')}

Sugira 2-4 abordagens alternativas baseadas em evidências.

Retorne JSON:
{
  "currentApproach": "${data.currentApproach}",
  "alternatives": [{
    "approach": "string",
    "matchScore": number,
    "rationale": "string",
    "expectedBenefits": ["benefit1"],
    "considerations": ["consideration1"]
  }]
}`

    const response = await openai.chat.completions.create({
      model: AI_MODELS.ADVANCED,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt('TREATMENT_ADVISOR', [
            'Sugira abordagens baseadas em evidências (TCC, DBT, ACT, etc.).',
            'Considere preferências e recursos do paciente.',
          ]),
        },
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE_SETTINGS.BALANCED,
      max_tokens: TOKEN_LIMITS.COMPREHENSIVE,
    })

    return JSON.parse(response.choices[0]?.message?.content || '{}')
  } catch (error) {
    console.error('Error suggesting alternative approaches:', error)
    throw error
  }
}
