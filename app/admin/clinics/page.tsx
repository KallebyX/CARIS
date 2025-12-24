"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface Clinic {
  id: number
  name: string
  slug: string
  description: string | null
  email: string | null
  phone: string | null
  website: string | null
  cnpj: string | null
  status: string
  planType: string
  maxUsers: number
  maxPsychologists: number
  maxPatients: number
  ownerId: number
  ownerName?: string
  ownerEmail?: string
  totalUsers?: number
  monthlyRevenue?: number
  createdAt: string
}

interface ClinicFormData {
  name: string
  slug: string
  description: string
  email: string
  phone: string
  website: string
  cnpj: string
  planType: string
  maxUsers: number
  maxPsychologists: number
  maxPatients: number
  status: string
}

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterPlan, setFilterPlan] = useState("")

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<ClinicFormData>({
    name: "",
    slug: "",
    description: "",
    email: "",
    phone: "",
    website: "",
    cnpj: "",
    planType: "basic",
    maxUsers: 10,
    maxPsychologists: 5,
    maxPatients: 50,
    status: "active",
  })

  useEffect(() => {
    fetchClinics()
  }, [])

  const fetchClinics = async () => {
    try {
      const res = await fetch("/api/admin/clinics")
      if (res.ok) {
        const data = await res.json()
        setClinics(data.data || [])
      }
    } catch (error) {
      console.error("Error fetching clinics:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClinic = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        await fetchClinics()
        setIsCreateModalOpen(false)
        resetForm()
      } else {
        const data = await res.json()
        alert(data.error || "Erro ao criar clinica")
      }
    } catch (error) {
      console.error("Error creating clinic:", error)
      alert("Erro ao criar clinica")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateClinic = async () => {
    if (!selectedClinic) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/clinics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedClinic.id, ...formData }),
      })
      if (res.ok) {
        await fetchClinics()
        setIsEditModalOpen(false)
        setSelectedClinic(null)
        resetForm()
      } else {
        const data = await res.json()
        alert(data.error || "Erro ao atualizar clinica")
      }
    } catch (error) {
      console.error("Error updating clinic:", error)
      alert("Erro ao atualizar clinica")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (clinic: Clinic) => {
    const newStatus = clinic.status === "active" ? "suspended" : "active"
    try {
      const res = await fetch("/api/admin/clinics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clinic.id, status: newStatus }),
      })
      if (res.ok) {
        await fetchClinics()
      }
    } catch (error) {
      console.error("Error toggling clinic status:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      email: "",
      phone: "",
      website: "",
      cnpj: "",
      planType: "basic",
      maxUsers: 10,
      maxPsychologists: 5,
      maxPatients: 50,
      status: "active",
    })
  }

  const openEditModal = (clinic: Clinic) => {
    setSelectedClinic(clinic)
    setFormData({
      name: clinic.name,
      slug: clinic.slug,
      description: clinic.description || "",
      email: clinic.email || "",
      phone: clinic.phone || "",
      website: clinic.website || "",
      cnpj: clinic.cnpj || "",
      planType: clinic.planType,
      maxUsers: clinic.maxUsers,
      maxPsychologists: clinic.maxPsychologists,
      maxPatients: clinic.maxPatients,
      status: clinic.status,
    })
    setIsEditModalOpen(true)
  }

  const openDetailModal = (clinic: Clinic) => {
    setSelectedClinic(clinic)
    setIsDetailModalOpen(true)
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  const filteredClinics = clinics.filter(clinic => {
    const matchesSearch = clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clinic.slug.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "" || clinic.status === filterStatus
    const matchesPlan = filterPlan === "" || clinic.planType === filterPlan
    return matchesSearch && matchesStatus && matchesPlan
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium"
      case "suspended":
        return "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium"
      case "inactive":
        return "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium"
      default:
        return "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium"
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "basic":
        return "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
      case "professional":
        return "bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium"
      case "enterprise":
        return "bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium"
      default:
        return "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium"
    }
  }

  const formatStatus = (status: string) => {
    switch (status) {
      case "active": return "Ativa"
      case "suspended": return "Suspensa"
      case "inactive": return "Inativa"
      default: return status
    }
  }

  const formatPlan = (plan: string) => {
    switch (plan) {
      case "basic": return "Basico"
      case "professional": return "Profissional"
      case "enterprise": return "Empresarial"
      default: return plan
    }
  }

  // Stats calculation
  const totalClinics = clinics.length
  const activeClinics = clinics.filter(c => c.status === "active").length
  const totalUsers = clinics.reduce((sum, c) => sum + (c.totalUsers || 0), 0)
  const totalRevenue = clinics.reduce((sum, c) => sum + (c.monthlyRevenue || 0), 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-800">Gestao de Clinicas</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestao de Clinicas</h1>
          <p className="text-slate-600 mt-1">Gerencie todas as clinicas da plataforma</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          + Nova Clinica
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total de Clinicas</p>
              <p className="text-2xl font-bold text-slate-900">{totalClinics}</p>
              <p className="text-xs text-slate-500">{activeClinics} ativas</p>
            </div>
            <div className="text-2xl">🏢</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Usuarios Ativos</p>
              <p className="text-2xl font-bold text-slate-900">{totalUsers}</p>
              <p className="text-xs text-slate-500">Em todas as clinicas</p>
            </div>
            <div className="text-2xl">👥</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Receita Total</p>
              <p className="text-2xl font-bold text-slate-900">
                R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500">Receita mensal</p>
            </div>
            <div className="text-2xl">💰</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Taxa de Atividade</p>
              <p className="text-2xl font-bold text-slate-900">
                {totalClinics > 0 ? ((activeClinics / totalClinics) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-xs text-slate-500">Clinicas ativas</p>
            </div>
            <div className="text-2xl">📈</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Buscar clinica</Label>
            <Input
              placeholder="Nome ou slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Filtrar por status</Label>
            <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="suspended">Suspensa</SelectItem>
                <SelectItem value="inactive">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Filtrar por plano</Label>
            <Select value={filterPlan || "all"} onValueChange={(v) => setFilterPlan(v === "all" ? "" : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Todos os planos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os planos</SelectItem>
                <SelectItem value="basic">Basico</SelectItem>
                <SelectItem value="professional">Profissional</SelectItem>
                <SelectItem value="enterprise">Empresarial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setFilterStatus("")
                setFilterPlan("")
              }}
              className="w-full"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Clinics List */}
      <div className="grid gap-6">
        {filteredClinics.length === 0 ? (
          <div className="bg-white p-12 rounded-lg border border-slate-200 text-center">
            <p className="text-slate-500">
              {clinics.length === 0 ? "Nenhuma clinica cadastrada" : "Nenhuma clinica corresponde aos filtros"}
            </p>
          </div>
        ) : (
          filteredClinics.map((clinic) => (
            <div key={clinic.id} className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold text-slate-900">{clinic.name}</h3>
                  <p className="text-sm text-slate-600">Proprietario: {clinic.ownerName || "N/A"}</p>
                  <p className="text-sm text-slate-500">/{clinic.slug}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <span className={getStatusColor(clinic.status)}>
                    {formatStatus(clinic.status)}
                  </span>
                  <span className={getPlanColor(clinic.planType)}>
                    {formatPlan(clinic.planType)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-600">Usuarios</p>
                  <p className="text-2xl font-semibold text-slate-900">{clinic.totalUsers || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-600">Limites</p>
                  <p className="text-sm text-slate-700">
                    {clinic.maxPsychologists} psicologos / {clinic.maxPatients} pacientes
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-600">Receita Mensal</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    R$ {(clinic.monthlyRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openDetailModal(clinic)}>
                      Ver Detalhes
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditModal(clinic)}>
                      Configurar
                    </Button>
                  </div>
                  <Button
                    variant={clinic.status === "active" ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleStatus(clinic)}
                  >
                    {clinic.status === "active" ? "Suspender" : "Ativar"}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false)
          setIsEditModalOpen(false)
          setSelectedClinic(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditModalOpen ? "Editar Clinica" : "Nova Clinica"}</DialogTitle>
            <DialogDescription>
              {isEditModalOpen ? "Atualize as informacoes da clinica" : "Preencha os dados para criar uma nova clinica"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome da Clinica *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: isCreateModalOpen ? generateSlug(e.target.value) : formData.slug
                    })
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descricao</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="planType">Plano</Label>
                <Select value={formData.planType} onValueChange={(value) => setFormData({ ...formData, planType: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basico</SelectItem>
                    <SelectItem value="professional">Profissional</SelectItem>
                    <SelectItem value="enterprise">Empresarial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="suspended">Suspensa</SelectItem>
                    <SelectItem value="inactive">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="maxUsers">Max. Usuarios</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={formData.maxUsers}
                  onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="maxPsychologists">Max. Psicologos</Label>
                <Input
                  id="maxPsychologists"
                  type="number"
                  value={formData.maxPsychologists}
                  onChange={(e) => setFormData({ ...formData, maxPsychologists: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="maxPatients">Max. Pacientes</Label>
                <Input
                  id="maxPatients"
                  type="number"
                  value={formData.maxPatients}
                  onChange={(e) => setFormData({ ...formData, maxPatients: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateModalOpen(false)
              setIsEditModalOpen(false)
              setSelectedClinic(null)
              resetForm()
            }}>
              Cancelar
            </Button>
            <Button onClick={isEditModalOpen ? handleUpdateClinic : handleCreateClinic} disabled={saving}>
              {saving ? "Salvando..." : isEditModalOpen ? "Salvar Alteracoes" : "Criar Clinica"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDetailModalOpen(false)
          setSelectedClinic(null)
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Clinica</DialogTitle>
          </DialogHeader>

          {selectedClinic && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Nome</p>
                  <p className="font-medium">{selectedClinic.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Slug</p>
                  <p className="font-medium">/{selectedClinic.slug}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500">Descricao</p>
                <p className="font-medium">{selectedClinic.description || "Sem descricao"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium">{selectedClinic.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Telefone</p>
                  <p className="font-medium">{selectedClinic.phone || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Website</p>
                  <p className="font-medium">{selectedClinic.website || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">CNPJ</p>
                  <p className="font-medium">{selectedClinic.cnpj || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <span className={getStatusColor(selectedClinic.status)}>
                    {formatStatus(selectedClinic.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Plano</p>
                  <span className={getPlanColor(selectedClinic.planType)}>
                    {formatPlan(selectedClinic.planType)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Criado em</p>
                  <p className="font-medium">{new Date(selectedClinic.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Max. Usuarios</p>
                  <p className="text-xl font-bold">{selectedClinic.maxUsers}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Max. Psicologos</p>
                  <p className="text-xl font-bold">{selectedClinic.maxPsychologists}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Max. Pacientes</p>
                  <p className="text-xl font-bold">{selectedClinic.maxPatients}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setIsDetailModalOpen(false)
              if (selectedClinic) openEditModal(selectedClinic)
            }}>
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
