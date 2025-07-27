"use client"

import { useState } from "react"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Brain, Sparkles, Send, Heart, Shield, TrendingUp, CopyIcon as CreateIcon } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

const moodEmojis = ["😔", "😕", "😐", "🙂", "😄"]
const prompts = [
  "Como você descreveria seu dia em cores ou metáforas?",
  "Qual foi o momento mais desafiador de hoje e como você lidou com ele?",
  "Pelo que você sentiu gratidão hoje?",
  "Se sua ansiedade pudesse falar, o que ela diria?",
]
const cycles = [
  { name: "Criar", icon: CreateIcon, color: "text-emerald-500" },
  { name: "Cuidar", icon: Shield, color: "text-blue-500" },
  { name: "Crescer", icon: TrendingUp, color: "text-purple-500" },
  { name: "Curar", icon: Heart, color: "text-orange-500" },
]
const emotions = ["Alegria", "Tristeza", "Raiva", "Ansiedade", "Medo", "Surpresa", "Calma", "Gratidão"]

export default function DiaryPage() {
  const { toast } = useToast()
  const [mood, setMood] = useState(2)
  const [intensity, setIntensity] = useState(5)
  const [entry, setEntry] = useState("")
  const [currentPrompt, setCurrentPrompt] = useState(prompts[0])
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null)
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleNewPrompt = () => {
    const newPrompt = prompts[Math.floor(Math.random() * prompts.length)]
    setCurrentPrompt(newPrompt)
  }

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions((prev) => (prev.includes(emotion) ? prev.filter((e) => e !== emotion) : [...prev, emotion]))
  }

  const resetForm = () => {
    setMood(2)
    setIntensity(5)
    setEntry("")
    setSelectedCycle(null)
    setSelectedEmotions([])
    handleNewPrompt()
  }

  const handleSubmit = async () => {
    if (!entry) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, escreva sua reflexão.",
        variant: "destructive",
      })
      return
    }
    if (!selectedCycle) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione um ciclo.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    const payload = {
      moodRating: mood,
      intensityRating: intensity,
      content: entry,
      cycle: selectedCycle.toLowerCase() as "criar" | "cuidar" | "crescer" | "curar",
      emotions: selectedEmotions,
    }

    try {
      const res = await fetch("/api/patient/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Falha ao salvar a entrada.")
      }

      toast({
        title: "Sucesso!",
        description: "Sua entrada no diário foi salva.",
        className: "bg-teal-100 border-teal-200 text-teal-800",
      })
      resetForm()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800">Diário Emocional</h1>
        <p className="text-slate-600">Um espaço seguro para suas reflexões.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-caris-gradient p-6 text-white">
          <CardTitle className="flex items-center gap-3">
            <Brain className="w-6 h-6" />
            Nova Entrada - {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </CardTitle>
        </div>
        <CardContent className="p-6 space-y-8">
          {/* Mood Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-medium text-slate-700">Como você está se sentindo agora?</Label>
            <div className="flex justify-between items-center">
              {moodEmojis.map((emoji, index) => (
                <motion.button
                  key={index}
                  onClick={() => setMood(index)}
                  className={`text-4xl p-2 rounded-full transition-all duration-200 ${
                    mood === index ? "bg-teal-100" : "opacity-50 hover:opacity-100"
                  }`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Intensity Slider */}
          <div className="space-y-4">
            <Label htmlFor="intensity" className="text-lg font-medium text-slate-700">
              Qual a intensidade desse sentimento? <span className="font-bold text-teal-600">{intensity}</span>
            </Label>
            <Slider
              id="intensity"
              min={1}
              max={10}
              step={1}
              value={[intensity]}
              onValueChange={(value) => setIntensity(value[0])}
            />
          </div>

          {/* Cycle Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-medium text-slate-700">A qual ciclo essa entrada se refere?</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cycles.map((cycle) => (
                <button
                  key={cycle.name}
                  onClick={() => setSelectedCycle(cycle.name)}
                  className={cn(
                    "p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all",
                    selectedCycle === cycle.name
                      ? "border-caris-teal bg-teal-50"
                      : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <cycle.icon className={cn("w-6 h-6", cycle.color)} />
                  <span className="font-medium text-slate-700">{cycle.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Emotion Tagging */}
          <div className="space-y-4">
            <Label className="text-lg font-medium text-slate-700">Quais emoções você identifica? (Opcional)</Label>
            <div className="flex flex-wrap gap-2">
              {emotions.map((emotion) => (
                <button
                  key={emotion}
                  onClick={() => toggleEmotion(emotion)}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium border transition-colors",
                    selectedEmotions.includes(emotion)
                      ? "bg-caris-teal text-white border-caris-teal"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200",
                  )}
                >
                  {emotion}
                </button>
              ))}
            </div>
          </div>

          {/* Text Entry */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-medium text-slate-700">Sua reflexão</Label>
              <Button variant="ghost" size="sm" onClick={handleNewPrompt}>
                <Sparkles className="w-4 h-4 mr-2" />
                Novo prompt
              </Button>
            </div>
            <Textarea
              placeholder={currentPrompt}
              className="min-h-[200px] text-base"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
            />
          </div>

          <Button
            size="lg"
            className="w-full bg-caris-teal hover:bg-caris-teal/90"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              "Salvando..."
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" /> Salvar Entrada
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
