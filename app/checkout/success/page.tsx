"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ArrowRight, Download, Mail, Smartphone } from "lucide-react"
import { Confetti } from "@/components/ui/confetti"

interface PaymentDetails {
  id: string
  status: string
  amount: number
  paymentMethod: string
  plan: string
  date: string
}

function CheckoutSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const paymentId = searchParams.get("payment")
    
    if (paymentId) {
      // Simular busca dos detalhes do pagamento
      setTimeout(() => {
        setPaymentDetails({
          id: paymentId,
          status: "approved",
          amount: 129,
          paymentMethod: "Cartão de Crédito",
          plan: "Profissional", 
          date: new Date().toLocaleDateString("pt-BR")
        })
        setLoading(false)
      }, 1000)
    } else {
      setLoading(false)
    }
  }, [searchParams])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">Processando seu pagamento...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!paymentDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-slate-600 mb-4">Pagamento não encontrado</p>
            <Button onClick={() => router.push("/")} variant="outline">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50">
      <Confetti />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header de Sucesso */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                🎉 Pagamento Aprovado!
              </h1>
              <p className="text-lg text-slate-600">
                Bem-vindo ao Caris SaaS Pro! Sua assinatura está ativa.
              </p>
            </div>
          </div>

          {/* Detalhes do Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Detalhes do Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">ID do Pagamento</p>
                  <p className="font-medium">{paymentDetails.id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge className="bg-green-500 text-white">
                    {paymentDetails.status === "approved" ? "Aprovado" : paymentDetails.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Plano Selecionado</p>
                  <p className="font-medium">Plano {paymentDetails.plan}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Valor Pago</p>
                  <p className="font-medium text-teal-600 text-lg">
                    {formatCurrency(paymentDetails.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Método de Pagamento</p>
                  <p className="font-medium">{paymentDetails.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Data do Pagamento</p>
                  <p className="font-medium">{paymentDetails.date}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Próximos Passos */}
          <Card>
            <CardHeader>
              <CardTitle>🚀 Próximos Passos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
                  <Mail className="w-5 h-5 text-teal-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-teal-800">
                      Verifique seu e-mail
                    </p>
                    <p className="text-sm text-teal-600">
                      Enviamos instruções de acesso e sua fatura por e-mail
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Smartphone className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">
                      Configure seu perfil
                    </p>
                    <p className="text-sm text-blue-600">
                      Complete suas informações profissionais no dashboard
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">
                      Comece a usar
                    </p>
                    <p className="text-sm text-green-600">
                      Acesse todas as funcionalidades do seu plano agora mesmo
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações Importantes */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-medium text-slate-800">📋 Informações Importantes</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Sua assinatura renova automaticamente todo mês</li>
                <li>• Você pode cancelar a qualquer momento sem multa</li>
                <li>• Suporte prioritário disponível via chat</li>
                <li>• Todos os dados são protegidos com criptografia</li>
                <li>• Garantia de 30 dias - satisfação total ou dinheiro de volta</li>
              </ul>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={() => router.push("/dashboard")}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              size="lg"
            >
              Acessar Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <Button
              onClick={() => window.open(`/api/invoice/${paymentDetails.id}/download`, '_blank')}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Recibo
            </Button>
          </div>

          {/* Suporte */}
          <div className="text-center pt-8">
            <p className="text-slate-600 mb-2">
              Precisa de ajuda? Nossa equipe está aqui para você!
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="ghost" size="sm">
                💬 Chat de Suporte
              </Button>
              <Button variant="ghost" size="sm">
                📧 Enviar E-mail
              </Button>
              <Button variant="ghost" size="sm">
                📞 WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
} 