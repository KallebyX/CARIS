"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { AudioSource, meditationAudioSources, validateAudioSource, formatDuration } from '@/lib/meditation-audio-sources'
import { Play, Pause, Download, Check, X, Plus, Search, Filter } from 'lucide-react'

interface AudioSourceManagerProps {
  onSourcesUpdate?: (sources: AudioSource[]) => void
}

export function AudioSourceManager({ onSourcesUpdate }: AudioSourceManagerProps) {
  const [sources, setSources] = useState<AudioSource[]>(meditationAudioSources)
  const [filteredSources, setFilteredSources] = useState<AudioSource[]>(sources)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterLicense, setFilterLicense] = useState<string>('all')
  const [filterLanguage, setFilterLanguage] = useState<string>('all')
  const [newSource, setNewSource] = useState<Partial<AudioSource>>({
    title: '',
    description: '',
    url: '',
    license: 'creative_commons',
    author: '',
    duration: 0,
    category: 'meditation',
    tags: [],
    quality: 'medium',
    format: 'mp3',
    isVerified: false,
    addedAt: new Date()
  })

  // Filtrar fontes baseado nos critérios
  useEffect(() => {
    let filtered = sources

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(source => 
        source.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        source.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        source.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        source.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filtro por categoria
    if (filterCategory !== 'all') {
      filtered = filtered.filter(source => source.category === filterCategory)
    }

    // Filtro por licença
    if (filterLicense !== 'all') {
      filtered = filtered.filter(source => source.license === filterLicense)
    }

    // Filtro por idioma
    if (filterLanguage !== 'all') {
      filtered = filtered.filter(source => source.language === filterLanguage)
    }

    setFilteredSources(filtered)
  }, [sources, searchTerm, filterCategory, filterLicense, filterLanguage])

  const handleAddSource = () => {
    if (!newSource.title || !newSource.url || !newSource.author) {
      alert('Por favor, preencha todos os campos obrigatórios')
      return
    }

    const sourceToAdd: AudioSource = {
      id: `custom-${Date.now()}`,
      title: newSource.title!,
      description: newSource.description || '',
      url: newSource.url!,
      license: newSource.license as AudioSource['license'],
      licenseDetails: newSource.licenseDetails || '',
      attribution: newSource.attribution,
      author: newSource.author!,
      duration: newSource.duration || 0,
      category: newSource.category as AudioSource['category'],
      tags: Array.isArray(newSource.tags) ? newSource.tags : [],
      language: newSource.language,
      quality: newSource.quality as AudioSource['quality'],
      format: newSource.format as AudioSource['format'],
      downloadUrl: newSource.downloadUrl,
      embedUrl: newSource.embedUrl,
      isVerified: false,
      addedAt: new Date()
    }

    if (!validateAudioSource(sourceToAdd)) {
      alert('Fonte de áudio inválida. Verifique todos os campos.')
      return
    }

    const updatedSources = [...sources, sourceToAdd]
    setSources(updatedSources)
    onSourcesUpdate?.(updatedSources)
    
    // Reset form
    setNewSource({
      title: '',
      description: '',
      url: '',
      license: 'creative_commons',
      author: '',
      duration: 0,
      category: 'meditation',
      tags: [],
      quality: 'medium',
      format: 'mp3',
      isVerified: false,
      addedAt: new Date()
    })
    setIsAddingNew(false)
  }

  const handleVerifySource = async (sourceId: string) => {
    const updatedSources = sources.map(source => 
      source.id === sourceId 
        ? { ...source, isVerified: !source.isVerified }
        : source
    )
    setSources(updatedSources)
    onSourcesUpdate?.(updatedSources)
  }

  const handleDeleteSource = (sourceId: string) => {
    if (confirm('Tem certeza que deseja remover esta fonte de áudio?')) {
      const updatedSources = sources.filter(source => source.id !== sourceId)
      setSources(updatedSources)
      onSourcesUpdate?.(updatedSources)
    }
  }

  const handleDownloadSource = async (source: AudioSource) => {
    if (source.downloadUrl) {
      window.open(source.downloadUrl, '_blank')
    } else {
      // Implementar lógica de download baseada na URL
      window.open(source.url, '_blank')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciador de Fontes de Áudio</h2>
          <p className="text-muted-foreground">
            Gerencie as fontes de áudio para meditação guiada
          </p>
        </div>
        <Button onClick={() => setIsAddingNew(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Fonte
        </Button>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Título, autor, tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="meditation">Meditação</SelectItem>
                  <SelectItem value="nature">Natureza</SelectItem>
                  <SelectItem value="binaural">Binaural</SelectItem>
                  <SelectItem value="music">Música</SelectItem>
                  <SelectItem value="voice">Voz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="license">Licença</Label>
              <Select value={filterLicense} onValueChange={setFilterLicense}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="creative_commons">Creative Commons</SelectItem>
                  <SelectItem value="public_domain">Domínio Público</SelectItem>
                  <SelectItem value="royalty_free">Royalty Free</SelectItem>
                  <SelectItem value="fair_use">Fair Use</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="language">Idioma</Label>
              <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pt-BR">Português (BR)</SelectItem>
                  <SelectItem value="pt-PT">Português (PT)</SelectItem>
                  <SelectItem value="en">Inglês</SelectItem>
                  <SelectItem value="es">Espanhol</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Lista de Fontes</TabsTrigger>
          <TabsTrigger value="add">Adicionar Nova Fonte</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {filteredSources.length} de {sources.length} fontes
          </div>
          
          {filteredSources.map((source) => (
            <Card key={source.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{source.title}</h3>
                      {source.isVerified ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Verificado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <X className="h-3 w-3 mr-1" />
                          Não verificado
                        </Badge>
                      )}
                      <Badge variant="outline">{source.category}</Badge>
                      <Badge variant="outline">{source.license}</Badge>
                      {source.language && (
                        <Badge variant="outline">{source.language}</Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {source.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Por: {source.author}</span>
                      <span>Duração: {formatDuration(source.duration)}</span>
                      <span>Qualidade: {source.quality}</span>
                      <span>Formato: {source.format.toUpperCase()}</span>
                    </div>
                    
                    {source.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {source.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadSource(source)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerifySource(source.id)}
                    >
                      {source.isVerified ? 'Desverificar' : 'Verificar'}
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSource(source.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Nova Fonte de Áudio</CardTitle>
              <CardDescription>
                Adicione uma nova fonte de áudio para meditação guiada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={newSource.title}
                    onChange={(e) => setNewSource({...newSource, title: e.target.value})}
                    placeholder="Nome da meditação"
                  />
                </div>
                
                <div>
                  <Label htmlFor="author">Autor *</Label>
                  <Input
                    id="author"
                    value={newSource.author}
                    onChange={(e) => setNewSource({...newSource, author: e.target.value})}
                    placeholder="Nome do criador"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={newSource.description}
                  onChange={(e) => setNewSource({...newSource, description: e.target.value})}
                  placeholder="Descrição da meditação..."
                />
              </div>

              <div>
                <Label htmlFor="url">URL da Fonte *</Label>
                <Input
                  id="url"
                  value={newSource.url}
                  onChange={(e) => setNewSource({...newSource, url: e.target.value})}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select 
                    value={newSource.category} 
                    onValueChange={(value) => setNewSource({...newSource, category: value as AudioSource['category']})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meditation">Meditação</SelectItem>
                      <SelectItem value="nature">Natureza</SelectItem>
                      <SelectItem value="binaural">Binaural</SelectItem>
                      <SelectItem value="music">Música</SelectItem>
                      <SelectItem value="voice">Voz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="license">Licença</Label>
                  <Select 
                    value={newSource.license} 
                    onValueChange={(value) => setNewSource({...newSource, license: value as AudioSource['license']})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creative_commons">Creative Commons</SelectItem>
                      <SelectItem value="public_domain">Domínio Público</SelectItem>
                      <SelectItem value="royalty_free">Royalty Free</SelectItem>
                      <SelectItem value="fair_use">Fair Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="duration">Duração (segundos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={newSource.duration}
                    onChange={(e) => setNewSource({...newSource, duration: parseInt(e.target.value) || 0})}
                    placeholder="300"
                  />
                </div>

                <div>
                  <Label htmlFor="quality">Qualidade</Label>
                  <Select 
                    value={newSource.quality} 
                    onValueChange={(value) => setNewSource({...newSource, quality: value as AudioSource['quality']})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="format">Formato</Label>
                  <Select 
                    value={newSource.format} 
                    onValueChange={(value) => setNewSource({...newSource, format: value as AudioSource['format']})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp3">MP3</SelectItem>
                      <SelectItem value="wav">WAV</SelectItem>
                      <SelectItem value="ogg">OGG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleAddSource}>
                  Adicionar Fonte
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddingNew(false)}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">{sources.length}</div>
                <p className="text-muted-foreground">Total de Fontes</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">
                  {sources.filter(s => s.isVerified).length}
                </div>
                <p className="text-muted-foreground">Fontes Verificadas</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">
                  {sources.filter(s => s.language?.startsWith('pt')).length}
                </div>
                <p className="text-muted-foreground">Em Português</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">
                  {formatDuration(sources.reduce((total, source) => total + source.duration, 0))}
                </div>
                <p className="text-muted-foreground">Duração Total</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}