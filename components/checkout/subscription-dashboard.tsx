"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  CreditCard, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Calendar,
  DollarSign,
  RefreshCw,
  Settings
} from "lucide-react"
import { formatPrice } from "@/lib/stripe"
import { useToast } from "@/hooks/use-toast"

interface Subscription {
  id: string
  status: string
  planId: string
  planName: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
}

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  amountDue: number
  amountPaid: number
  currency: string
  description: string
  dueDate: string | null
  paidAt: string | null
  invoiceUrl: string | null
  downloadUrl: string | null
  createdAt: string
}

interface PaymentMethod {
  id: string
  type: string
  card: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  } | null
}

interface PaymentFailure {
  id: string
  failureCode: string | null
  failureMessage: string | null
  retryCount: number
  nextRetryAt: string | null
  resolvedAt: string | null
  createdAt: string
}

interface BillingData {
  subscription: Subscription | null
  invoices: Invoice[]
  paymentMethods: PaymentMethod[]
  paymentFailures: PaymentFailure[]
}

export function SubscriptionDashboard() {
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      const response = await fetch('/api/stripe/billing')
      if (response.ok) {
        const data = await response.json()
        setBillingData(data)
      } else {
        throw new Error('Failed to fetch billing data')
      }
    } catch (error) {
      console.error('Error fetching billing data:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de faturamento.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubscriptionAction = async (action: string, params?: any) => {
    setActionLoading(action)
    
    try {
      const response = await fetch('/api/stripe/subscriptions/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Sucesso",
          description: result.message,
        })
        await fetchBillingData() // Refresh data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Subscription action error:', error)
      toast({
        title: "Erro",
        description: "Não foi possível executar a ação. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const retryPayment = async (invoiceId: string) => {
    setActionLoading(`retry-${invoiceId}`)
    
    try {
      const response = await fetch('/api/stripe/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry_payment', invoiceId }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Sucesso",
          description: "Tentativa de pagamento iniciada.",
        })
        await fetchBillingData()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Retry payment error:', error)
      toast({
        title: "Erro",
        description: "Não foi possível tentar o pagamento novamente.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "bg-green-100 text-green-800", label: "Ativo" },
      canceled: { color: "bg-red-100 text-red-800", label: "Cancelado" },
      past_due: { color: "bg-yellow-100 text-yellow-800", label: "Em Atraso" },
      incomplete: { color: "bg-orange-100 text-orange-800", label: "Incompleto" },
      trialing: { color: "bg-blue-100 text-blue-800", label: "Teste" },
      unpaid: { color: "bg-red-100 text-red-800", label: "Não Pago" },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { color: "bg-gray-100 text-gray-800", label: status }
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const getInvoiceStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'open':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'void':
      case 'uncollectible':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!billingData?.subscription) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <CreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Nenhuma Assinatura Ativa
            </h3>
            <p className="text-gray-500 mb-6">
              Você ainda não possui uma assinatura ativa. Escolha um plano para começar.
            </p>
            <Button 
              onClick={() => window.location.href = '/checkout'}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Ver Planos Disponíveis
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { subscription, invoices, paymentMethods, paymentFailures } = billingData

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Gerenciar Assinatura</h1>
        <Button 
          variant="outline" 
          onClick={fetchBillingData}
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Subscription Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Plano Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-teal-600">
                {subscription.planName}
              </div>
              {getStatusBadge(subscription.status)}
              {subscription.cancelAtPeriodEnd && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sua assinatura será cancelada em{' '}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Período Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Início:</div>
              <div className="font-medium">
                {new Date(subscription.currentPeriodStart).toLocaleDateString('pt-BR')}
              </div>
              <div className="text-sm text-gray-600">Renovação:</div>
              <div className="font-medium">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Próxima Cobrança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoices.length > 0 && (
                <>
                  <div className="text-2xl font-bold text-gray-800">
                    {formatPrice(invoices[0].amountDue)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Failures Alert */}
      {paymentFailures.length > 0 && paymentFailures.some(f => !f.resolvedAt) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Problema com pagamento detectado.</strong> Verifique seus dados de pagamento 
            ou tente novamente. Entre em contato com o suporte se o problema persistir.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Ações da Assinatura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {subscription.cancelAtPeriodEnd ? (
              <Button
                onClick={() => handleSubscriptionAction('reactivate')}
                disabled={actionLoading === 'reactivate'}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading === 'reactivate' ? 'Processando...' : 'Reativar Assinatura'}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => handleSubscriptionAction('cancel')}
                disabled={actionLoading === 'cancel'}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                {actionLoading === 'cancel' ? 'Processando...' : 'Cancelar Assinatura'}
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => window.location.href = '/checkout?upgrade=true'}
            >
              Alterar Plano
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhuma fatura encontrada.</p>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {getInvoiceStatusIcon(invoice.status)}
                    <div>
                      <div className="font-medium">
                        Fatura #{invoice.invoiceNumber}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(invoice.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">
                        {formatPrice(invoice.amountDue)}
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                    
                    <div className="flex gap-2">
                      {invoice.status === 'open' && (
                        <Button
                          size="sm"
                          onClick={() => retryPayment(invoice.id)}
                          disabled={actionLoading === `retry-${invoice.id}`}
                          className="bg-teal-600 hover:bg-teal-700"
                        >
                          {actionLoading === `retry-${invoice.id}` ? 'Tentando...' : 'Pagar'}
                        </Button>
                      )}
                      
                      {invoice.downloadUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(invoice.downloadUrl!, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Métodos de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-6">
              <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">Nenhum método de pagamento salvo.</p>
              <Button variant="outline">
                Adicionar Cartão
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <CreditCard className="w-6 h-6 text-gray-400" />
                    <div>
                      <div className="font-medium">
                        **** **** **** {method.card?.last4}
                      </div>
                      <div className="text-sm text-gray-600">
                        {method.card?.brand?.toUpperCase()} • Expira {method.card?.expMonth}/{method.card?.expYear}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">Padrão</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}