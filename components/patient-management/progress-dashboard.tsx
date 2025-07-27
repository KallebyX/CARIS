"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, Calendar, BookOpen, Target, RotateCcw } from "lucide-react"
import { toast } from "react-hot-toast"

interface ProgressMetric {
  id: number
  metricType: string
  value: number
  calculatedAt: string
  period: string
}

interface CalculatedMetrics {
  diaryConsistency: number
  averageMood: number
  averageIntensity: number
  sessionFrequency: number
}

interface ProgressData {
  existingMetrics: ProgressMetric[]
  calculatedMetrics: CalculatedMetrics
  period: string
}

interface ProgressDashboardProps {
  patientId: number
  patientName: string
}

export function ProgressDashboard({ patientId, patientName }: ProgressDashboardProps) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)

  useEffect(() => {
    fetchProgressData()
  }, [patientId])

  const fetchProgressData = async () => {
    try {
      const response = await fetch(`/api/psychologist/progress?patientId=${patientId}&period=monthly`)
      if (response.ok) {
        const data = await response.json()
        setProgressData(data.data)
      } else {
        toast.error("Erro ao carregar dados de progresso")
      }
    } catch (error) {
      toast.error("Erro ao carregar dados de progresso")
    } finally {
      setLoading(false)
    }
  }

  const recalculateMetrics = async () => {
    setRecalculating(true)
    try {
      const response = await fetch("/api/psychologist/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId,
          action: "recalculate",
        }),
      })

      if (response.ok) {
        toast.success("Métricas recalculadas com sucesso!")
        fetchProgressData()
      } else {
        toast.error("Erro ao recalcular métricas")
      }
    } catch (error) {
      toast.error("Erro ao recalcular métricas")
    } finally {
      setRecalculating(false)
    }
  }

  const getMetricIcon = (metricType: string) => {
    const icons = {
      diary_consistency: BookOpen,
      mood_trend: TrendingUp,
      session_frequency: Calendar,
    }
    return icons[metricType as keyof typeof icons] || Target
  }

  const getMetricTitle = (metricType: string) => {
    const titles = {
      diary_consistency: "Consistência do Diário",
      mood_trend: "Tendência de Humor",
      session_frequency: "Frequência de Sessões",
    }
    return titles[metricType as keyof typeof titles] || metricType
  }

  const getMoodLabel = (value: number) => {
    if (value >= 8) return { label: "Excelente", color: "text-green-600" }
    if (value >= 6) return { label: "Bom", color: "text-blue-600" }
    if (value >= 4) return { label: "Regular", color: "text-yellow-600" }
    return { label: "Baixo", color: "text-red-600" }
  }

  const getConsistencyPercentage = (days: number) => {
    return Math.min((days / 30) * 100, 100)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando dados de progresso...</div>
        </CardContent>
      </Card>
    )
  }

  if (!progressData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Não foi possível carregar os dados de progresso.
          </div>
        </CardContent>
      </Card>
    )
  }

  const { calculatedMetrics } = progressData

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                Dashboard de Progresso - {patientName}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Métricas detalhadas dos últimos 30 dias
              </p>
            </div>
            <Button
              onClick={recalculateMetrics}
              disabled={recalculating}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className={`w-4 h-4 ${recalculating ? "animate-spin" : ""}`} />
              {recalculating ? "Recalculando..." : "Recalcular"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Consistência do Diário */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <BookOpen className="w-8 h-8 text-blue-500" />
                  <Badge variant="outline">{calculatedMetrics.diaryConsistency} dias</Badge>
                </div>
                <h3 className="font-semibold text-sm mb-2">Consistência do Diário</h3>
                <Progress value={getConsistencyPercentage(calculatedMetrics.diaryConsistency)} className="mb-2" />
                <p className="text-xs text-gray-600">
                  {calculatedMetrics.diaryConsistency} entradas em 30 dias
                </p>
              </CardContent>
            </Card>

            {/* Humor Médio */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-8 h-8 text-green-500" />
                  <Badge variant="outline">{calculatedMetrics.averageMood.toFixed(1)}/10</Badge>
                </div>
                <h3 className="font-semibold text-sm mb-2">Humor Médio</h3>
                <div className={`text-lg font-bold ${getMoodLabel(calculatedMetrics.averageMood).color}`}>
                  {getMoodLabel(calculatedMetrics.averageMood).label}
                </div>
                <p className="text-xs text-gray-600">
                  Baseado nas últimas entradas
                </p>
              </CardContent>
            </Card>

            {/* Intensidade Média */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Target className="w-8 h-8 text-purple-500" />
                  <Badge variant="outline">{calculatedMetrics.averageIntensity.toFixed(1)}/10</Badge>
                </div>
                <h3 className="font-semibold text-sm mb-2">Intensidade Média</h3>
                <Progress value={calculatedMetrics.averageIntensity * 10} className="mb-2" />
                <p className="text-xs text-gray-600">
                  Intensidade emocional média
                </p>
              </CardContent>
            </Card>

            {/* Frequência de Sessões */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Calendar className="w-8 h-8 text-orange-500" />
                  <Badge variant="outline">{calculatedMetrics.sessionFrequency} sessões</Badge>
                </div>
                <h3 className="font-semibold text-sm mb-2">Sessões Realizadas</h3>
                <div className="text-lg font-bold text-orange-600">
                  {calculatedMetrics.sessionFrequency}
                </div>
                <p className="text-xs text-gray-600">
                  Nos últimos 30 dias
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metrics">Métricas Históricas</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Métricas</CardTitle>
            </CardHeader>
            <CardContent>
              {progressData.existingMetrics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma métrica histórica ainda.</p>
                  <p className="text-sm">As métricas serão armazenadas após o primeiro cálculo.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {progressData.existingMetrics.map((metric) => {
                    const Icon = getMetricIcon(metric.metricType)
                    return (
                      <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-teal-600" />
                          <div>
                            <p className="font-medium">{getMetricTitle(metric.metricType)}</p>
                            <p className="text-xs text-gray-600">
                              {new Date(metric.calculatedAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{metric.value}</Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Tendências</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Tendência de Humor</h4>
                  {calculatedMetrics.averageMood >= 6 ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>Tendência positiva</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <TrendingDown className="w-4 h-4" />
                      <span>Necessita atenção</span>
                    </div>
                  )}
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Engajamento</h4>
                  {calculatedMetrics.diaryConsistency >= 20 ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>Alto engajamento</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-600">
                      <TrendingDown className="w-4 h-4" />
                      <span>Engajamento moderado</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Insights Automáticos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {calculatedMetrics.diaryConsistency < 10 && (
                  <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50">
                    <h4 className="font-semibold text-yellow-800">Baixa Consistência do Diário</h4>
                    <p className="text-sm text-yellow-700">
                      O paciente tem escrito no diário apenas {calculatedMetrics.diaryConsistency} vezes nos últimos 30 dias.
                      Considere conversar sobre a importância da regularidade.
                    </p>
                  </div>
                )}

                {calculatedMetrics.averageMood < 4 && (
                  <div className="p-4 border-l-4 border-red-500 bg-red-50">
                    <h4 className="font-semibold text-red-800">Humor Baixo</h4>
                    <p className="text-sm text-red-700">
                      O humor médio está baixo ({calculatedMetrics.averageMood.toFixed(1)}/10).
                      Considere uma avaliação mais detalhada ou ajuste no plano terapêutico.
                    </p>
                  </div>
                )}

                {calculatedMetrics.sessionFrequency === 0 && (
                  <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
                    <h4 className="font-semibold text-orange-800">Ausência de Sessões</h4>
                    <p className="text-sm text-orange-700">
                      Nenhuma sessão foi realizada nos últimos 30 dias.
                      Considere entrar em contato com o paciente.
                    </p>
                  </div>
                )}

                {calculatedMetrics.diaryConsistency >= 20 && calculatedMetrics.averageMood >= 7 && (
                  <div className="p-4 border-l-4 border-green-500 bg-green-50">
                    <h4 className="font-semibold text-green-800">Progresso Excelente</h4>
                    <p className="text-sm text-green-700">
                      O paciente mostra alta consistência no diário e bom humor médio.
                      Continue com o plano atual e considere celebrar esses progressos.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}