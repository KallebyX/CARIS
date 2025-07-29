"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Mail, MessageSquare, GoogleIcon, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

interface CalendarSettings {
  timezone: string;
  googleCalendarEnabled: boolean;
  outlookCalendarEnabled: boolean;
  emailRemindersEnabled: boolean;
  smsRemindersEnabled: boolean;
  reminderBefore24h: boolean;
  reminderBefore1h: boolean;
  reminderBefore15min: boolean;
}

const timezones = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+10)' },
];

// Placeholder Microsoft Icon
const MicrosoftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1H11V11H1V1Z" fill="#F25022"/>
    <path d="M12 1H22V11H12V1Z" fill="#7FBA00"/>
    <path d="M1 12H11V22H1V12Z" fill="#00A4EF"/>
    <path d="M12 12H22V22H12V12Z" fill="#FFB900"/>
  </svg>
);

export function CalendarManagement() {
  const [settings, setSettings] = useState<CalendarSettings>({
    timezone: 'America/Sao_Paulo',
    googleCalendarEnabled: false,
    outlookCalendarEnabled: false,
    emailRemindersEnabled: true,
    smsRemindersEnabled: false,
    reminderBefore24h: true,
    reminderBefore1h: true,
    reminderBefore15min: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/calendar/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching calendar settings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações do calendário.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<CalendarSettings>) => {
    setSaving(true);
    try {
      const response = await fetch('/api/calendar/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings({ ...settings, ...data.settings });
        toast({
          title: 'Sucesso',
          description: 'Configurações atualizadas com sucesso!',
        });
      } else {
        throw new Error('Erro ao atualizar configurações');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const connectCalendar = async (provider: 'google' | 'outlook') => {
    try {
      const response = await fetch(`/api/calendar/${provider}/auth`);
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      } else {
        throw new Error('Erro ao gerar URL de autorização');
      }
    } catch (error) {
      console.error(`Error connecting ${provider} calendar:`, error);
      toast({
        title: 'Erro',
        description: `Não foi possível conectar com o ${provider === 'google' ? 'Google' : 'Outlook'} Calendar.`,
        variant: 'destructive',
      });
    }
  };

  const disconnectCalendar = async (provider: 'google' | 'outlook') => {
    try {
      const response = await fetch(`/api/calendar/settings?provider=${provider}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSettings({
          ...settings,
          [`${provider}CalendarEnabled`]: false,
        });
        toast({
          title: 'Sucesso',
          description: `${provider === 'google' ? 'Google' : 'Outlook'} Calendar desconectado com sucesso!`,
        });
      } else {
        throw new Error('Erro ao desconectar calendário');
      }
    } catch (error) {
      console.error(`Error disconnecting ${provider} calendar:`, error);
      toast({
        title: 'Erro',
        description: `Não foi possível desconectar o ${provider === 'google' ? 'Google' : 'Outlook'} Calendar.`,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caris-teal mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando configurações do calendário...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timezone Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Fuso Horário
          </CardTitle>
          <CardDescription>
            Defina seu fuso horário para sincronização correta dos agendamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso Horário</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => updateSettings({ timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu fuso horário" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Integração de Calendários
          </CardTitle>
          <CardDescription>
            Conecte seus calendários para sincronização automática de consultas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Calendar */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label>Google Calendar</Label>
                  {settings.googleCalendarEnabled ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {settings.googleCalendarEnabled
                    ? 'Conectado - suas consultas serão sincronizadas automaticamente'
                    : 'Sincronize suas consultas com o Google Calendar'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {settings.googleCalendarEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectCalendar('google')}
                  disabled={saving}
                >
                  Desconectar
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => connectCalendar('google')}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Conectar
                </Button>
              )}
            </div>
          </div>

          {/* Outlook Calendar */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <MicrosoftIcon />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label>Outlook Calendar</Label>
                  {settings.outlookCalendarEnabled ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {settings.outlookCalendarEnabled
                    ? 'Conectado - suas consultas serão sincronizadas automaticamente'
                    : 'Sincronize suas consultas com o Outlook Calendar'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {settings.outlookCalendarEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectCalendar('outlook')}
                  disabled={saving}
                >
                  Desconectar
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => connectCalendar('outlook')}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Conectar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Lembretes Automáticos
          </CardTitle>
          <CardDescription>
            Configure quando e como você quer receber lembretes de consultas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Lembretes por E-mail</Label>
              <p className="text-sm text-muted-foreground">
                Receber lembretes por e-mail antes das consultas.
              </p>
            </div>
            <Switch
              checked={settings.emailRemindersEnabled}
              onCheckedChange={(checked) =>
                updateSettings({ emailRemindersEnabled: checked })
              }
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Lembretes por SMS</Label>
              <p className="text-sm text-muted-foreground">
                Receber lembretes por SMS antes das consultas.
              </p>
            </div>
            <Switch
              checked={settings.smsRemindersEnabled}
              onCheckedChange={(checked) =>
                updateSettings({ smsRemindersEnabled: checked })
              }
              disabled={saving}
            />
          </div>

          <div className="border-t pt-4">
            <Label className="text-base font-medium">Horários dos Lembretes</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Escolha quando receber os lembretes antes das consultas.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>24 horas antes</Label>
                <Switch
                  checked={settings.reminderBefore24h}
                  onCheckedChange={(checked) =>
                    updateSettings({ reminderBefore24h: checked })
                  }
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>1 hora antes</Label>
                <Switch
                  checked={settings.reminderBefore1h}
                  onCheckedChange={(checked) =>
                    updateSettings({ reminderBefore1h: checked })
                  }
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>15 minutos antes</Label>
                <Switch
                  checked={settings.reminderBefore15min}
                  onCheckedChange={(checked) =>
                    updateSettings({ reminderBefore15min: checked })
                  }
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}