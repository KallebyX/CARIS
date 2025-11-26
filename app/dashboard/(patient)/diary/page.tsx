"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VoiceRecorder } from "@/components/ui/voice-recorder"
import { PhotoUploader } from "@/components/ui/photo-uploader"
import { Brain, Sparkles, Send, Heart, Shield, TrendingUp, CopyIcon as CreateIcon, Mic, Camera, Type } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { useTranslations } from "@/lib/i18n"

const moodEmojis = ["😔", "😕", "😐", "🙂", "😄"]

// Cycle keys for API (lowercase)
const cycleKeys = ["create", "care", "grow", "heal"] as const
type CycleKey = typeof cycleKeys[number]

// Map cycle keys to icons and colors
const cycleConfig = {
  create: { icon: CreateIcon, color: "text-emerald-500" },
  care: { icon: Shield, color: "text-blue-500" },
  grow: { icon: TrendingUp, color: "text-purple-500" },
  heal: { icon: Heart, color: "text-orange-500" },
}

// Emotion keys for translation
const emotionKeys = ["joy", "sadness", "anger", "anxiety", "fear", "surprise", "calm", "gratitude"] as const
type EmotionKey = typeof emotionKeys[number]

// Prompt keys for translation
const promptKeys = ["colors", "challenge", "gratitude", "anxiety"] as const

export default function DiaryPage() {
  const { toast } = useToast()
  const t = useTranslations("patient.diaryPage")

  const [mood, setMood] = useState(2)
  const [intensity, setIntensity] = useState(5)
  const [entry, setEntry] = useState("")
  const [currentPromptKey, setCurrentPromptKey] = useState<typeof promptKeys[number]>(promptKeys[0])
  const [selectedCycle, setSelectedCycle] = useState<CycleKey | null>(null)
  const [selectedEmotions, setSelectedEmotions] = useState<EmotionKey[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("text")

  // Multimodal state
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioTranscription, setAudioTranscription] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [imageAnalysis, setImageAnalysis] = useState("")

  // Get translated prompt
  const currentPrompt = t(`prompts.${currentPromptKey}`)

  const handleNewPrompt = () => {
    const newPromptKey = promptKeys[Math.floor(Math.random() * promptKeys.length)]
    setCurrentPromptKey(newPromptKey)
  }

  const toggleEmotion = (emotion: EmotionKey) => {
    setSelectedEmotions((prev) => (prev.includes(emotion) ? prev.filter((e) => e !== emotion) : [...prev, emotion]))
  }

  const resetForm = () => {
    setMood(2)
    setIntensity(5)
    setEntry("")
    setSelectedCycle(null)
    setSelectedEmotions([])
    setAudioBlob(null)
    setAudioTranscription("")
    setPhotoFile(null)
    setPhotoPreview(null)
    setImageAnalysis("")
    setActiveTab("text")
    handleNewPrompt()
  }

  const handleAudioRecording = (blob: Blob, transcription?: string) => {
    setAudioBlob(blob)
    if (transcription) {
      setAudioTranscription(transcription)
      // Auto-fill text area if empty
      if (!entry) {
        setEntry(transcription)
      }
    }
  }

  const handlePhotoUpload = (file: File, preview: string) => {
    setPhotoFile(file)
    setPhotoPreview(preview)
  }

  const handlePhotoRemove = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    setImageAnalysis("")
  }

  const uploadFile = async (file: File, type: 'audio' | 'image'): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        return data.url
      }
      return null
    } catch (error) {
      console.error('File upload error:', error)
      return null
    }
  }

  // Map cycle keys to Portuguese API values
  const cycleToApiValue: Record<CycleKey, "criar" | "cuidar" | "crescer" | "curar"> = {
    create: "criar",
    care: "cuidar",
    grow: "crescer",
    heal: "curar",
  }

  const handleSubmit = async () => {
    if (!entry && !audioBlob && !photoFile) {
      toast({
        title: t("validation.contentRequired"),
        description: t("validation.contentRequiredDescription"),
        variant: "destructive",
      })
      return
    }
    if (!selectedCycle) {
      toast({
        title: t("validation.cycleRequired"),
        description: t("validation.cycleRequiredDescription"),
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Upload files first
      let audioUrl = null
      let imageUrl = null

      if (audioBlob) {
        const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' })
        audioUrl = await uploadFile(audioFile, 'audio')
      }

      if (photoFile) {
        imageUrl = await uploadFile(photoFile, 'image')
      }

      const payload = {
        moodRating: mood,
        intensityRating: intensity,
        content: entry,
        cycle: cycleToApiValue[selectedCycle],
        emotions: selectedEmotions,
        audioUrl,
        audioTranscription,
        imageUrl,
        imageDescription: imageAnalysis,
      }

      const res = await fetch("/api/patient/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || t("error.saveError"))
      }

      toast({
        title: t("success.title"),
        description: t("success.description"),
        className: "bg-teal-100 border-teal-200 text-teal-800",
      })
      resetForm()
    } catch (error: any) {
      toast({
        title: t("error.title"),
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
        <h1 className="text-3xl font-bold text-slate-800">{t("title")}</h1>
        <p className="text-slate-600">{t("subtitle")}</p>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-caris-gradient p-6 text-white">
          <CardTitle className="flex items-center gap-3">
            <Brain className="w-6 h-6" />
            {t("newEntry")} - {new Date().toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" })}
          </CardTitle>
        </div>
        <CardContent className="p-6 space-y-8">
          {/* Mood Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-medium text-slate-700">{t("moodQuestion")}</Label>
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
              {t("intensityQuestion")} <span className="font-bold text-teal-600">{intensity}</span>
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
            <Label className="text-lg font-medium text-slate-700">{t("cycleQuestion")}</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cycleKeys.map((cycleKey) => {
                const config = cycleConfig[cycleKey]
                const Icon = config.icon
                return (
                  <button
                    key={cycleKey}
                    onClick={() => setSelectedCycle(cycleKey)}
                    className={cn(
                      "p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all",
                      selectedCycle === cycleKey
                        ? "border-caris-teal bg-teal-50"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <Icon className={cn("w-6 h-6", config.color)} />
                    <span className="font-medium text-slate-700">{t(`cycles.${cycleKey}`)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Emotion Tagging */}
          <div className="space-y-4">
            <Label className="text-lg font-medium text-slate-700">{t("emotionsQuestion")}</Label>
            <div className="flex flex-wrap gap-2">
              {emotionKeys.map((emotionKey) => (
                <button
                  key={emotionKey}
                  onClick={() => toggleEmotion(emotionKey)}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium border transition-colors",
                    selectedEmotions.includes(emotionKey)
                      ? "bg-caris-teal text-white border-caris-teal"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200",
                  )}
                >
                  {t(`emotions.${emotionKey}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Multimodal Content */}
          <div className="space-y-4">
            <Label className="text-lg font-medium text-slate-700">{t("expressionLabel")}</Label>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  {t("tabs.text")}
                </TabsTrigger>
                <TabsTrigger value="voice" className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  {t("tabs.voice")}
                </TabsTrigger>
                <TabsTrigger value="photo" className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  {t("tabs.photo")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-medium text-slate-700">{t("yourReflection")}</Label>
                  <Button variant="ghost" size="sm" onClick={handleNewPrompt}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t("newPrompt")}
                  </Button>
                </div>
                <Textarea
                  placeholder={currentPrompt}
                  className="min-h-[200px] text-base"
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                />
              </TabsContent>

              <TabsContent value="voice">
                <VoiceRecorder
                  onRecordingComplete={handleAudioRecording}
                  onTranscriptionComplete={(transcription) => setAudioTranscription(transcription)}
                />
              </TabsContent>

              <TabsContent value="photo">
                <PhotoUploader
                  onPhotoUpload={handlePhotoUpload}
                  onPhotoRemove={handlePhotoRemove}
                />
              </TabsContent>
            </Tabs>
          </div>

          <Button
            size="lg"
            className="w-full bg-caris-teal hover:bg-caris-teal/90"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              t("saving")
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" /> {t("saveMultimodalEntry")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
