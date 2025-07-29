"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Clock,
  Settings,
  Download,
  Wifi,
  WifiOff,
  Headphones,
  Music,
  FileAudio,
  Radio
} from 'lucide-react'
import { MeditationPractice } from '@/lib/meditation-library'
import { AudioSource } from '@/lib/meditation-audio-sources'

interface EnhancedMeditationPlayerProps {
  meditation: MeditationPractice
  audioSources?: AudioSource[]
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
  currentAudioSource?: AudioSource
  isOnline: boolean
}

export function EnhancedMeditationPlayer({ 
  meditation, 
  audioSources = [],
  onComplete, 
  onRating, 
  autoPlay = false 
}: EnhancedMeditationPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [sessionData, setSessionData] = useState({
    startTime: null as Date | null,
    endTime: null as Date | null,
    completionPercentage: 0,
    rating: 0,
    feedback: ''
  })

  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    playbackRate: 1.0,
    isLoading: false,
    isOnline: navigator.onLine
  })

  // Detectar status da conexão
  useEffect(() => {
    const handleOnline = () => setPlayerState(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setPlayerState(prev => ({ ...prev, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Buscar fonte de áudio compatível
  useEffect(() => {
    if (audioSources.length > 0) {
      // Priorizar fontes verificadas e em português
      const compatibleSource = audioSources.find(source => 
        source.isVerified && 
        source.language?.startsWith('pt') &&
        source.category === 'meditation' &&
        source.tags.some(tag => 
          meditation.category === 'ansiedade' && tag.includes('anxiety') ||
          meditation.category === 'sono' && tag.includes('sleep') ||
          meditation.category === 'foco' && tag.includes('focus') ||
          meditation.category === 'mindfulness' && tag.includes('mindfulness')
        )
      ) || audioSources.find(source => 
        source.isVerified && source.category === 'meditation'
      ) || audioSources[0]

      if (compatibleSource) {
        setPlayerState(prev => ({ ...prev, currentAudioSource: compatibleSource }))
      }
    }
  }, [audioSources, meditation.category])

  // Configurar audio element
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setPlayerState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
        duration: audio.duration || 0
      }))

      // Atualizar progresso da sessão
      if (audio.duration > 0) {
        const completionPercentage = (audio.currentTime / audio.duration) * 100
        setSessionData(prev => ({ ...prev, completionPercentage }))
      }
    }

    const handleLoadStart = () => {
      setPlayerState(prev => ({ ...prev, isLoading: true }))
    }

    const handleCanPlay = () => {
      setPlayerState(prev => ({ ...prev, isLoading: false }))
      if (autoPlay && !sessionStarted) {
        handlePlay()
      }
    }

    const handleEnded = () => {
      handleSessionComplete()
    }

    const handleError = (e: any) => {
      console.error('Audio error:', e)
      setPlayerState(prev => ({ ...prev, isLoading: false, isPlaying: false }))
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [autoPlay, sessionStarted])

  const handlePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (!sessionStarted) {
      setSessionStarted(true)
      setSessionData(prev => ({ ...prev, startTime: new Date() }))
    }

    audio.play()
    setPlayerState(prev => ({ ...prev, isPlaying: true }))
  }

  const handlePause = () => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      setPlayerState(prev => ({ ...prev, isPlaying: false }))
    }
  }

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current
    if (audio && playerState.duration > 0) {
      const newTime = (value[0] / 100) * playerState.duration
      audio.currentTime = newTime
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current
    const volume = value[0] / 100
    
    if (audio) {
      audio.volume = volume
    }
    
    setPlayerState(prev => ({ 
      ...prev, 
      volume,
      isMuted: volume === 0
    }))
  }

  const handleMute = () => {
    const audio = audioRef.current
    if (audio) {
      const newMuted = !playerState.isMuted
      audio.muted = newMuted
      setPlayerState(prev => ({ ...prev, isMuted: newMuted }))
    }
  }

  const handleSessionComplete = () => {
    setSessionData(prev => ({ 
      ...prev, 
      endTime: new Date(),
      completionPercentage: 100
    }))
    
    if (onComplete) {
      onComplete({
        ...sessionData,
        meditationId: meditation.id,
        duration: playerState.duration,
        actualDuration: playerState.currentTime
      })
    }
  }

  const handleAudioSourceChange = (sourceId: string) => {
    const newSource = audioSources.find(s => s.id === sourceId)
    if (newSource) {
      setPlayerState(prev => ({ ...prev, currentAudioSource: newSource }))
      
      // Pausar reprodução atual e recarregar
      if (playerState.isPlaying) {
        handlePause()
      }
    }
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getAudioSourceIcon = (source?: AudioSource) => {
    if (!source) return <Music className="h-4 w-4" />
    
    switch (source.category) {
      case 'nature': return <Radio className="h-4 w-4" />
      case 'binaural': return <Headphones className="h-4 w-4" />
      case 'voice': return <FileAudio className="h-4 w-4" />
      default: return <Music className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={playerState.currentAudioSource?.downloadUrl || playerState.currentAudioSource?.url}
        preload="metadata"
      />

      {/* Informações da Meditação */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{meditation.title}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{meditation.category}</Badge>
                <Badge variant="outline">{meditation.difficulty}</Badge>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {meditation.duration}min
                </Badge>
                {!playerState.isOnline && (
                  <Badge variant="destructive">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Seleção de Fonte de Áudio */}
          {audioSources.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Fonte de Áudio:</label>
              <Select 
                value={playerState.currentAudioSource?.id} 
                onValueChange={handleAudioSourceChange}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    {getAudioSourceIcon(playerState.currentAudioSource)}
                    <SelectValue placeholder="Selecionar fonte de áudio" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {audioSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      <div className="flex items-center gap-2">
                        {getAudioSourceIcon(source)}
                        <div>
                          <div className="font-medium">{source.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {source.author} • {formatTime(source.duration)} • {source.quality}
                          </div>
                        </div>
                        {source.isVerified && (
                          <Badge variant="default" className="ml-2">
                            Verificado
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Controles de Reprodução */}
          <div className="space-y-4">
            {/* Barra de Progresso */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatTime(playerState.currentTime)}</span>
                <span>{formatTime(playerState.duration)}</span>
              </div>
              <Slider
                value={[playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Controles Principais */}
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="sm">
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                size="lg"
                onClick={playerState.isPlaying ? handlePause : handlePlay}
                disabled={playerState.isLoading || !playerState.currentAudioSource}
                className="w-12 h-12 rounded-full"
              >
                {playerState.isLoading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : playerState.isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              
              <Button variant="outline" size="sm">
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Controles de Volume */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMute}
              >
                {playerState.isMuted || playerState.volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              
              <Slider
                value={[playerState.volume * 100]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="flex-1"
              />
            </div>
          </div>

          {/* Progresso da Sessão */}
          {sessionStarted && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso da Sessão:</span>
                <span>{Math.round(sessionData.completionPercentage)}%</span>
              </div>
              <Progress value={sessionData.completionPercentage} className="w-full" />
            </div>
          )}

          {/* Status da Conexão e Fonte */}
          {playerState.currentAudioSource && (
            <div className="text-xs text-muted-foreground border-t pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {playerState.isOnline ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500" />
                  )}
                  <span>
                    {playerState.isOnline ? 'Online' : 'Offline'} • 
                    {playerState.currentAudioSource.license.replace('_', ' ')} • 
                    {playerState.currentAudioSource.format.toUpperCase()}
                  </span>
                </div>
                <div>
                  {playerState.currentAudioSource.quality} quality
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Passos da Meditação */}
      {meditation.guidedSteps && meditation.guidedSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Passos da Meditação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {meditation.guidedSteps.map((step, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${
                    index === currentStep 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                      index === currentStep 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <span className={index === currentStep ? 'font-medium' : ''}>{step}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}