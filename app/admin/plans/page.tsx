"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2 } from "lucide-react"

const plans = [
  {
    name: "Essencial",
    price: "R$ 79/mês",
    activeUsers: 450,
    features: "Até 10 pacientes, Agenda, Prontuário",
    isPublic: true,
  },
  {
    name: "Profissional",
    price: "R$ 129/mês",
    activeUsers: 834,
    features: "Pacientes ilimitados, IA Preditiva, Relatórios",
    isPublic: true,
  },
  {
    name: "Clínica",
    price: "Personalizado",
    activeUsers: 56,
    features: "Múltiplos psicólogos, White-label, Faturamento",
    isPublic: true,
  },
  {
    name: "Parceiro Corporativo",
    price: "Sob Contrato",
    activeUsers: 12,
    features: "API, Suporte dedicado",
    isPublic: false,
  },
]

export default function AdminPlansPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gerenciamento de Planos</h1>
          <p className="text-slate-600">Crie e edite os planos de assinatura da plataforma.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Criar Novo Plano
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="font-bold text-caris-teal text-lg">{plan.price}</p>
                </div>
                <Badge variant={plan.isPublic ? "default" : "secondary"}>{plan.isPublic ? "Público" : "Privado"}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-4">{plan.features}</p>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-md">
                <span className="text-sm font-medium">Usuários Ativos</span>
                <span className="font-bold">{plan.activeUsers}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
