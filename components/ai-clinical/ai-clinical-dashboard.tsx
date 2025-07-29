'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  AlertTriangle, 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  Download,
  RefreshCw,
  BarChart3,
  Users,
  Heart,
  AlertCircle
} from 'lucide-react'

interface SessionAnalysis {
  overallProgress: 'excellent' | 'good' | 'stable' | 'concerning' | 'critical'
  keyThemes: string[]
  emotionalTrends: {
    direction: 'improving' | 'stable' | 'declining'
    consistency: 'very_consistent' | 'consistent' | 'variable' | 'highly_variable'
    predominantEmotions: string[]
  }
  riskFactors: string[]
  therapeuticOpportunities: string[]
  recommendedInterventions: string[]
  nextSessionFocus: string[]
}

interface ClinicalAlert {
  id: number
  alertType: 'risk_escalation' | 'pattern_change' | 'mood_decline' | 'session_concern'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  recommendations: string[]
  createdAt: string
  patientName: string
  isActive: boolean
  acknowledgedAt?: string
}

interface ProgressReport {
  id: number
  patientName: string
  reportType: string
  period: string
  progressScore: number
  generatedAt: string
  sharedWithPatient: boolean
}

interface AIClinicalDashboardProps {
  patientId?: number
  psychologistId: number
}

export function AIClinicalDashboard({ patientId, psychologistId }: AIClinicalDashboardProps) {
  const [activeTab, setActiveTab] = useState('insights')
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<any>(null)
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([])
  const [reports, setReports] = useState<ProgressReport[]>([])

  // Fetch AI insights
  const fetchInsights = async () => {
    if (!patientId) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        patientId: patientId.toString(),
        type: 'all'
      })
      const response = await fetch(`/api/psychologist/ai-insights?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setInsights(data.data)
      }
    } catch (error) {
      console.error('Error fetching insights:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch clinical alerts
  const fetchAlerts = async () => {
    try {
      const params = new URLSearchParams({
        status: 'active',
        ...(patientId && { patientId: patientId.toString() })
      })
      const response = await fetch(`/api/psychologist/clinical-alerts?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setAlerts(data.data)
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    }
  }

  // Fetch progress reports
  const fetchReports = async () => {
    try {
      const params = new URLSearchParams({
        ...(patientId && { patientId: patientId.toString() })
      })
      const response = await fetch(`/api/psychologist/progress-reports?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setReports(data.data)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    }
  }

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: number) => {
    try {
      const response = await fetch('/api/psychologist/clinical-alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, action: 'acknowledge' })
      })
      
      if (response.ok) {
        fetchAlerts() // Refresh alerts
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  // Generate new report
  const generateReport = async (reportType: string) => {
    if (!patientId) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/psychologist/progress-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, reportType })
      })
      
      if (response.ok) {
        fetchReports() // Refresh reports
      }
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (patientId) {
      fetchInsights()
    }
    fetchAlerts()
    fetchReports()
  }, [patientId])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getProgressColor = (progress: string) => {
    switch (progress) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'stable': return 'text-yellow-600'
      case 'concerning': return 'text-orange-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-8 w-8 text-purple-600" />
          Assistente Clínico IA
        </h2>
        <Button 
          onClick={() => {
            if (patientId) fetchInsights()
            fetchAlerts()
            fetchReports()
          }}
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">Insights IA</TabsTrigger>
          <TabsTrigger value="alerts">
            Alertas 
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          {patientId ? (
            <>
              {loading ? (
                <Card>
                  <CardContent className="flex items-center justify-center p-6">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    Gerando análise com IA...
                  </CardContent>
                </Card>
              ) : insights ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Session Analysis */}
                  {insights.sessionAnalysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Análise de Sessão
                        </CardTitle>
                        <CardDescription>
                          Progresso geral: 
                          <span className={`ml-1 font-semibold ${getProgressColor(insights.sessionAnalysis.overallProgress)}`}>
                            {insights.sessionAnalysis.overallProgress}
                          </span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {insights.sessionAnalysis.keyThemes.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">Temas Principais</h4>
                            <div className="flex flex-wrap gap-2">
                              {insights.sessionAnalysis.keyThemes.map((theme: string, index: number) => (
                                <Badge key={index} variant="outline">{theme}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <Separator />
                        
                        <div>
                          <h4 className="font-semibold mb-2">Tendência Emocional</h4>
                          <div className="flex items-center gap-2">
                            {insights.sessionAnalysis.emotionalTrends.direction === 'improving' && (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            )}
                            {insights.sessionAnalysis.emotionalTrends.direction === 'declining' && (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                            <span className="capitalize">{insights.sessionAnalysis.emotionalTrends.direction}</span>
                          </div>
                        </div>
                        
                        {insights.sessionAnalysis.recommendedInterventions.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">Intervenções Recomendadas</h4>
                            <ul className="text-sm space-y-1">
                              {insights.sessionAnalysis.recommendedInterventions.slice(0, 3).map((intervention: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                  {intervention}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Clinical Alerts for this patient */}
                  {insights.clinicalAlerts && insights.clinicalAlerts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          Alertas Detectados
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-64">
                          <div className="space-y-3">
                            {insights.clinicalAlerts.map((alert: any, index: number) => (
                              <Alert key={index}>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>{alert.title}</AlertTitle>
                                <AlertDescription>{alert.description}</AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  {/* Progress Report Summary */}
                  {insights.progressReport && (
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Resumo de Progresso (30 dias)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Score de Progresso</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={insights.progressReport.overallProgress} className="flex-1" />
                              <span className="text-sm font-semibold">{insights.progressReport.overallProgress}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Humor Médio</p>
                            <p className="text-2xl font-bold">{insights.progressReport.moodTrends.average}/10</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Tendência</p>
                            <div className="flex items-center gap-1">
                              {insights.progressReport.moodTrends.trend === 'improving' && (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              )}
                              {insights.progressReport.moodTrends.trend === 'declining' && (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                              <span className="capitalize text-sm">{insights.progressReport.moodTrends.trend}</span>
                            </div>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold mb-2">Conquistas Principais</h4>
                            <ul className="text-sm space-y-1">
                              {insights.progressReport.keyAchievements.slice(0, 3).map((achievement: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  {achievement}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Próximos Passos</h4>
                            <ul className="text-sm space-y-1">
                              {insights.progressReport.nextSteps.slice(0, 3).map((step: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center p-6">
                    <p className="text-muted-foreground">Selecione um paciente para ver os insights da IA</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-6">
                <p className="text-muted-foreground">Selecione um paciente para ver os insights da IA</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Alertas Clínicos Ativos</h3>
            <Badge variant="outline">{alerts.length} alertas</Badge>
          </div>
          
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card key={alert.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <CardTitle className="text-base">{alert.title}</CardTitle>
                        <Badge variant={getSeverityColor(alert.severity) as any}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Reconhecer
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      {alert.patientName} • {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm mb-3">{alert.description}</p>
                    
                    {alert.recommendations.length > 0 && (
                      <div>
                        <h5 className="font-semibold text-sm mb-2">Recomendações:</h5>
                        <ul className="text-sm space-y-1">
                          {alert.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-6">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-muted-foreground">Nenhum alerta ativo no momento</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Relatórios de Progresso</h3>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => generateReport('weekly')}
                disabled={!patientId || loading}
              >
                Relatório Semanal
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => generateReport('monthly')}
                disabled={!patientId || loading}
              >
                Relatório Mensal
              </Button>
            </div>
          </div>
          
          {reports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report) => (
                <Card key={report.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{report.patientName}</CardTitle>
                    <CardDescription>
                      {report.reportType} • {report.period}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Score de Progresso</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={report.progressScore} className="flex-1" />
                        <span className="text-sm font-semibold">{report.progressScore}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {new Date(report.generatedAt).toLocaleDateString('pt-BR')}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {report.sharedWithPatient ? (
                          <Badge variant="secondary">
                            <Eye className="h-3 w-3 mr-1" />
                            Compartilhado
                          </Badge>
                        ) : (
                          <Badge variant="outline">Privado</Badge>
                        )}
                      </div>
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-6">
                <p className="text-muted-foreground">Nenhum relatório gerado ainda</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardContent className="flex items-center justify-center p-6">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Dashboard de Analytics em desenvolvimento</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Visualizações avançadas e métricas agregadas estarão disponíveis em breve
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}