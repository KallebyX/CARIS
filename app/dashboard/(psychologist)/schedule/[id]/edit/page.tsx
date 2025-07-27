"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, MapPin, Video, AlertCircle, CheckCircle, ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

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

interface FormData {
  sessionDate: string
  sessionTime: string
  durationMinutes: string
  type: "online" | "presencial"
  status: "agendada" | "confirmada" | "realizada" | "cancelada"
  notes: string
}

export default function EditSessionPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    sessionDate: "",
    sessionTime: "",
    durationMinutes: "50",
    type: "online",
    status: "agendada",
    notes: "",
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})

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

        // Preencher formulário com dados existentes
        const sessionDate = new Date(data.sessionDate)
        setFormData({
          sessionDate: sessionDate.toISOString().split("T")[0],
          sessionTime: sessionDate.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          durationMinutes: data.durationMinutes.toString(),
          type: data.type,
          status: data.status,
          notes: data.notes || "",
        })
      } else {
        toast.error("Sessão não encontrada")
        router.push("/dashboard/schedule")
      }
    } catch (error) {
      console.error("Error fetching session:", error)
      toast.error("Erro ao carregar sessão")
      router.push("/dashboard/schedule")
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.sessionDate) {
      newErrors.sessionDate = "Selecione uma data"
    }

    if (!formData.sessionTime) {
      newErrors.sessionTime = "Selecione um horário"
    }

    if (!formData.durationMinutes || Number.parseInt(formData.durationMinutes) < 15) {
      newErrors.durationMinutes = "Duração deve ser de pelo menos 15 minutos"
    }

    if (!formData.type) {
      newErrors.type = "Selecione o tipo de sessão"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error("Por favor, corrija os erros no formulário")
      return
    }

    setSubmitting(true)
    try {
      // Combinar data e horário
      const [hours, minutes] = formData.sessionTime.split(":")
      const sessionDateTime = new Date(formData.sessionDate)
      sessionDateTime.setHours(Number.parseInt(hours), Number.parseInt(minutes), 0, 0)

      const updateData = {
        sessionDate: sessionDateTime.toISOString(),
        durationMinutes: Number.parseInt(formData.durationMinutes),
        type: formData.type,
        status: formData.status,
        notes: formData.notes || undefined,
      }

      const res = await fetch(`/api/psychologist/sessions/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      if (res.ok) {
        toast.success("Sessão atualizada com sucesso!")
        router.push("/dashboard/schedule")
      } else {
        const error = await res.json()
        toast.error(error.error || "Erro ao atualizar sessão")
      }
    } catch (error) {
      console.error("Error updating session:", error)
      toast.error("Erro ao atualizar sessão")
    } finally {
      setSubmitting(false)
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
          <span>Carregando sessão...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Sessão não encontrada</h2>
        <p className="text-gray-600 mb-4">A sessão que você está procurando não existe ou foi removida.</p>
        <Button asChild>
          <Link href="/dashboard/schedule">Voltar para Agenda</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/schedule">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Editar Sessão</h1>
          <p className="text-gray-600">Modifique os detalhes da sessão</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-[#2D9B9B]" />
                Detalhes da Sessão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informações do Paciente (somente leitura) */}
                <div className="space-y-2">
                  <Label>Paciente</Label>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <User className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-800">{session.patient.name}</p>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getCycleColor(session.patient.currentCycle)}`}></div>
                        <p className="text-sm text-gray-600">{session.patient.currentCycle}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data e Horário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessionDate">Data da Sessão *</Label>
                    <Input
                      id="sessionDate"
                      type="date"
                      value={formData.sessionDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sessionDate: e.target.value }))}
                      className={errors.sessionDate ? "border-red-500" : ""}
                    />
                    {errors.sessionDate && (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.sessionDate}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessionTime">Horário *</Label>
                    <Input
                      id="sessionTime"
                      type="time"
                      value={formData.sessionTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sessionTime: e.target.value }))}
                      className={errors.sessionTime ? "border-red-500" : ""}
                    />
                    {errors.sessionTime && (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.sessionTime}
                      </p>
                    )}
                  </div>
                </div>

                {/* Duração */}
                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (minutos) *</Label>
                  <Select
                    value={formData.durationMinutes}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, durationMinutes: value }))}
                  >
                    <SelectTrigger className={errors.durationMinutes ? "border-red-500" : ""}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="45">45 minutos</SelectItem>
                      <SelectItem value="50">50 minutos</SelectItem>
                      <SelectItem value="60">60 minutos</SelectItem>
                      <SelectItem value="90">90 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.durationMinutes && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.durationMinutes}
                    </p>
                  )}
                </div>

                {/* Tipo e Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Sessão *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: "online" | "presencial") =>
                        setFormData((prev) => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger className={errors.type ? "border-red-500" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">
                          <div className="flex items-center space-x-2">
                            <Video className="w-4 h-4" />
                            <span>Online</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="presencial">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>Presencial</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.type && (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.type}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: "agendada" | "confirmada" | "realizada" | "cancelada") =>
                        setFormData((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agendada">Agendada</SelectItem>
                        <SelectItem value="confirmada">Confirmada</SelectItem>
                        <SelectItem value="realizada">Realizada</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    placeholder="Observações sobre a sessão"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                  />
                </div>

                {/* Botões de Ação */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/schedule">Cancelar</Link>
                  </Button>
                  <Button type="submit" disabled={submitting} className="bg-[#2D9B9B] hover:bg-[#238B8B]">
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar com Informações */}
        <div className="space-y-6">
          {/* Status Atual */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={getStatusColor(session.status)} variant="secondary">
                {session.status}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">
                Criada em {new Date(session.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </CardContent>
          </Card>

          {/* Informações da Sessão Original */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados Originais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Data/Hora Original:</p>
                <p className="font-medium">
                  {new Date(session.sessionDate).toLocaleDateString("pt-BR")} às{" "}
                  {new Date(session.sessionDate).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duração Original:</p>
                <p className="font-medium">{session.durationMinutes} minutos</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tipo Original:</p>
                <p className="font-medium capitalize">{session.type}</p>
              </div>
            </CardContent>
          </Card>

          {/* Avisos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Avisos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                <p className="text-sm text-gray-600">Alterações na data/horário podem gerar conflitos</p>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                <p className="text-sm text-gray-600">Sessões realizadas não devem ser alteradas</p>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                <p className="text-sm text-gray-600">Notifique o paciente sobre mudanças</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
