"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, MicOff, Play, Pause, Square, Trash2 } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, transcription?: string) => void
  onTranscriptionComplete?: (transcription: string) => void
  className?: string
}

export function VoiceRecorder({ 
  onRecordingComplete, 
  onTranscriptionComplete,
  className 
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcription, setTranscription] = useState("")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      mediaRecorderRef.current = new MediaRecorder(stream)
      chunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' })
        const audioUrl = URL.createObjectURL(audioBlob)
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl
        }
        
        setHasRecording(true)
        
        // Automatically transcribe the audio
        transcribeAudio(audioBlob)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Erro ao acessar o microfone. Verifique as permissões.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.wav')
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        const data = await response.json()
        const transcribedText = data.transcription || ''
        setTranscription(transcribedText)
        
        if (onTranscriptionComplete) {
          onTranscriptionComplete(transcribedText)
        }
        
        onRecordingComplete(audioBlob, transcribedText)
      } else {
        console.error('Transcription failed')
        onRecordingComplete(audioBlob)
      }
    } catch (error) {
      console.error('Error transcribing audio:', error)
      onRecordingComplete(audioBlob)
    } finally {
      setIsTranscribing(false)
    }
  }

  const playRecording = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
        
        audioRef.current.onended = () => {
          setIsPlaying(false)
        }
      }
    }
  }

  const deleteRecording = () => {
    if (audioRef.current) {
      audioRef.current.src = ''
    }
    setHasRecording(false)
    setIsPlaying(false)
    setRecordingTime(0)
    setTranscription("")
    chunksRef.current = []
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className={cn("border-2 border-dashed border-slate-200", className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              Gravação de Voz
            </h3>
            <p className="text-sm text-slate-500">
              {hasRecording 
                ? "Gravação pronta para ser enviada" 
                : "Clique para começar a gravar"
              }
            </p>
          </div>

          {/* Recording visualization */}
          {isRecording && (
            <motion.div
              className="flex justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center">
                <Mic className="w-8 h-8 text-white" />
              </div>
            </motion.div>
          )}

          {/* Timer */}
          {(isRecording || hasRecording) && (
            <div className="text-center">
              <span className="text-2xl font-mono text-slate-600">
                {formatTime(recordingTime)}
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-3">
            {!isRecording && !hasRecording && (
              <Button
                onClick={startRecording}
                className="bg-red-500 hover:bg-red-600 text-white px-6"
                size="lg"
              >
                <Mic className="w-5 h-5 mr-2" />
                Gravar
              </Button>
            )}

            {isRecording && (
              <Button
                onClick={stopRecording}
                className="bg-red-600 hover:bg-red-700 text-white px-6"
                size="lg"
              >
                <Square className="w-5 h-5 mr-2" />
                Parar
              </Button>
            )}

            {hasRecording && !isRecording && (
              <>
                <Button
                  onClick={playRecording}
                  variant="outline"
                  size="lg"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 mr-2" />
                  ) : (
                    <Play className="w-5 h-5 mr-2" />
                  )}
                  {isPlaying ? 'Pausar' : 'Reproduzir'}
                </Button>
                
                <Button
                  onClick={deleteRecording}
                  variant="outline"
                  size="lg"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Excluir
                </Button>
              </>
            )}
          </div>

          {/* Transcription status */}
          {isTranscribing && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Transcrevendo áudio...</span>
              </div>
            </div>
          )}

          {/* Transcription result */}
          {transcription && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 font-medium mb-1">Transcrição:</p>
              <p className="text-sm text-blue-700">{transcription}</p>
            </div>
          )}

          <audio ref={audioRef} className="hidden" />
        </div>
      </CardContent>
    </Card>
  )
}