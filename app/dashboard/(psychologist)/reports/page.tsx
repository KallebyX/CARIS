"use client"

import { useState, useEffect, Suspense } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Users, Activity, TrendingUp, Download, FileText, Loader2 } from "lucide-react"
import { useTranslations } from "@/lib/i18n"

// Dynamic imports for heavy chart components to reduce initial bundle size
const AdvancedCharts = dynamic(
  () => import("@/components/reports/advanced-charts").then(mod => ({ default: mod.AdvancedCharts })),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
          <p className="mt-2 text-slate-600">Carregando gráficos...</p>
        </CardContent>
      </Card>
    ),
  }
)

const PatientReport = dynamic(
  () => import("@/components/reports/patient-report").then(mod => ({ default: mod.PatientReport })),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
          <p className="mt-2 text-slate-600">Carregando relatório...</p>
        </CardContent>
      </Card>
    ),
  }
)

export default function ReportsPage() {
  const t = useTranslations("psychologist.reportsPage")
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
            <h1 className="text-3xl font-bold text-slate-800">{t("title")}</h1>
            <p className="text-slate-600">{t("loading")}</p>
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
          <h1 className="text-3xl font-bold text-slate-800">{t("title")}</h1>
          <p className="text-slate-600">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedPatient?.toString() || "all"}
            onValueChange={(value) => setSelectedPatient(value === "all" ? null : Number.parseInt(value))}
          >
            <SelectTrigger className="w-full md:w-[200px] bg-white">
              <SelectValue placeholder={t("allPatients")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allPatients")}</SelectItem>
              {data?.patients?.map((patient: any) => (
                <SelectItem key={patient.id} value={patient.id.toString()}>
                  {patient.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="bg-white" onClick={handleExportPDF}>
            <Download className="w-4 h-4 mr-2" />
            {t("exportPdf")}
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.avgEngagement")}</CardTitle>
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
              {t("stats.vsLastMonth")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.activePatients")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.patients?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {selectedPatient ? t("selectedPatient") : t("totalPatients")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.sessionsCompleted")}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.sessionStats?.byStatus?.realizada || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t("stats.cancellations", { count: data?.sessionStats?.byStatus?.cancelada || 0 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.sosToolsUsage")}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(data?.sosUsage || {}).reduce((acc: number, curr: any) => acc + (curr.count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">{t("stats.usesInPeriod")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="individual">{t("tabs.individual")}</TabsTrigger>
          <TabsTrigger value="export">{t("tabs.export")}</TabsTrigger>
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
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{t("individual.selectPatient")}</h3>
                <p className="text-slate-600 mb-4">
                  {t("individual.selectDescription")}
                </p>
                <Select onValueChange={(value) => setSelectedPatient(Number.parseInt(value))}>
                  <SelectTrigger className="w-64 mx-auto">
                    <SelectValue placeholder={t("individual.selectPlaceholder")} />
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
              <CardTitle>{t("export.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button onClick={handleExportPDF} className="h-20 flex-col">
                  <Download className="w-6 h-6 mb-2" />
                  {t("export.fullReportPdf")}
                </Button>
                <Button variant="outline" className="h-20 flex-col bg-transparent">
                  <FileText className="w-6 h-6 mb-2" />
                  {t("export.rawDataCsv")}
                </Button>
              </div>
              <div className="text-sm text-slate-600">
                <p>• {t("export.notes.pdf")}</p>
                <p>• {t("export.notes.csv")}</p>
                <p>• {t("export.notes.filter")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
