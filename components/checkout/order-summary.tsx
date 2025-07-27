"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Check, Clock, Shield, CreditCard, Sparkles } from "lucide-react"

interface Plan {
  id: string
  name: string
  price: number
  period: string
  description: string
  features: string[]
  isPopular?: boolean
}

interface OrderSummaryProps {
  plan: Plan | null
  paymentMethod: string
}

const paymentMethodNames = {
  credit_card: "Cartão de Crédito",
  pix: "PIX",
  debit_card: "Cartão de Débito",
  bank_slip: "Boleto Bancário"
}

export function OrderSummary({ plan, paymentMethod }: OrderSummaryProps) {
  const formatPrice = (price: number, discount?: number) => {
    const finalPrice = discount ? price * (1 - discount / 100) : price
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(finalPrice)
  }

  const getPixDiscount = (method: string, price: number) => {
    if (method === "pix") {
      return price * 0.05 // 5% de desconto
    }
    return 0
  }

  const getFinalPrice = (price: number, method: string) => {
    const discount = getPixDiscount(method, price)
    return price - discount
  }

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            Resumo do Pedido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-slate-500 py-8">
            Selecione um plano para ver o resumo
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-600" />
          Resumo do Pedido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plano Selecionado */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-800">Plano {plan.name}</h3>
              {plan.isPopular && (
                <Badge className="bg-orange-500 text-white text-xs mt-1">
                  Mais Popular
                </Badge>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-900">
                {formatPrice(plan.price)}
              </p>
              <p className="text-xs text-slate-500">por {plan.period}</p>
            </div>
          </div>
          
          <p className="text-sm text-slate-600">{plan.description}</p>
        </div>

        <Separator />

        {/* Recursos Inclusos */}
        <div className="space-y-3">
          <h4 className="font-medium text-slate-800 text-sm">Recursos Inclusos:</h4>
          <ul className="space-y-2">
            {plan.features.slice(0, 4).map((feature, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Check className="w-3 h-3 text-teal-500 mt-1 flex-shrink-0" />
                <span className="text-slate-600">{feature}</span>
              </li>
            ))}
            {plan.features.length > 4 && (
              <li className="text-xs text-slate-500 ml-5">
                +{plan.features.length - 4} recursos adicionais
              </li>
            )}
          </ul>
        </div>

        <Separator />

        {/* Método de Pagamento */}
        {paymentMethod && (
          <div className="space-y-2">
            <h4 className="font-medium text-slate-800 text-sm">Método de Pagamento:</h4>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">
                {paymentMethodNames[paymentMethod as keyof typeof paymentMethodNames] || paymentMethod}
              </span>
            </div>
          </div>
        )}

        <Separator />

        {/* Cálculo do Preço */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Subtotal:</span>
            <span className="text-sm font-medium">{formatPrice(plan.price)}</span>
          </div>

          {paymentMethod === "pix" && (
            <div className="flex justify-between items-center text-green-600">
              <span className="text-sm">Desconto PIX (5%):</span>
              <span className="text-sm font-medium">
                -{formatPrice(getPixDiscount(paymentMethod, plan.price))}
              </span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between items-center">
            <span className="font-medium">Total:</span>
            <div className="text-right">
              <span className="text-xl font-bold text-teal-600">
                {formatPrice(getFinalPrice(plan.price, paymentMethod))}
              </span>
              <p className="text-xs text-slate-500">por {plan.period}</p>
            </div>
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="bg-slate-50 p-3 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="w-3 h-3" />
            <span>Cobrança recorrente mensal</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Shield className="w-3 h-3" />
            <span>Cancele a qualquer momento</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Check className="w-3 h-3" />
            <span>7 dias de teste grátis</span>
          </div>
        </div>

        {/* Garantia */}
        <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Garantia de 30 dias
            </span>
          </div>
          <p className="text-xs text-green-700">
            Se não ficar satisfeito, devolvemos 100% do seu dinheiro
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 