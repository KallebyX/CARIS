"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { MeditationPlayer } from './meditation-player'
import { 
  Play, 
  Clock, 
  User, 
  Star, 
  Search, 
  Filter,
  Heart,
  TrendingUp,
  Calendar,
  Award,
  BookOpen,
  Headphones,
  Target,
  BarChart3
} from 'lucide-react'
import { 
  MeditationAudio,
  MeditationCategory,
  MeditationLibraryService
} from '@/lib/meditation-library-service'

interface MeditationLibraryProps {
  userId: number
}

interface UserProgress {
  totalSessions: number
  totalMinutes: number
  currentStreak: number
  longestStreak: number
  favoriteMeditations: string[]
  completedTracks: string[]
  averageRating: number
}

interface MeditationSession {
  id: string
  userId: number
  meditationId: string
  startedAt: Date
  completedAt?: Date
  duration: number
  wasCompleted: boolean
  rating?: number
  feedback?: string
  moodBefore?: number
  moodAfter?: number
  notes?: string
}

export function MeditationLibraryComponent({ userId }: MeditationLibraryProps) {
  const [meditations, setMeditations] = useState<MeditationAudio[]>([])
  const [categories, setCategories] = useState<MeditationCategory[]>([])
  const [selectedMeditation, setSelectedMeditation] = useState<MeditationAudio | null>(null)
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [durationRange, setDurationRange] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [userProgress, setUserProgress] = useState<UserProgress>({
    totalSessions: 45,
    totalMinutes: 420,
    currentStreak: 7,
    longestStreak: 12,
    favoriteMeditations: ['med-001', 'med-005'],
    completedTracks: ['track-beginner'],
    averageRating: 4.3
  })
  const [recentSessions, setRecentSessions] = useState<MeditationSession[]>([])
  const [popularMeditations, setPopularMeditations] = useState<MeditationAudio[]>([])
  const [recommendedMeditations, setRecommendedMeditations] = useState<MeditationAudio[]>([])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    loadMeditations()
  }, [searchQuery, selectedCategory, selectedDifficulty, durationRange, currentPage])

  const loadInitialData = async () => {
    try {
      const [categoriesData, popularData, recommendedData] = await Promise.all([
        MeditationLibraryService.getCategories(),
        MeditationLibraryService.getPopularAudios(3),
        MeditationLibraryService.getRecommendedAudios(userId, 3)
      ])

      setCategories(categoriesData)
      setPopularMeditations(popularData)
      setRecommendedMeditations(recommendedData)
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
    }
  }

  const loadMeditations = async () => {
    try {
      setLoading(true)
      
      const filters = {
        userId,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCategory !== 'all' && { categoryId: selectedCategory }),
        ...(selectedDifficulty !== 'all' && { difficulty: selectedDifficulty }),
        ...(durationRange !== 'all' && getDurationFilter(durationRange))
      }

      const result = await MeditationLibraryService.getAudios(filters, currentPage, 20)
      setMeditations(result.audios)
      setTotalPages(result.pagination.totalPages)
    } catch (error) {
      console.error('Erro ao carregar meditações:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDurationFilter = (range: string) => {
    switch (range) {
      case '0-10':
        return { minDuration: 0, maxDuration: 600 }
      case '10-20':
        return { minDuration: 600, maxDuration: 1200 }
      case '20-30':
        return { minDuration: 1200, maxDuration: 1800 }
      case '30':
        return { minDuration: 1800 }
      default:
        return {}
    }
  }

  const startMeditation = async (meditation: MeditationAudio) => {
    try {
      // Incrementar contador de reprodução
      await MeditationLibraryService.incrementPlayCount(meditation.id)
      
      setSelectedMeditation(meditation)
      setIsPlayerOpen(true)
    } catch (error) {
      console.error('Erro ao iniciar meditação:', error)
    }
  }

  const handleToggleFavorite = async (audioId: string) => {
    try {
      const isFavorite = await MeditationLibraryService.toggleFavorite(userId, audioId)
      
      // Atualizar estado local
      setMeditations(prev => 
        prev.map(med => 
          med.id === audioId 
            ? { ...med, isFavorite }
            : med
        )
      )
      
      setPopularMeditations(prev => 
        prev.map(med => 
          med.id === audioId 
            ? { ...med, isFavorite }
            : med
        )
      )
      
      setRecommendedMeditations(prev => 
        prev.map(med => 
          med.id === audioId 
            ? { ...med, isFavorite }
            : med
        )
      )
    } catch (error) {
      console.error('Erro ao alterar favorito:', error)
    }
  }

  const handleMeditationComplete = async (sessionData: any) => {
    try {
      // Salvar sessão no banco
      const response = await fetch('/api/patient/meditation-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sessionData,
          meditationId: selectedMeditation?.id
        })
      })

      if (response.ok) {
        // Atualizar progresso do usuário
        setUserProgress(prev => ({
          ...prev,
          totalSessions: prev.totalSessions + 1,
          totalMinutes: prev.totalMinutes + Math.round(sessionData.duration / 60)
        }))
        
        // Fechar player
        setIsPlayerOpen(false)
        setSelectedMeditation(null)
      }
    } catch (error) {
      console.error('Erro ao salvar sessão:', error)
    }
  }

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category?.icon || '🧘‍♀️'
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'iniciante': return 'bg-green-100 text-green-800'
      case 'intermediario': return 'bg-yellow-100 text-yellow-800'
      case 'avancado': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const popularMeditationsData = popularMeditations.slice(0, 3)
  const recommendedMeditationsData = recommendedMeditations.slice(0, 3)

  if (isPlayerOpen && selectedMeditation) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => {
              setIsPlayerOpen(false)
              setSelectedMeditation(null)
            }}
          >
            ← Voltar à Biblioteca
          </Button>
        </div>
        
        <MeditationPlayer
          meditation={selectedMeditation}
          onComplete={handleMeditationComplete}
          autoPlay={false}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com Progresso */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Sessões</span>
            </div>
            <div className="text-2xl font-bold mt-1">{userProgress.totalSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Minutos</span>
            </div>
            <div className="text-2xl font-bold mt-1">{formatDuration(userProgress.totalMinutes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Sequência</span>
            </div>
            <div className="text-2xl font-bold mt-1">{userProgress.currentStreak} dias</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium">Avaliação</span>
            </div>
            <div className="text-2xl font-bold mt-1">{userProgress.averageRating}/5</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="library" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="library">Biblioteca</TabsTrigger>
          <TabsTrigger value="tracks">Trilhas</TabsTrigger>
          <TabsTrigger value="favorites">Favoritos</TabsTrigger>
          <TabsTrigger value="progress">Progresso</TabsTrigger>
        </TabsList>

        {/* Biblioteca de Meditações */}
        <TabsContent value="library" className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar meditações..."
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
                
                <Select value={durationRange} onValueChange={setDurationRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Duração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Qualquer duração</SelectItem>
                    <SelectItem value="0-10">Até 10 min</SelectItem>
                    <SelectItem value="10-20">10-20 min</SelectItem>
                    <SelectItem value="20-30">20-30 min</SelectItem>
                    <SelectItem value="30">Mais de 30 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Seções Destacadas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Populares */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Mais Populares
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {popularMeditationsData.map((meditation) => (
                  <div key={meditation.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getCategoryIcon(meditation.categoryId)}</div>
                      <div>
                        <h4 className="font-medium">{meditation.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-3 h-3" />
                          {Math.floor(meditation.duration / 60)}min
                          <Star className="w-3 h-3 text-yellow-500" />
                          {meditation.averageRating.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => startMeditation(meditation)}>
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recomendadas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Recomendadas para Você
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendedMeditationsData.map((meditation) => (
                  <div key={meditation.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getCategoryIcon(meditation.categoryId)}</div>
                      <div>
                        <h4 className="font-medium">{meditation.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-3 h-3" />
                          {Math.floor(meditation.duration / 60)}min
                          <Badge className={getDifficultyColor(meditation.difficulty)}>
                            {meditation.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => startMeditation(meditation)}>
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Lista de Meditações */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Carregando meditações...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {meditations.map((meditation) => (
                <Card key={meditation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="text-4xl">{getCategoryIcon(meditation.categoryId)}</div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{meditation.title}</h3>
                            <Badge className={getDifficultyColor(meditation.difficulty)}>
                              {meditation.difficulty}
                            </Badge>
                            {meditation.isFavorite && (
                              <Heart className="w-4 h-4 text-red-500 fill-current" />
                            )}
                          </div>
                          
                          <p className="text-gray-600 mb-3">{meditation.description}</p>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {meditation.instructor}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.floor(meditation.duration / 60)} minutos
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              {meditation.averageRating.toFixed(1)}/5
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            {meditation.tags?.slice(0, 4).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <Button onClick={() => startMeditation(meditation)}>
                          <Play className="w-4 h-4 mr-2" />
                          Meditar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleFavorite(meditation.id)}
                        >
                          <Heart className={`w-4 h-4 ${meditation.isFavorite ? 'fill-current text-red-500' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {meditations.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600">Nenhuma meditação encontrada com os filtros aplicados.</p>
                </div>
              )}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
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
        </TabsContent>

        {/* Trilhas de Meditação */}
        <TabsContent value="tracks" className="space-y-4">
          <Card>
            <CardContent className="text-center py-8">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Trilhas de meditação em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Favoritos */}
        <TabsContent value="favorites">
          <Card>
            <CardContent className="text-center py-8">
              <Heart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Suas meditações favoritas aparecerão aqui</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progresso */}
        <TabsContent value="progress" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Sessões este mês</span>
                    <span>23/30</span>
                  </div>
                  <Progress value={76} />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Meta de minutos</span>
                    <span>420/500</span>
                  </div>
                  <Progress value={84} />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Sequência atual</span>
                    <span>{userProgress.currentStreak} dias</span>
                  </div>
                  <Progress value={(userProgress.currentStreak / 30) * 100} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categorias Praticadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categories.slice(0, 5).map((category) => (
                    <div key={category.id} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        {category.name}
                      </span>
                      <Badge variant="secondary">
                        {Math.floor(Math.random() * 10) + 1} sessões
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}