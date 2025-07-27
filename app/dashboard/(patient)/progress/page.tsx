"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, CheckCircle, Heart, Calendar, TrendingUp, Clock, Target, Star, Award } from "lucide-react"
import { EmotionalMap } from "@/components/emotional-map"
import { GamificationSummary } from "@/components/gamification/gamification-summary"

interface ProgressData {
  stats: {
    diary: { total: number; recent: number }
    tasks: { total: number; completed: number; pending: number; inProgress: number }
    sos: { total: number; recent: number; totalMinutes: number }
    sessions: { total: number; completed: number; upcoming: number }
  }
  achievements: Array<{
    id: number
    type: string
    title: string
    description: string
    unlockedAt: string
  }>
  achievementProgress: {
    firstEntry: boolean
    weekStreak: boolean
    sosUsage: boolean
    taskCompletion: boolean
    monthlyGoal: boolean
  }
  emotionalMapData: Array<{
    id: number
    mood: number
    energy: number
    anxiety: number
    date: string
    notes?: string
  }>
  recentTasks: Array<{
    id: number
    title: string
    description: string
    status: string
    priority: string
    dueDate: string
    psychologist: { name: string }
  }>
}

interface Task {
  id: number
  title: string
  description: string
  status: string
  priority: string
  dueDate: string
  psychologist: { name: string }
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProgressData()
  }, [])

  const fetchProgressData = async () => {
    try {
      const response = await fetch("/api/patient/progress")
      if (response.ok) {
        const progressData = await response.json()
        setData(progressData)
      }
    } catch (error) {
      console.error("Erro ao carregar dados de progresso:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      const response = await fetch("/api/patient/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      })

      if (response.ok) {
        // Recarregar dados
        fetchProgressData()
      }
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error)
    }
  }

  const getTaskStatusColor = (status: string) => {
    const colors = {
      pendente: "bg-yellow-100 text-yellow-800",
      em_progresso: "bg-blue-100 text-blue-800",
      concluida: "bg-green-100 text-green-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      baixa: "border-green-200",
      media: "border-yellow-200",
      alta: "border-red-200",
    }
    return colors[priority as keyof typeof colors] || "border-gray-200"
  }

  const achievements = [
    {
      id: "firstEntry",
      title: "Primeira Entrada",
      description: "Fez sua primeira entrada no diário",
      icon: BookOpen,
      unlocked: data?.achievementProgress.firstEntry || false,
    },
    {
      id: "weekStreak",
      title: "Semana Consistente",
      description: "7 dias consecutivos de entradas no diário",
      icon: Calendar,
      unlocked: data?.achievementProgress.weekStreak || false,
    },
    {
      id: "sosUsage",
      title: "Ato de Coragem",
      description: "Usou as ferramentas SOS quando precisou",
      icon: Heart,
      unlocked: data?.achievementProgress.sosUsage || false,
    },
    {
      id: "taskCompletion",
      title: "Primeira Tarefa",
      description: "Concluiu sua primeira tarefa terapêutica",
      icon: CheckCircle,
      unlocked: data?.achievementProgress.taskCompletion || false,
    },
    {
      id: "monthlyGoal",
      title: "Meta Mensal",
      description: "Atingiu sua meta mensal de progresso",
      icon: Target,
      unlocked: data?.achievementProgress.monthlyGoal || false,
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caris-teal mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando seu progresso...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Erro ao carregar dados de progresso.</p>
        <Button onClick={fetchProgressData} className="mt-4">
          Tentar Novamente
        </Button>
      </div>
    )
  }

  const completionRate =
    data.stats.tasks.total > 0 ? Math.round((data.stats.tasks.completed / data.stats.tasks.total) * 100) : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Meu Progresso</h1>
        <p className="text-slate-600">Acompanhe sua jornada de crescimento e bem-estar.</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Entradas no Diário</p>
                <p className="text-2xl font-bold text-slate-800">{data.stats.diary.total}</p>
                <p className="text-xs text-slate-500">{data.stats.diary.recent} nos últimos 30 dias</p>
              </div>
              <BookOpen className="w-8 h-8 text-caris-teal" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Tarefas Concluídas</p>
                <p className="text-2xl font-bold text-slate-800">{data.stats.tasks.completed}</p>
                <p className="text-xs text-slate-500">{completionRate}% de conclusão</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Uso do SOS</p>
                <p className="text-2xl font-bold text-slate-800">{data.stats.sos.total}</p>
                <p className="text-xs text-slate-500">{data.stats.sos.totalMinutes} minutos totais</p>
              </div>
              <Heart className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Sessões</p>
                <p className="text-2xl font-bold text-slate-800">{data.stats.sessions.completed}</p>
                <p className="text-xs text-slate-500">{data.stats.sessions.upcoming} próximas</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          <TabsTrigger value="emotional">Mapa Emocional</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Gamification Summary */}
            <GamificationSummary />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-caris-teal" />
                  Progresso Geral
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Conclusão de Tarefas</span>
                    <span>{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Atividade no Diário</span>
                    <span>{Math.min(100, (data.stats.diary.recent / 30) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={Math.min(100, (data.stats.diary.recent / 30) * 100)} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Uso de Ferramentas SOS</span>
                    <span>{Math.min(100, data.stats.sos.recent * 10)}%</span>
                  </div>
                  <Progress value={Math.min(100, data.stats.sos.recent * 10)} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Conquistas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.achievements.length > 0 ? (
                  <div className="space-y-3">
                    {data.achievements.slice(0, 3).map((achievement) => (
                      <div key={achievement.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                        <Award className="w-6 h-6 text-yellow-600" />
                        <div>
                          <p className="font-medium text-slate-800">{achievement.title}</p>
                          <p className="text-sm text-slate-600">{achievement.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-slate-500 mb-2">Continue sua jornada para desbloquear conquistas!</p>
                    <p className="text-sm text-slate-400">Experimente o novo dashboard gamificado para ver todas as suas conquistas.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Minhas Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentTasks.length > 0 ? (
                <div className="space-y-4">
                  {data.recentTasks.map((task) => (
                    <div key={task.id} className={`border rounded-lg p-4 ${getPriorityColor(task.priority)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800">{task.title}</h3>
                          {task.description && <p className="text-sm text-slate-600 mt-1">{task.description}</p>}
                          <div className="flex items-center gap-4 mt-2">
                            <Badge className={getTaskStatusColor(task.status)}>{task.status.replace("_", " ")}</Badge>
                            <span className="text-xs text-slate-500">Por: {task.psychologist.name}</span>
                            {task.dueDate && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(task.dueDate).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {task.status === "pendente" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTaskStatus(task.id, "em_progresso")}
                            >
                              Iniciar
                            </Button>
                          )}
                          {task.status === "em_progresso" && (
                            <Button size="sm" onClick={() => updateTaskStatus(task.id, "concluida")}>
                              Concluir
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">
                  Nenhuma tarefa encontrada. Seu psicólogo pode prescrever tarefas durante as sessões.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((achievement) => {
              const IconComponent = achievement.icon
              return (
                <Card
                  key={achievement.id}
                  className={achievement.unlocked ? "border-yellow-200 bg-yellow-50" : "opacity-60"}
                >
                  <CardContent className="p-6 text-center">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                        achievement.unlocked ? "bg-yellow-100" : "bg-gray-100"
                      }`}
                    >
                      <IconComponent
                        className={`w-8 h-8 ${achievement.unlocked ? "text-yellow-600" : "text-gray-400"}`}
                      />
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-2">{achievement.title}</h3>
                    <p className="text-sm text-slate-600">{achievement.description}</p>
                    {achievement.unlocked && <Badge className="mt-3 bg-yellow-100 text-yellow-800">Desbloqueada</Badge>}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="emotional" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mapa Emocional - Últimos 30 Dias</CardTitle>
            </CardHeader>
            <CardContent>
              <EmotionalMap data={data.emotionalMapData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
