"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  ExternalLink,
  RefreshCcw,
  Server,
  TrendingUp,
  Zap,
  AlertCircle,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ================================================================
// TYPES
// ================================================================

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  uptime: number
  version: string
  environment: string
  responseTime: number
  services: {
    database: ServiceStatus
    application: ServiceStatus
    pusher?: ServiceStatus
  }
  system: {
    memory: {
      used: number
      total: number
      percentage: number
    }
    cpu: any
    platform: string
    nodeVersion: string
  }
  checks: HealthCheck[]
}

interface ServiceStatus {
  status: "healthy" | "degraded" | "unhealthy"
  responseTime?: number
  lastCheck?: string
  error?: string
}

interface HealthCheck {
  name: string
  status: "pass" | "warn" | "fail"
  duration: number
  message?: string
  error?: string
}

// ================================================================
// MONITORING DASHBOARD COMPONENT
// ================================================================

export default function MonitoringDashboard() {
  const [healthData, setHealthData] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Fetch health data
  const fetchHealthData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/health")
      const data = await response.json()
      setHealthData(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch health data")
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchHealthData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000)

    return () => clearInterval(interval)
  }, [])

  // Get status color
  const getStatusColor = (
    status: "healthy" | "degraded" | "unhealthy" | "pass" | "warn" | "fail"
  ) => {
    switch (status) {
      case "healthy":
      case "pass":
        return "text-green-600 bg-green-50 border-green-200"
      case "degraded":
      case "warn":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "unhealthy":
      case "fail":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  // Get status icon
  const getStatusIcon = (
    status: "healthy" | "degraded" | "unhealthy" | "pass" | "warn" | "fail"
  ) => {
    switch (status) {
      case "healthy":
      case "pass":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "degraded":
      case "warn":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case "unhealthy":
      case "fail":
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      default:
        return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  // Format uptime
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sistema de Monitoramento</h1>
          <p className="text-muted-foreground">
            Monitore a saúde e o desempenho do sistema CÁRIS
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Última atualização: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button onClick={fetchHealthData} disabled={loading}>
            <RefreshCcw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">Erro ao carregar dados</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && !healthData && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCcw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Carregando dados de monitoramento...</p>
          </div>
        </div>
      )}

      {/* Health Data */}
      {healthData && (
        <>
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Overall Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status Geral</CardTitle>
                {getStatusIcon(healthData.status)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">
                  {healthData.status === "healthy"
                    ? "Saudável"
                    : healthData.status === "degraded"
                    ? "Degradado"
                    : "Não Saudável"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ambiente: {healthData.environment}
                </p>
              </CardContent>
            </Card>

            {/* Uptime */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Ativo</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatUptime(healthData.uptime)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Versão: {healthData.version}
                </p>
              </CardContent>
            </Card>

            {/* Memory Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uso de Memória</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {healthData.system.memory.percentage}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {healthData.system.memory.used}MB / {healthData.system.memory.total}MB
                </p>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tempo de Resposta
                </CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {healthData.responseTime}ms
                </div>
                <p className="text-xs text-muted-foreground">Health check API</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Information */}
          <Tabs defaultValue="services" className="space-y-4">
            <TabsList>
              <TabsTrigger value="services">Serviços</TabsTrigger>
              <TabsTrigger value="checks">Verificações</TabsTrigger>
              <TabsTrigger value="system">Sistema</TabsTrigger>
              <TabsTrigger value="sentry">Sentry</TabsTrigger>
            </TabsList>

            {/* Services Tab */}
            <TabsContent value="services" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Database Service */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        <CardTitle>Banco de Dados</CardTitle>
                      </div>
                      <Badge
                        className={getStatusColor(healthData.services.database.status)}
                      >
                        {healthData.services.database.status === "healthy"
                          ? "Saudável"
                          : "Não Saudável"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Tempo de Resposta:
                        </span>
                        <span className="font-medium">
                          {healthData.services.database.responseTime}ms
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Última Verificação:
                        </span>
                        <span className="font-medium">
                          {healthData.services.database.lastCheck
                            ? new Date(
                                healthData.services.database.lastCheck
                              ).toLocaleTimeString()
                            : "N/A"}
                        </span>
                      </div>
                      {healthData.services.database.error && (
                        <div className="text-sm text-red-600 mt-2">
                          Erro: {healthData.services.database.error}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Pusher Service */}
                {healthData.services.pusher && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          <CardTitle>Pusher (WebSocket)</CardTitle>
                        </div>
                        <Badge
                          className={getStatusColor(healthData.services.pusher.status)}
                        >
                          {healthData.services.pusher.status === "healthy"
                            ? "Saudável"
                            : healthData.services.pusher.status === "degraded"
                            ? "Degradado"
                            : "Não Saudável"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Tempo de Resposta:
                          </span>
                          <span className="font-medium">
                            {healthData.services.pusher.responseTime}ms
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Health Checks Tab */}
            <TabsContent value="checks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Verificações de Saúde</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {healthData.checks.map((check, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(check.status)}
                          <div>
                            <p className="font-medium capitalize">{check.name}</p>
                            {check.message && (
                              <p className="text-sm text-muted-foreground">
                                {check.message}
                              </p>
                            )}
                            {check.error && (
                              <p className="text-sm text-red-600">{check.error}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {check.duration}ms
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Tab */}
            <TabsContent value="system" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Plataforma</p>
                        <p className="font-medium">{healthData.system.platform}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Versão Node.js</p>
                        <p className="font-medium">{healthData.system.nodeVersion}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Uso de Memória</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            healthData.system.memory.percentage > 90
                              ? "bg-red-600"
                              : healthData.system.memory.percentage > 75
                              ? "bg-yellow-600"
                              : "bg-green-600"
                          }`}
                          style={{
                            width: `${healthData.system.memory.percentage}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {healthData.system.memory.used}MB /{" "}
                        {healthData.system.memory.total}MB (
                        {healthData.system.memory.percentage}%)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sentry Tab */}
            <TabsContent value="sentry" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sentry Monitoring</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    O Sentry está configurado para rastrear erros, desempenho e
                    sessões de usuários em tempo real.
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Dashboard do Sentry</p>
                        <p className="text-sm text-muted-foreground">
                          Visualize erros e métricas de desempenho
                        </p>
                      </div>
                      <Button variant="outline" asChild>
                        <a
                          href="https://sentry.io"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir Sentry
                        </a>
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">
                          Rastreamento de Erros
                        </p>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Ativo</span>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">
                          Monitoramento de Performance
                        </p>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Ativo</span>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">
                          Session Replay
                        </p>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Ativo</span>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">
                          Source Maps
                        </p>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Configurado</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Recursos Principais</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Rastreamento automático de erros no cliente e servidor
                      </li>
                      <li className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Monitoramento de performance de API e componentes
                      </li>
                      <li className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Gravação de sessões de usuário para debugging
                      </li>
                      <li className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Scrubbing automático de dados sensíveis (PII)
                      </li>
                      <li className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Alertas configuráveis para eventos críticos
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
