"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  Filter,
  Search,
  Edit,
  Trash2,
  Eye,
  BarChart3,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Session {
  id: number
  sessionDate: string
  durationMinutes: number
  type: "online" | "presencial"
  status: "agendada" | "confirmada" | "realizada" | "cancelada"
  notes?: string
  patient: {
    id: number
    name: string
    email: string
    currentCycle: string
  }
}

interface SessionStats {
  total: number
  agendadas: number
  confirmadas: number
  realizadas: number
  canceladas: number
  online: number
  presencial: number
  totalHours: number
}

interface ScheduleStats {
  overview: {
    totalSessions: number
    weekSessions: number
    monthSessions: number
    hoursThisMonth: number
    activePatients: number
  }
  sessionsByStatus: Record<string, number>
  sessionsByType: Record<string, number>
  upcomingSessions: Session[]
  weekdayStats: Array<{ day: string; count: number }>
}

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState("week")
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [scheduleStats, setScheduleStats] = useState<ScheduleStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  // Filtros
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    patientId: "",
    startDate: "",
    endDate: "",
  })

  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchSessions()
    fetchScheduleStats()
  }, [filters])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()

      if (filters.status !== "all") params.append("status", filters.status)
      if (filters.type !== "all") params.append("type", filters.type)
      if (filters.patientId) params.append("patientId", filters.patientId)
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)

      const res = await fetch(`/api/psychologist/sessions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions)
        setStats(data.stats)
      } else {
        toast.error("Erro ao carregar sessões")
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error)
      toast.error("Erro ao carregar sessões")
    } finally {
      setLoading(false)
    }
  }

  const fetchScheduleStats = async () => {
    try {
      const res = await fetch("/api/psychologist/schedule/stats")
      if (res.ok) {
        const data = await res.json()
        setScheduleStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch schedule stats:", error)
    }
  }

  const deleteSession = async (sessionId: number) => {
    if (!confirm("Tem certeza que deseja deletar esta sessão?")) return

    try {
      const res = await fetch(`/api/psychologist/sessions/${sessionId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast.success("Sessão deletada com sucesso")
        fetchSessions()
        fetchScheduleStats()
      } else {
        const error = await res.json()
        toast.error(error.error || "Erro ao deletar sessão")
      }
    } catch (error) {
      console.error("Error deleting session:", error)
      toast.error("Erro ao deletar sessão")
    }
  }

  const updateSessionStatus = async (sessionId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/psychologist/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        toast.success("Status atualizado com sucesso")
        fetchSessions()
        fetchScheduleStats()
      } else {
        const error = await res.json()
        toast.error(error.error || "Erro ao atualizar status")
      }
    } catch (error) {
      console.error("Error updating session:", error)
      toast.error("Erro ao atualizar status")
    }
  }

  const getCycleColor = (cycle: string) => {
    const colors = {
      Criar: "bg-emerald-500",
      Cuidar: "bg-blue-500",
      Crescer: "bg-purple-500",
      Curar: "bg-orange-500",
    }
    return colors[cycle as keyof typeof colors] || "bg-gray-500"
  }

  const getStatusColor = (status: string) => {
    const colors = {
      confirmada: "bg-green-100 text-green-800",
      agendada: "bg-yellow-100 text-yellow-800",
      cancelada: "bg-red-100 text-red-800",
      realizada: "bg-blue-100 text-blue-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  const filteredSessions = sessions.filter(
    (session) =>
      session.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.patient.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const todaySessions = filteredSessions.filter(
    (session) => new Date(session.sessionDate).toDateString() === new Date().toDateString(),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Agenda</h1>
          <p className="text-gray-600">Gerencie suas sessões e compromissos</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Sincronizar Google
          </Button>
          <Button className="bg-[#2D9B9B] hover:bg-[#238B8B]" asChild>
            <Link href="/dashboard/schedule/new">
              <Plus className="w-4 h-4 mr-2" />
              Nova Sessão
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="agendada">Agendada</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="realizada">Realizada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type-filter">Tipo</Label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="start-date">Data Início</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="end-date">Data Fim</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="search">Buscar Paciente</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="search"
                    placeholder="Nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas Rápidas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
              <p className="text-sm text-gray-600">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.agendadas}</div>
              <p className="text-sm text-gray-600">Agendadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.confirmadas}</div>
              <p className="text-sm text-gray-600">Confirmadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.realizadas}</div>
              <p className="text-sm text-gray-600">Realizadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.canceladas}</div>
              <p className="text-sm text-gray-600">Canceladas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.online}</div>
              <p className="text-sm text-gray-600">Online</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-[#2D9B9B]">{stats.totalHours}h</div>
              <p className="text-sm text-gray-600">Horas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Sessões */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-[#2D9B9B]" />
                  Sessões ({filteredSessions.length})
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => navigateDate("prev")}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                    Hoje
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateDate("next")}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Carregando sessões...</div>
              ) : filteredSessions.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma sessão encontrada</p>
                  <Button className="mt-4 bg-[#2D9B9B] hover:bg-[#238B8B]" asChild>
                    <Link href="/dashboard/schedule/new">Agendar Sessão</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredSessions.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div
                            className={`w-4 h-4 rounded-full mt-1 ${getCycleColor(session.patient.currentCycle)}`}
                          ></div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold text-gray-800">{session.patient.name}</h3>
                              <Badge className={getStatusColor(session.status)}>{session.status}</Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {new Date(session.sessionDate).toLocaleDateString("pt-BR")} às{" "}
                                {new Date(session.sessionDate).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                ({session.durationMinutes}min)
                              </div>
                              <div className="flex items-center">
                                {session.type === "presencial" ? (
                                  <MapPin className="w-4 h-4 mr-1" />
                                ) : (
                                  <Video className="w-4 h-4 mr-1" />
                                )}
                                {session.type}
                              </div>
                              <div className="flex items-center">
                                <div
                                  className={`w-2 h-2 rounded-full mr-1 ${getCycleColor(session.patient.currentCycle)}`}
                                ></div>
                                {session.patient.currentCycle}
                              </div>
                            </div>
                            {session.notes && <p className="text-sm text-gray-600">{session.notes}</p>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Select
                            value={session.status}
                            onValueChange={(value) => updateSessionStatus(session.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="agendada">Agendada</SelectItem>
                              <SelectItem value="confirmada">Confirmada</SelectItem>
                              <SelectItem value="realizada">Realizada</SelectItem>
                              <SelectItem value="cancelada">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/schedule/${session.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/schedule/${session.id}/edit`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteSession(session.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar com estatísticas */}
        <div className="space-y-6">
          {scheduleStats && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Resumo Geral
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Esta Semana</span>
                    <span className="font-semibold text-gray-800">{scheduleStats.overview.weekSessions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Este Mês</span>
                    <span className="font-semibold text-gray-800">{scheduleStats.overview.monthSessions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Horas/Mês</span>
                    <span className="font-semibold text-gray-800">{scheduleStats.overview.hoursThisMonth}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Pacientes Ativos</span>
                    <span className="font-semibold text-gray-800">{scheduleStats.overview.activePatients}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Próximas Sessões</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {scheduleStats.upcomingSessions.slice(0, 5).map((session) => (
                      <div key={session.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                        <div className={`w-3 h-3 rounded-full ${getCycleColor(session.patient.currentCycle)}`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{session.patient.name}</p>
                          <p className="text-xs text-gray-600">
                            {new Date(session.sessionDate).toLocaleDateString("pt-BR")} às{" "}
                            {new Date(session.sessionDate).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Badge className={getStatusColor(session.status)} variant="secondary">
                          {session.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  {scheduleStats.upcomingSessions.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Nenhuma sessão próxima</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
