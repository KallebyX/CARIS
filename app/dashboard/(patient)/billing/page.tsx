'use client'

/**
 * Customer Billing Portal
 *
 * Features:
 * - Current subscription details
 * - Payment method management
 * - Invoice history with download
 * - Plan upgrade/downgrade
 * - Cancellation flow with feedback
 */

import { useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  CreditCard,
  Download,
  Calendar,
  AlertCircle,
  Check,
  X,
  Plus,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface Subscription {
  id: string
  planId: string
  planName: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
}

interface PaymentMethod {
  id: string
  type: string
  card: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
}

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  amountDue: number
  amountPaid: number
  currency: string
  dueDate: string | null
  paidAt: string | null
  downloadUrl: string | null
  createdAt: string
}

interface Plan {
  id: string
  name: string
  priceMonthly: number
  priceYearly: number
  features: string[]
  isPopular: boolean
}

const PLANS: Plan[] = [
  {
    id: 'essential',
    name: 'Essencial',
    priceMonthly: 7900,
    priceYearly: 79000,
    features: [
      'Até 10 pacientes ativos',
      'Agenda e Prontuário Eletrônico',
      'Diário Emocional e Mapa Básico',
      'Videoterapia Integrada',
      'Suporte por e-mail',
    ],
    isPopular: false,
  },
  {
    id: 'professional',
    name: 'Profissional',
    priceMonthly: 12900,
    priceYearly: 129000,
    features: [
      'Pacientes ilimitados',
      'Tudo do plano Essencial',
      'Mapa Emocional com IA Preditiva',
      'Gamificação e Prescrição de Tarefas',
      'Relatórios Avançados',
      'Suporte Prioritário via Chat',
    ],
    isPopular: true,
  },
  {
    id: 'clinic',
    name: 'Clínica',
    priceMonthly: 29900,
    priceYearly: 299000,
    features: [
      'Tudo do plano Profissional',
      'Gestão de múltiplos psicólogos',
      'Faturamento centralizado',
      'Dashboard administrativo',
      'Opções de White-label',
      'Gerente de conta dedicado',
    ],
    isPopular: false,
  },
]

function AddPaymentMethodForm({ onSuccess, t }: { onSuccess: () => void, t: ReturnType<typeof useTranslations> }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    try {
      // Create setup intent
      const res = await fetch('/api/stripe/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_setup_intent' }),
      })

      const { clientSecret } = await res.json()

      // Confirm card setup
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) return

      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      })

      if (error) {
        setError(error.message || 'Failed to add payment method')
      } else {
        onSuccess()
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t("payments.adding")}
          </>
        ) : (
          t("payments.addButton")
        )}
      </Button>
    </form>
  )
}

export default function BillingPage() {
  const t = useTranslations("billing")
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/stripe/billing')
      const data = await res.json()

      setSubscription(data.subscription)
      setPaymentMethods(data.paymentMethods)
      setInvoices(data.invoices)
    } catch (error) {
      console.error('Error loading billing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/subscriptions/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })

      if (res.ok) {
        alert('Subscription will be canceled at the end of the billing period')
        setShowCancelDialog(false)
        loadBillingData()
      }
    } catch (error) {
      console.error('Error canceling subscription:', error)
    }
  }

  const handleReactivateSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/subscriptions/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivate' }),
      })

      if (res.ok) {
        alert('Subscription reactivated successfully')
        loadBillingData()
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error)
    }
  }

  const handleUpgradePlan = async (planId: string) => {
    try {
      const res = await fetch('/api/stripe/subscriptions/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_plan', planId }),
      })

      if (res.ok) {
        alert('Plan updated successfully')
        loadBillingData()
      }
    } catch (error) {
      console.error('Error upgrading plan:', error)
    }
  }

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch('/api/stripe/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download_invoice', invoiceId }),
      })

      const { downloadUrl } = await res.json()
      if (downloadUrl) {
        window.open(downloadUrl, '_blank')
      }
    } catch (error) {
      console.error('Error downloading invoice:', error)
    }
  }

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (status: string) => {
    const config = {
      active: { variant: 'default' as const, key: 'active' },
      past_due: { variant: 'destructive' as const, key: 'past_due' },
      canceled: { variant: 'secondary' as const, key: 'canceled' },
      paid: { variant: 'default' as const, key: 'paid' },
      open: { variant: 'outline' as const, key: 'open' },
    }

    const statusConfig = config[status as keyof typeof config]
    if (statusConfig) {
      return <Badge variant={statusConfig.variant}>{t(`status.${statusConfig.key}`)}</Badge>
    }

    return <Badge variant="outline">{status}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Tabs defaultValue="subscription" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscription">{t("tabs.subscription")}</TabsTrigger>
          <TabsTrigger value="payments">{t("tabs.payments")}</TabsTrigger>
          <TabsTrigger value="invoices">{t("tabs.invoices")}</TabsTrigger>
          <TabsTrigger value="plans">{t("tabs.plans")}</TabsTrigger>
        </TabsList>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("subscription.title")}</CardTitle>
                  <CardDescription>{t("subscription.description")}</CardDescription>
                </div>
                {subscription && getStatusBadge(subscription.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("subscription.plan")}</p>
                      <p className="text-lg font-semibold">{subscription.planName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("subscription.status")}</p>
                      <p className="text-lg font-semibold capitalize">{subscription.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("subscription.currentPeriod")}</p>
                      <p className="text-sm">
                        {formatDate(subscription.currentPeriodStart)} -{' '}
                        {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("subscription.nextBilling")}</p>
                      <p className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    </div>
                  </div>

                  {subscription.cancelAtPeriodEnd && (
                    <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-900">{t("subscription.ending.title")}</p>
                        <p className="text-sm text-yellow-700">
                          {t("subscription.ending.message", { date: formatDate(subscription.currentPeriodEnd) })}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">{t("subscription.noSubscription")}</p>
                  <Button>{t("subscription.subscribeNow")}</Button>
                </div>
              )}
            </CardContent>
            {subscription && (
              <CardFooter className="flex gap-2">
                {subscription.cancelAtPeriodEnd ? (
                  <Button onClick={handleReactivateSubscription} variant="default">
                    {t("subscription.reactivate")}
                  </Button>
                ) : (
                  <Button onClick={() => setShowCancelDialog(true)} variant="destructive">
                    {t("subscription.cancel")}
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("payments.title")}</CardTitle>
                  <CardDescription>{t("payments.description")}</CardDescription>
                </div>
                <Button onClick={() => setShowAddPayment(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("payments.addMethod")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentMethods.length > 0 ? (
                paymentMethods.map(method => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {method.card.brand.toUpperCase()} •••• {method.card.last4}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("payments.expires")} {method.card.expMonth}/{method.card.expYear}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{t("payments.default")}</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t("payments.noMethods")}
                </div>
              )}
            </CardContent>
          </Card>

          {showAddPayment && (
            <Card>
              <CardHeader>
                <CardTitle>{t("payments.addTitle")}</CardTitle>
                <CardDescription>{t("payments.addDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise}>
                  <AddPaymentMethodForm
                    t={t}
                    onSuccess={() => {
                      setShowAddPayment(false)
                      loadBillingData()
                    }}
                  />
                </Elements>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("invoices.title")}</CardTitle>
              <CardDescription>{t("invoices.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <div className="space-y-2">
                  {invoices.map(invoice => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-mono font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(invoice.createdAt)}
                          </p>
                        </div>
                        <div>{getStatusBadge(invoice.status)}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-semibold">{formatCurrency(invoice.amountDue)}</p>
                        {invoice.downloadUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadInvoice(invoice.id)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {t("invoices.download")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">{t("invoices.noInvoices")}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Change Plan Tab */}
        <TabsContent value="plans" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map(plan => (
              <Card
                key={plan.id}
                className={plan.isPopular ? 'border-primary shadow-lg' : ''}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.isPopular && <Badge>{t("plans.popular")}</Badge>}
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">{formatCurrency(plan.priceMonthly)}</span>
                    <span className="text-muted-foreground">{t("plans.perMonth")}</span>
                  </div>
                  <CardDescription className="text-sm">
                    or {formatCurrency(plan.priceYearly)}{t("plans.perYear")} ({t("plans.twoMonthsFree")})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {subscription?.planId === plan.id ? (
                    <Button variant="outline" className="w-full" disabled>
                      {t("plans.currentPlan")}
                    </Button>
                  ) : (
                    <Button
                      variant={plan.isPopular ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => handleUpgradePlan(plan.id)}
                    >
                      {subscription ? t("plans.changeTo") : t("plans.subscribe")}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cancelDialog.description", { date: subscription ? formatDate(subscription.currentPeriodEnd) : '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelDialog.keep")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive">
              {t("cancelDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
