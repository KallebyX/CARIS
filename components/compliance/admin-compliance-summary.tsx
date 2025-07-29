"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  FileText, 
  Activity,
  TrendingUp
} from "lucide-react"
import Link from "next/link"

interface ComplianceMetrics {
  totalUsers: number
  usersWithConsent: number
  pendingDataRequests: number
  criticalAlerts: number
  todayActivity: number
  complianceScore: number
}

export function AdminComplianceSummary() {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadComplianceMetrics()
  }, [])

  const loadComplianceMetrics = async () => {
    try {
      // Simulated data - in real implementation, this would come from the API
      const mockMetrics: ComplianceMetrics = {
        totalUsers: 1250,
        usersWithConsent: 1180,
        pendingDataRequests: 3,
        criticalAlerts: 1,
        todayActivity: 47,
        complianceScore: 94
      }
      
      setMetrics(mockMetrics)
    } catch (error) {
      console.error('Erro ao carregar métricas de compliance:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-600">Erro ao carregar métricas de compliance</p>
        </CardContent>
      </Card>
    )
  }

  const consentPercentage = Math.round((metrics.usersWithConsent / metrics.totalUsers) * 100)
  const hasIssues = metrics.pendingDataRequests > 0 || metrics.criticalAlerts > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Compliance Overview
          </CardTitle>
          <Badge variant={hasIssues ? "destructive" : "default"}>
            {metrics.complianceScore}% Score
          </Badge>
        </div>
        <CardDescription>
          Status geral de conformidade LGPD/GDPR
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Métricas Principais */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Usuários</span>
            </div>
            <p className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</p>
            <p className="text-xs text-gray-600">
              {consentPercentage}% com consentimento
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Atividade Hoje</span>
            </div>
            <p className="text-2xl font-bold">{metrics.todayActivity}</p>
            <p className="text-xs text-gray-600">operações auditadas</p>
          </div>
        </div>

        {/* Alertas e Pendências */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Status Crítico</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Solicitações Pendentes</span>
              </div>
              <Badge variant={metrics.pendingDataRequests > 0 ? "destructive" : "outline"}>
                {metrics.pendingDataRequests}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Alertas Críticos</span>
              </div>
              <Badge variant={metrics.criticalAlerts > 0 ? "destructive" : "outline"}>
                {metrics.criticalAlerts}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Taxa de Conformidade</span>
              </div>
              <Badge variant={consentPercentage >= 90 ? "default" : "secondary"}>
                {consentPercentage}%
              </Badge>
            </div>
          </div>
        </div>

        {/* Tendências */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Tendência</span>
          </div>
          <p className="text-xs text-blue-700">
            Conformidade melhorou 5% nas últimas 2 semanas. 
            Aumento de solicitações de exportação de dados.
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/compliance">Ver Dashboard Completo</Link>
          </Button>
        </div>

        {/* Alertas Importantes */}
        {hasIssues && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Atenção Necessária</p>
                <p className="text-xs text-red-700">
                  {metrics.pendingDataRequests > 0 && `${metrics.pendingDataRequests} solicitação(ões) de dados pendente(s). `}
                  {metrics.criticalAlerts > 0 && `${metrics.criticalAlerts} alerta(s) crítico(s) ativo(s).`}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}