"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Edit, Mail, Calendar, FileText, Brain, BarChart3, MessageSquare, Shield, Map } from "lucide-react"
import Link from "next/link"
import { EmotionalMap } from "@/components/emotional-map"
import { ChatLayout } from "@/components/chat/chat-layout"

interface PatientData {
  patient: {
    id: number
    name: string
    email: string
    patientProfile: {
      userId: number
      psychologistId: number | null
      birthDate: string | null
      currentCycle: string | null
    }
  }
  emotionalMapData: any[]
}

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [data, setData] = useState<PatientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: number; role: "psychologist" | "patient" } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { id } = await params
        const [patientRes, userRes] = await Promise.all([
          fetch(`/api/psychologist/patients/${id}`),
          fetch("/api/users/me"),
        ])

          if (patientRes.ok) {
            const patientData = await patientRes.json()
            setData(patientData)
          } else {
            console.error("Falha ao buscar dados do paciente")
          }

          if (userRes.ok) {
            const userData = await userRes.json()
            setCurrentUser(userData)
          } else {
            console.error("Falha ao buscar dados do usuário")
          }
        } catch (error) {
          console.error("Erro na requisição:", error)
        } finally {
          setLoading(false)
        }
      }
      fetchData()
  }, [params])

  if (loading) {
    return <div>Carregando perfil do paciente...</div>
  }

  if (!data) {
    return <div>Não foi possível carregar os dados do paciente.</div>
  }

  const { patient, emotionalMapData } = data

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/patients">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-teal-200">
              <AvatarImage src={"/placeholder.svg?height=100&width=100"} />
              <AvatarFallback className="text-xl">{patient.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{patient.name}</h1>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>ID: {params.id}</span>
                <Badge className={"bg-green-100 text-green-800"}>Ativo</Badge>
              </div>
            </div>
          </div>
        </div>
        <Button>
          <Edit className="mr-2 h-4 w-4" /> Editar Prontuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <Mail className="h-8 w-8 text-teal-500" />
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="font-medium text-slate-700">{patient.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-teal-500" />
            <div>
              <p className="text-xs text-slate-500">Nascimento</p>
              <p className="font-medium text-slate-700">
                {patient.patientProfile.birthDate
                  ? new Date(patient.patientProfile.birthDate).toLocaleDateString("pt-BR")
                  : "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-teal-500" />
            <div>
              <p className="text-xs text-slate-500">Ciclo Atual</p>
              <p className="font-medium text-slate-700 capitalize">{patient.patientProfile.currentCycle || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="emotional-map" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="overview">
            <FileText className="w-4 h-4 mr-2" />
            Prontuário
          </TabsTrigger>
          <TabsTrigger value="emotional-map">
            <Map className="w-4 h-4 mr-2" />
            Mapa Emocional
          </TabsTrigger>
          <TabsTrigger value="diary">
            <Brain className="w-4 h-4 mr-2" />
            Diário
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Calendar className="w-4 h-4 mr-2" />
            Sessões
          </TabsTrigger>
          <TabsTrigger value="progress">
            <BarChart3 className="w-4 h-4 mr-2" />
            Progresso
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
          </TabsTrigger>
        </TabsList>
        <TabsContent value="emotional-map">
          <EmotionalMap data={emotionalMapData} />
        </TabsContent>
        {/* Other tabs content here */}
        <TabsContent value="chat">
          {currentUser && (
            <ChatLayout counterpartId={patient.id} counterpartName={patient.name} currentUser={currentUser} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
