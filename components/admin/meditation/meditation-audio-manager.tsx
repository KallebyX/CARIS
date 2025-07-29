"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Upload,
  Play,
  Pause,
  Clock,
  Star,
  Eye,
  Download,
  ExternalLink
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MeditationAudio {
  id: string
  title: string
  description: string
  categoryId: string
  categoryName: string
  duration: number
  difficulty: 'iniciante' | 'intermediario' | 'avancado'
  instructor: string
  audioUrl: string
  thumbnailUrl?: string
  language: string
  license: string
  attribution?: string
  playCount: number
  averageRating: number
  ratingCount: number
  status: 'active' | 'inactive' | 'pending' | 'archived'
  isPopular: boolean
  isFeatured: boolean
  createdAt: string
  updatedAt: string
}

interface MeditationCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  displayOrder: number
  isActive: boolean
}

export function MeditationAudioManager() {
  const [audios, setAudios] = useState<MeditationAudio[]>([])
  const [categories, setCategories] = useState<MeditationCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const { toast } = useToast()

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    duration: 0,
    difficulty: 'iniciante' as const,
    instructor: '',
    audioUrl: '',
    thumbnailUrl: '',
    transcript: '',
    guidedSteps: [] as string[],
    benefits: [] as string[],
    techniques: [] as string[],
    preparationSteps: [] as string[],
    tags: [] as string[],
    language: 'pt-BR',
    fileSize: 0,
    format: 'mp3',
    bitrate: 128,
    sampleRate: 44100,
    sourceUrl: '',
    license: '',
    attribution: '',
    isCommercialUse: false,
    status: 'active' as const
  })

  useEffect(() => {
    fetchCategories()
    fetchAudios()
  }, [searchQuery, selectedCategory, selectedStatus, selectedDifficulty, currentPage])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/meditation-categories?includeInactive=true')
      if (response.ok) {
        const result = await response.json()
        setCategories(result.data)
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
    }
  }

  const fetchAudios = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(selectedStatus !== 'all' && { status: selectedStatus }),
        ...(selectedDifficulty !== 'all' && { difficulty: selectedDifficulty })
      })

      const response = await fetch(`/api/admin/meditation-audios?${params}`)
      if (response.ok) {
        const result = await response.json()
        setAudios(result.data.audios)
        setTotalPages(result.data.pagination.totalPages)
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os áudios",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Erro ao buscar áudios:', error)
      toast({
        title: "Erro",
        description: "Erro interno do servidor",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAudio = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/admin/meditation-audios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Áudio de meditação criado com sucesso!"
        })
        setIsCreateDialogOpen(false)
        resetForm()
        fetchAudios()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao criar áudio",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Erro ao criar áudio:', error)
      toast({
        title: "Erro",
        description: "Erro interno do servidor",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      categoryId: '',
      duration: 0,
      difficulty: 'iniciante',
      instructor: '',
      audioUrl: '',
      thumbnailUrl: '',
      transcript: '',
      guidedSteps: [],
      benefits: [],
      techniques: [],
      preparationSteps: [],
      tags: [],
      language: 'pt-BR',
      fileSize: 0,
      format: 'mp3',
      bitrate: 128,
      sampleRate: 44100,
      sourceUrl: '',
      license: '',
      attribution: '',
      isCommercialUse: false,
      status: 'active'
    })
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'iniciante': return 'bg-green-100 text-green-800'
      case 'intermediario': return 'bg-yellow-100 text-yellow-800'
      case 'avancado': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Biblioteca de Áudios de Meditação</h2>
          <p className="text-gray-600">Gerencie os áudios de meditação disponíveis na plataforma</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Áudio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Áudio de Meditação</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleCreateAudio} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="instructor">Instrutor *</Label>
                  <Input
                    id="instructor"
                    value={formData.instructor}
                    onChange={(e) => setFormData(prev => ({ ...prev, instructor: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="categoryId">Categoria *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="difficulty">Dificuldade *</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iniciante">Iniciante</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="avancado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="duration">Duração (segundos) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="audioUrl">URL do Áudio *</Label>
                <Input
                  id="audioUrl"
                  type="url"
                  value={formData.audioUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, audioUrl: e.target.value }))}
                  placeholder="https://example.com/audio.mp3"
                  required
                />
              </div>

              <div>
                <Label htmlFor="thumbnailUrl">URL da Thumbnail</Label>
                <Input
                  id="thumbnailUrl"
                  type="url"
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                  placeholder="https://example.com/thumbnail.jpg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sourceUrl">URL da Fonte</Label>
                  <Input
                    id="sourceUrl"
                    type="url"
                    value={formData.sourceUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, sourceUrl: e.target.value }))}
                    placeholder="https://fonte-original.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="license">Licença *</Label>
                  <Input
                    id="license"
                    value={formData.license}
                    onChange={(e) => setFormData(prev => ({ ...prev, license: e.target.value }))}
                    placeholder="Creative Commons CC0"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="attribution">Atribuição</Label>
                <Input
                  id="attribution"
                  value={formData.attribution}
                  onChange={(e) => setFormData(prev => ({ ...prev, attribution: e.target.value }))}
                  placeholder="Criado por..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Criar Áudio
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar áudios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Dificuldade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as dificuldades</SelectItem>
                <SelectItem value="iniciante">Iniciante</SelectItem>
                <SelectItem value="intermediario">Intermediário</SelectItem>
                <SelectItem value="avancado">Avançado</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setSelectedDifficulty('all')
                setSelectedStatus('all')
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de áudios */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Áudio</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Dificuldade</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Estatísticas</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audios.map((audio) => (
                  <TableRow key={audio.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {audio.thumbnailUrl && (
                          <img 
                            src={audio.thumbnailUrl} 
                            alt={audio.title}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{audio.title}</p>
                          <p className="text-sm text-gray-500">{audio.instructor}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {audio.categoryName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDifficultyColor(audio.difficulty)}>
                        {audio.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(audio.duration)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(audio.status)}>
                        {audio.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          {audio.playCount}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {(audio.averageRating / 100).toFixed(1)} ({audio.ratingCount})
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="w-3 h-3" />
                        </Button>
                        {audio.audioUrl && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(audio.audioUrl, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}