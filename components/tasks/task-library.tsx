"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BookOpen, 
  Search, 
  Filter, 
  Clock, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Plus,
  Eye,
  Send,
  Star,
  User,
  Brain
} from 'lucide-react'
import { 
  TherapeuticTask,
  therapeuticTasksLibrary,
  getTasksByCategory,
  getTasksByApproach,
  searchTasks,
  taskCategories,
  therapeuticApproaches
} from '@/lib/therapeutic-tasks'

interface TaskLibraryProps {
  userRole: 'patient' | 'psychologist'
  userId: number
  patientId?: number // Para quando psicólogo prescreve para paciente
}

interface PrescribedTask {
  id: string
  taskId: string
  patientId: number
  psychologistId: number
  prescribedAt: Date
  dueDate?: Date
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  notes?: string
  patientFeedback?: string
  completedAt?: Date
}

export function TaskLibrary({ userRole, userId, patientId }: TaskLibraryProps) {
  const [tasks, setTasks] = useState<TherapeuticTask[]>(therapeuticTasksLibrary)
  const [prescribedTasks, setPrescribedTasks] = useState<PrescribedTask[]>([])
  const [selectedTask, setSelectedTask] = useState<TherapeuticTask | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedApproach, setSelectedApproach] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [prescriptionNotes, setPrescriptionNotes] = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    filterTasks()
  }, [searchQuery, selectedCategory, selectedApproach, selectedDifficulty])

  useEffect(() => {
    if (userRole === 'patient') {
      fetchPrescribedTasks()
    }
  }, [userRole, userId])

  const filterTasks = () => {
    let filtered = therapeuticTasksLibrary

    if (searchQuery) {
      filtered = searchTasks(searchQuery)
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(task => task.category === selectedCategory)
    }

    if (selectedApproach !== 'all') {
      filtered = filtered.filter(task => task.approach === selectedApproach)
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(task => task.difficulty === selectedDifficulty)
    }

    setTasks(filtered)
  }

  const fetchPrescribedTasks = async () => {
    try {
      const response = await fetch('/api/patient/tasks')
      const data = await response.json()
      
      if (data.success) {
        setPrescribedTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Erro ao buscar tarefas prescritas:', error)
    }
  }

  const prescribeTask = async (task: TherapeuticTask) => {
    if (!patientId) return

    try {
      const response = await fetch('/api/psychologist/prescribe-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          patientId,
          notes: prescriptionNotes,
          dueDate: dueDate || null
        })
      })

      if (response.ok) {
        alert('Tarefa prescrita com sucesso!')
        setPrescriptionNotes('')
        setDueDate('')
        setSelectedTask(null)
      }
    } catch (error) {
      console.error('Erro ao prescrever tarefa:', error)
    }
  }

  const updateTaskStatus = async (prescribedTaskId: string, status: string, feedback?: string) => {
    try {
      const response = await fetch(`/api/patient/tasks/${prescribedTaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, feedback })
      })

      if (response.ok) {
        fetchPrescribedTasks()
      }
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'baixa': return 'bg-green-100 text-green-800'
      case 'media': return 'bg-yellow-100 text-yellow-800'
      case 'alta': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getApproachColor = (approach: string) => {
    const colors = {
      'TCC': 'bg-blue-100 text-blue-800',
      'ACT': 'bg-purple-100 text-purple-800',
      'DBT': 'bg-pink-100 text-pink-800',
      'Sistêmica': 'bg-orange-100 text-orange-800',
      'Humanística': 'bg-green-100 text-green-800',
      'Psicodinâmica': 'bg-indigo-100 text-indigo-800'
    }
    return colors[approach as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Biblioteca de Tarefas</h1>
          <p className="text-muted-foreground">
            {userRole === 'psychologist' 
              ? 'Prescreva tarefas terapêuticas validadas' 
              : 'Suas tarefas terapêuticas prescritas'}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {tasks.length} tarefas disponíveis
        </Badge>
      </div>

      <Tabs defaultValue={userRole === 'patient' ? 'prescribed' : 'library'} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {userRole === 'patient' && (
            <TabsTrigger value="prescribed">Minhas Tarefas</TabsTrigger>
          )}
          <TabsTrigger value="library">
            {userRole === 'psychologist' ? 'Biblioteca' : 'Explorar Tarefas'}
          </TabsTrigger>
        </TabsList>

        {/* Tarefas Prescritas (Paciente) */}
        {userRole === 'patient' && (
          <TabsContent value="prescribed" className="space-y-4">
            {prescribedTasks.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Nenhuma tarefa prescrita ainda</p>
                </CardContent>
              </Card>
            ) : (
              prescribedTasks.map((prescribedTask) => {
                const task = therapeuticTasksLibrary.find(t => t.id === prescribedTask.taskId)
                if (!task) return null

                return (
                  <Card key={prescribedTask.id} className="relative">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{task.title}</h3>
                            <Badge className={getDifficultyColor(task.difficulty)}>
                              {task.difficulty}
                            </Badge>
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {task.estimatedTime}min
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Prescrita em: {new Date(prescribedTask.prescribedAt).toLocaleDateString()}</span>
                            {prescribedTask.dueDate && (
                              <span>Prazo: {new Date(prescribedTask.dueDate).toLocaleDateString()}</span>
                            )}
                          </div>

                          {prescribedTask.notes && (
                            <Alert className="mt-3">
                              <AlertDescription className="text-sm">
                                <strong>Orientações:</strong> {prescribedTask.notes}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          {prescribedTask.status === 'pending' && (
                            <>
                              <Button 
                                size="sm"
                                onClick={() => updateTaskStatus(prescribedTask.id, 'in_progress')}
                              >
                                Iniciar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedTask(task)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                            </>
                          )}
                          
                          {prescribedTask.status === 'in_progress' && (
                            <Button 
                              size="sm"
                              onClick={() => {
                                const feedback = prompt('Como foi realizar esta tarefa? (opcional)')
                                updateTaskStatus(prescribedTask.id, 'completed', feedback || undefined)
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Concluir
                            </Button>
                          )}
                          
                          {prescribedTask.status === 'completed' && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Concluída
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>
        )}

        {/* Biblioteca de Tarefas */}
        <TabsContent value="library" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Input
                    placeholder="Buscar tarefas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {taskCategories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedApproach} onValueChange={setSelectedApproach}>
                  <SelectTrigger>
                    <SelectValue placeholder="Abordagem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as abordagens</SelectItem>
                    {therapeuticApproaches.map(approach => (
                      <SelectItem key={approach.id} value={approach.id}>
                        {approach.name}
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
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Tarefas */}
          <div className="grid gap-4">
            {tasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{task.title}</h3>
                        <Badge className={getApproachColor(task.approach)}>
                          {task.approach}
                        </Badge>
                        <Badge className={getDifficultyColor(task.difficulty)}>
                          {task.difficulty}
                        </Badge>
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          {task.estimatedTime}min
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-blue-600">{task.objective}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {task.targetSymptoms.slice(0, 3).map((symptom) => (
                          <Badge key={symptom} variant="secondary" className="text-xs">
                            {symptom}
                          </Badge>
                        ))}
                        {task.targetSymptoms.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{task.targetSymptoms.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedTask(task)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      
                      {userRole === 'psychologist' && patientId && (
                        <Button 
                          size="sm"
                          onClick={() => prescribeTask(task)}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Prescrever
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes da Tarefa */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{selectedTask.title}</CardTitle>
                <Button variant="outline" onClick={() => setSelectedTask(null)}>
                  Fechar
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge className={getApproachColor(selectedTask.approach)}>
                  {selectedTask.approach}
                </Badge>
                <Badge className={getDifficultyColor(selectedTask.difficulty)}>
                  Dificuldade: {selectedTask.difficulty}
                </Badge>
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  {selectedTask.estimatedTime} minutos
                </Badge>
                <Badge variant="outline">
                  <Star className="w-3 h-3 mr-1" />
                  Evidência: {selectedTask.evidenceLevel}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Descrição</h4>
                <p className="text-gray-600">{selectedTask.description}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Objetivo</h4>
                <p className="text-gray-600">{selectedTask.objective}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Instruções</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  {selectedTask.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>
              </div>
              
              {selectedTask.materials && (
                <div>
                  <h4 className="font-semibold mb-2">Materiais Necessários</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {selectedTask.materials.map((material, index) => (
                      <li key={index}>{material}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div>
                <h4 className="font-semibold mb-2">Sintomas-alvo</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedTask.targetSymptoms.map((symptom) => (
                    <Badge key={symptom} variant="secondary">
                      {symptom}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {selectedTask.warnings && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Cuidados:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {selectedTask.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              <div>
                <h4 className="font-semibold mb-2">Perguntas de Acompanhamento</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {selectedTask.followUpQuestions.map((question, index) => (
                    <li key={index}>{question}</li>
                  ))}
                </ul>
              </div>
              
              {userRole === 'psychologist' && patientId && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Prescrever para Paciente</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Observações (opcional)</label>
                      <Textarea
                        value={prescriptionNotes}
                        onChange={(e) => setPrescriptionNotes(e.target.value)}
                        placeholder="Orientações específicas para o paciente..."
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Prazo (opcional)</label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                    
                    <Button onClick={() => prescribeTask(selectedTask)} className="w-full">
                      <Send className="w-4 h-4 mr-2" />
                      Prescrever Tarefa
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}