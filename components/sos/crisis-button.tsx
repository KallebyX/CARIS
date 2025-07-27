"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  Phone, 
  Heart, 
  Clock, 
  User, 
  MapPin,
  AlertTriangle,
  Check,
  X,
  Headphones,
  MessageCircle,
  Video
} from 'lucide-react'

interface CrisisButtonProps {
  userId: number
  onActivate?: () => void
}

interface CrisisState {
  isActive: boolean
  activatedAt: Date | null
  status: 'waiting' | 'connecting' | 'connected' | 'resolved'
  responseTime: number
  helpType: 'immediate' | 'urgent' | 'support' | null
  location: { lat: number; lng: number } | null
}

interface CrisisResource {
  id: string
  title: string
  description: string
  type: 'breathing' | 'grounding' | 'phone' | 'chat' | 'video'
  action: () => void
  icon: React.ReactNode
}

export function CrisisButton({ userId, onActivate }: CrisisButtonProps) {
  const [crisisState, setCrisisState] = useState<CrisisState>({
    isActive: false,
    activatedAt: null,
    status: 'waiting',
    responseTime: 0,
    helpType: null,
    location: null
  })

  const [showResources, setShowResources] = useState(false)
  const [breathingActive, setBreathingActive] = useState(false)
  const [breathingCycle, setBreathingCycle] = useState<'inhale' | 'hold' | 'exhale'>('inhale')

  // Timer para resposta de emergência
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (crisisState.isActive && crisisState.status === 'waiting') {
      interval = setInterval(() => {
        setCrisisState(prev => ({
          ...prev,
          responseTime: prev.responseTime + 1
        }))
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [crisisState.isActive, crisisState.status])

  // Técnica de respiração
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (breathingActive) {
      interval = setInterval(() => {
        setBreathingCycle(prev => {
          switch (prev) {
            case 'inhale': return 'hold'
            case 'hold': return 'exhale'
            case 'exhale': return 'inhale'
            default: return 'inhale'
          }
        })
      }, 4000) // 4 segundos para cada fase
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [breathingActive])

  // Obter localização
  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCrisisState(prev => ({
            ...prev,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          }))
        },
        (error) => {
          console.error('Erro ao obter localização:', error)
        }
      )
    }
  }

  const activateSOS = async (helpType: 'immediate' | 'urgent' | 'support') => {
    try {
      // Obter localização
      getLocation()

      setCrisisState({
        isActive: true,
        activatedAt: new Date(),
        status: 'waiting',
        responseTime: 0,
        helpType,
        location: null
      })

      // Enviar alerta para API
      const response = await fetch('/api/sos/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          helpType,
          location: crisisState.location,
          timestamp: new Date().toISOString()
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Simular processo de conexão
        setTimeout(() => {
          setCrisisState(prev => ({ ...prev, status: 'connecting' }))
        }, 2000)

        setTimeout(() => {
          setCrisisState(prev => ({ ...prev, status: 'connected' }))
        }, 5000)
      }

      onActivate?.()
    } catch (error) {
      console.error('Erro ao ativar SOS:', error)
    }
  }

  const deactivateSOS = async () => {
    try {
      await fetch('/api/sos/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      setCrisisState({
        isActive: false,
        activatedAt: null,
        status: 'waiting',
        responseTime: 0,
        helpType: null,
        location: null
      })

      setShowResources(false)
      setBreathingActive(false)
    } catch (error) {
      console.error('Erro ao desativar SOS:', error)
    }
  }

  const crisisResources: CrisisResource[] = [
    {
      id: 'breathing',
      title: 'Técnica de Respiração',
      description: 'Exercício guiado para acalmar a ansiedade',
      type: 'breathing',
      action: () => setBreathingActive(!breathingActive),
      icon: <Heart className="w-5 h-5" />
    },
    {
      id: 'grounding',
      title: 'Técnica 5-4-3-2-1',
      description: 'Grounding para reconexão com o presente',
      type: 'grounding',
      action: () => alert('Técnica 5-4-3-2-1 ativada'),
      icon: <MapPin className="w-5 h-5" />
    },
    {
      id: 'cvv',
      title: 'CVV - 188',
      description: 'Centro de Valorização da Vida',
      type: 'phone',
      action: () => window.open('tel:188'),
      icon: <Phone className="w-5 h-5" />
    },
    {
      id: 'chat-support',
      title: 'Chat de Apoio',
      description: 'Conversar com especialista agora',
      type: 'chat',
      action: () => window.open('/dashboard/chat'),
      icon: <MessageCircle className="w-5 h-5" />
    }
  ]

  const getBreathingInstruction = () => {
    switch (breathingCycle) {
      case 'inhale': return 'Inspire devagar pelo nariz...'
      case 'hold': return 'Segure a respiração...'
      case 'exhale': return 'Expire lentamente pela boca...'
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (crisisState.isActive) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-red-50 border-red-200">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl text-red-800">SOS Ativado</CardTitle>
            <Badge variant="destructive" className="mx-auto">
              {crisisState.status === 'waiting' && 'Aguardando resposta'}
              {crisisState.status === 'connecting' && 'Conectando...'}
              {crisisState.status === 'connected' && 'Conectado com especialista'}
            </Badge>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                Tempo de resposta: {formatTime(crisisState.responseTime)}
              </div>
              
              {crisisState.helpType && (
                <div className="mt-2">
                  <Badge variant="outline">
                    {crisisState.helpType === 'immediate' && 'Emergência Imediata'}
                    {crisisState.helpType === 'urgent' && 'Ajuda Urgente'}
                    {crisisState.helpType === 'support' && 'Apoio Emocional'}
                  </Badge>
                </div>
              )}
            </div>

            {crisisState.status === 'waiting' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Seu pedido de ajuda foi enviado. Um especialista entrará em contato em breve.
                  Enquanto isso, você pode usar as técnicas de apoio abaixo.
                </AlertDescription>
              </Alert>
            )}

            {crisisState.status === 'connected' && (
              <Alert className="border-green-200 bg-green-50">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Você está conectado com um especialista. Eles podem te ajudar agora.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowResources(!showResources)}
              >
                <Heart className="w-4 h-4 mr-2" />
                Técnicas de Apoio Imediato
              </Button>

              {showResources && (
                <div className="space-y-2 mt-2">
                  {crisisResources.map((resource) => (
                    <Button
                      key={resource.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={resource.action}
                    >
                      {resource.icon}
                      <span className="ml-2">{resource.title}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {breathingActive && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <div 
                      className={`w-12 h-12 bg-white rounded-full transition-all duration-4000 ${
                        breathingCycle === 'inhale' ? 'scale-150' : 
                        breathingCycle === 'hold' ? 'scale-150' : 'scale-75'
                      }`}
                    />
                  </div>
                  <p className="text-blue-800 font-medium">{getBreathingInstruction()}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setBreathingActive(false)}
                  >
                    Parar
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={deactivateSOS}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar SOS
              </Button>
              
              {crisisState.status === 'connected' && (
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => setCrisisState(prev => ({ ...prev, status: 'resolved' }))}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Resolvido
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-red-800 mb-2">Sistema SOS</h1>
        <p className="text-muted-foreground">
          Estamos aqui para ajudar. Escolha o tipo de apoio que você precisa.
        </p>
      </div>

      {/* Botões SOS por tipo de emergência */}
      <div className="grid gap-4">
        <Card className="border-red-200 hover:border-red-300 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">Emergência Imediata</h3>
                <p className="text-sm text-gray-600">
                  Para situações de risco imediato à vida ou segurança
                </p>
              </div>
              <Button
                size="lg"
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={() => activateSOS('immediate')}
              >
                <Shield className="w-5 h-5 mr-2" />
                SOS AGORA
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 hover:border-orange-300 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800">Ajuda Urgente</h3>
                <p className="text-sm text-gray-600">
                  Para crises que precisam de atenção rápida
                </p>
              </div>
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => activateSOS('urgent')}
              >
                <Heart className="w-5 h-5 mr-2" />
                AJUDA
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 hover:border-blue-300 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-800">Apoio Emocional</h3>
                <p className="text-sm text-gray-600">
                  Para conversas de apoio e suporte emocional
                </p>
              </div>
              <Button
                size="lg"
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => activateSOS('support')}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                CONVERSAR
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recursos de autoajuda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Recursos de Autoajuda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {crisisResources.map((resource) => (
              <div
                key={resource.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {resource.icon}
                  <div>
                    <h4 className="font-medium">{resource.title}</h4>
                    <p className="text-sm text-gray-600">{resource.description}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={resource.action}>
                  Usar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Informações importantes */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Em caso de emergência médica grave, ligue imediatamente para o SAMU (192) 
          ou Bombeiros (193). Este sistema é um complemento, não substitui serviços de emergência tradicionais.
        </AlertDescription>
      </Alert>
    </div>
  )
}