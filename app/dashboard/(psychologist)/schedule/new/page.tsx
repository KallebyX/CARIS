"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, User, MapPin, Video, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useTranslations } from "@/lib/i18n"

interface Patient {
  id: number
  name: string
  email: string
  currentCycle: string
}

interface AvailabilityData {
  date: string
  duration: number
  availableSlots: string[]
  existingSessions: Array<{
    time: string
    duration: number
    status: string
  }>
}

interface FormData {
  patientId: string
  sessionDate: string
  sessionTime: string
  durationMinutes: string
  type: "online" | "presencial" | ""
  status: "agendada" | "confirmada"
  notes: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

export default function NewSessionPage() {
  const t = useTranslations("psychologist.newSessionPage")
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [availability, setAvailability] = useState<AvailabilityData | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    patientId: "",
    sessionDate: "",
    sessionTime: "",
    durationMinutes: "50",
    type: "",
    status: "agendada",
    notes: "",
  })

  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    fetchPatients()
  }, [])

  useEffect(() => {
    if (formData.sessionDate && formData.durationMinutes) {
      checkAvailability()
    }
  }, [formData.sessionDate, formData.durationMinutes])

  const fetchPatients = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/psychologist/patients")
      if (res.ok) {
        const data = await res.json()
        setPatients(data.patients || [])
      } else {
        toast.error(t("toast.loadError"))
      }
    } catch (error) {
      console.error("Error fetching patients:", error)
      toast.error(t("toast.loadError"))
    } finally {
      setLoading(false)
    }
  }

  const checkAvailability = async () => {
    if (!formData.sessionDate || !formData.durationMinutes) return

    setCheckingAvailability(true)
    try {
      const params = new URLSearchParams({
        date: formData.sessionDate,
        duration: formData.durationMinutes,
      })

      const res = await fetch(`/api/psychologist/availability?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAvailability(data)

        // Limpar horário selecionado se não estiver mais disponível
        if (formData.sessionTime && !data.availableSlots.includes(formData.sessionTime)) {
          setFormData((prev) => ({ ...prev, sessionTime: "" }))
        }
      } else {
        const error = await res.json()
        toast.error(error.error || t("toast.availabilityError"))
        setAvailability(null)
      }
    } catch (error) {
      console.error("Error checking availability:", error)
      toast.error(t("toast.availabilityError"))
      setAvailability(null)
    } finally {
      setCheckingAvailability(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.patientId) {
      newErrors.patientId = t("validation.selectPatient")
    }

    if (!formData.sessionDate) {
      newErrors.sessionDate = t("validation.selectDate")
    } else {
      const selectedDate = new Date(formData.sessionDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (selectedDate < today) {
        newErrors.sessionDate = t("validation.pastDate")
      }
    }

    if (!formData.sessionTime) {
      newErrors.sessionTime = t("validation.selectTime")
    }

    if (!formData.durationMinutes || Number.parseInt(formData.durationMinutes) < 15) {
      newErrors.durationMinutes = t("validation.minDuration")
    }

    if (!formData.type) {
      newErrors.type = t("validation.selectType")
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error(t("toast.validationError"))
      return
    }

    setSubmitting(true)
    try {
      // Combinar data e horário
      const [hours, minutes] = formData.sessionTime.split(":")
      const sessionDateTime = new Date(formData.sessionDate)
      sessionDateTime.setHours(Number.parseInt(hours), Number.parseInt(minutes), 0, 0)

      const sessionData = {
        patientId: Number.parseInt(formData.patientId),
        sessionDate: sessionDateTime.toISOString(),
        durationMinutes: Number.parseInt(formData.durationMinutes),
        type: formData.type,
        status: formData.status,
        notes: formData.notes || undefined,
      }

      const res = await fetch("/api/psychologist/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionData),
      })

      if (res.ok) {
        toast.success(t("toast.success"))
        router.push("/dashboard/schedule")
      } else {
        const error = await res.json()
        toast.error(error.error || t("toast.error"))
      }
    } catch (error) {
      console.error("Error creating session:", error)
      toast.error(t("toast.error"))
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

  const selectedPatient = patients.find((p) => p.id === Number.parseInt(formData.patientId))

  return (
    <div className="space-y-6">
      {/* Header */}
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-[#2D9B9B]" />
                {t("sessionDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Seleção do Paciente */}
                <div className="space-y-2">
                  <Label htmlFor="patient">{t("patient")} *</Label>
                  <Select
                    value={formData.patientId}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, patientId: value }))}
                  >
                    <SelectTrigger className={errors.patientId ? "border-red-500" : ""}>
                      <SelectValue placeholder={t("selectPatient")} />
                    </SelectTrigger>
                    <SelectContent>
                      {loading ? (
                        <SelectItem value="" disabled>
                          {t("loadingPatients")}
                        </SelectItem>
                      ) : patients.length === 0 ? (
                        <SelectItem value="" disabled>
                          {t("noPatients")}
                        </SelectItem>
                      ) : (
                        patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${getCycleColor(patient.currentCycle)}`}></div>
                              <span>{patient.name}</span>
                              <span className="text-gray-500 text-sm">({patient.currentCycle})</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.patientId && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.patientId}
                    </p>
                  )}
                </div>

                {/* Data da Sessão */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessionDate">{t("sessionDate")} *</Label>
                    <Input
                      id="sessionDate"
                      type="date"
                      value={formData.sessionDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sessionDate: e.target.value }))}
                      className={errors.sessionDate ? "border-red-500" : ""}
                      min={new Date().toISOString().split("T")[0]}
                    />
                    {errors.sessionDate && (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.sessionDate}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">{t("duration")} *</Label>
                    <Select
                      value={formData.durationMinutes}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, durationMinutes: value }))}
                    >
                      <SelectTrigger className={errors.durationMinutes ? "border-red-500" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 {t("minutes")}</SelectItem>
                        <SelectItem value="45">45 {t("minutes")}</SelectItem>
                        <SelectItem value="50">50 {t("minutes")}</SelectItem>
                        <SelectItem value="60">60 {t("minutes")}</SelectItem>
                        <SelectItem value="90">90 {t("minutes")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.durationMinutes && (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.durationMinutes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Horários Disponíveis */}
                {formData.sessionDate && (
                  <div className="space-y-2">
                    <Label>{t("availableTime")} *</Label>
                    {checkingAvailability ? (
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>{t("checkingAvailability")}</span>
                      </div>
                    ) : availability ? (
                      <div className="space-y-3">
                        {availability.availableSlots.length === 0 ? (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center space-x-2 text-red-700">
                              <AlertCircle className="w-5 h-5" />
                              <span className="font-medium">{t("noAvailableSlots")}</span>
                            </div>
                            <p className="text-sm text-red-600 mt-1">
                              {t("tryDifferentDate")}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {availability.availableSlots.map((slot) => (
                              <Button
                                key={slot}
                                type="button"
                                variant={formData.sessionTime === slot ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFormData((prev) => ({ ...prev, sessionTime: slot }))}
                                className={formData.sessionTime === slot ? "bg-[#2D9B9B] hover:bg-[#238B8B]" : ""}
                              >
                                {slot}
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* Sessões Existentes */}
                        {availability.existingSessions.length > 0 && (
                          <div className="mt-4">
                            <Label className="text-sm text-gray-600">{t("existingSessions")}</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {availability.existingSessions.map((session, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {session.time} ({session.duration}min) - {session.status}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : formData.sessionDate ? (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center space-x-2 text-yellow-700">
                          <AlertCircle className="w-5 h-5" />
                          <span>{t("selectDateForSlots")}</span>
                        </div>
                      </div>
                    ) : null}

                    {errors.sessionTime && (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.sessionTime}
                      </p>
                    )}
                  </div>
                )}

                {/* Tipo e Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">{t("sessionType")} *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: "online" | "presencial") =>
                        setFormData((prev) => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger className={errors.type ? "border-red-500" : ""}>
                        <SelectValue placeholder={t("selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">
                          <div className="flex items-center space-x-2">
                            <Video className="w-4 h-4" />
                            <span>{t("online")}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="presencial">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>{t("inPerson")}</span>
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
                    <Label htmlFor="status">{t("initialStatus")}</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: "agendada" | "confirmada") =>
                        setFormData((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agendada">{t("scheduled")}</SelectItem>
                        <SelectItem value="confirmada">{t("confirmed")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="notes">{t("notes")}</Label>
                  <Textarea
                    id="notes"
                    placeholder={t("notesPlaceholder")}
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Botões de Ação */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/schedule">{t("cancel")}</Link>
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || checkingAvailability}
                    className="bg-[#2D9B9B] hover:bg-[#238B8B]"
                  >
                    {submitting ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        {t("scheduling")}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t("scheduleSession")}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar com Resumo */}
        <div className="space-y-6">
          {/* Resumo da Sessão */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("sessionSummary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPatient ? (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-800">{selectedPatient.name}</p>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getCycleColor(selectedPatient.currentCycle)}`}></div>
                      <p className="text-sm text-gray-600">{selectedPatient.currentCycle}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg text-center text-gray-500">{t("selectAPatient")}</div>
              )}

              {formData.sessionDate && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{t("date")}</span>
                  </div>
                  <p className="font-medium">
                    {new Date(formData.sessionDate).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}

              {formData.sessionTime && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{t("time")}</span>
                  </div>
                  <p className="font-medium">{formData.sessionTime}</p>
                </div>
              )}

              {formData.durationMinutes && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{t("duration")}:</span>
                  </div>
                  <p className="font-medium">{formData.durationMinutes} {t("minutes")}</p>
                </div>
              )}

              {formData.type && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {formData.type === "online" ? (
                      <Video className="w-4 h-4 text-gray-400" />
                    ) : (
                      <MapPin className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-600">{t("type")}</span>
                  </div>
                  <p className="font-medium">{formData.type === "online" ? t("online") : t("inPerson")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("tips")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <p className="text-sm text-gray-600">{t("tip1")}</p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <p className="text-sm text-gray-600">{t("tip2")}</p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <p className="text-sm text-gray-600">{t("tip3")}</p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <p className="text-sm text-gray-600">{t("tip4")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
