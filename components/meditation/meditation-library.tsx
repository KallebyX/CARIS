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
  MeditationPractice,
  MeditationSession,
  MeditationTrack,
  meditationLibrary,
  meditationTracks,
  meditationCategories,
  getMeditationsByCategory,
  getMeditationsByDifficulty,
  getMeditationsByDuration,
  searchMeditations,
  getPopularMeditations,
  getRecommendedMeditations
} from '@/lib/meditation-library'

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

export function MeditationLibraryComponent({ userId }: MeditationLibraryProps) {
  const [meditations, setMeditations] = useState<MeditationPractice[]>(meditationLibrary)
  const [selectedMeditation, setSelectedMeditation] = useState<MeditationPractice | null>(null)
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [durationRange, setDurationRange] = useState<string>('all')
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

  useEffect(() => {
    filterMeditations()
  }, [searchQuery, selectedCategory, selectedDifficulty, durationRange])

  const filterMeditations = () => {
    let filtered = meditationLibrary

    if (searchQuery) {
      filtered = searchMeditations(searchQuery)
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(med => med.category === selectedCategory)
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(med => med.difficulty === selectedDifficulty)
    }

    if (durationRange !== 'all') {
      const [min, max] = durationRange.split('-').map(Number)
      filtered = filtered.filter(med => {
        if (max) {
          return med.duration >= min && med.duration <= max
        } else {
          return med.duration >= min
        }
      })
    }

    setMeditations(filtered)
  }

  const startMeditation = (meditation: MeditationPractice) => {
    setSelectedMeditation(meditation)
    setIsPlayerOpen(true)
  }

  const handleMeditationComplete = async (sessionData: any) => {
    try {
      // Salvar sessão no banco
      const response = await fetch('/api/patient/meditation-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
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
    const category = meditationCategories.find(cat => cat.id === categoryId)
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

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const popularMeditations = getPopularMeditations(3)
  const recommendedMeditations = getRecommendedMeditations({
    categories: ['ansiedade', 'mindfulness'],
    difficulty: 'iniciante',
    maxDuration: 15
  }).slice(0, 3)

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
                    {meditationCategories.map(category => (
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
                {popularMeditations.map((meditation) => (
                  <div key={meditation.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getCategoryIcon(meditation.category)}</div>
                      <div>
                        <h4 className="font-medium">{meditation.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-3 h-3" />
                          {meditation.duration}min
                          <Star className="w-3 h-3 text-yellow-500" />
                          {meditation.effectivenessRating}
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
                {recommendedMeditations.map((meditation) => (
                  <div key={meditation.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getCategoryIcon(meditation.category)}</div>
                      <div>
                        <h4 className="font-medium">{meditation.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-3 h-3" />
                          {meditation.duration}min
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
          <div className="grid gap-4">
            {meditations.map((meditation) => (
              <Card key={meditation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="text-4xl">{getCategoryIcon(meditation.category)}</div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{meditation.title}</h3>
                          <Badge className={getDifficultyColor(meditation.difficulty)}>
                            {meditation.difficulty}
                          </Badge>
                          {userProgress.favoriteMeditations.includes(meditation.id) && (
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
                            {meditation.duration} minutos
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            {meditation.effectivenessRating}/5
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {meditation.tags.slice(0, 4).map((tag) => (
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
                      <Button variant="outline" size="sm">
                        <Heart className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Trilhas de Meditação */}
        <TabsContent value="tracks" className="space-y-4">
          {meditationTracks.map((track) => (
            <Card key={track.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{track.title}</CardTitle>
                    <p className="text-gray-600 mt-1">{track.description}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{track.weekNumber} semanas</Badge>
                    {userProgress.completedTracks.includes(track.id) && (
                      <Badge className="ml-2 bg-green-100 text-green-800">
                        <Award className="w-3 h-3 mr-1" />
                        Concluída
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm"><strong>Objetivo:</strong> {track.objective}</p>
                  <p className="text-sm"><strong>Tema:</strong> {track.theme}</p>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {track.meditations.length} meditações
                    </span>
                    <Button variant="outline">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Ver Trilha
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
                  {meditationCategories.slice(0, 5).map((category) => (
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