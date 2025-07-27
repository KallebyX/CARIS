"use client"

import React, { useState, useEffect } from 'react'
import { EmotionalTimeline } from './emotional-timeline'
import { PlutchikRadar } from './plutchik-radar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Brain, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  Heart, 
  Activity,
  BarChart3,
  Clock,
  Target,
  Lightbulb
} from 'lucide-react'

interface DiaryEntry {
  id: number
  entryDate: string
  moodRating: number
  content: string
  dominantEmotion: string
  emotionIntensity: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  plutchikCategories: string[]
  aiInsights: string[]
  suggestedActions: string[]
}

interface EmotionalDashboardProps {
  userId: number
}

export function EmotionalDashboard({ userId }: EmotionalDashboardProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [insights, setInsights] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month')
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null)

  // Buscar dados do diário e insights
  useEffect(() => {
    fetchDiaryData()
    fetchInsights()
  }, [userId, selectedPeriod])

  const fetchDiaryData = async () => {
    try {
      const response = await fetch(`/api/patient/diary?limit=100`)
      const data = await response.json()
      
      if (data.success) {
        setEntries(data.entries || [])
      }
    } catch (error) {
      console.error('Erro ao buscar dados do diário:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInsights = async () => {
    try {
      const response = await fetch(`/api/patient/insights?period=${selectedPeriod}`)
      const data = await response.json()
      
      if (data.success) {
        setInsights(data.insights)
      }
    } catch (error) {
      console.error('Erro ao buscar insights:', error)
    }
  }

  // Transformar dados para o timeline
  const timelineData = React.useMemo(() => {
    return entries.map(entry => ({
      date: new Date(entry.entryDate),
      moodRating: entry.moodRating,
      dominantEmotion: entry.dominantEmotion || 'neutro',
      intensity: entry.emotionIntensity || 5,
      riskLevel: entry.riskLevel || 'low',
      content: entry.content || '',
      plutchikCategories: entry.plutchikCategories || [],
      aiInsights: entry.aiInsights || []
    }))
  }, [entries])

  // Preparar dados para o radar Plutchik
  const plutchikData = React.useMemo(() => {
    const emotionCounts = new Map<string, { frequency: number, totalIntensity: number, trends: string[] }>()
    
    entries.forEach(entry => {
      const emotion = entry.dominantEmotion || 'neutro'
      const current = emotionCounts.get(emotion) || { frequency: 0, totalIntensity: 0, trends: [] }
      
      current.frequency += 1
      current.totalIntensity += entry.emotionIntensity || 5
      current.trends.push(entry.entryDate)
      
      emotionCounts.set(emotion, current)
    })

    return Array.from(emotionCounts.entries()).map(([emotion, data]) => {
      // Calcular tendência baseada em entradas recentes vs antigas
      const sortedTrends = data.trends.sort()
      const half = Math.floor(sortedTrends.length / 2)
      const recentCount = sortedTrends.slice(half).length
      const olderCount = sortedTrends.slice(0, half).length
      
      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (recentCount > olderCount * 1.5) trend = 'up'
      else if (olderCount > recentCount * 1.5) trend = 'down'

      return {
        emotion,
        frequency: data.frequency,
        intensity: data.totalIntensity / data.frequency,
        trend
      }
    })
  }, [entries])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Total de Registros</span>
            </div>
            <div className="text-2xl font-bold mt-1">{entries.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Humor Médio</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {insights?.moodAnalysis?.average || 'N/A'}/10
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Tendência</span>
            </div>
            <div className="text-lg font-bold mt-1 capitalize">
              {insights?.moodAnalysis?.trend === 'improving' ? 'Melhorando' :
               insights?.moodAnalysis?.trend === 'declining' ? 'Declinando' : 'Estável'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium">Dias de Risco</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {insights?.riskAssessment?.highRiskDays || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de risco */}
      {insights?.riskAssessment?.level === 'attention' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Foram detectados {insights.riskAssessment.highRiskDays} dias com indicadores de risco elevado. 
            Considere conversar com seu terapeuta sobre estes padrões.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="plutchik">Radar Plutchik</TabsTrigger>
          <TabsTrigger value="insights">Insights IA</TabsTrigger>
          <TabsTrigger value="patterns">Padrões</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <EmotionalTimeline 
            data={timelineData}
            onPointClick={setSelectedEntry}
          />
          
          {selectedEntry && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Detalhes da Entrada - {new Date(selectedEntry.entryDate).toLocaleDateString()}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm font-medium">Humor:</span>
                    <div className="text-lg font-bold">{selectedEntry.moodRating}/10</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Emoção Dominante:</span>
                    <div className="text-lg font-bold">{selectedEntry.dominantEmotion}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Nível de Risco:</span>
                    <Badge variant={selectedEntry.riskLevel === 'high' || selectedEntry.riskLevel === 'critical' ? 'destructive' : 'secondary'}>
                      {selectedEntry.riskLevel}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm font-medium">Conteúdo:</span>
                  <p className="mt-1 text-sm bg-gray-50 p-3 rounded-md">
                    {selectedEntry.content}
                  </p>
                </div>
                
                {selectedEntry.aiInsights && selectedEntry.aiInsights.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Insights da IA:</span>
                    <ul className="mt-1 text-sm space-y-1">
                      {selectedEntry.aiInsights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {selectedEntry.suggestedActions && selectedEntry.suggestedActions.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Ações Sugeridas:</span>
                    <ul className="mt-1 text-sm space-y-1">
                      {selectedEntry.suggestedActions.map((action, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="plutchik">
          <PlutchikRadar 
            data={plutchikData}
            period={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {insights?.therapeuticInsights && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Análise Semanal da IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">
                    {insights.therapeuticInsights.weeklyInsight}
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Técnicas Recomendadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {insights.therapeuticInsights.recommendedTechniques.map((technique: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          {technique}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Áreas de Foco</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {insights.therapeuticInsights.focusAreas.map((area: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Heart className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          {insights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Padrões de Humor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm font-medium">Volatilidade:</span>
                    <Badge variant="secondary" className="ml-2">
                      {insights.moodAnalysis?.volatility || 'N/A'}
                    </Badge>
                  </div>
                  
                  {insights.moodAnalysis?.concerningPatterns && insights.moodAnalysis.concerningPatterns.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">Padrões Preocupantes:</span>
                      <ul className="mt-2 space-y-1">
                        {insights.moodAnalysis.concerningPatterns.map((pattern: string, index: number) => (
                          <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {pattern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição Emocional</CardTitle>
                </CardHeader>
                <CardContent>
                  {insights.emotionAnalysis?.distribution && (
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Emoção Mais Frequente:</span>
                        <div className="text-lg font-bold">
                          {insights.emotionAnalysis.mostFrequent}
                        </div>
                      </div>
                      
                      <div className="text-xs space-y-1">
                        {Object.entries(insights.emotionAnalysis.distribution)
                          .sort(([,a], [,b]) => (b as number) - (a as number))
                          .slice(0, 5)
                          .map(([emotion, count]) => (
                            <div key={emotion} className="flex justify-between">
                              <span>{emotion}:</span>
                              <span>{count as number}x</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}