"use client"

import { useState, useEffect } from 'react'
import { AudioSourceManager } from '@/components/admin/audio-source-manager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AudioSource } from '@/lib/meditation-audio-sources'
import { audioSourceService } from '@/lib/audio-source-service'
import { RefreshCw as Sync, CheckCircle, AlertTriangle, Info, Download, Search } from 'lucide-react'

export default function AudioSourcesAdminPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{
    discovered: number
    validated: number
    downloaded: number
    errors: string[]
  } | null>(null)
  const [qualityReport, setQualityReport] = useState<any>(null)
  const [sources, setSources] = useState<AudioSource[]>([])

  useEffect(() => {
    loadSources()
    generateQualityReport()
  }, [])

  const loadSources = async () => {
    try {
      const response = await fetch('/api/admin/audio-sources')
      if (response.ok) {
        const data = await response.json()
        setSources(data.data || [])
      }
    } catch (error) {
      console.error('Error loading sources:', error)
    }
  }

  const generateQualityReport = async () => {
    try {
      const report = audioSourceService.generateQualityReport(sources)
      setQualityReport(report)
    } catch (error) {
      console.error('Error generating quality report:', error)
    }
  }

  const handleSyncSources = async () => {
    setIsLoading(true)
    try {
      const result = await audioSourceService.syncAudioSources()
      setSyncStatus(result)
      
      // Recarregar fontes após sincronização
      await loadSources()
      await generateQualityReport()
    } catch (error) {
      console.error('Error syncing sources:', error)
      setSyncStatus({
        discovered: 0,
        validated: 0,
        downloaded: 0,
        errors: ['Erro durante sincronização']
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSourcesUpdate = async (updatedSources: AudioSource[]) => {
    setSources(updatedSources)
    await generateQualityReport()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Fontes de Áudio</h1>
          <p className="text-muted-foreground">
            Gerencie e monitore as fontes de áudio para meditações guiadas
          </p>
        </div>
        
        <Button 
          onClick={handleSyncSources}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Sync className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Sincronizando...' : 'Sincronizar Fontes'}
        </Button>
      </div>

      {/* Status da Sincronização */}
      {syncStatus && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">Resultado da Sincronização:</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Descobertas:</span> {syncStatus.discovered}
                </div>
                <div>
                  <span className="font-medium">Validadas:</span> {syncStatus.validated}
                </div>
                <div>
                  <span className="font-medium">Baixadas:</span> {syncStatus.downloaded}
                </div>
              </div>
              {syncStatus.errors.length > 0 && (
                <div className="mt-2">
                  <div className="font-medium text-red-600">Erros:</div>
                  <ul className="list-disc list-inside text-sm text-red-600">
                    {syncStatus.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="management" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="management">Gerenciamento</TabsTrigger>
          <TabsTrigger value="quality">Relatório de Qualidade</TabsTrigger>
          <TabsTrigger value="discovery">Descoberta Automática</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-4">
          <AudioSourceManager onSourcesUpdate={handleSourcesUpdate} />
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          {qualityReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Cards de Estatísticas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Visão Geral</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total de Fontes:</span>
                    <Badge variant="outline">{qualityReport.totalSources}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Verificadas:</span>
                    <Badge variant="default">
                      {qualityReport.verifiedSources} 
                      ({Math.round((qualityReport.verifiedSources / qualityReport.totalSources) * 100)}%)
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Duração Média:</span>
                    <Badge variant="outline">
                      {Math.round(qualityReport.averageDuration / 60)}min
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Distribuição por Categoria */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Por Categoria</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(qualityReport.byCategory).map(([category, count]) => (
                    <div key={category} className="flex justify-between">
                      <span className="capitalize">{category}:</span>
                      <Badge variant="outline">{count as number}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Distribuição por Idioma */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Por Idioma</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(qualityReport.byLanguage).map(([language, count]) => (
                    <div key={language} className="flex justify-between">
                      <span>{language}:</span>
                      <Badge variant="outline">{count as number}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Distribuição por Licença */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Por Licença</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(qualityReport.byLicense).map(([license, count]) => (
                    <div key={license} className="flex justify-between">
                      <span className="capitalize">{license.replace('_', ' ')}:</span>
                      <Badge variant="outline">{count as number}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Distribuição por Qualidade */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Por Qualidade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(qualityReport.qualityDistribution).map(([quality, count]) => (
                    <div key={quality} className="flex justify-between">
                      <span className="capitalize">{quality}:</span>
                      <Badge 
                        variant={quality === 'high' ? 'default' : quality === 'medium' ? 'secondary' : 'outline'}
                      >
                        {count as number}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recomendações */}
              <Card className="md:col-span-2 lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Recomendações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {qualityReport.recommendations.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {qualityReport.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-0.5 text-orange-500 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Tudo parece estar em ordem!</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="discovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Descoberta Automática de Fontes
              </CardTitle>
              <CardDescription>
                Configure e execute buscas automáticas por conteúdo de meditação em português
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Fontes Recomendadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• Freesound.org - Sons Creative Commons</li>
                      <li>• Archive.org - Domínio público</li>
                      <li>• YouTube Audio Library - Royalty free</li>
                      <li>• Wikimedia Commons - Mídia livre</li>
                      <li>• Pixabay Music - Uso comercial permitido</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Termos de Busca</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• "meditação guiada"</li>
                      <li>• "mindfulness português"</li>
                      <li>• "relaxamento"</li>
                      <li>• "sons da natureza"</li>
                      <li>• "respiração consciente"</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  A busca automática verifica repositórios públicos e identifica conteúdo 
                  compatível com as licenças de uso. Todas as fontes são validadas antes 
                  de serem adicionadas ao sistema.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSyncSources}
                  disabled={isLoading}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Iniciar Busca Automática
                </Button>
                
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Relatório
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}