"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdvancedCharts } from "@/components/reports/advanced-charts"
import { PatientReport } from "@/components/reports/patient-report"
import { BarChart3, Users, Activity, TrendingUp, Download, FileText } from "lucide-react"

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30d")
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({ period })
        if (selectedPatient) {
          params.append("patientId", selectedPatient.toString())
        }

        const response = await fetch(`/api/psychologist/reports/advanced?${params}`)
        if (response.ok) {
          const reportData = await response.json()
          setData(reportData)
        }
      } catch (error) {
        console.error("Erro ao carregar relatórios:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period, selectedPatient])

  const handleExportPDF = async () => {
    try {
      const response = await fetch("/api/psychologist/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, patientId: selectedPatient }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `relatorio-${period}-${new Date().toISOString().split("T")[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Erro ao exportar PDF:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Relatórios e Métricas</h1>
            <p className="text-slate-600">Carregando dados...</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Relatórios e Métricas</h1>
          <p className="text-slate-600">Análise detalhada do progresso e engajamento dos seus pacientes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedPatient?.toString() || "all"}
            onValueChange={(value) => setSelectedPatient(value === "all" ? null : Number.parseInt(value))}
          >
            <SelectTrigger className="w-full md:w-[200px] bg-white">
              <SelectValue placeholder="Todos os pacientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pacientes</SelectItem>
              {data?.patients?.map((patient: any) => (
                <SelectItem key={patient.id} value={patient.id.toString()}>
                  {patient.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="bg-white" onClick={handleExportPDF}>
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engajamento Médio</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.sessionStats?.total > 0
                ? Math.round(((data.sessionStats.byStatus?.realizada || 0) / data.sessionStats.total) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
              +5% vs. mês passado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.patients?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {selectedPatient ? "Paciente selecionado" : "Total de pacientes"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões Realizadas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.sessionStats?.byStatus?.realizada || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data?.sessionStats?.byStatus?.cancelada || 0} cancelamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uso de Ferramentas SOS</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(data?.sosUsage || {}).reduce((acc: number, curr: any) => acc + (curr.count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Usos no período</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para diferentes visualizações */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="individual">Relatório Individual</TabsTrigger>
          <TabsTrigger value="export">Exportar Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {data && <AdvancedCharts data={data} period={period} onPeriodChange={setPeriod} />}
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          {selectedPatient ? (
            <PatientReport patientId={selectedPatient} />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Selecione um Paciente</h3>
                <p className="text-slate-600 mb-4">
                  Escolha um paciente no filtro acima para visualizar seu relatório individual detalhado.
                </p>
                <Select onValueChange={(value) => setSelectedPatient(Number.parseInt(value))}>
                  <SelectTrigger className="w-64 mx-auto">
                    <SelectValue placeholder="Selecionar paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {data?.patients?.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Relatórios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button onClick={handleExportPDF} className="h-20 flex-col">
                  <Download className="w-6 h-6 mb-2" />
                  Relatório Completo (PDF)
                </Button>
                <Button variant="outline" className="h-20 flex-col bg-transparent">
                  <FileText className="w-6 h-6 mb-2" />
                  Dados Brutos (CSV)
                </Button>
              </div>
              <div className="text-sm text-slate-600">
                <p>• O relatório PDF inclui todos os gráficos e estatísticas</p>
                <p>• Os dados CSV podem ser importados em planilhas</p>
                <p>• Todos os dados são filtrados pelo período selecionado</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
