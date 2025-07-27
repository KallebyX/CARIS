"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CheckCircle, Crown, Building2, Users, Zap, Shield } from "lucide-react"
import { getAllPlans, formatPrice } from "@/lib/stripe"
import { useToast } from "@/hooks/use-toast"

interface Plan {
  id: string
  name: string
  description: string
  priceMonthly: number
  priceYearly?: number
  features: string[]
  maxPatients: number | null
  isPopular: boolean
}

interface StripeCheckoutProps {
  userId?: number
  userEmail?: string
  userName?: string
}

export function StripeCheckout({ userId, userEmail, userName }: StripeCheckoutProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isYearly, setIsYearly] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const plans = getAllPlans()

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
  }

  const handleCheckout = async () => {
    if (!selectedPlan) {
      toast({
        title: "Selecione um plano",
        description: "Por favor, selecione um plano antes de continuar.",
        variant: "destructive",
      })
      return
    }

    if (!userEmail) {
      toast({
        title: "Erro de autenticação",
        description: "É necessário estar logado para fazer uma assinatura.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/stripe/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan,
          interval: isYearly ? 'yearly' : 'monthly',
          email: userEmail,
          name: userName,
        }),
      })

      const result = await response.json()

      if (result.success && result.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = result.sessionUrl
      } else {
        throw new Error(result.error || 'Erro ao criar sessão de checkout')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast({
        title: "Erro no checkout",
        description: "Não foi possível iniciar o processo de pagamento. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getPlanPrice = (plan: Plan) => {
    const price = isYearly && plan.priceYearly ? plan.priceYearly : plan.priceMonthly
    return formatPrice(price)
  }

  const getPlanPeriod = () => {
    return isYearly ? "ano" : "mês"
  }

  const getYearlySavings = (plan: Plan) => {
    if (!plan.priceYearly) return 0
    const monthlyTotal = plan.priceMonthly * 12
    const savings = monthlyTotal - plan.priceYearly
    return savings
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          Escolha seu Plano
        </h1>
        <p className="text-xl text-slate-600 mb-6">
          Comece sua jornada para transformar sua prática psicológica
        </p>
        
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Label htmlFor="billing-toggle" className="text-slate-600">
            Mensal
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label htmlFor="billing-toggle" className="text-slate-600">
            Anual
            <Badge variant="secondary" className="ml-2 text-teal-600">
              2 meses grátis
            </Badge>
          </Label>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-8">
        {plans.map((plan) => (
          <Card 
            key={plan.id}
            className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedPlan === plan.id 
                ? 'ring-2 ring-teal-500 shadow-lg' 
                : 'hover:shadow-md'
            } ${
              plan.isPopular 
                ? 'border-teal-200 bg-gradient-to-b from-teal-50 to-white' 
                : 'border-slate-200'
            }`}
            onClick={() => handlePlanSelect(plan.id)}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-1">
                  <Crown className="w-3 h-3 mr-1" />
                  Mais Popular
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <div className="mb-4">
                {plan.id === 'essential' && <Users className="w-8 h-8 mx-auto text-blue-500" />}
                {plan.id === 'professional' && <Zap className="w-8 h-8 mx-auto text-teal-500" />}
                {plan.id === 'clinic' && <Building2 className="w-8 h-8 mx-auto text-purple-500" />}
              </div>
              
              <CardTitle className="text-2xl font-bold text-slate-800">
                {plan.name}
              </CardTitle>
              
              <p className="text-slate-600 text-sm mt-2">
                {plan.description}
              </p>

              <div className="mt-4">
                <div className="text-4xl font-bold text-slate-800">
                  {getPlanPrice(plan)}
                </div>
                <div className="text-slate-500 text-sm">
                  por {getPlanPeriod()}
                </div>
                {isYearly && plan.priceYearly && getYearlySavings(plan) > 0 && (
                  <div className="text-teal-600 text-sm mt-1">
                    Economize {formatPrice(getYearlySavings(plan))} por ano
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.maxPatients && (
                <div className="text-sm text-slate-500 mb-4">
                  Até {plan.maxPatients} pacientes ativos
                </div>
              )}

              <Button
                className={`w-full ${
                  selectedPlan === plan.id
                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                    : plan.isPopular
                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  handlePlanSelect(plan.id)
                }}
              >
                {selectedPlan === plan.id ? 'Selecionado' : 'Selecionar Plano'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Checkout Button */}
      {selectedPlan && (
        <div className="text-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-lg text-slate-800 mb-2">
                  Plano Selecionado
                </h3>
                <div className="text-2xl font-bold text-teal-600">
                  {plans.find(p => p.id === selectedPlan)?.name}
                </div>
                <div className="text-slate-600">
                  {getPlanPrice(plans.find(p => p.id === selectedPlan)!)} por {getPlanPeriod()}
                </div>
              </div>

              <Separator className="my-4" />

              <Button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3"
                size="lg"
              >
                {loading ? "Processando..." : "Finalizar Assinatura"}
              </Button>

              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-500">
                <Shield className="w-3 h-3" />
                Pagamento seguro via Stripe
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Features */}
      <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
        <div className="text-center">
          <Shield className="w-8 h-8 mx-auto text-teal-500 mb-2" />
          <h4 className="font-semibold text-slate-800 mb-2">Pagamento Seguro</h4>
          <p className="text-sm text-slate-600">
            Processado pelo Stripe com criptografia de nível bancário
          </p>
        </div>
        <div className="text-center">
          <CheckCircle className="w-8 h-8 mx-auto text-teal-500 mb-2" />
          <h4 className="font-semibold text-slate-800 mb-2">Sem Compromisso</h4>
          <p className="text-sm text-slate-600">
            Cancele a qualquer momento sem taxas adicionais
          </p>
        </div>
        <div className="text-center">
          <Zap className="w-8 h-8 mx-auto text-teal-500 mb-2" />
          <h4 className="font-semibold text-slate-800 mb-2">Ativação Imediata</h4>
          <p className="text-sm text-slate-600">
            Acesso instantâneo após confirmação do pagamento
          </p>
        </div>
      </div>
    </div>
  )
}