"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Video, MapPin, Clock, Plus } from "lucide-react"

interface Session {
  id: number
  sessionDate: string
  durationMinutes: number
  type: "online" | "presencial"
  status: "agendada" | "confirmada" | "realizada" | "cancelada"
  notes?: string
  psychologist: {
    name: string
  }
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/patient/sessions")
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      }
    } catch (error) {
      console.error("Erro ao carregar sessões:", error)
    } finally {
      setLoading(false)
    }
  }

  const isUpcoming = (sessionDate: string) => {
    return new Date(sessionDate) > new Date()
  }

  const upcomingSessions = sessions.filter((s) => isUpcoming(s.sessionDate))
  const pastSessions = sessions.filter((s) => !isUpcoming(s.sessionDate))

  const getStatusColor = (status: string) => {
    const colors = {
      confirmada: "bg-green-100 text-green-800",
      agendada: "border-yellow-500 text-yellow-600",
      realizada: "bg-slate-100 text-slate-800",
      cancelada: "bg-red-100 text-red-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const SessionCard = ({ session }: { session: Session }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-3 rounded-lg">
            <Calendar className="w-6 h-6 text-caris-teal" />
          </div>
          <div>
            <p className="font-bold text-slate-800">
              {new Date(session.sessionDate).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(session.sessionDate).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="flex items-center gap-1">
                {session.type === "online" ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                {session.type === "online" ? "Online" : "Presencial"}
              </span>
              <span className="text-xs">{session.durationMinutes}min</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Com {session.psychologist.name}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Badge
            variant={session.status === "confirmada" || session.status === "realizada" ? "default" : "outline"}
            className={getStatusColor(session.status)}
          >
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </Badge>
          {isUpcoming(session.sessionDate) && session.type === "online" && session.status === "confirmada" && (
            <Button size="sm" className="bg-caris-orange hover:bg-caris-orange/90">
              Entrar na Sessão
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caris-teal mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando suas sessões...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Minhas Sessões</h1>
          <p className="text-slate-600">Acompanhe seus agendamentos e histórico.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Solicitar Agendamento
        </Button>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-slate-700 mb-4">Próximas Sessões</h2>
        <div className="space-y-4">
          {upcomingSessions.length > 0 ? (
            upcomingSessions.map((session) => <SessionCard key={session.id} session={session} />)
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">Nenhuma sessão futura agendada.</p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Solicitar Agendamento
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-slate-700 mb-4">Sessões Anteriores</h2>
        <div className="space-y-4">
          {pastSessions.length > 0 ? (
            pastSessions.map((session) => <SessionCard key={session.id} session={session} />)
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-slate-500">Nenhuma sessão anterior encontrada.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
