"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, CheckCircle, AlertTriangle, Settings } from "lucide-react"
import Link from "next/link"

interface ConsentStatus {
  consentType: string
  consentGiven: boolean
  consentDate: string
}

interface PrivacyStatusProps {
  showFullDetails?: boolean
}

export function PrivacyStatus({ showFullDetails = false }: PrivacyStatusProps) {
  const [consents, setConsents] = useState<ConsentStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConsentStatus()
  }, [])

  const loadConsentStatus = async () => {
    try {
      const response = await fetch('/api/compliance/consents')
      if (response.ok) {
        const data = await response.json()
        setConsents(data.data.currentConsents || [])
      }
    } catch (error) {
      console.error('Erro ao carregar status de consentimento:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  const essentialConsents = consents.filter(c => 
    ['data_processing', 'share_with_psychologist'].includes(c.consentType)
  )
  const optionalConsents = consents.filter(c => 
    ['marketing', 'analytics'].includes(c.consentType)
  )

  const hasEssentialConsents = essentialConsents.every(c => c.consentGiven)
  const complianceScore = consents.length > 0 
    ? Math.round((consents.filter(c => c.consentGiven).length / consents.length) * 100) 
    : 0

  const getConsentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'data_processing': 'Processamento de Dados',
      'marketing': 'Marketing',
      'analytics': 'Analytics',
      'share_with_psychologist': 'Compartilhar com Psicólogo',
      'ai_analysis': 'Análise por IA',
    }
    return labels[type] || type
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Status de Privacidade
          </CardTitle>
          {hasEssentialConsents ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          )}
        </div>
        <CardDescription>
          Seus consentimentos e configurações de privacidade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Geral */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Conformidade Geral</span>
          <Badge variant={hasEssentialConsents ? "default" : "secondary"}>
            {complianceScore}% Configurado
          </Badge>
        </div>

        {/* Consentimentos Essenciais */}
        {showFullDetails && (
          <>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Consentimentos Essenciais</h4>
              {essentialConsents.length === 0 ? (
                <p className="text-sm text-gray-600">Nenhum consentimento essencial registrado</p>
              ) : (
                <div className="space-y-1">
                  {essentialConsents.map((consent) => (
                    <div key={consent.consentType} className="flex items-center justify-between">
                      <span className="text-sm">{getConsentTypeLabel(consent.consentType)}</span>
                      <Badge variant={consent.consentGiven ? "default" : "destructive"} className="text-xs">
                        {consent.consentGiven ? 'Ativo' : 'Revogado'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Consentimentos Opcionais */}
            {optionalConsents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Consentimentos Opcionais</h4>
                <div className="space-y-1">
                  {optionalConsents.map((consent) => (
                    <div key={consent.consentType} className="flex items-center justify-between">
                      <span className="text-sm">{getConsentTypeLabel(consent.consentType)}</span>
                      <Badge variant={consent.consentGiven ? "default" : "outline"} className="text-xs">
                        {consent.consentGiven ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Status Resumido para versão compacta */}
        {!showFullDetails && (
          <div className="text-sm text-gray-600">
            {hasEssentialConsents 
              ? 'Configurações essenciais ativadas' 
              : 'Algumas configurações precisam de atenção'
            }
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/privacy">
              <Settings className="h-4 w-4 mr-2" />
              Gerenciar Privacidade
            </Link>
          </Button>
        </div>

        {/* Alerta se necessário */}
        {!hasEssentialConsents && (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Ação Necessária</p>
                <p className="text-xs text-yellow-700">
                  Alguns consentimentos essenciais estão pendentes. 
                  Visite as configurações de privacidade para resolver.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}