"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import {
  Calendar,
  Brain,
  BookOpen,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Download,
  Mail,
} from "lucide-react"

const COLORS = {
  primary: "#2D9B9B",
  secondary: "#F4A261",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
}

interface PatientReportProps {
  patientId: number
}

export function PatientReport({ patientId }: PatientReportProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/psychologist/reports/patient/${patientId}`)
        if (response.ok) {
          const reportData = await response.json()
          setData(reportData)
        }
      } catch (error) {
        console.error("Erro ao carregar relatório:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [patientId])

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando relatório...</div>
  }

  if (!data) {
    return <div className="flex items-center justify-center h-64">Erro ao carregar dados</div>
  }

  const { patient, stats, history, charts } = data

  const getCycleColor = (cycle: string) => {
    const colors = {
      Criar: "bg-emerald-500",
      Cuidar: "bg-blue-500",
      Crescer: "bg-purple-500",
      Curar: "bg-orange-500",
    }
    return colors[cycle as keyof typeof colors] || "bg-gray-500"
  }

  const getMoodTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <div className="w-4 h-4" />
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Paciente */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={patient.avatar || "/placeholder.svg"} />
                <AvatarFallback className="text-lg font-semibold">
                  {patient.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{patient.name}</h1>
                <p className="text-slate-600">{patient.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`${getCycleColor(patient.currentCycle)} text-white`}>{patient.currentCycle}</Badge>
                  <Badge variant="outline">
                    Paciente desde {new Date(patient.createdAt).toLocaleDateString("pt-BR")}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Enviar E-mail
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Sessões Realizadas</p>
                <p className="text-2xl font-bold text-slate-800">{stats.completedSessions}</p>
                <p className="text-xs text-slate-500">
                  {stats.totalSessions} agendadas • {stats.cancelledSessions} canceladas
                </p>
              </div>
              <Calendar className="w-8 h-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Humor Atual</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-slate-800">{stats.currentMood?.mood || "N/A"}/5</p>
                  {getMoodTrendIcon(stats.moodTrend)}
                </div>
                <p className="text-xs text-slate-500">
                  Energia: {stats.currentMood?.energy || "N/A"} • Ansiedade: {stats.currentMood?.anxiety || "N/A"}
                </p>
              </div>
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Entradas no Diário</p>
                <p className="text-2xl font-bold text-slate-800">{stats.diaryEntries}</p>
                <p className="text-xs text-slate-500">Humor médio: {stats.avgDiaryMood}/5</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Taxa de Conclusão</p>
                <p className="text-2xl font-bold text-slate-800">{stats.taskCompletionRate}%</p>
                <p className="text-xs text-slate-500">
                  {stats.tasksCompleted}/{stats.tasksTotal} tarefas
                </p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com Relatórios Detalhados */}
      <Tabs defaultValue="mood" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="mood">Humor</TabsTrigger>
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
          <TabsTrigger value="diary">Diário</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="sos">SOS</TabsTrigger>
        </TabsList>

        <TabsContent value="mood" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução do Humor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.moodChart}>
                    <defs>
                      <linearGradient id="colorHumor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis domain={[1, 5]} stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "none",
                        borderRadius: "8px",
                        color: "#f8fafc",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="humor"
                      stroke={COLORS.primary}
                      fillOpacity={1}
                      fill="url(#colorHumor)"
                      name="Humor"
                    />
                    <Line type="monotone" dataKey="energia" stroke={COLORS.secondary} strokeWidth={2} name="Energia" />
                    <Line type="monotone" dataKey="ansiedade" stroke={COLORS.danger} strokeWidth={2} name="Ansiedade" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Sessões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history.sessions.slice(0, 10).map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          session.status === "realizada"
                            ? "bg-green-500"
                            : session.status === "cancelada"
                              ? "bg-red-500"
                              : "bg-yellow-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium text-slate-800">
                          {new Date(session.sessionDate).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-sm text-slate-600">
                          {session.type} • {session.durationMinutes} min
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        session.status === "realizada"
                          ? "default"
                          : session.status === "cancelada"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {session.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Atividade no Diário</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.values(charts.diaryChart || {})}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "none",
                        borderRadius: "8px",
                        color: "#f8fafc",
                      }}
                    />
                    <Bar dataKey="entries" fill={COLORS.primary} name="Entradas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800">Entradas Recentes</h4>
                {history.diary.slice(0, 5).map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">{entry.title}</p>
                      <p className="text-sm text-slate-600">{new Date(entry.createdAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Humor: {entry.mood}/5</Badge>
                      {entry.isPrivate && <Badge variant="secondary">Privado</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progresso das Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.values(charts.taskChart || {})}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "none",
                        borderRadius: "8px",
                        color: "#f8fafc",
                      }}
                    />
                    <Bar dataKey="created" fill={COLORS.info} name="Criadas" />
                    <Bar dataKey="completed" fill={COLORS.success} name="Concluídas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800">Tarefas Recentes</h4>
                {history.tasks.slice(0, 5).map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {task.status === "concluida" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium text-slate-800">{task.title}</p>
                        <p className="text-sm text-slate-600">
                          {task.dueDate ? `Prazo: ${new Date(task.dueDate).toLocaleDateString("pt-BR")}` : "Sem prazo"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          task.priority === "alta" ? "destructive" : task.priority === "media" ? "default" : "secondary"
                        }
                      >
                        {task.priority}
                      </Badge>
                      <Badge variant={task.status === "concluida" ? "default" : "outline"}>{task.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Uso de Ferramentas SOS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(charts.sosChart || {}).flatMap(([month, tools]: [string, any]) =>
                        Object.entries(tools).map(([tool, count]) => ({
                          ferramenta:
                            tool === "breathing" ? "Respiração" : tool === "meditation" ? "Meditação" : "Grounding",
                          usos: count,
                          mes: month,
                        })),
                      )}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ ferramenta, percent }) => `${ferramenta} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="usos"
                    >
                      {Object.values(COLORS).map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800">Usos Recentes</h4>
                {history.sos.slice(0, 5).map((usage: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">
                        {usage.toolName === "breathing"
                          ? "Exercício de Respiração"
                          : usage.toolName === "meditation"
                            ? "Meditação Guiada"
                            : "Técnica de Grounding"}
                      </p>
                      <p className="text-sm text-slate-600">
                        {new Date(usage.createdAt).toLocaleDateString("pt-BR")} às{" "}
                        {new Date(usage.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Badge variant="outline">{usage.durationMinutes || 0} min</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
