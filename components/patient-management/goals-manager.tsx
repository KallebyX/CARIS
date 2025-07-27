"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Target, Plus, Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { toast } from "react-hot-toast"

interface Milestone {
  id: number
  title: string
  description?: string
  targetValue: number
  achievedAt?: string
  createdAt: string
}

interface Goal {
  id: number
  title: string
  description?: string
  targetValue?: number
  currentValue: number
  unit?: string
  status: string
  dueDate?: string
  createdAt: string
  completedAt?: string
  milestones: Milestone[]
  patient?: {
    id: number
    name: string
  }
}

interface GoalsManagerProps {
  patientId?: number
  patientName?: string
  showPatientInfo?: boolean
}

export function GoalsManager({ patientId, patientName, showPatientInfo = false }: GoalsManagerProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState("active")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetValue: "",
    unit: "",
    dueDate: "",
    milestones: [{ title: "", description: "", targetValue: "" }],
  })

  useEffect(() => {
    fetchGoals()
  }, [patientId])

  const fetchGoals = async () => {
    try {
      const url = patientId 
        ? `/api/psychologist/goals?patientId=${patientId}`
        : "/api/psychologist/goals"
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setGoals(data.data || [])
      } else {
        toast.error("Erro ao carregar metas terapêuticas")
      }
    } catch (error) {
      toast.error("Erro ao carregar metas terapêuticas")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!patientId) {
      toast.error("ID do paciente é obrigatório")
      return
    }

    try {
      const response = await fetch("/api/psychologist/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId,
          title: formData.title,
          description: formData.description,
          targetValue: formData.targetValue ? parseInt(formData.targetValue) : null,
          unit: formData.unit,
          dueDate: formData.dueDate || null,
          milestones: formData.milestones.filter(m => m.title).map(m => ({
            title: m.title,
            description: m.description,
            targetValue: parseInt(m.targetValue) || 0,
          })),
        }),
      })

      if (response.ok) {
        toast.success("Meta criada com sucesso!")
        setDialogOpen(false)
        resetForm()
        fetchGoals()
      } else {
        toast.error("Erro ao criar meta")
      }
    } catch (error) {
      toast.error("Erro ao criar meta")
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      targetValue: "",
      unit: "",
      dueDate: "",
      milestones: [{ title: "", description: "", targetValue: "" }],
    })
  }

  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [...formData.milestones, { title: "", description: "", targetValue: "" }]
    })
  }

  const updateMilestone = (index: number, field: string, value: string) => {
    const newMilestones = [...formData.milestones]
    newMilestones[index] = { ...newMilestones[index], [field]: value }
    setFormData({ ...formData, milestones: newMilestones })
  }

  const removeMilestone = (index: number) => {
    if (formData.milestones.length > 1) {
      const newMilestones = formData.milestones.filter((_, i) => i !== index)
      setFormData({ ...formData, milestones: newMilestones })
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      paused: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      active: Clock,
      completed: CheckCircle,
      paused: AlertCircle,
      cancelled: AlertCircle,
    }
    return icons[status as keyof typeof icons] || Clock
  }

  const calculateProgress = (goal: Goal) => {
    if (!goal.targetValue) return 0
    return Math.min((goal.currentValue / goal.targetValue) * 100, 100)
  }

  const filteredGoals = goals.filter(goal => {
    if (selectedTab === "active") return goal.status === "active"
    if (selectedTab === "completed") return goal.status === "completed"
    if (selectedTab === "all") return true
    return goal.status === selectedTab
  })

  const getTabCounts = () => {
    return {
      active: goals.filter(g => g.status === "active").length,
      completed: goals.filter(g => g.status === "completed").length,
      all: goals.length,
    }
  }

  const tabCounts = getTabCounts()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-teal-600" />
                Metas Terapêuticas
                {patientName && <span className="text-teal-600">- {patientName}</span>}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {patientId 
                  ? "Gerencie as metas terapêuticas do paciente"
                  : "Visão geral de todas as metas dos seus pacientes"
                }
              </p>
            </div>
            {patientId && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Meta
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nova Meta Terapêutica</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Título da Meta</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ex: Reduzir ansiedade em situações sociais"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descreva os detalhes da meta..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="targetValue">Valor Alvo</Label>
                        <Input
                          id="targetValue"
                          type="number"
                          value={formData.targetValue}
                          onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                          placeholder="10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit">Unidade</Label>
                        <Input
                          id="unit"
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          placeholder="sessões, dias, pontos..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="dueDate">Data Limite</Label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <Label>Marcos de Progresso</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar Marco
                        </Button>
                      </div>
                      
                      {formData.milestones.map((milestone, index) => (
                        <div key={index} className="border rounded-lg p-3 mb-3">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <Label>Título do Marco</Label>
                              <Input
                                value={milestone.title}
                                onChange={(e) => updateMilestone(index, "title", e.target.value)}
                                placeholder="Ex: Participar de 3 eventos sociais"
                              />
                            </div>
                            <div>
                              <Label>Valor Alvo</Label>
                              <Input
                                type="number"
                                value={milestone.targetValue}
                                onChange={(e) => updateMilestone(index, "targetValue", e.target.value)}
                                placeholder="3"
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Descrição</Label>
                            <Textarea
                              value={milestone.description}
                              onChange={(e) => updateMilestone(index, "description", e.target.value)}
                              placeholder="Descreva o marco..."
                              rows={2}
                            />
                          </div>
                          {formData.milestones.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeMilestone(index)}
                              className="mt-2"
                            >
                              Remover Marco
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
                        Criar Meta
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">
                Ativas ({tabCounts.active})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Concluídas ({tabCounts.completed})
              </TabsTrigger>
              <TabsTrigger value="all">
                Todas ({tabCounts.all})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-6">
              {loading ? (
                <div className="text-center py-4">Carregando metas...</div>
              ) : filteredGoals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma meta encontrada.</p>
                  {patientId && (
                    <p className="text-sm">Clique em "Nova Meta" para começar.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredGoals.map((goal) => {
                    const StatusIcon = getStatusIcon(goal.status)
                    const progress = calculateProgress(goal)
                    
                    return (
                      <Card key={goal.id} className="border-l-4 border-l-teal-500">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg">{goal.title}</h3>
                                <Badge className={getStatusColor(goal.status)}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {goal.status === "active" ? "Ativa" : 
                                   goal.status === "completed" ? "Concluída" : 
                                   goal.status === "paused" ? "Pausada" : "Cancelada"}
                                </Badge>
                              </div>
                              
                              {showPatientInfo && goal.patient && (
                                <p className="text-sm text-gray-600 mb-2">
                                  Paciente: {goal.patient.name}
                                </p>
                              )}
                              
                              {goal.description && (
                                <p className="text-gray-700 mb-3">{goal.description}</p>
                              )}
                              
                              {goal.targetValue && (
                                <div className="mb-3">
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>Progresso</span>
                                    <span>
                                      {goal.currentValue} / {goal.targetValue} {goal.unit}
                                    </span>
                                  </div>
                                  <Progress value={progress} className="h-2" />
                                </div>
                              )}
                              
                              {goal.dueDate && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    Prazo: {new Date(goal.dueDate).toLocaleDateString("pt-BR")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {goal.milestones.length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-medium text-sm mb-2">Marcos de Progresso:</h4>
                              <div className="space-y-2">
                                {goal.milestones.map((milestone) => (
                                  <div key={milestone.id} className="flex items-center gap-2 text-sm">
                                    {milestone.achievedAt ? (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <Clock className="w-4 h-4 text-gray-400" />
                                    )}
                                    <span className={milestone.achievedAt ? "line-through text-gray-500" : ""}>
                                      {milestone.title}
                                    </span>
                                    {milestone.achievedAt && (
                                      <Badge variant="secondary" className="text-xs">
                                        {new Date(milestone.achievedAt).toLocaleDateString("pt-BR")}
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}