"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AudioPlayer } from "@/components/ui/audio-player"
import { Calendar, Filter, Image, Mic, Type, Heart, Brain, Download } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import NextImage from "next/image"

interface DiaryEntry {
  id: number
  entryDate: Date
  moodRating: number
  intensityRating: number
  content: string
  cycle: string
  emotions: string[]
  audioUrl?: string
  audioTranscription?: string
  imageUrl?: string
  imageDescription?: string
  dominantEmotion?: string
  riskLevel?: string
  aiInsights?: string[]
}

interface MemoryGalleryProps {
  className?: string
}

const moodEmojis = ["😔", "😕", "😐", "🙂", "😄"]
const moodLabels = ["Muito baixo", "Baixo", "Neutro", "Bom", "Muito bom"]

export function MemoryGallery({ className }: MemoryGalleryProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date")

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    try {
      const response = await fetch('/api/patient/diary')
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries.map((entry: any) => ({
          ...entry,
          entryDate: new Date(entry.entryDate),
          emotions: entry.emotions ? JSON.parse(entry.emotions) : [],
          aiInsights: entry.aiInsights ? JSON.parse(entry.aiInsights) : []
        })))
      }
    } catch (error) {
      console.error('Error fetching diary entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEntries = entries.filter(entry => {
    if (filter === "all") return true
    if (filter === "text") return entry.content && !entry.audioUrl && !entry.imageUrl
    if (filter === "audio") return entry.audioUrl
    if (filter === "image") return entry.imageUrl
    if (filter === "multimodal") return (entry.audioUrl || entry.imageUrl) && entry.content
    return true
  })

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (sortBy === "date") return new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
    if (sortBy === "mood") return b.moodRating - a.moodRating
    if (sortBy === "intensity") return b.intensityRating - a.intensityRating
    return 0
  })

  const getRiskColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case "critical": return "bg-red-500"
      case "high": return "bg-orange-500"
      case "medium": return "bg-yellow-500"
      case "low": return "bg-green-500"
      default: return "bg-gray-500"
    }
  }

  const getCycleColor = (cycle: string) => {
    switch (cycle.toLowerCase()) {
      case "criar": return "text-emerald-600 bg-emerald-50 border-emerald-200"
      case "cuidar": return "text-blue-600 bg-blue-50 border-blue-200"
      case "crescer": return "text-purple-600 bg-purple-50 border-purple-200"
      case "curar": return "text-orange-600 bg-orange-50 border-orange-200"
      default: return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      const response = await fetch(`/api/patient/diary/export?format=${format}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        // Get filename from response headers
        const contentDisposition = response.headers.get('content-disposition')
        const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `diary-export.${format}`
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Galeria de Memórias</h2>
          <p className="text-slate-600">Explore suas reflexões ao longo do tempo</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="text"><Type className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="audio"><Mic className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="image"><Image className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="multimodal">Multimodal</TabsTrigger>
            </TabsList>
          </Tabs>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="date">Por Data</option>
            <option value="mood">Por Humor</option>
            <option value="intensity">Por Intensidade</option>
          </select>

          {/* Export buttons */}
          <div className="flex gap-1">
            <Button
              onClick={() => handleExport('json')}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              JSON
            </Button>
            <Button
              onClick={() => handleExport('csv')}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              CSV
            </Button>
            <Button
              onClick={() => handleExport('pdf')}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              TXT
            </Button>
          </div>
        </div>
      </div>

      {sortedEntries.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="space-y-4">
            <Brain className="w-12 h-12 text-slate-400 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-slate-700">Nenhuma entrada encontrada</h3>
              <p className="text-slate-500">Comece criando sua primeira entrada no diário</p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6">
          {sortedEntries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-slate-500" />
                        {entry.entryDate.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </CardTitle>
                      
                      <div className="flex items-center gap-4">
                        {/* Mood indicator */}
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{moodEmojis[entry.moodRating]}</span>
                          <span className="text-sm text-slate-600">
                            {moodLabels[entry.moodRating]}
                          </span>
                        </div>

                        {/* Intensity */}
                        <Badge variant="outline">
                          Intensidade: {entry.intensityRating}/10
                        </Badge>

                        {/* Cycle */}
                        <Badge className={getCycleColor(entry.cycle)}>
                          {entry.cycle}
                        </Badge>
                      </div>
                    </div>

                    {/* Risk indicator */}
                    {entry.riskLevel && (
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", getRiskColor(entry.riskLevel))}></div>
                        <span className="text-xs text-slate-500 capitalize">{entry.riskLevel}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Text content */}
                  {entry.content && (
                    <div>
                      <p className="text-slate-700 leading-relaxed">{entry.content}</p>
                    </div>
                  )}

                  {/* Audio content */}
                  {entry.audioUrl && (
                    <AudioPlayer
                      audioUrl={entry.audioUrl}
                      transcription={entry.audioTranscription}
                      title="Gravação de Voz"
                    />
                  )}

                  {/* Image content */}
                  {entry.imageUrl && (
                    <div className="space-y-2">
                      <div className="relative rounded-lg overflow-hidden">
                        <NextImage
                          src={entry.imageUrl}
                          alt="Imagem do diário"
                          width={400}
                          height={300}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      {entry.imageDescription && (
                        <p className="text-sm text-slate-600 italic">{entry.imageDescription}</p>
                      )}
                    </div>
                  )}

                  {/* Emotions */}
                  {entry.emotions && entry.emotions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Emoções identificadas:</span>
                      <div className="flex flex-wrap gap-1">
                        {entry.emotions.map((emotion) => (
                          <Badge key={emotion} variant="secondary" className="text-xs">
                            {emotion}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Insights */}
                  {entry.aiInsights && entry.aiInsights.length > 0 && (
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-start gap-2">
                        <Brain className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-purple-800 font-medium mb-1">
                            Insights da IA:
                          </p>
                          <ul className="space-y-1">
                            {entry.aiInsights.map((insight, i) => (
                              <li key={i} className="text-sm text-purple-700">
                                • {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dominant emotion */}
                  {entry.dominantEmotion && (
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-slate-600">
                        Emoção dominante: <span className="font-medium">{entry.dominantEmotion}</span>
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}