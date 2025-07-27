"use client"

import React, { useRef, useEffect, useState } from 'react'
import Peer from 'simple-peer'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Monitor, 
  Settings,
  Users,
  Clock,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RefreshCw
} from 'lucide-react'

interface VideoCallProps {
  sessionId: string
  userId: number
  userRole: 'patient' | 'psychologist'
  onCallEnd?: () => void
  onError?: (error: string) => void
}

interface CallState {
  isConnected: boolean
  isInitiator: boolean
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  peer: Peer.Instance | null
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error'
}

export function VideoCall({ sessionId, userId, userRole, onCallEnd, onError }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  
  const [callState, setCallState] = useState<CallState>({
    isConnected: false,
    isInitiator: false,
    localStream: null,
    remoteStream: null,
    peer: null,
    connectionState: 'disconnected'
  })
  
  const [controls, setControls] = useState({
    videoEnabled: true,
    audioEnabled: true,
    speakerEnabled: true,
    isFullscreen: false
  })
  
  const [sessionInfo, setSessionInfo] = useState({
    startTime: new Date(),
    duration: 0,
    participantsCount: 1
  })
  
  const [notes, setNotes] = useState('')
  const [isRecording, setIsRecording] = useState(false)

  // WebSocket connection for signaling
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    `ws://localhost:3001/ws/videotherapy/${sessionId}`,
    {
      shouldReconnect: () => true,
      reconnectInterval: 3000,
    }
  )

  // Timer para duração da sessão
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionInfo(prev => ({
        ...prev,
        duration: Math.floor((new Date().getTime() - prev.startTime.getTime()) / 1000)
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Inicializar chamada
  useEffect(() => {
    initializeCall()
    
    return () => {
      cleanup()
    }
  }, [sessionId])

  // Processar mensagens do WebSocket
  useEffect(() => {
    if (lastMessage?.data) {
      try {
        const data = JSON.parse(lastMessage.data)
        handleSignalingMessage(data)
      } catch (error) {
        console.error('Erro ao processar mensagem:', error)
      }
    }
  }, [lastMessage])

  const initializeCall = async () => {
    try {
      setCallState(prev => ({ ...prev, connectionState: 'connecting' }))
      
      // Obter stream local (câmera + microfone)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      setCallState(prev => ({ ...prev, localStream: stream }))

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Notificar outros participantes
      sendMessage(JSON.stringify({
        type: 'join',
        sessionId,
        userId,
        userRole
      }))

    } catch (error) {
      console.error('Erro ao inicializar chamada:', error)
      setCallState(prev => ({ ...prev, connectionState: 'error' }))
      onError?.('Erro ao acessar câmera/microfone')
    }
  }

  const handleSignalingMessage = (data: any) => {
    switch (data.type) {
      case 'user-joined':
        if (data.userId !== userId) {
          initiateConnection(true)
          setSessionInfo(prev => ({ ...prev, participantsCount: prev.participantsCount + 1 }))
        }
        break
        
      case 'signal':
        if (data.userId !== userId) {
          if (!callState.peer) {
            initiateConnection(false)
          }
          callState.peer?.signal(data.signal)
        }
        break
        
      case 'user-left':
        if (data.userId !== userId) {
          setSessionInfo(prev => ({ ...prev, participantsCount: prev.participantsCount - 1 }))
          handlePeerDisconnect()
        }
        break
    }
  }

  const initiateConnection = (isInitiator: boolean) => {
    if (!callState.localStream) return

    const peer = new Peer({
      initiator: isInitiator,
      trickle: false,
      stream: callState.localStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    })

    peer.on('signal', (signal) => {
      sendMessage(JSON.stringify({
        type: 'signal',
        sessionId,
        userId,
        signal
      }))
    })

    peer.on('connect', () => {
      console.log('Peer conectado')
      setCallState(prev => ({ 
        ...prev, 
        isConnected: true, 
        connectionState: 'connected',
        isInitiator 
      }))
    })

    peer.on('stream', (remoteStream) => {
      console.log('Stream remoto recebido')
      setCallState(prev => ({ ...prev, remoteStream }))
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
      }
    })

    peer.on('error', (error) => {
      console.error('Erro no peer:', error)
      setCallState(prev => ({ ...prev, connectionState: 'error' }))
      onError?.('Erro na conexão de vídeo')
    })

    peer.on('close', () => {
      console.log('Peer desconectado')
      handlePeerDisconnect()
    })

    setCallState(prev => ({ ...prev, peer }))
  }

  const handlePeerDisconnect = () => {
    setCallState(prev => ({
      ...prev,
      isConnected: false,
      remoteStream: null,
      connectionState: 'disconnected'
    }))
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
  }

  const toggleVideo = () => {
    if (callState.localStream) {
      const videoTrack = callState.localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setControls(prev => ({ ...prev, videoEnabled: videoTrack.enabled }))
      }
    }
  }

  const toggleAudio = () => {
    if (callState.localStream) {
      const audioTrack = callState.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setControls(prev => ({ ...prev, audioEnabled: audioTrack.enabled }))
      }
    }
  }

  const toggleSpeaker = () => {
    setControls(prev => ({ ...prev, speakerEnabled: !prev.speakerEnabled }))
    // Implementar controle de volume se necessário
  }

  const endCall = () => {
    cleanup()
    
    sendMessage(JSON.stringify({
      type: 'leave',
      sessionId,
      userId
    }))
    
    onCallEnd?.()
  }

  const cleanup = () => {
    if (callState.peer) {
      callState.peer.destroy()
    }
    
    if (callState.localStream) {
      callState.localStream.getTracks().forEach(track => track.stop())
    }
    
    setCallState({
      isConnected: false,
      isInitiator: false,
      localStream: null,
      remoteStream: null,
      peer: null,
      connectionState: 'disconnected'
    })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const connectionStatus = readyState === ReadyState.OPEN ? 'connected' : 'disconnected'

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Sessão de Videoterapia</h1>
          <Badge variant={callState.connectionState === 'connected' ? 'default' : 'secondary'}>
            {callState.connectionState === 'connected' ? 'Conectado' : 'Desconectado'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatDuration(sessionInfo.duration)}
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {sessionInfo.participantsCount} participante(s)
          </div>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {/* Remote Video (Main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted={false}
          className="w-full h-full object-cover bg-gray-800"
        />
        
        {!callState.remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Aguardando outro participante...</p>
              {callState.connectionState === 'connecting' && (
                <div className="flex items-center justify-center mt-2">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Conectando...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Local Video (Picture in Picture) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-700 rounded-lg overflow-hidden shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted={true}
            className="w-full h-full object-cover"
          />
          {!controls.videoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <VideoOff className="w-8 h-8 text-white" />
            </div>
          )}
        </div>

        {/* Connection Status */}
        {connectionStatus === 'disconnected' && (
          <Alert className="absolute top-4 left-4 w-72">
            <AlertDescription>
              Tentando reconectar ao servidor...
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white border-t p-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={controls.videoEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full w-12 h-12"
          >
            {controls.videoEnabled ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </Button>

          <Button
            variant={controls.audioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full w-12 h-12"
          >
            {controls.audioEnabled ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </Button>

          <Button
            variant={controls.speakerEnabled ? "default" : "secondary"}
            size="lg"
            onClick={toggleSpeaker}
            className="rounded-full w-12 h-12"
          >
            {controls.speakerEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="rounded-full w-12 h-12"
          >
            <Monitor className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="rounded-full w-12 h-12"
          >
            <Settings className="w-5 h-5" />
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={endCall}
            className="rounded-full w-12 h-12"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Side Panel for Notes (if psychologist) */}
      {userRole === 'psychologist' && (
        <div className="fixed right-0 top-0 w-80 h-full bg-white border-l shadow-lg transform transition-transform duration-300">
          <Card className="h-full rounded-none border-0">
            <CardHeader>
              <CardTitle className="text-lg">Notas da Sessão</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione suas observações da sessão..."
                className="w-full h-64 p-3 border rounded-md resize-none"
              />
              
              <div className="mt-4 space-y-2">
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  onClick={() => setIsRecording(!isRecording)}
                  className="w-full"
                >
                  {isRecording ? "Parar Gravação" : "Iniciar Gravação"}
                </Button>
                
                <Button variant="outline" className="w-full">
                  Salvar Notas
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}