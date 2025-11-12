"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Session {
  id: number;
  scheduledAt: Date;
  duration: number;
  type: string;
  status: string;
  patientName?: string;
  psychologistName?: string;
  googleCalendarSynced: boolean;
  outlookCalendarSynced: boolean;
}

interface SyncStatus {
  googleEnabled: boolean;
  outlookEnabled: boolean;
  lastSync?: Date;
  syncing: boolean;
  syncedCount: number;
  failedCount: number;
}

export function CalendarWidget() {
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    googleEnabled: false,
    outlookEnabled: false,
    syncing: false,
    syncedCount: 0,
    failedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUpcomingSessions();
    fetchSyncStatus();
  }, []);

  const fetchUpcomingSessions = async () => {
    try {
      setLoading(true);
      // In a real implementation, fetch from API
      // const response = await fetch('/api/sessions/upcoming?limit=5');
      // const data = await response.json();
      // setUpcomingSessions(data.sessions);

      // Mock data for demonstration
      setUpcomingSessions([
        {
          id: 1,
          scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          duration: 50,
          type: 'therapy',
          status: 'confirmed',
          patientName: 'João Silva',
          psychologistName: 'Dra. Maria Santos',
          googleCalendarSynced: true,
          outlookCalendarSynced: false,
        },
        {
          id: 2,
          scheduledAt: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow
          duration: 50,
          type: 'therapy',
          status: 'scheduled',
          patientName: 'Ana Costa',
          psychologistName: 'Dr. Pedro Lima',
          googleCalendarSynced: true,
          outlookCalendarSynced: true,
        },
      ]);
    } catch (error) {
      console.error('Error fetching upcoming sessions:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as próximas sessões',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      // In a real implementation, fetch from API
      // const response = await fetch('/api/calendar/sync/status');
      // const data = await response.json();
      // setSyncStatus(data);

      // Mock data
      setSyncStatus({
        googleEnabled: true,
        outlookEnabled: false,
        lastSync: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        syncing: false,
        syncedCount: 5,
        failedCount: 0,
      });
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncStatus((prev) => ({ ...prev, syncing: true }));

      // In a real implementation, call sync API
      // const response = await fetch('/api/calendar/sync', { method: 'POST' });
      // const result = await response.json();

      // Simulate sync
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSyncStatus((prev) => ({
        ...prev,
        syncing: false,
        lastSync: new Date(),
        syncedCount: prev.syncedCount + upcomingSessions.length,
      }));

      toast({
        title: 'Sincronização concluída',
        description: 'Seus calendários foram sincronizados com sucesso',
      });

      fetchUpcomingSessions();
    } catch (error) {
      console.error('Error syncing calendar:', error);
      setSyncStatus((prev) => ({ ...prev, syncing: false }));
      toast({
        title: 'Erro na sincronização',
        description: 'Não foi possível sincronizar os calendários',
        variant: 'destructive',
      });
    }
  };

  const getSessionTimeLabel = (date: Date): string => {
    if (isToday(date)) {
      return `Hoje às ${format(date, 'HH:mm')}`;
    } else if (isTomorrow(date)) {
      return `Amanhã às ${format(date, 'HH:mm')}`;
    } else if (isThisWeek(date)) {
      return format(date, "EEEE 'às' HH:mm", { locale: ptBR });
    } else {
      return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
    }
  };

  const getSyncStatusBadge = () => {
    if (syncStatus.syncing) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Sincronizando...
        </Badge>
      );
    }

    if (!syncStatus.googleEnabled && !syncStatus.outlookEnabled) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Não configurado
        </Badge>
      );
    }

    if (syncStatus.failedCount > 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Erro na sincronização
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="flex items-center gap-1 bg-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Sincronizado
      </Badge>
    );
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'scheduled':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Sessões
            </CardTitle>
            <CardDescription>
              {syncStatus.lastSync
                ? `Última sincronização: ${format(syncStatus.lastSync, 'HH:mm', { locale: ptBR })}`
                : 'Calendário não sincronizado'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getSyncStatusBadge()}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={syncStatus.syncing || (!syncStatus.googleEnabled && !syncStatus.outlookEnabled)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus.syncing ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : upcomingSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma sessão agendada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 pt-1">
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">
                      {session.patientName || session.psychologistName}
                    </p>
                    <Badge variant={getStatusBadgeVariant(session.status)}>
                      {session.status === 'confirmed' ? 'Confirmado' : 'Agendado'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {getSessionTimeLabel(session.scheduledAt)} • {session.duration} min
                  </p>
                  <div className="flex items-center gap-2">
                    {session.googleCalendarSynced && (
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                        Google
                      </Badge>
                    )}
                    {session.outlookCalendarSynced && (
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1 text-blue-600" />
                        Outlook
                      </Badge>
                    )}
                    {!session.googleCalendarSynced && !session.outlookCalendarSynced && (
                      <Badge variant="outline" className="text-xs text-gray-500">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Não sincronizado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!syncStatus.googleEnabled && !syncStatus.outlookEnabled && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              Configure a integração com seu calendário para sincronizar automaticamente suas sessões.
            </p>
            <Button variant="link" className="p-0 h-auto text-blue-600" asChild>
              <a href="/dashboard/settings/calendar">Configurar agora</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
