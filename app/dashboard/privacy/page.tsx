"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield, Download, Trash2, Eye, Clock, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "react-hot-toast"

interface PrivacySettings {
  dataProcessingConsent: boolean
  marketingConsent: boolean
  analyticsConsent: boolean
  shareDataWithPsychologist: boolean
  allowDataExport: boolean
  anonymizeAfterDeletion: boolean
  dataRetentionPreference: number
  notificationPreferences: {
    email: boolean
    sms: boolean
    push: boolean
    complianceUpdates: boolean
  }
}

interface ConsentRecord {
  id: number
  consentType: string
  consentGiven: boolean
  consentDate: string
  purpose: string
  legalBasis: string
  version: string
}

interface DataExport {
  id: number
  requestedAt: string
  completedAt?: string
  format: string
  status: string
  downloadCount: number
}

export default function PrivacyPage() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null)
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [exports, setExports] = useState<DataExport[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPrivacyData()
  }, [])

  const loadPrivacyData = async () => {
    try {
      const [settingsRes, consentsRes, exportsRes] = await Promise.all([
        fetch('/api/compliance/privacy-settings'),
        fetch('/api/compliance/consents'),
        fetch('/api/compliance/data-export')
      ])

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setSettings(settingsData.data)
      }

      if (consentsRes.ok) {
        const consentsData = await consentsRes.json()
        setConsents(consentsData.data.currentConsents || [])
      }

      if (exportsRes.ok) {
        const exportsData = await exportsRes.json()
        setExports(exportsData.data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados de privacidade:', error)
      toast.error('Erro ao carregar configurações de privacidade')
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (updates: Partial<PrivacySettings>) => {
    if (!settings) return

    setSaving(true)
    try {
      const response = await fetch('/api/compliance/privacy-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        setSettings({ ...settings, ...updates })
        toast.success('Configurações atualizadas com sucesso')
      } else {
        throw new Error('Falha ao atualizar configurações')
      }
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error)
      toast.error('Erro ao atualizar configurações')
    } finally {
      setSaving(false)
    }
  }

  const recordConsent = async (consentType: string, consentGiven: boolean, purpose: string) => {
    try {
      const response = await fetch('/api/compliance/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentType,
          consentGiven,
          purpose,
          legalBasis: 'consent'
        })
      })

      if (response.ok) {
        toast.success(`Consentimento ${consentGiven ? 'concedido' : 'revogado'} com sucesso`)
        loadPrivacyData() // Recarrega os dados
      } else {
        throw new Error('Falha ao registrar consentimento')
      }
    } catch (error) {
      console.error('Erro ao registrar consentimento:', error)
      toast.error('Erro ao registrar consentimento')
    }
  }

  const requestDataExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch('/api/compliance/data-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      })

      if (response.ok) {
        toast.success('Solicitação de exportação criada. Você será notificado quando estiver pronta.')
        loadPrivacyData() // Recarrega os dados
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Falha ao solicitar exportação')
      }
    } catch (error) {
      console.error('Erro ao solicitar exportação:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao solicitar exportação')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando configurações de privacidade...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar configurações de privacidade. Tente recarregar a página.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Privacidade e Proteção de Dados</h1>
          <p className="text-gray-600">Gerencie seus dados e preferências de privacidade conforme LGPD/GDPR</p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="consents">Consentimentos</TabsTrigger>
          <TabsTrigger value="exports">Exportar Dados</TabsTrigger>
          <TabsTrigger value="deletion">Exclusão de Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Privacidade</CardTitle>
              <CardDescription>
                Controle como seus dados são processados e utilizados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Processamento de Dados</Label>
                      <p className="text-sm text-gray-600">
                        Permite o processamento básico de seus dados para funcionamento da plataforma
                      </p>
                    </div>
                    <Switch
                      checked={settings.dataProcessingConsent}
                      onCheckedChange={(checked) => {
                        updateSettings({ dataProcessingConsent: checked })
                        recordConsent('data_processing', checked, 'Funcionamento básico da plataforma')
                      }}
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Marketing</Label>
                      <p className="text-sm text-gray-600">
                        Receber comunicações de marketing e novidades
                      </p>
                    </div>
                    <Switch
                      checked={settings.marketingConsent}
                      onCheckedChange={(checked) => {
                        updateSettings({ marketingConsent: checked })
                        recordConsent('marketing', checked, 'Comunicações de marketing')
                      }}
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Analytics</Label>
                      <p className="text-sm text-gray-600">
                        Permitir análise de uso para melhorar a plataforma
                      </p>
                    </div>
                    <Switch
                      checked={settings.analyticsConsent}
                      onCheckedChange={(checked) => {
                        updateSettings({ analyticsConsent: checked })
                        recordConsent('analytics', checked, 'Análise de uso da plataforma')
                      }}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Compartilhar com Psicólogo</Label>
                      <p className="text-sm text-gray-600">
                        Permite compartilhamento de dados relevantes com seu psicólogo
                      </p>
                    </div>
                    <Switch
                      checked={settings.shareDataWithPsychologist}
                      onCheckedChange={(checked) => updateSettings({ shareDataWithPsychologist: checked })}
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Permitir Exportação</Label>
                      <p className="text-sm text-gray-600">
                        Habilitar funcionalidade de exportação de dados
                      </p>
                    </div>
                    <Switch
                      checked={settings.allowDataExport}
                      onCheckedChange={(checked) => updateSettings({ allowDataExport: checked })}
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Anonimizar após Exclusão</Label>
                      <p className="text-sm text-gray-600">
                        Anonimizar dados ao invés de deletar completamente
                      </p>
                    </div>
                    <Switch
                      checked={settings.anonymizeAfterDeletion}
                      onCheckedChange={(checked) => updateSettings({ anonymizeAfterDeletion: checked })}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Período de Retenção de Dados (dias)</Label>
                <Select
                  value={settings.dataRetentionPreference.toString()}
                  onValueChange={(value) => updateSettings({ dataRetentionPreference: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="365">1 ano</SelectItem>
                    <SelectItem value="1095">3 anos</SelectItem>
                    <SelectItem value="1825">5 anos</SelectItem>
                    <SelectItem value="2555">7 anos (padrão)</SelectItem>
                    <SelectItem value="3650">10 anos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Consentimentos</CardTitle>
              <CardDescription>
                Visualize todos os consentimentos concedidos e revogados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {consents.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Nenhum consentimento registrado</p>
              ) : (
                <div className="space-y-4">
                  {consents.map((consent) => (
                    <div key={consent.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{consent.consentType}</h4>
                        <p className="text-sm text-gray-600">{consent.purpose}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(consent.consentDate).toLocaleDateString('pt-BR')} - v{consent.version}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {consent.consentGiven ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        )}
                        <span className={`text-sm ${consent.consentGiven ? 'text-green-600' : 'text-red-600'}`}>
                          {consent.consentGiven ? 'Concedido' : 'Revogado'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exportação de Dados</CardTitle>
              <CardDescription>
                Solicite a exportação de todos os seus dados (direito à portabilidade)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <Button 
                  onClick={() => requestDataExport('json')}
                  disabled={!settings.allowDataExport}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar JSON
                </Button>
                <Button 
                  onClick={() => requestDataExport('csv')}
                  disabled={!settings.allowDataExport}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>

              {!settings.allowDataExport && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Exportação de dados está desabilitada nas suas configurações de privacidade.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <h4 className="font-medium">Solicitações de Exportação</h4>
                {exports.length === 0 ? (
                  <p className="text-gray-600">Nenhuma exportação solicitada</p>
                ) : (
                  <div className="space-y-2">
                    {exports.map((exportRecord) => (
                      <div key={exportRecord.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{exportRecord.format.toUpperCase()}</p>
                          <p className="text-sm text-gray-600">
                            Solicitado em {new Date(exportRecord.requestedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-sm ${
                            exportRecord.status === 'completed' ? 'bg-green-100 text-green-800' :
                            exportRecord.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            exportRecord.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {exportRecord.status}
                          </span>
                          {exportRecord.status === 'completed' && (
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deletion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Exclusão e Anonimização de Dados
              </CardTitle>
              <CardDescription>
                Solicite a anonimização ou exclusão dos seus dados (direito ao esquecimento)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atenção:</strong> A anonimização/exclusão de dados é irreversível. 
                  Certifique-se de exportar seus dados antes de prosseguir, se necessário.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Anonimização de Dados</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Remove informações pessoais identificáveis mantendo dados agregados para pesquisa.
                  </p>
                  <Button variant="outline" className="text-orange-600 hover:text-orange-700">
                    Solicitar Anonimização
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Exclusão Completa</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Remove completamente todos os seus dados da plataforma.
                  </p>
                  <Button variant="destructive">
                    Solicitar Exclusão Completa
                  </Button>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Informações Importantes</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Alguns dados podem ser mantidos por obrigações legais</li>
                  <li>• Logs de auditoria são preservados por requisitos de compliance</li>
                  <li>• O processo pode levar até 30 dias para ser concluído</li>
                  <li>• Você receberá confirmação por email quando concluído</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}