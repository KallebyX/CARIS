"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Sparkles } from "lucide-react"

interface Plan {
  id: string
  name: string
  price: number
  period: string
  description: string
  features: string[]
  isPopular?: boolean
}

interface PlanSelectorProps {
  plans: Plan[]
  selectedPlan: Plan | null
  onPlanSelect: (plan: Plan) => void
}

export function PlanSelector({ plans, selectedPlan, onPlanSelect }: PlanSelectorProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-600" />
          Escolha seu Plano
        </CardTitle>
        <CardDescription>
          Selecione o plano que melhor se adapta às suas necessidades
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedPlan?.id === plan.id
                  ? "ring-2 ring-teal-500 border-teal-500"
                  : plan.isPopular
                  ? "border-teal-200 shadow-md"
                  : "border-gray-200"
              }`}
              onClick={() => onPlanSelect(plan)}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white px-3 py-1">
                    Mais Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm h-12 flex items-center justify-center">
                  {plan.description}
                </CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {formatPrice(plan.price)}
                  </span>
                  <span className="text-slate-500">/{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className={`w-full transition-colors ${
                    selectedPlan?.id === plan.id
                      ? "bg-teal-600 hover:bg-teal-700 text-white"
                      : plan.isPopular
                      ? "bg-teal-600 hover:bg-teal-700 text-white"
                      : "bg-transparent border-teal-600 text-teal-600 hover:bg-teal-50"
                  }`}
                  variant={
                    selectedPlan?.id === plan.id || plan.isPopular
                      ? "default"
                      : "outline"
                  }
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlanSelect(plan)
                  }}
                >
                  {selectedPlan?.id === plan.id ? "Selecionado" : "Selecionar Plano"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {selectedPlan && (
          <div className="mt-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
            <div className="flex items-center gap-2 text-teal-800">
              <Check className="w-5 h-5" />
              <span className="font-medium">
                Plano {selectedPlan.name} selecionado - {formatPrice(selectedPlan.price)}/{selectedPlan.period}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 