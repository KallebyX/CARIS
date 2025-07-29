"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, User, Video, MapPin, CalendarCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Session {
  id: number;
  sessionDate: string;
  durationMinutes: number;
  type: 'online' | 'presencial';
  status: string;
  notes?: string;
  patient?: {
    id: number;
    name: string;
    email: string;
  };
  psychologist?: {
    id: number;
    name: string;
    email: string;
  };
  googleCalendarEventId?: string;
  outlookCalendarEventId?: string;
  timezone?: string;
}

interface Patient {
  id: number;
  name: string;
  email: string;
}

export function SessionScheduler() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    patientId: '',
    sessionDate: '',
    sessionTime: '',
    durationMinutes: 60,
    type: 'online' as 'online' | 'presencial',
    notes: '',
  });

  useEffect(() => {
    fetchSessions();
    fetchPatients();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as sessões.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      // This would need to be implemented in the backend
      // For now, we'll use a placeholder
      const response = await fetch('/api/psychologist/patients');
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      // Continue without patients list for now
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.sessionDate || !formData.sessionTime) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const sessionDateTime = new Date(`${formData.sessionDate}T${formData.sessionTime}`);
      
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: parseInt(formData.patientId),
          sessionDate: sessionDateTime.toISOString(),
          durationMinutes: formData.durationMinutes,
          type: formData.type,
          notes: formData.notes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSessions([data.session, ...sessions]);
        setShowForm(false);
        setFormData({
          patientId: '',
          sessionDate: '',
          sessionTime: '',
          durationMinutes: 60,
          type: 'online',
          notes: '',
        });
        toast({
          title: 'Sucesso',
          description: 'Sessão agendada com sucesso! Calendários sincronizados automaticamente.',
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao agendar sessão');
      }
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível agendar a sessão.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const syncToCalendar = async (sessionId: number) => {
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Sessão sincronizada com os calendários!',
        });
        fetchSessions(); // Refresh the list
      } else {
        throw new Error('Erro na sincronização');
      }
    } catch (error) {
      console.error('Error syncing session:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível sincronizar com os calendários.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      agendada: { label: 'Agendada', className: 'bg-blue-100 text-blue-800' },
      confirmada: { label: 'Confirmada', className: 'bg-green-100 text-green-800' },
      realizada: { label: 'Realizada', className: 'bg-gray-100 text-gray-800' },
      cancelada: { label: 'Cancelada', className: 'bg-red-100 text-red-800' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.agendada;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getSyncStatus = (session: Session) => {
    const hasGoogle = !!session.googleCalendarEventId;
    const hasOutlook = !!session.outlookCalendarEventId;
    
    if (hasGoogle && hasOutlook) {
      return <Badge className="bg-green-100 text-green-800">Sync Completo</Badge>;
    } else if (hasGoogle || hasOutlook) {
      return <Badge className="bg-yellow-100 text-yellow-800">Sync Parcial</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800">Não Sincronizado</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caris-teal mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Agendamentos</h2>
          <p className="text-slate-600">Gerencie suas consultas e sincronize com calendários externos.</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          Nova Consulta
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Agendar Nova Consulta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient">Paciente</Label>
                  <Select
                    value={formData.patientId}
                    onValueChange={(value) => setFormData({ ...formData, patientId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          {patient.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Consulta</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'online' | 'presencial') => 
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Online
                        </div>
                      </SelectItem>
                      <SelectItem value="presencial">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Presencial
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.sessionDate}
                    onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Horário</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.sessionTime}
                    onChange={(e) => setFormData({ ...formData, sessionTime: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (minutos)</Label>
                  <Select
                    value={formData.durationMinutes.toString()}
                    onValueChange={(value) => 
                      setFormData({ ...formData, durationMinutes: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="45">45 minutos</SelectItem>
                      <SelectItem value="60">60 minutos</SelectItem>
                      <SelectItem value="90">90 minutos</SelectItem>
                      <SelectItem value="120">120 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações adicionais sobre a consulta..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Agendando...' : 'Agendar Consulta'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Consultas Agendadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhuma consulta agendada</p>
                <p className="text-sm text-gray-500">Clique em "Nova Consulta" para começar</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      {session.type === 'online' ? (
                        <Video className="h-5 w-5 text-blue-600" />
                      ) : (
                        <MapPin className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">
                          {session.patient?.name || session.psychologist?.name || 'Paciente'}
                        </h4>
                        {getStatusBadge(session.status)}
                        {getSyncStatus(session)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(session.sessionDate).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(session.sessionDate).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>{session.durationMinutes} min</span>
                      </div>
                      {session.notes && (
                        <p className="text-sm text-gray-500 mt-1">{session.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!session.googleCalendarEventId && !session.outlookCalendarEventId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncToCalendar(session.id)}
                        className="flex items-center gap-1"
                      >
                        <CalendarCheck className="h-4 w-4" />
                        Sincronizar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}