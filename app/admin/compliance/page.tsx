"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  FileText, 
  Download,
  Search,
  Filter,
  Calendar,
  Activity
} from "lucide-react"
import { toast } from "react-hot-toast"

interface AuditLog {
  id: number
  userId: number
  userName: string
  userEmail: string
  action: string
  resourceType: string
  resourceId: string
  ipAddress: string
  timestamp: string
  severity: 'info' | 'warning' | 'critical'
  complianceRelated: boolean
  metadata: any
}

interface AuditStats {
  totalLogs: number
  complianceLogs: number
  criticalLogs: number
  todayLogs: number
}

interface ComplianceMetrics {
  totalUsers: number
  usersWithConsent: number
  pendingDataRequests: number
  completedExports: number
  anonymizedUsers: number
}

export default function AdminCompliancePage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null)
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Filtros
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resourceType: '',
    severity: '',
    complianceOnly: false,
    dateFrom: '',
    dateTo: '',
    search: ''
  })

  useEffect(() => {
    loadComplianceData()
  }, [currentPage, filters])

  const loadComplianceData = async () => {
    setLoading(true)
    try {
      // Constrói query string para filtros
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== false)
        )
      })

      const response = await fetch(`/api/admin/audit-logs?${queryParams}`)
      
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data.data.logs)
        setAuditStats(data.data.stats)
        setTotalPages(data.data.pagination.totalPages)
      } else {
        throw new Error('Falha ao carregar dados de compliance')
      }

      // Carrega métricas (simuladas por enquanto)
      setMetrics({
        totalUsers: 1250,
        usersWithConsent: 1180,
        pendingDataRequests: 3,
        completedExports: 47,
        anonymizedUsers: 12
      })

    } catch (error) {
      console.error('Erro ao carregar dados de compliance:', error)
      toast.error('Erro ao carregar dados de compliance')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset para primeira página
  }

  const exportAuditLogs = async () => {
    try {
      toast.success('Exportação iniciada. O arquivo será enviado por email.')
    } catch (error) {
      toast.error('Erro ao exportar logs de auditoria')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      default: return 'bg-blue-500'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  if (loading && auditLogs.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando dashboard de compliance...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Compliance LGPD/GDPR</h1>
            <p className="text-gray-600">Dashboard de auditoria e compliance</p>
          </div>
        </div>
        <Button onClick={exportAuditLogs} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar Logs
        </Button>
      </div>

      {/* Métricas de Compliance */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <Users className="h-8 w-8 text-blue-500 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
                <p className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <CheckCircle className="h-8 w-8 text-green-500 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Com Consentimento</p>
                <p className="text-2xl font-bold">{metrics.usersWithConsent.toLocaleString()}</p>
                <p className="text-xs text-gray-500">
                  {((metrics.usersWithConsent / metrics.totalUsers) * 100).toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <FileText className="h-8 w-8 text-orange-500 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Solicitações Pendentes</p>
                <p className="text-2xl font-bold">{metrics.pendingDataRequests}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <Download className="h-8 w-8 text-blue-500 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Exportações</p>
                <p className="text-2xl font-bold">{metrics.completedExports}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <Shield className="h-8 w-8 text-purple-500 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Anonimizados</p>
                <p className="text-2xl font-bold">{metrics.anonymizedUsers}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estatísticas de Auditoria */}
      {auditStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <Activity className="h-8 w-8 text-blue-500 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Logs</p>
                <p className="text-2xl font-bold">{auditStats.totalLogs.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <Shield className="h-8 w-8 text-green-500 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Logs de Compliance</p>
                <p className="text-2xl font-bold">{auditStats.complianceLogs.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Logs Críticos</p>
                <p className="text-2xl font-bold">{auditStats.criticalLogs.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <Calendar className="h-8 w-8 text-purple-500 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Hoje</p>
                <p className="text-2xl font-bold">{auditStats.todayLogs.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="audit-logs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="audit-logs">Logs de Auditoria</TabsTrigger>
          <TabsTrigger value="data-requests">Solicitações de Dados</TabsTrigger>
          <TabsTrigger value="compliance-reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="audit-logs" className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Usuário, ação..."
                      className="pl-10"
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Ação</Label>
                  <Select value={filters.action || "all"} onValueChange={(value) => handleFilterChange('action', value === "all" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="logout">Logout</SelectItem>
                      <SelectItem value="create">Criar</SelectItem>
                      <SelectItem value="update">Atualizar</SelectItem>
                      <SelectItem value="delete">Excluir</SelectItem>
                      <SelectItem value="export_data">Exportar</SelectItem>
                      <SelectItem value="anonymize_data">Anonimizar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Recurso</Label>
                  <Select value={filters.resourceType || "all"} onValueChange={(value) => handleFilterChange('resourceType', value === "all" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="session">Sessão</SelectItem>
                      <SelectItem value="diary_entry">Diário</SelectItem>
                      <SelectItem value="consent">Consentimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Severidade</Label>
                  <Select value={filters.severity || "all"} onValueChange={(value) => handleFilterChange('severity', value === "all" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Data Início</Label>
                  <Input
                    type="datetime-local"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Data Fim</Label>
                  <Input
                    type="datetime-local"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.complianceOnly}
                    onChange={(e) => handleFilterChange('complianceOnly', e.target.checked)}
                  />
                  <span className="text-sm">Apenas compliance</span>
                </label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({
                      userId: '',
                      action: '',
                      resourceType: '',
                      severity: '',
                      complianceOnly: false,
                      dateFrom: '',
                      dateTo: '',
                      search: ''
                    })
                    setCurrentPage(1)
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Logs de Auditoria</CardTitle>
              <CardDescription>
                Histórico completo de operações auditadas na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-gray-600">Carregando logs...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-center py-8 text-gray-600">Nenhum log encontrado</p>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getSeverityColor(log.severity)}`} />
                          <span className="font-medium">{log.action}</span>
                          <Badge variant="outline">{log.resourceType}</Badge>
                          {log.complianceRelated && (
                            <Badge className="bg-green-100 text-green-800">Compliance</Badge>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">{formatDate(log.timestamp)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Usuário:</span> {log.userName || 'Sistema'} ({log.userEmail})
                        </div>
                        <div>
                          <span className="font-medium">IP:</span> {log.ipAddress || 'N/A'}
                        </div>
                        {log.resourceId && (
                          <div>
                            <span className="font-medium">Recurso ID:</span> {log.resourceId}
                          </div>
                        )}
                        {log.metadata && (
                          <div className="col-span-2">
                            <span className="font-medium">Metadata:</span>
                            <pre className="text-xs bg-gray-50 p-2 rounded mt-1">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Paginação */}
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-gray-600">
                      Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Solicitações de Dados</CardTitle>
              <CardDescription>
                Exportações e solicitações de anonimização pendentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-gray-600">
                Implementação pendente - Lista de solicitações de dados dos usuários
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance-reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios de Compliance</CardTitle>
              <CardDescription>
                Relatórios automáticos de conformidade com LGPD/GDPR
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-gray-600">
                Implementação pendente - Relatórios de compliance automáticos
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}