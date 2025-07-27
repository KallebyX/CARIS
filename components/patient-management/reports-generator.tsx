"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileText, Download, Plus, Calendar, User } from "lucide-react"
import { toast } from "react-hot-toast"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface Report {
  id: number
  reportType: string
  format: string
  filePath: string
  generatedAt: string
  parameters?: string
  patient?: {
    id: number
    name: string
  }
}

interface ReportData {
  reportType: string
  generatedAt: string
  period: string
  [key: string]: any
}

interface ReportsGeneratorProps {
  patientId?: number
  patientName?: string
}

export function ReportsGenerator({ patientId, patientName }: ReportsGeneratorProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [previewData, setPreviewData] = useState<ReportData | null>(null)
  const reportPreviewRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    reportType: "",
    format: "pdf",
    patientId: patientId?.toString() || "",
  })

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const response = await fetch("/api/psychologist/reports")
      if (response.ok) {
        const data = await response.json()
        setReports(data.data || [])
      } else {
        toast.error("Erro ao carregar relatórios")
      }
    } catch (error) {
      toast.error("Erro ao carregar relatórios")
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    if (!formData.reportType || !formData.format) {
      toast.error("Selecione o tipo de relatório e formato")
      return
    }

    setGenerating(true)
    try {
      const response = await fetch("/api/psychologist/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportType: formData.reportType,
          format: formData.format,
          patientId: formData.patientId || null,
          parameters: {},
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPreviewData(data.data.reportData)
        toast.success("Relatório gerado com sucesso!")
        fetchReports()
      } else {
        toast.error("Erro ao gerar relatório")
      }
    } catch (error) {
      toast.error("Erro ao gerar relatório")
    } finally {
      setGenerating(false)
    }
  }

  const downloadReportPDF = async () => {
    if (!reportPreviewRef.current || !previewData) return

    try {
      const canvas = await html2canvas(reportPreviewRef.current, {
        scale: 2,
        useCORS: true,
      })
      
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`relatorio_${previewData.reportType.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}.pdf`)
      toast.success("PDF baixado com sucesso!")
    } catch (error) {
      toast.error("Erro ao gerar PDF")
    }
  }

  const getReportTypeLabel = (type: string) => {
    const types = {
      patient_progress: "Progresso do Paciente",
      monthly_summary: "Resumo Mensal",
      goal_analysis: "Análise de Metas",
    }
    return types[type as keyof typeof types] || type
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Gerador de Relatórios
                {patientName && <span className="text-teal-600">- {patientName}</span>}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Gere relatórios detalhados em PDF ou DOC
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Relatório
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Gerar Novo Relatório</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="reportType">Tipo de Relatório</Label>
                      <Select
                        value={formData.reportType}
                        onValueChange={(value) => setFormData({ ...formData, reportType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="patient_progress">Progresso do Paciente</SelectItem>
                          <SelectItem value="monthly_summary">Resumo Mensal</SelectItem>
                          <SelectItem value="goal_analysis">Análise de Metas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="format">Formato</Label>
                      <Select
                        value={formData.format}
                        onValueChange={(value) => setFormData({ ...formData, format: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="doc">DOC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {!patientId && (
                      <div>
                        <Label htmlFor="patientId">ID do Paciente (opcional)</Label>
                        <Input
                          id="patientId"
                          value={formData.patientId}
                          onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                          placeholder="Deixe vazio para relatório geral"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={generateReport}
                      disabled={generating}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {generating ? "Gerando..." : "Gerar Relatório"}
                    </Button>
                  </div>

                  {previewData && (
                    <div className="border-t pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Pré-visualização do Relatório</h3>
                        <Button onClick={downloadReportPDF} className="bg-blue-600 hover:bg-blue-700">
                          <Download className="w-4 h-4 mr-2" />
                          Baixar PDF
                        </Button>
                      </div>
                      
                      <div 
                        ref={reportPreviewRef}
                        className="bg-white p-8 border rounded-lg max-h-96 overflow-y-auto"
                      >
                        <ReportPreview data={previewData} />
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Carregando relatórios...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum relatório gerado ainda.</p>
              <p className="text-sm">Clique em "Novo Relatório" para começar.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Relatório</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Data de Geração</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-teal-600" />
                          {getReportTypeLabel(report.reportType)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {report.patient ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            {report.patient.name}
                          </div>
                        ) : (
                          <span className="text-gray-500">Relatório Geral</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase">
                          {report.format}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          {formatDate(report.generatedAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Download className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ReportPreview({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">CÁRIS - Sistema de Saúde Mental</h1>
        <h2 className="text-xl font-semibold text-teal-600 mt-2">{data.reportType}</h2>
        <p className="text-gray-600 mt-1">
          Período: {data.period} | Gerado em: {new Date(data.generatedAt).toLocaleDateString("pt-BR")}
        </p>
      </div>

      {data.patient && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">Informações do Paciente</h3>
          <p><strong>Nome:</strong> {data.patient.name}</p>
          <p><strong>Email:</strong> {data.patient.email}</p>
          {data.patient.patientProfile?.currentCycle && (
            <p><strong>Ciclo Atual:</strong> {data.patient.patientProfile.currentCycle}</p>
          )}
        </div>
      )}

      {data.metrics && data.metrics.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3">Métricas de Progresso</h3>
          <div className="grid grid-cols-2 gap-4">
            {data.metrics.map((metric: any, index: number) => (
              <div key={index} className="border rounded-lg p-3">
                <h4 className="font-medium">{metric.metricType}</h4>
                <p className="text-2xl font-bold text-teal-600">{metric.value}</p>
                <p className="text-sm text-gray-600">
                  {new Date(metric.calculatedAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.goals && data.goals.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3">Metas Terapêuticas</h3>
          <div className="space-y-3">
            {data.goals.map((goal: any, index: number) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">{goal.title}</h4>
                  <Badge className={goal.status === "completed" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
                    {goal.status}
                  </Badge>
                </div>
                {goal.description && <p className="text-gray-700 mb-2">{goal.description}</p>}
                {goal.targetValue && (
                  <div className="text-sm text-gray-600">
                    Progresso: {goal.currentValue} / {goal.targetValue} {goal.unit}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.sessions && data.sessions.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3">Sessões Realizadas</h3>
          <p className="text-gray-700">
            Total de sessões no período: <strong>{data.sessions.length}</strong>
          </p>
          <div className="mt-3 space-y-2">
            {data.sessions.slice(0, 5).map((session: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-2 border rounded">
                <span>{new Date(session.sessionDate).toLocaleDateString("pt-BR")}</span>
                <Badge variant="outline">{session.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.diaryEntries && data.diaryEntries.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3">Entradas do Diário</h3>
          <p className="text-gray-700 mb-3">
            Total de entradas no período: <strong>{data.diaryEntries.length}</strong>
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Análise de Humor</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Humor Médio</p>
                <p className="text-xl font-bold text-blue-600">
                  {(data.diaryEntries.reduce((sum: number, entry: any) => sum + (entry.moodRating || 0), 0) / data.diaryEntries.length).toFixed(1)}/10
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Intensidade Média</p>
                <p className="text-xl font-bold text-purple-600">
                  {(data.diaryEntries.reduce((sum: number, entry: any) => sum + (entry.intensityRating || 0), 0) / data.diaryEntries.length).toFixed(1)}/10
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-t pt-4 text-center text-sm text-gray-500">
        <p>Relatório gerado automaticamente pelo Sistema CÁRIS</p>
        <p>Este documento contém informações confidenciais de saúde mental</p>
      </div>
    </div>
  )
}