"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StripeCheckout } from "@/components/checkout/stripe-checkout"
import { CheckoutForm } from "@/components/checkout/checkout-form"
import { PlanSelector } from "@/components/checkout/plan-selector"
import { PaymentMethods } from "@/components/checkout/payment-methods"
import { OrderSummary } from "@/components/checkout/order-summary"
import { CheckoutProgress } from "@/components/checkout/checkout-progress"
import { ShieldCheck, CreditCard, Smartphone, Building2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Plan {
  id: string
  name: string
  price: number
  period: string
  description: string
  features: string[]
  isPopular?: boolean
}

interface CheckoutData {
  plan: Plan | null
  paymentMethod: string
  customerData: {
    name: string
    email: string
    document: string
    phone: string
  }
  billingData: {
    address: string
    city: string
    state: string
    zipCode: string
  }
}

const plans: Plan[] = [
  {
    id: "essential",
    name: "Essencial",
    price: 79,
    period: "mês",
    description: "Para psicólogos autônomos que estão começando",
    features: [
      "Até 10 pacientes ativos",
      "Agenda e Prontuário Eletrônico",
      "Diário Emocional e Mapa Básico",
      "Videoterapia Integrada",
      "Suporte por e-mail"
    ]
  },
  {
    id: "professional",
    name: "Profissional",
    price: 129,
    period: "mês",
    description: "A solução completa para escalar sua prática",
    features: [
      "Pacientes ilimitados",
      "Tudo do plano Essencial",
      "Mapa Emocional com IA Preditiva",
      "Gamificação e Prescrição de Tarefas",
      "Relatórios Avançados",
      "Suporte Prioritário via Chat"
    ],
    isPopular: true
  },
  {
    id: "clinic",
    name: "Clínica",
    price: 299,
    period: "mês",
    description: "Para clínicas e equipes com múltiplos terapeutas",
    features: [
      "Tudo do plano Profissional",
      "Gestão de múltiplos psicólogos",
      "Faturamento centralizado",
      "Dashboard administrativo",
      "Opções de White-label",
      "Gerente de conta dedicado"
    ]
  }
]

function CheckoutPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [useStripe, setUseStripe] = useState(true) // Default to Stripe
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<{
    id?: number
    email?: string
    name?: string
  }>({})

  // Legacy checkout system state (keeping for backward compatibility)
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    plan: null,
    paymentMethod: "",
    customerData: {
      name: "",
      email: "",
      document: "",
      phone: ""
    },
    billingData: {
      address: "",
      city: "",
      state: "",
      zipCode: ""
    }
  })

  // Check for cancellation or error parameters
  useEffect(() => {
    const cancelled = searchParams.get("cancelled")
    const error = searchParams.get("error")
    const upgrade = searchParams.get("upgrade")

    if (cancelled) {
      toast({
        title: "Checkout Cancelado",
        description: "Você cancelou o processo de pagamento. Seus dados foram preservados.",
        variant: "destructive",
      })
    }

    if (error) {
      toast({
        title: "Erro no Checkout",
        description: "Ocorreu um erro durante o pagamento. Tente novamente.",
        variant: "destructive",
      })
    }

    if (upgrade) {
      toast({
        title: "Alterar Plano",
        description: "Selecione seu novo plano abaixo.",
      })
    }

    // Get user info from cookie or session
    fetchUserInfo()
  }, [searchParams, toast])

  useEffect(() => {
    // Verificar se há um plano pré-selecionado na URL
    const planId = searchParams.get("plan")
    if (planId) {
      const selectedPlan = plans.find(p => p.id === planId)
      if (selectedPlan) {
        setCheckoutData(prev => ({ ...prev, plan: selectedPlan }))
        setCurrentStep(2) // Pular para a seleção de método de pagamento
      }
    }
  }, [searchParams])

  const fetchUserInfo = async () => {
    try {
      // This would normally come from your auth system
      // For now, we'll use placeholder data
      setUserInfo({
        id: 1,
        email: "user@example.com",
        name: "Usuário Teste"
      })
    } catch (error) {
      console.error("Error fetching user info:", error)
    }
  }

  // If using Stripe (recommended), show the new Stripe checkout
  if (useStripe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Finalize sua Assinatura
            </h1>
            <p className="text-slate-600">
              Escolha seu plano e comece a transformar sua prática hoje mesmo
            </p>
          </div>

          {/* Payment Method Toggle */}
          <div className="max-w-md mx-auto mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Stripe</span>
                    <Badge className="bg-green-100 text-green-800">Recomendado</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUseStripe(false)}
                  >
                    Usar Sistema Antigo
                  </Button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Pagamento mais seguro e confiável com processamento internacional
                </p>
              </CardContent>
            </Card>
          </div>

          <StripeCheckout 
            userId={userInfo.id}
            userEmail={userInfo.email}
            userName={userInfo.name}
          />
        </div>
      </div>
    )
  }

  const handlePlanSelect = (plan: Plan) => {
    setCheckoutData(prev => ({ ...prev, plan }))
    setCurrentStep(2)
  }

  const handlePaymentMethodSelect = (method: string) => {
    setCheckoutData(prev => ({ ...prev, paymentMethod: method }))
    setCurrentStep(3)
  }

  const handleCustomerDataSubmit = (customerData: CheckoutData["customerData"], billingData: CheckoutData["billingData"]) => {
    setCheckoutData(prev => ({ ...prev, customerData, billingData }))
    setCurrentStep(4)
  }

  const handlePayment = async () => {
    if (!checkoutData.plan || !checkoutData.paymentMethod) {
      toast({
        title: "Erro",
        description: "Dados incompletos. Verifique suas informações.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    
    try {
      // Integração com MercadoPago MCP (Legacy)
      const response = await fetch("/api/checkout/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: checkoutData.plan,
          paymentMethod: checkoutData.paymentMethod,
          customer: checkoutData.customerData,
          billing: checkoutData.billingData
        })
      })

      const result = await response.json()

      if (result.success) {
        // Redirecionar para página de sucesso ou processar pagamento
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl
        } else {
          router.push(`/checkout/success?payment=${result.paymentId}`)
        }
      } else {
        throw new Error(result.error || "Erro ao processar pagamento")
      }
    } catch (error) {
      console.error("Erro no checkout:", error)
      toast({
        title: "Erro no Pagamento",
        description: "Não foi possível processar seu pagamento. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Finalize sua Assinatura
          </h1>
          <p className="text-slate-600">
            Escolha seu plano e comece a transformar sua prática hoje mesmo
          </p>
        </div>

        {/* Progress Indicator */}
        <CheckoutProgress currentStep={currentStep} />

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto mt-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {currentStep === 1 && (
              <PlanSelector 
                plans={plans} 
                selectedPlan={checkoutData.plan}
                onPlanSelect={handlePlanSelect} 
              />
            )}

            {currentStep === 2 && checkoutData.plan && (
              <PaymentMethods 
                selectedMethod={checkoutData.paymentMethod}
                onMethodSelect={handlePaymentMethodSelect}
                plan={checkoutData.plan}
              />
            )}

            {currentStep === 3 && (
              <CheckoutForm 
                customerData={checkoutData.customerData}
                billingData={checkoutData.billingData}
                onSubmit={handleCustomerDataSubmit}
              />
            )}

            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    Confirmar Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Resumo final */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Plano selecionado:</span>
                      <span className="font-medium">{checkoutData.plan?.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Método de pagamento:</span>
                      <span className="font-medium">{checkoutData.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Cliente:</span>
                      <span className="font-medium">{checkoutData.customerData.name}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-teal-600">
                        R$ {checkoutData.plan?.price.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>

                  <Button 
                    onClick={handlePayment}
                    disabled={loading}
                    className="w-full bg-teal-600 hover:bg-teal-700"
                    size="lg"
                  >
                    {loading ? "Processando..." : "Finalizar Pagamento"}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <ShieldCheck className="w-3 h-3" />
                    Pagamento seguro via MercadoPago
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary 
              plan={checkoutData.plan}
              paymentMethod={checkoutData.paymentMethod}
            />
            
            {/* Security Features */}
            <Card className="mt-6">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-slate-600">Pagamento 100% seguro</span>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-slate-600">Cartões aceitos</span>
                </div>
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-purple-500" />
                  <span className="text-sm text-slate-600">PIX instantâneo</span>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-slate-600">Boleto bancário</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <CheckoutPageContent />
    </Suspense>
  )
} 