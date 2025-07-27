"use client"

import React, { useState, useEffect } from 'react'
import { VideoCall } from './video-call'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Video, 
  Calendar, 
  Clock, 
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Settings,
  FileText,
  Download
} from 'lucide-react'

interface Session {
  id: number
  sessionDate: string
  durationMinutes: number
  status: 'agendada' | 'confirmada' | 'em_andamento' | 'realizada' | 'cancelada'
  type: 'online' | 'presencial'
  patientId: number
  psychologistId: number
  notes?: string
  recordingUrl?: string
  patientName?: string
  psychologistName?: string
}

interface SessionManagerProps {
  userId: number
  userRole: 'patient' | 'psychologist'
}

export function SessionManager({ userId, userRole }: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [isInCall, setIsInCall] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newSessionData, setNewSessionData] = useState({
    patientId: '',
    sessionDate: '',
    durationMinutes: 60,
    type: 'online' as 'online' | 'presencial',
    notes: ''
  })

  useEffect(() => {
    fetchSessions()
  }, [userId])

  const fetchSessions = async () => {
    try {
      const endpoint = userRole === 'psychologist' 
        ? '/api/psychologist/sessions'
        : '/api/patient/sessions'
      
      const response = await fetch(endpoint)
      const data = await response.json()
      
      if (data.success) {
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Erro ao buscar sessões:', error)
    } finally {
      setLoading(false)
    }
  }

  const startSession = async (session: Session) => {
    try {
      // Atualizar status da sessão para "em_andamento"
      const response = await fetch(`/api/sessions/${session.id}/start`, {
        method: 'POST'
      })
      
      if (response.ok) {
        setActiveSession(session)
        setIsInCall(true)
        
        // Atualizar lista local
        setSessions(prev => prev.map(s => 
          s.id === session.id 
            ? { ...s, status: 'em_andamento' }
            : s
        ))
      }
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error)
    }
  }

  const endSession = async () => {
    if (!activeSession) return

    try {
      const response = await fetch(`/api/sessions/${activeSession.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: newSessionData.notes
        })
      })
      
      if (response.ok) {
        setIsInCall(false)
        setActiveSession(null)
        
        // Atualizar lista local
        setSessions(prev => prev.map(s => 
          s.id === activeSession.id 
            ? { ...s, status: 'realizada' }
            : s
        ))
        
        // Recarregar sessões
        fetchSessions()
      }
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error)
    }
  }

  const createSession = async () => {
    if (userRole !== 'psychologist') return

    try {
      const response = await fetch('/api/psychologist/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSessionData)
      })
      
      if (response.ok) {
        const data = await response.json()
        setSessions(prev => [data.session, ...prev])
        
        // Limpar formulário
        setNewSessionData({
          patientId: '',
          sessionDate: '',
          durationMinutes: 60,
          type: 'online',
          notes: ''
        })
      }
    } catch (error) {
      console.error('Erro ao criar sessão:', error)
    }
  }

  const getStatusBadge = (status: Session['status']) => {
    const statusMap = {
      agendada: { variant: 'secondary' as const, label: 'Agendada' },
      confirmada: { variant: 'default' as const, label: 'Confirmada' },
      em_andamento: { variant: 'default' as const, label: 'Em Andamento' },
      realizada: { variant: 'default' as const, label: 'Realizada' },
      cancelada: { variant: 'destructive' as const, label: 'Cancelada' }
    }
    
    const config = statusMap[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getStatusIcon = (status: Session['status']) => {
    switch (status) {
      case 'confirmada':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'em_andamento':
        return <Play className="w-4 h-4 text-blue-500" />
      case 'realizada':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'cancelada':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const canStartSession = (session: Session) => {
    const sessionDate = new Date(session.sessionDate)
    const now = new Date()
    const timeDiff = sessionDate.getTime() - now.getTime()
    const minutesDiff = timeDiff / (1000 * 60)
    
    return session.status === 'confirmada' && 
           session.type === 'online' && 
           minutesDiff <= 15 && 
           minutesDiff >= -5 // Pode iniciar até 15 min antes e 5 min depois
  }

  if (isInCall && activeSession) {
    return (
      <VideoCall
        sessionId={activeSession.id.toString()}
        userId={userId}
        userRole={userRole}
        onCallEnd={endSession}
        onError={(error) => {
          console.error('Erro na videochamada:', error)
          setIsInCall(false)
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Videoterapia</h1>
          <p className="text-muted-foreground">
            {userRole === 'psychologist' 
              ? 'Gerencie suas sessões de videoterapia' 
              : 'Suas sessões de terapia online'}
          </p>
        </div>
        
        {userRole === 'psychologist' && (
          <Button onClick={() => setNewSessionData(prev => ({ ...prev, patientId: '' }))}>
            <Calendar className="w-4 h-4 mr-2" />
            Agendar Sessão
          </Button>
        )}
      </div>

      {/* Criar Nova Sessão (Psicólogo) */}
      {userRole === 'psychologist' && newSessionData.patientId === '' && (
        <Card>
          <CardHeader>
            <CardTitle>Agendar Nova Sessão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patientId">Paciente</Label>
                <Input
                  id="patientId"
                  value={newSessionData.patientId}
                  onChange={(e) => setNewSessionData(prev => ({ ...prev, patientId: e.target.value }))}
                  placeholder="ID do paciente"
                />
              </div>
              
              <div>
                <Label htmlFor="sessionDate">Data e Hora</Label>
                <Input
                  id="sessionDate"
                  type="datetime-local"
                  value={newSessionData.sessionDate}
                  onChange={(e) => setNewSessionData(prev => ({ ...prev, sessionDate: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={newSessionData.durationMinutes}
                  onChange={(e) => setNewSessionData(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) }))}
                  min="30"
                  max="120"
                  step="15"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Tipo</Label>
                <select
                  id="type"
                  value={newSessionData.type}
                  onChange={(e) => setNewSessionData(prev => ({ ...prev, type: e.target.value as 'online' | 'presencial' }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="online">Online</option>
                  <option value="presencial">Presencial</option>
                </select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={newSessionData.notes}
                onChange={(e) => setNewSessionData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações sobre a sessão..."
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={createSession}>
                Agendar Sessão
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setNewSessionData(prev => ({ ...prev, patientId: '' }))}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Sessões */}
      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Video className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Nenhuma sessão encontrada</p>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(session.status)}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">
                          {userRole === 'psychologist' 
                            ? `Sessão com ${session.patientName || 'Paciente'}`
                            : `Sessão com ${session.psychologistName || 'Terapeuta'}`}
                        </h3>
                        {getStatusBadge(session.status)}
                        {session.type === 'online' && (
                          <Badge variant="outline">
                            <Video className="w-3 h-3 mr-1" />
                            Online
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(session.sessionDate).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(session.sessionDate).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        <span>{session.durationMinutes} min</span>
                      </div>
                      
                      {session.notes && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {session.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {canStartSession(session) && (
                      <Button onClick={() => startSession(session)}>
                        <Video className="w-4 h-4 mr-2" />
                        Iniciar Videochamada
                      </Button>
                    )}
                    
                    {session.status === 'realizada' && session.recordingUrl && (
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Gravação
                      </Button>
                    )}
                    
                    {userRole === 'psychologist' && (
                      <Button variant="outline" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Notas
                      </Button>
                    )}
                    
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Alertas importantes */}
      {sessions.some(s => canStartSession(s)) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você tem sessões que podem ser iniciadas agora. 
            Clique em "Iniciar Videochamada" para começar.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}