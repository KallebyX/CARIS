"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  Banknote,
  Clock,
  CheckCircle,
  Zap
} from "lucide-react"

interface Plan {
  id: string
  name: string
  price: number
  period: string
}

interface PaymentMethodsProps {
  selectedMethod: string
  onMethodSelect: (method: string) => void
  plan: Plan
}

const paymentMethods = [
  {
    id: "credit_card",
    name: "Cartão de Crédito",
    description: "Visa, Mastercard, American Express",
    icon: CreditCard,
    processing: "Aprovação instantânea",
    recommended: true,
    color: "blue"
  },
  {
    id: "pix",
    name: "PIX",
    description: "Pagamento instantâneo",
    icon: Zap,
    processing: "Confirmação em segundos",
    discount: 5,
    color: "green"
  },
  {
    id: "debit_card",
    name: "Cartão de Débito",
    description: "Débito em conta corrente",
    icon: Smartphone,
    processing: "Aprovação instantânea",
    color: "purple"
  },
  {
    id: "bank_slip",
    name: "Boleto Bancário",
    description: "Vencimento em 3 dias úteis",
    icon: Building2,
    processing: "Aprovação em até 3 dias úteis",
    color: "orange"
  }
]

export function PaymentMethods({ selectedMethod, onMethodSelect, plan }: PaymentMethodsProps) {
  const formatPrice = (price: number, discount?: number) => {
    const finalPrice = discount ? price * (1 - discount / 100) : price
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(finalPrice)
  }

  const getIconColor = (color: string) => {
    const colors = {
      blue: "text-blue-500",
      green: "text-green-500",
      purple: "text-purple-500",
      orange: "text-orange-500"
    }
    return colors[color as keyof typeof colors] || "text-gray-500"
  }

  const getBorderColor = (color: string, isSelected: boolean) => {
    if (isSelected) return "border-teal-500 ring-2 ring-teal-500"
    
    const colors = {
      blue: "border-blue-200 hover:border-blue-300",
      green: "border-green-200 hover:border-green-300",
      purple: "border-purple-200 hover:border-purple-300",
      orange: "border-orange-200 hover:border-orange-300"
    }
    return colors[color as keyof typeof colors] || "border-gray-200 hover:border-gray-300"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-teal-600" />
          Método de Pagamento
        </CardTitle>
        <CardDescription>
          Escolha como você prefere pagar sua assinatura do plano {plan.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo do plano */}
        <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-teal-800">Plano {plan.name}</p>
              <p className="text-sm text-teal-600">Cobrança mensal</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-teal-800">
                {formatPrice(plan.price)}
              </p>
              <p className="text-sm text-teal-600">por mês</p>
            </div>
          </div>
        </div>

        {/* Métodos de pagamento */}
        <div className="grid md:grid-cols-2 gap-4">
          {paymentMethods.map((method) => (
            <Card
              key={method.id}
              className={`cursor-pointer transition-all hover:shadow-md relative ${getBorderColor(
                method.color,
                selectedMethod === method.id
              )}`}
              onClick={() => onMethodSelect(method.id)}
            >
              {method.recommended && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-green-500 text-white text-xs">
                    Recomendado
                  </Badge>
                </div>
              )}

              {method.discount && (
                <div className="absolute -top-2 -left-2">
                  <Badge className="bg-orange-500 text-white text-xs">
                    -{method.discount}%
                  </Badge>
                </div>
              )}

              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <method.icon className={`w-6 h-6 mt-1 ${getIconColor(method.color)}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-800">{method.name}</h3>
                      {selectedMethod === method.id && (
                        <CheckCircle className="w-4 h-4 text-teal-500" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{method.description}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {method.processing}
                    </div>
                    
                    {method.discount && (
                      <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                        <p className="text-xs text-orange-700 font-medium">
                          Valor com desconto: {formatPrice(plan.price, method.discount)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Informações de segurança */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
          <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Pagamento Seguro via MercadoPago
          </h4>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>• Seus dados são protegidos com criptografia SSL</li>
            <li>• Não armazenamos informações do seu cartão</li>
            <li>• Processamento 100% seguro</li>
            <li>• Cancele a qualquer momento</li>
          </ul>
        </div>

        {selectedMethod && (
          <div className="mt-4">
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700"
              size="lg"
              onClick={() => {
                // A validação será feita no próximo passo
              }}
            >
              Continuar com {paymentMethods.find(m => m.id === selectedMethod)?.name}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 