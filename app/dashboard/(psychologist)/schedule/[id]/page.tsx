"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, User, MapPin, Video, ArrowLeft, Edit, Trash2, Loader2, FileText, Mail } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useTranslations } from "@/lib/i18n"

interface Session {
  id: number
  sessionDate: string
  durationMinutes: number
  type: "online" | "presencial"
  status: "agendada" | "confirmada" | "realizada" | "cancelada"
  notes?: string
  createdAt: string
  updatedAt: string
  patient: {
    id: number
    name: string
    email: string
    currentCycle: string
  }
}

export default function SessionDetailsPage() {
  const t = useTranslations("psychologist.sessionDetailPage")
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (sessionId) {
      fetchSession()
    }
  }, [sessionId])

  const fetchSession = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/psychologist/sessions/${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setSession(data)
      } else {
        toast.error(t("toast.notFound"))
        router.push("/dashboard/schedule")
      }
    } catch (error) {
      console.error("Error fetching session:", error)
      toast.error(t("toast.loadError"))
      router.push("/dashboard/schedule")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t("toast.deleteConfirm"))) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/psychologist/sessions/${sessionId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast.success(t("toast.deleteSuccess"))
        router.push("/dashboard/schedule")
      } else {
        const error = await res.json()
        toast.error(error.error || t("toast.deleteError"))
      }
    } catch (error) {
      console.error("Error deleting session:", error)
      toast.error(t("toast.deleteError"))
    } finally {
      setDeleting(false)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#2D9B9B]" />
          <span>{t("loading")}</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{t("notFound")}</h2>
        <p className="text-gray-600 mb-4">{t("notFoundDescription")}</p>
        <Button asChild>
          <Link href="/dashboard/schedule">{t("backToSchedule")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/schedule">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("back")}
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{t("title")}</h1>
            <p className="text-gray-600">{t("subtitle")}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(session.status)} variant="secondary">
            {session.status}
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/schedule/${session.id}/edit`}>
              <Edit className="w-4 h-4 mr-2" />
              {t("edit")}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting || session.status === "realizada"}
            className="text-red-600 hover:text-red-700 bg-transparent"
          >
            {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            {t("delete")}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Informações Principais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados da Sessão */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-[#2D9B9B]" />
                {t("sessionInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">{t("dateTime")}</h3>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">
                        {new Date(session.sessionDate).toLocaleDateString("pt-BR", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">
                        {new Date(session.sessionDate).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">{t("duration")}</h3>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{session.durationMinutes} minutos</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">{t("sessionType")}</h3>
                    <div className="flex items-center space-x-2">
                      {session.type === "online" ? (
                        <Video className="w-4 h-4 text-gray-400" />
                      ) : (
                        <MapPin className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="font-medium capitalize">{session.type}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">{t("status")}</h3>
                    <Badge className={getStatusColor(session.status)} variant="secondary">
                      {session.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {session.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">{t("observations")}</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                      <p className="text-gray-700">{session.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("history")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{t("sessionCreated")}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(session.createdAt).toLocaleDateString("pt-BR")} às{" "}
                      {new Date(session.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {session.updatedAt !== session.createdAt && (
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{t("lastUpdate")}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(session.updatedAt).toLocaleDateString("pt-BR")} às{" "}
                        {new Date(session.updatedAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Informações do Paciente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("patient")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3 mb-4">
                <User className="w-10 h-10 text-gray-400" />
                <div>
                  <h3 className="font-semibold text-gray-800">{session.patient.name}</h3>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getCycleColor(session.patient.currentCycle)}`}></div>
                    <span className="text-sm text-gray-600">{session.patient.currentCycle}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{session.patient.email}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                  <Link href={`/dashboard/patients/${session.patient.id}`}>{t("viewFullProfile")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("quickActions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                <Link href={`/dashboard/patients/${session.patient.id}/chat`}>
                  <Mail className="w-4 h-4 mr-2" />
                  {t("sendMessage")}
                </Link>
              </Button>

              <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                <Link href={`/dashboard/schedule/new?patientId=${session.patient.id}`}>
                  <Calendar className="w-4 h-4 mr-2" />
                  {t("newSession")}
                </Link>
              </Button>

              {session.type === "online" && (
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  <Video className="w-4 h-4 mr-2" />
                  {t("startVideoCall")}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Informações Técnicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("technicalInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">{t("sessionId")}</p>
                <p className="font-mono text-sm">{session.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t("createdAt")}</p>
                <p className="text-sm">
                  {new Date(session.createdAt).toLocaleDateString("pt-BR")} às{" "}
                  {new Date(session.createdAt).toLocaleTimeString("pt-BR")}
                </p>
              </div>
              {session.updatedAt !== session.createdAt && (
                <div>
                  <p className="text-sm text-gray-600">{t("updatedAt")}</p>
                  <p className="text-sm">
                    {new Date(session.updatedAt).toLocaleDateString("pt-BR")} às{" "}
                    {new Date(session.updatedAt).toLocaleTimeString("pt-BR")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
