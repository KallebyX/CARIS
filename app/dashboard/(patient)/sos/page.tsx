"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Heart, Wind, Brain, Phone, MessageCircle, Users } from "lucide-react"

export default function SOSPage() {
  const [activeExercise, setActiveExercise] = useState<string | null>(null)
  const [breathingProgress, setBreathingProgress] = useState(0)
  const [meditationTime, setMeditationTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const registerSOSUsage = async (toolName: string, durationMinutes?: number) => {
    try {
      await fetch("/api/patient/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName, durationMinutes }),
      })
    } catch (error) {
      console.error("Erro ao registrar uso do SOS:", error)
    }
  }

  const startBreathingExercise = () => {
    setActiveExercise("breathing")
    setBreathingProgress(0)

    const interval = setInterval(() => {
      setBreathingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setActiveExercise(null)
          registerSOSUsage("breathing", 2)
          return 0
        }
        return prev + 2
      })
    }, 240) // 2 minutos = 120 segundos, 100/120 = 0.83, aproximadamente 2% a cada 2.4 segundos
  }

  const startMeditation = () => {
    setActiveExercise("meditation")
    setMeditationTime(0)
    setIsPlaying(true)

    const interval = setInterval(() => {
      setMeditationTime((prev) => prev + 1)
    }, 1000)

    // Simular duração de 5 minutos
    setTimeout(() => {
      clearInterval(interval)
      setActiveExercise(null)
      setIsPlaying(false)
      registerSOSUsage("meditation", Math.floor(meditationTime / 60))
    }, 300000) // 5 minutos
  }

  const startGroundingExercise = () => {
    setActiveExercise("grounding")
    registerSOSUsage("grounding", 3)

    // Simular exercício de 3 minutos
    setTimeout(() => {
      setActiveExercise(null)
    }, 180000)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">SOS - Ferramentas de Apoio</h1>
        <p className="text-slate-600">
          Quando você precisar de apoio imediato, estas ferramentas estão aqui para ajudar.
        </p>
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">
            ⚠️ Em caso de emergência ou pensamentos de autolesão, procure ajuda profissional imediatamente.
          </p>
        </div>
      </div>

      {/* Ferramentas de Autoajuda */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <Wind className="w-12 h-12 text-blue-500 mx-auto mb-2" />
            <CardTitle className="text-lg">Respiração Guiada</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-slate-600">
              Exercício de respiração 4-7-8 para reduzir ansiedade e promover calma.
            </p>
            {activeExercise === "breathing" ? (
              <div className="space-y-4">
                <div className="text-2xl font-bold text-blue-600">
                  {breathingProgress < 25 ? "Inspire (4s)" : breathingProgress < 60 ? "Segure (7s)" : "Expire (8s)"}
                </div>
                <Progress value={breathingProgress} className="h-3" />
                <p className="text-sm text-slate-500">Siga o ritmo e foque na sua respiração</p>
              </div>
            ) : (
              <Button onClick={startBreathingExercise} className="w-full bg-blue-500 hover:bg-blue-600">
                Iniciar Exercício
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <Brain className="w-12 h-12 text-purple-500 mx-auto mb-2" />
            <CardTitle className="text-lg">Meditação Guiada</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-slate-600">
              Sessão de meditação mindfulness para acalmar a mente e reduzir o estresse.
            </p>
            {activeExercise === "meditation" ? (
              <div className="space-y-4">
                <div className="text-2xl font-bold text-purple-600">{formatTime(meditationTime)}</div>
                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
                <p className="text-sm text-slate-500">Concentre-se na sua respiração</p>
                <audio autoPlay loop>
                  <source src="/audio/calm-ambient-sound.mp3" type="audio/mpeg" />
                </audio>
              </div>
            ) : (
              <Button onClick={startMeditation} className="w-full bg-purple-500 hover:bg-purple-600">
                Iniciar Meditação
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <Heart className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <CardTitle className="text-lg">Técnica 5-4-3-2-1</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-slate-600">
              Exercício de grounding para reconectar com o presente e reduzir ansiedade.
            </p>
            {activeExercise === "grounding" ? (
              <div className="space-y-4">
                <div className="text-lg font-semibold text-green-600">Exercício em Andamento</div>
                <div className="text-left space-y-2 text-sm">
                  <p>
                    <strong>5 coisas</strong> que você pode ver
                  </p>
                  <p>
                    <strong>4 coisas</strong> que você pode tocar
                  </p>
                  <p>
                    <strong>3 coisas</strong> que você pode ouvir
                  </p>
                  <p>
                    <strong>2 coisas</strong> que você pode cheirar
                  </p>
                  <p>
                    <strong>1 coisa</strong> que você pode saborear
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800">Focando no presente</Badge>
              </div>
            ) : (
              <Button onClick={startGroundingExercise} className="w-full bg-green-500 hover:bg-green-600">
                Iniciar Exercício
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contatos de Emergência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-red-500" />
            Contatos de Emergência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <h3 className="font-semibold text-red-800 mb-2">Centro de Valorização da Vida (CVV)</h3>
                <p className="text-sm text-red-700 mb-3">
                  Apoio emocional e prevenção do suicídio. Atendimento 24h, gratuito e sigiloso.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700">
                    <Phone className="w-4 h-4 mr-1" />
                    188
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-300 text-red-700 bg-transparent">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Chat Online
                  </Button>
                </div>
              </div>

              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <h3 className="font-semibold text-blue-800 mb-2">SAMU</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Serviço de Atendimento Móvel de Urgência. Para emergências médicas.
                </p>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Phone className="w-4 h-4 mr-1" />
                  192
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 border border-caris-teal/30 rounded-lg bg-caris-teal/5">
                <h3 className="font-semibold text-caris-teal mb-2">Seu Psicólogo</h3>
                <p className="text-sm text-slate-700 mb-3">
                  Entre em contato com seu psicólogo através do chat da plataforma.
                </p>
                <Button size="sm" className="bg-caris-teal hover:bg-caris-teal/90">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Abrir Chat
                </Button>
              </div>

              <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
                <h3 className="font-semibold text-purple-800 mb-2">Grupos de Apoio</h3>
                <p className="text-sm text-purple-700 mb-3">
                  Conecte-se com outras pessoas que passam por experiências similares.
                </p>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  <Users className="w-4 h-4 mr-1" />
                  Encontrar Grupos
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dicas de Autocuidado */}
      <Card>
        <CardHeader>
          <CardTitle>Dicas de Autocuidado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-800">Durante uma Crise:</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Respire profundamente e devagar</li>
                <li>• Encontre um lugar seguro e confortável</li>
                <li>• Use as técnicas de grounding</li>
                <li>• Lembre-se: este sentimento vai passar</li>
                <li>• Entre em contato com alguém de confiança</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-800">Prevenção:</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Mantenha uma rotina de sono regular</li>
                <li>• Pratique exercícios físicos regularmente</li>
                <li>• Alimente-se de forma equilibrada</li>
                <li>• Limite o consumo de cafeína e álcool</li>
                <li>• Pratique mindfulness diariamente</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
