"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  AlertCircle,
  Settings as SettingsIcon,
  Unlink,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarSettings {
  googleCalendarEnabled: boolean;
  googleCalendarConnected: boolean;
  outlookCalendarEnabled: boolean;
  outlookCalendarConnected: boolean;
  autoSyncEnabled: boolean;
  syncFrequency: number;
  timezone: string;
  reminderBefore24h: boolean;
  reminderBefore1h: boolean;
  reminderBefore15min: boolean;
  syncAllPatients: boolean; // Psychologist-specific
}

interface SyncHistory {
  id: string;
  timestamp: Date;
  direction: string;
  success: boolean;
  syncedCount: number;
  failedCount: number;
}

export default function PsychologistCalendarSettingsPage() {
  const [settings, setSettings] = useState<CalendarSettings>({
    googleCalendarEnabled: false,
    googleCalendarConnected: false,
    outlookCalendarEnabled: false,
    outlookCalendarConnected: false,
    autoSyncEnabled: true,
    syncFrequency: 15,
    timezone: 'America/Sao_Paulo',
    reminderBefore24h: true,
    reminderBefore1h: true,
    reminderBefore15min: false,
    syncAllPatients: true,
  });
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
    fetchSyncHistory();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/calendar/settings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncHistory = async () => {
    try {
      const response = await fetch('/api/calendar/sync/history?limit=5');
      const data = await response.json();

      if (data.success) {
        setSyncHistory(data.history);
      }
    } catch (error) {
      console.error('Error fetching sync history:', error);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch('/api/calendar/google/auth');
      const data = await response.json();

      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível conectar ao Google Calendar',
        variant: 'destructive',
      });
    }
  };

  const handleConnectOutlook = async () => {
    try {
      const response = await fetch('/api/calendar/outlook/auth');
      const data = await response.json();

      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error connecting Outlook Calendar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível conectar ao Outlook Calendar',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      const response = await fetch('/api/calendar/google/disconnect', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setSettings((prev) => ({
          ...prev,
          googleCalendarEnabled: false,
          googleCalendarConnected: false,
        }));
        toast({
          title: 'Sucesso',
          description: 'Google Calendar desconectado',
        });
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível desconectar o Google Calendar',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnectOutlook = async () => {
    try {
      const response = await fetch('/api/calendar/outlook/disconnect', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setSettings((prev) => ({
          ...prev,
          outlookCalendarEnabled: false,
          outlookCalendarConnected: false,
        }));
        toast({
          title: 'Sucesso',
          description: 'Outlook Calendar desconectado',
        });
      }
    } catch (error) {
      console.error('Error disconnecting Outlook Calendar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível desconectar o Outlook Calendar',
        variant: 'destructive',
      });
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sincronização concluída',
          description: `${data.syncedCount || 0} sessões sincronizadas`,
        });
        fetchSyncHistory();
      } else {
        toast({
          title: 'Erro na sincronização',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível sincronizar os calendários',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/calendar/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Configurações salvas',
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao salvar configurações',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const timezones = [
    { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
    { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
    { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
    { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
  ];

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Configurações de Calendário
          </h1>
          <p className="text-gray-600 mt-2">
            Configure a integração com seus calendários externos para sincronizar automaticamente suas sessões com pacientes.
          </p>
        </div>

        {/* Google Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Google Calendar</span>
              {settings.googleCalendarConnected ? (
                <Badge className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Desconectado
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Sincronize suas sessões com o Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.googleCalendarConnected ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="google-enabled">Sincronização ativa</Label>
                    <p className="text-sm text-gray-600">
                      Sincronizar sessões automaticamente
                    </p>
                  </div>
                  <Switch
                    id="google-enabled"
                    checked={settings.googleCalendarEnabled}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, googleCalendarEnabled: checked }))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleManualSync} disabled={syncing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Sincronizar agora
                  </Button>
                  <Button variant="destructive" onClick={handleDisconnectGoogle}>
                    <Unlink className="h-4 w-4 mr-2" />
                    Desconectar
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={handleConnectGoogle}>
                <Calendar className="h-4 w-4 mr-2" />
                Conectar Google Calendar
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Outlook Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Outlook Calendar</span>
              {settings.outlookCalendarConnected ? (
                <Badge className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Desconectado
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Sincronize suas sessões com o Outlook Calendar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.outlookCalendarConnected ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="outlook-enabled">Sincronização ativa</Label>
                    <p className="text-sm text-gray-600">
                      Sincronizar sessões automaticamente
                    </p>
                  </div>
                  <Switch
                    id="outlook-enabled"
                    checked={settings.outlookCalendarEnabled}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, outlookCalendarEnabled: checked }))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleManualSync} disabled={syncing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Sincronizar agora
                  </Button>
                  <Button variant="destructive" onClick={handleDisconnectOutlook}>
                    <Unlink className="h-4 w-4 mr-2" />
                    Desconectar
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={handleConnectOutlook}>
                <Calendar className="h-4 w-4 mr-2" />
                Conectar Outlook Calendar
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Sync Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Configurações de Sincronização
            </CardTitle>
            <CardDescription>
              Personalize como suas sessões são sincronizadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-sync">Sincronização automática</Label>
                <p className="text-sm text-gray-600">
                  Sincronizar automaticamente a cada {settings.syncFrequency} minutos
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={settings.autoSyncEnabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, autoSyncEnabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <div>
                  <Label htmlFor="sync-all-patients">Sincronizar todos os pacientes</Label>
                  <p className="text-sm text-gray-600">
                    Incluir sessões com todos os seus pacientes no calendário
                  </p>
                </div>
              </div>
              <Switch
                id="sync-all-patients"
                checked={settings.syncAllPatients}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, syncAllPatients: checked }))
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso horário</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, timezone: value }))
                }
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
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

            <Separator />

            <div className="space-y-4">
              <Label>Lembretes de sessão</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reminder-24h" className="font-normal">
                    24 horas antes
                  </Label>
                  <Switch
                    id="reminder-24h"
                    checked={settings.reminderBefore24h}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, reminderBefore24h: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="reminder-1h" className="font-normal">
                    1 hora antes
                  </Label>
                  <Switch
                    id="reminder-1h"
                    checked={settings.reminderBefore1h}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, reminderBefore1h: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="reminder-15min" className="font-normal">
                    15 minutos antes
                  </Label>
                  <Switch
                    id="reminder-15min"
                    checked={settings.reminderBefore15min}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, reminderBefore15min: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar configurações'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sync History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Sincronização
            </CardTitle>
            <CardDescription>
              Últimas sincronizações realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {syncHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma sincronização realizada ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {syncHistory.map((sync) => (
                  <div
                    key={sync.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {sync.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">
                          {sync.success ? 'Sincronização bem-sucedida' : 'Falha na sincronização'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(sync.timestamp), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        {sync.syncedCount} sincronizadas
                      </Badge>
                      {sync.failedCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {sync.failedCount} falharam
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-900">Como funciona a sincronização para psicólogos?</h4>
                <p className="text-sm text-blue-800">
                  Quando você conecta seu calendário, todas as suas sessões com pacientes serão
                  automaticamente sincronizadas. Você receberá lembretes de acordo com suas
                  preferências. As informações dos pacientes serão incluídas nos eventos do calendário
                  para facilitar sua organização.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
