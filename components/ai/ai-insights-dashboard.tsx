'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Activity,
  AlertTriangle,
  Sparkles,
  Calendar,
  Target,
  Heart,
  Loader2,
  Info,
} from 'lucide-react'

interface AIInsightsDashboardProps {
  patientId: number
  userRole: 'patient' | 'psychologist'
}

export default function AIInsightsDashboard({ patientId, userRole }: AIInsightsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [moodPrediction, setMoodPrediction] = useState<any>(null)
  const [riskAssessment, setRiskAssessment] = useState<any>(null)
  const [insights, setInsights] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any>(null)

  useEffect(() => {
    loadAIInsights()
  }, [patientId])

  const loadAIInsights = async () => {
    setLoading(true)
    try {
      // Load all AI insights in parallel
      const [moodRes, riskRes, insightsRes, recsRes] = await Promise.allSettled([
        fetch('/api/ai/predict-mood', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId }),
        }).then((r) => r.json()),
        fetch('/api/ai/risk-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId, assessmentType: 'escalation' }),
        }).then((r) => r.json()),
        fetch('/api/ai/emotional-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId, analysisType: 'trajectory' }),
        }).then((r) => r.json()),
        fetch('/api/ai/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId, recommendationType: 'weekly_insight' }),
        }).then((r) => r.json()),
      ])

      if (moodRes.status === 'fulfilled' && moodRes.value.success) {
        setMoodPrediction(moodRes.value.data)
      }
      if (riskRes.status === 'fulfilled' && riskRes.value.success) {
        setRiskAssessment(riskRes.value.data.riskEscalation)
      }
      if (insightsRes.status === 'fulfilled' && insightsRes.value.success) {
        setInsights(insightsRes.value.data.trajectory)
      }
      if (recsRes.status === 'fulfilled' && recsRes.value.success) {
        setRecommendations(recsRes.value.data.insight)
      }
    } catch (error) {
      console.error('Error loading AI insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* AI Disclaimer */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>ℹ️ Insights Gerados por IA:</strong> Estas análises são geradas por inteligência
          artificial e devem ser usadas como ferramentas de apoio. Sempre consulte um profissional
          de saúde mental qualificado para decisões clínicas.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="predictions">Previsões</TabsTrigger>
          <TabsTrigger value="risk">Avaliação de Risco</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mood Trend Card */}
            {moodPrediction && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Tendência de Humor
                  </CardTitle>
                  <CardDescription>Análise dos próximos 7 dias</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(moodPrediction.overallTrend)}
                      <span className="text-2xl font-bold capitalize">
                        {moodPrediction.overallTrend === 'improving'
                          ? 'Melhorando'
                          : moodPrediction.overallTrend === 'declining'
                            ? 'Em Declínio'
                            : 'Estável'}
                      </span>
                    </div>
                    <Badge variant="secondary">
                      Confiança: {(moodPrediction.trendConfidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Fatores influentes:</p>
                    <ul className="text-sm space-y-1">
                      {moodPrediction.keyInfluencingFactors?.slice(0, 3).map((factor: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risk Assessment Card */}
            {riskAssessment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Avaliação de Risco
                  </CardTitle>
                  <CardDescription>Monitoramento de bem-estar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Nível Atual:</span>
                      <Badge className={getRiskColor(riskAssessment.currentRiskLevel)}>
                        {riskAssessment.currentRiskLevel === 'low'
                          ? 'Baixo'
                          : riskAssessment.currentRiskLevel === 'medium'
                            ? 'Médio'
                            : riskAssessment.currentRiskLevel === 'high'
                              ? 'Alto'
                              : 'Crítico'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Probabilidade de Escalação:</span>
                      <span className="text-sm">
                        {(riskAssessment.escalationProbability * 100).toFixed(0)}%
                      </span>
                    </div>
                    {riskAssessment.warningSignals && riskAssessment.warningSignals.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Sinais de Alerta:</p>
                        <ul className="text-sm space-y-1">
                          {riskAssessment.warningSignals.slice(0, 2).map((signal: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-muted-foreground">
                              <span className="text-orange-500">⚠</span>
                              <span>{signal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Weekly Insight */}
          {recommendations && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Insight Semanal
                </CardTitle>
                <CardDescription>Análise personalizada por IA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed">{recommendations.overallSummary}</p>
                  {recommendations.aiCommentary && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm text-purple-900">{recommendations.aiCommentary}</p>
                    </div>
                  )}
                  {recommendations.emotionalHighlights && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recommendations.emotionalHighlights.positivePatterns?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Heart className="h-4 w-4 text-green-500" />
                            Padrões Positivos
                          </p>
                          <ul className="text-sm space-y-1">
                            {recommendations.emotionalHighlights.positivePatterns.map((p: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-green-700">
                                <span>✓</span>
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {recommendations.emotionalHighlights.challenges?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Desafios</p>
                          <ul className="text-sm space-y-1">
                            {recommendations.emotionalHighlights.challenges.map((c: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-muted-foreground">
                                <span>•</span>
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          {moodPrediction && (
            <Card>
              <CardHeader>
                <CardTitle>Previsão de Humor - Próximos 7 Dias</CardTitle>
                <CardDescription>{moodPrediction.disclaimer}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {moodPrediction.predictions?.map((pred: any, i: number) => (
                    <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{new Date(pred.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                        <p className="text-sm text-muted-foreground">{pred.explanation}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold">{pred.predictedMood.toFixed(1)}</p>
                          <p className="text-xs text-muted-foreground">/ 10</p>
                        </div>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {(pred.confidence * 100).toFixed(0)}% confiança
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {moodPrediction.recommendations?.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium mb-3">Recomendações:</h4>
                    <ul className="space-y-2">
                      {moodPrediction.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk" className="space-y-4">
          {riskAssessment && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Análise de Risco Detalhada</CardTitle>
                  <CardDescription>Avaliação abrangente de bem-estar e segurança</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Nível Atual</p>
                        <Badge className={`${getRiskColor(riskAssessment.currentRiskLevel)} text-lg px-4 py-2`}>
                          {riskAssessment.currentRiskLevel === 'low'
                            ? 'Baixo Risco'
                            : riskAssessment.currentRiskLevel === 'medium'
                              ? 'Risco Médio'
                              : riskAssessment.currentRiskLevel === 'high'
                                ? 'Alto Risco'
                                : 'Risco Crítico'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Previsão</p>
                        <Badge className={`${getRiskColor(riskAssessment.predictedRiskLevel)} text-lg px-4 py-2`}>
                          {riskAssessment.predictedRiskLevel === 'low'
                            ? 'Baixo Risco'
                            : riskAssessment.predictedRiskLevel === 'medium'
                              ? 'Risco Médio'
                              : riskAssessment.predictedRiskLevel === 'high'
                                ? 'Alto Risco'
                                : 'Risco Crítico'}
                        </Badge>
                      </div>
                    </div>

                    {riskAssessment.preventiveActions?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Ações Preventivas Recomendadas:</h4>
                        <ul className="space-y-2">
                          {riskAssessment.preventiveActions.map((action: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-green-500 mt-0.5">✓</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {userRole === 'psychologist' && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <strong>Nota Profissional:</strong> Esta avaliação de risco é uma ferramenta
                    de triagem. Sempre faça sua própria avaliação clínica e considere fatores que
                    a IA pode não capturar.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {recommendations && (
            <Card>
              <CardHeader>
                <CardTitle>Recomendações Personalizadas</CardTitle>
                <CardDescription>Sugestões baseadas em seu progresso</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {recommendations.behavioralInsights?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Brain className="h-4 w-4 text-purple-500" />
                        Insights Comportamentais
                      </h4>
                      <ul className="space-y-2">
                        {recommendations.behavioralInsights.map((insight: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-purple-500">💡</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {recommendations.progressIndicators?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Indicadores de Progresso</h4>
                      <div className="space-y-2">
                        {recommendations.progressIndicators.map((indicator: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">{indicator.metric}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{indicator.change}</span>
                              <Badge variant="secondary">{indicator.significance}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={loadAIInsights} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Atualizar Insights'
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
