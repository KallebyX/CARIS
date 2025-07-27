"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Heart,
  Clock,
  User,
  BookOpen,
  Star,
  RotateCcw,
  Settings,
  Download,
  Share
} from 'lucide-react'
import { MeditationPractice } from '@/lib/meditation-library'

interface MeditationPlayerProps {
  meditation: MeditationPractice
  onComplete?: (sessionData: any) => void
  onRating?: (rating: number) => void
  autoPlay?: boolean
}

interface PlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  playbackRate: number
  isLoading: boolean
}

export function MeditationPlayer({ 
  meditation, 
  onComplete, 
  onRating, 
  autoPlay = false 
}: MeditationPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 70,
    isMuted: false,
    playbackRate: 1,
    isLoading: false
  })
  
  const [sessionData, setSessionData] = useState({
    startTime: new Date(),
    moodBefore: 5,
    moodAfter: 5,
    currentStep: 0,
    showSteps: true,
    showTranscript: false
  })

  const [userInteraction, setUserInteraction] = useState({
    hasStarted: false,
    rating: 0,
    feedback: '',
    personalNotes: ''
  })

  // Inicializar audio
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current
      
      // Simular URL de áudio (em produção seria meditation.audioUrl)
      audio.src = `/audio/meditations/${meditation.id}.mp3`
      
      const handleLoadedMetadata = () => {
        setPlayerState(prev => ({ 
          ...prev, 
          duration: audio.duration,
          isLoading: false 
        }))
      }
      
      const handleTimeUpdate = () => {
        setPlayerState(prev => ({ 
          ...prev, 
          currentTime: audio.currentTime 
        }))
        
        // Atualizar passo atual baseado no tempo
        const stepDuration = audio.duration / meditation.guidedSteps.length
        const currentStep = Math.floor(audio.currentTime / stepDuration)
        setSessionData(prev => ({ ...prev, currentStep }))
      }
      
      const handleEnded = () => {
        setPlayerState(prev => ({ ...prev, isPlaying: false }))
        handleMeditationComplete()
      }
      
      const handleLoadStart = () => {
        setPlayerState(prev => ({ ...prev, isLoading: true }))
      }
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata)
      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('loadstart', handleLoadStart)
      
      if (autoPlay) {
        audio.play().catch(console.error)
        setPlayerState(prev => ({ ...prev, isPlaying: true }))
      }
      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('loadstart', handleLoadStart)
      }
    }
  }, [meditation.id, autoPlay])

  // Controlar volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = playerState.isMuted ? 0 : playerState.volume / 100
    }
  }, [playerState.volume, playerState.isMuted])

  // Controlar velocidade
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playerState.playbackRate
    }
  }, [playerState.playbackRate])

  const togglePlay = async () => {
    if (!audioRef.current) return
    
    try {
      if (playerState.isPlaying) {
        audioRef.current.pause()
      } else {
        await audioRef.current.play()
        if (!userInteraction.hasStarted) {
          setUserInteraction(prev => ({ ...prev, hasStarted: true }))
          setSessionData(prev => ({ ...prev, startTime: new Date() }))
        }
      }
      setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))
    } catch (error) {
      console.error('Erro ao controlar reprodução:', error)
    }
  }

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setPlayerState(prev => ({ ...prev, currentTime: time }))
    }
  }

  const skipTime = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(playerState.duration, playerState.currentTime + seconds))
      seekTo(newTime)
    }
  }

  const toggleMute = () => {
    setPlayerState(prev => ({ ...prev, isMuted: !prev.isMuted }))
  }

  const handleMeditationComplete = () => {
    const completionData = {
      meditationId: meditation.id,
      duration: playerState.duration,
      completedAt: new Date(),
      wasCompleted: true,
      moodBefore: sessionData.moodBefore,
      moodAfter: sessionData.moodAfter,
      rating: userInteraction.rating,
      feedback: userInteraction.feedback,
      personalNotes: userInteraction.personalNotes
    }
    
    onComplete?.(completionData)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = playerState.duration ? (playerState.currentTime / playerState.duration) * 100 : 0

  const getCurrentStep = () => {
    if (sessionData.currentStep < meditation.guidedSteps.length) {
      return meditation.guidedSteps[sessionData.currentStep]
    }
    return meditation.guidedSteps[meditation.guidedSteps.length - 1]
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header da Meditação */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{meditation.title}</CardTitle>
              <p className="text-gray-600 mb-4">{meditation.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  {meditation.duration} min
                </Badge>
                <Badge variant="outline">
                  <User className="w-3 h-3 mr-1" />
                  {meditation.instructor}
                </Badge>
                <Badge variant="outline">
                  <Star className="w-3 h-3 mr-1" />
                  {meditation.effectivenessRating}/5
                </Badge>
                <Badge className="capitalize">{meditation.difficulty}</Badge>
                <Badge variant="secondary" className="capitalize">{meditation.category}</Badge>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Heart className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Share className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Player Principal */}
      <Card>
        <CardContent className="p-6">
          {/* Barra de Progresso */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>{formatTime(playerState.currentTime)}</span>
              <span>{formatTime(playerState.duration)}</span>
            </div>
            
            <Progress 
              value={progressPercentage} 
              className="h-2 cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const percentage = (e.clientX - rect.left) / rect.width
                const newTime = percentage * playerState.duration
                seekTo(newTime)
              }}
            />
          </div>

          {/* Controles de Reprodução */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => skipTime(-30)}
            >
              <RotateCcw className="w-4 h-4" />
              30s
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => skipTime(-10)}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button
              size="lg"
              onClick={togglePlay}
              disabled={playerState.isLoading}
              className="w-16 h-16 rounded-full"
            >
              {playerState.isLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
              ) : playerState.isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => skipTime(10)}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => skipTime(30)}
            >
              30s
              <RotateCcw className="w-4 h-4 scale-x-[-1]" />
            </Button>
          </div>

          {/* Controles Adicionais */}
          <div className="flex items-center justify-center gap-6">
            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
              >
                {playerState.isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
              <Slider
                value={[playerState.volume]}
                onValueChange={([value]) => 
                  setPlayerState(prev => ({ ...prev, volume: value }))
                }
                max={100}
                step={1}
                className="w-20"
              />
            </div>

            {/* Velocidade */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPlayerState(prev => ({ 
                  ...prev, 
                  playbackRate: prev.playbackRate === 1 ? 0.75 : prev.playbackRate === 0.75 ? 1.25 : 1 
                }))}
              >
                {playerState.playbackRate}x
              </Button>
            </div>

            {/* Configurações */}
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Passo Atual da Meditação */}
      {sessionData.showSteps && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Passo Atual ({sessionData.currentStep + 1}/{meditation.guidedSteps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed">{getCurrentStep()}</p>
            
            <div className="mt-4 flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSessionData(prev => ({ 
                  ...prev, 
                  showSteps: !prev.showSteps 
                }))}
              >
                Ocultar Passos
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSessionData(prev => ({ 
                  ...prev, 
                  showTranscript: !prev.showTranscript 
                }))}
              >
                {sessionData.showTranscript ? 'Ocultar' : 'Ver'} Transcrição
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcrição Completa */}
      {sessionData.showTranscript && meditation.transcript && (
        <Card>
          <CardHeader>
            <CardTitle>Transcrição Completa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {meditation.transcript}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Benefícios */}
      <Card>
        <CardHeader>
          <CardTitle>Benefícios desta Prática</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {meditation.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2">
                <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Audio Element (Hidden) */}
      <audio
        ref={audioRef}
        preload="metadata"
        onError={(e) => {
          console.error('Erro no áudio:', e)
          setPlayerState(prev => ({ ...prev, isLoading: false }))
        }}
      />
    </div>
  )
}