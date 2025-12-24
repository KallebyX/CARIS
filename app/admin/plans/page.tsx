"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2, AlertCircle } from "lucide-react"

interface Plan {
  id: string
  name: string
  description: string
  priceMonthly: number
  priceYearly: number | null
  stripePriceIdMonthly: string
  stripePriceIdYearly: string | null
  features: string[]
  maxPatients: number | null
  isPopular: boolean
  isActive: boolean
  sortOrder: number
  totalSubscribers: number
  activeSubscribers: number
}

interface PlanFormData {
  id: string
  name: string
  description: string
  priceMonthly: number
  priceYearly: number | null
  stripePriceIdMonthly: string
  stripePriceIdYearly: string
  features: string
  maxPatients: number | null
  isPopular: boolean
  isActive: boolean
  sortOrder: number
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [formData, setFormData] = useState<PlanFormData>({
    id: "",
    name: "",
    description: "",
    priceMonthly: 0,
    priceYearly: null,
    stripePriceIdMonthly: "",
    stripePriceIdYearly: "",
    features: "",
    maxPatients: null,
    isPopular: false,
    isActive: true,
    sortOrder: 0,
  })

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/admin/plans")
      if (res.ok) {
        const data = await res.json()
        setPlans(data.data || [])
      }
    } catch (error) {
      console.error("Error fetching plans:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlan = async () => {
    if (!formData.id || !formData.name || !formData.stripePriceIdMonthly) {
      alert("ID, nome e Stripe Price ID mensal sao obrigatorios")
      return
    }
    setSaving(true)
    try {
      const features = formData.features
        .split("\n")
        .map(f => f.trim())
        .filter(f => f.length > 0)

      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          features,
        }),
      })
      if (res.ok) {
        await fetchPlans()
        setIsCreateModalOpen(false)
        resetForm()
      } else {
        const data = await res.json()
        alert(data.error || "Erro ao criar plano")
      }
    } catch (error) {
      console.error("Error creating plan:", error)
      alert("Erro ao criar plano")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePlan = async () => {
    if (!selectedPlan) return
    setSaving(true)
    try {
      const features = formData.features
        .split("\n")
        .map(f => f.trim())
        .filter(f => f.length > 0)

      const res = await fetch("/api/admin/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPlan.id,
          ...formData,
          features,
        }),
      })
      if (res.ok) {
        await fetchPlans()
        setIsEditModalOpen(false)
        setSelectedPlan(null)
        resetForm()
      } else {
        const data = await res.json()
        alert(data.error || "Erro ao atualizar plano")
      }
    } catch (error) {
      console.error("Error updating plan:", error)
      alert("Erro ao atualizar plano")
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePlan = async () => {
    if (!selectedPlan) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/plans?id=${selectedPlan.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        await fetchPlans()
        setIsDeleteModalOpen(false)
        setSelectedPlan(null)
      } else {
        const data = await res.json()
        alert(data.error || "Erro ao excluir plano")
      }
    } catch (error) {
      console.error("Error deleting plan:", error)
      alert("Erro ao excluir plano")
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      description: "",
      priceMonthly: 0,
      priceYearly: null,
      stripePriceIdMonthly: "",
      stripePriceIdYearly: "",
      features: "",
      maxPatients: null,
      isPopular: false,
      isActive: true,
      sortOrder: 0,
    })
  }

  const openEditModal = (plan: Plan) => {
    setSelectedPlan(plan)
    setFormData({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      stripePriceIdMonthly: plan.stripePriceIdMonthly,
      stripePriceIdYearly: plan.stripePriceIdYearly || "",
      features: (plan.features || []).join("\n"),
      maxPatients: plan.maxPatients,
      isPopular: plan.isPopular,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    })
    setIsEditModalOpen(true)
  }

  const openDeleteModal = (plan: Plan) => {
    setSelectedPlan(plan)
    setIsDeleteModalOpen(true)
  }

  // Stats
  const totalPlans = plans.length
  const activePlans = plans.filter(p => p.isActive).length
  const totalSubscribers = plans.reduce((sum, p) => sum + (p.activeSubscribers || 0), 0)
  const estimatedMRR = plans.reduce((sum, p) => sum + (p.priceMonthly * (p.activeSubscribers || 0)), 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-800">Gerenciamento de Planos</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gerenciamento de Planos</h1>
          <p className="text-slate-600">Crie e edite os planos de assinatura da plataforma.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Criar Novo Plano
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-600">Total de Planos</p>
          <p className="text-2xl font-bold">{totalPlans}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-600">Planos Ativos</p>
          <p className="text-2xl font-bold">{activePlans}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-600">Assinantes Ativos</p>
          <p className="text-2xl font-bold">{totalSubscribers}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-600">MRR Estimado</p>
          <p className="text-2xl font-bold">R$ {estimatedMRR.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-slate-200 text-center">
          <p className="text-slate-500">Nenhum plano cadastrado</p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Plano
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={!plan.isActive ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <p className="font-bold text-teal-600 text-lg">
                      R$ {plan.priceMonthly.toLocaleString('pt-BR')}/mes
                    </p>
                    {plan.priceYearly && (
                      <p className="text-sm text-slate-500">
                        ou R$ {plan.priceYearly.toLocaleString('pt-BR')}/ano
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                    {plan.isPopular && (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                        Popular
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">{plan.description}</p>

                {plan.features && plan.features.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-slate-500 mb-2">Recursos:</p>
                    <ul className="text-sm space-y-1">
                      {plan.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="text-slate-600 flex items-center gap-1">
                          <span className="text-green-500">✓</span> {feature}
                        </li>
                      ))}
                      {plan.features.length > 3 && (
                        <li className="text-slate-400 text-xs">+{plan.features.length - 3} mais</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-md mb-4">
                  <span className="text-sm font-medium">Assinantes Ativos</span>
                  <span className="font-bold">{plan.activeSubscribers || 0}</span>
                </div>

                {plan.maxPatients && (
                  <p className="text-xs text-slate-500 mb-4">
                    Limite: {plan.maxPatients} pacientes
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openEditModal(plan)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => openDeleteModal(plan)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false)
          setIsEditModalOpen(false)
          setSelectedPlan(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditModalOpen ? "Editar Plano" : "Novo Plano"}</DialogTitle>
            <DialogDescription>
              {isEditModalOpen ? "Atualize as informacoes do plano" : "Preencha os dados para criar um novo plano"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="id">ID do Plano *</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="ex: essential, professional"
                  className="mt-1"
                  disabled={isEditModalOpen}
                />
              </div>
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descricao *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priceMonthly">Preco Mensal (R$) *</Label>
                <Input
                  id="priceMonthly"
                  type="number"
                  step="0.01"
                  value={formData.priceMonthly}
                  onChange={(e) => setFormData({ ...formData, priceMonthly: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="priceYearly">Preco Anual (R$)</Label>
                <Input
                  id="priceYearly"
                  type="number"
                  step="0.01"
                  value={formData.priceYearly || ""}
                  onChange={(e) => setFormData({ ...formData, priceYearly: parseFloat(e.target.value) || null })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stripePriceIdMonthly">Stripe Price ID Mensal *</Label>
                <Input
                  id="stripePriceIdMonthly"
                  value={formData.stripePriceIdMonthly}
                  onChange={(e) => setFormData({ ...formData, stripePriceIdMonthly: e.target.value })}
                  placeholder="price_xxx"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="stripePriceIdYearly">Stripe Price ID Anual</Label>
                <Input
                  id="stripePriceIdYearly"
                  value={formData.stripePriceIdYearly}
                  onChange={(e) => setFormData({ ...formData, stripePriceIdYearly: e.target.value })}
                  placeholder="price_xxx"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="features">Recursos (um por linha)</Label>
              <Textarea
                id="features"
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="Ate 10 pacientes&#10;Agenda integrada&#10;Relatorios basicos"
                className="mt-1"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxPatients">Max. Pacientes (vazio = ilimitado)</Label>
                <Input
                  id="maxPatients"
                  type="number"
                  value={formData.maxPatients || ""}
                  onChange={(e) => setFormData({ ...formData, maxPatients: parseInt(e.target.value) || null })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sortOrder">Ordem de Exibicao</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Ativo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isPopular"
                  checked={formData.isPopular}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPopular: checked })}
                />
                <Label htmlFor="isPopular">Destacar como Popular</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateModalOpen(false)
              setIsEditModalOpen(false)
              setSelectedPlan(null)
              resetForm()
            }}>
              Cancelar
            </Button>
            <Button onClick={isEditModalOpen ? handleUpdatePlan : handleCreatePlan} disabled={saving}>
              {saving ? "Salvando..." : isEditModalOpen ? "Salvar Alteracoes" : "Criar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDeleteModalOpen(false)
          setSelectedPlan(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Confirmar Exclusao
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o plano <strong>{selectedPlan?.name}</strong>?
              {selectedPlan && selectedPlan.activeSubscribers > 0 && (
                <span className="block mt-2 text-red-600">
                  Este plano possui {selectedPlan.activeSubscribers} assinantes ativos e nao pode ser excluido.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePlan}
              disabled={saving || (selectedPlan?.activeSubscribers || 0) > 0}
            >
              {saving ? "Excluindo..." : "Excluir Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
