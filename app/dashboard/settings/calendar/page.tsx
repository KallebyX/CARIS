"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Calendar } from 'lucide-react';

export default function CalendarCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const success = searchParams.get('success');
  const error = searchParams.get('error');

  useEffect(() => {
    if (success === 'google_connected') {
      toast({
        title: 'Sucesso!',
        description: 'Google Calendar conectado com sucesso! Suas consultas serão sincronizadas automaticamente.',
      });
    } else if (success === 'outlook_connected') {
      toast({
        title: 'Sucesso!',
        description: 'Outlook Calendar conectado com sucesso! Suas consultas serão sincronizadas automaticamente.',
      });
    } else if (error) {
      let errorMessage = 'Erro ao conectar calendário';
      
      switch (error) {
        case 'access_denied':
          errorMessage = 'Acesso negado. Você precisa autorizar o acesso ao seu calendário.';
          break;
        case 'invalid_request':
          errorMessage = 'Solicitação inválida. Tente novamente.';
          break;
        case 'invalid_user':
          errorMessage = 'Usuário inválido. Faça login novamente.';
          break;
        case 'token_error':
          errorMessage = 'Erro ao obter token de acesso. Tente novamente.';
          break;
        case 'callback_error':
          errorMessage = 'Erro interno. Tente novamente mais tarde.';
          break;
      }

      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [success, error, toast]);

  const goToSettings = () => {
    router.push('/dashboard/settings#calendar');
  };

  return (
    <div className="container mx-auto py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {success ? (
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              ) : (
                <XCircle className="h-16 w-16 text-red-600" />
              )}
            </div>
            <CardTitle>
              {success ? 'Calendário Conectado!' : 'Erro na Conexão'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              {success 
                ? 'Seu calendário foi conectado com sucesso. Suas consultas agendadas serão sincronizadas automaticamente.'
                : 'Houve um problema ao conectar seu calendário. Tente novamente nas configurações.'
              }
            </p>
            <Button onClick={goToSettings} className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              Ir para Configurações
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}