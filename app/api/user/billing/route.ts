import { NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth"
import { StripeService, getAllPlans, formatPrice } from "@/lib/stripe"
import { db } from "@/db"
import { subscriptions, customers, invoices, payments } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

// Updated billing route to use Stripe
export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    // Get user's subscription from database
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
      with: {
        customer: true,
      },
    })

    if (!subscription) {
      return NextResponse.json({
        currentPlan: null,
        invoices: [],
        paymentMethod: null,
        hasActiveSubscription: false,
      })
    }

    // Get latest subscription data from Stripe
    const stripeSubscription = await StripeService.getSubscription(subscription.stripeSubscriptionId)
    
    // Get customer invoices
    const userInvoices = await db.query.invoices.findMany({
      where: eq(invoices.userId, userId),
      orderBy: [desc(invoices.createdAt)],
      limit: 10,
    })

    // Get payment methods
    const paymentMethods = await StripeService.getCustomerPaymentMethods(
      subscription.customer.stripeCustomerId
    )

    const currentPlan = {
      name: subscription.planName,
      price: stripeSubscription.items.data[0]?.price.unit_amount || 0,
      interval: stripeSubscription.items.data[0]?.price.recurring?.interval || "month",
      renewsAt: subscription.currentPeriodEnd.toISOString().split('T')[0],
      status: stripeSubscription.status ?? subscription.status,
    }

    const billingInvoices = userInvoices.map(invoice => ({
      id: invoice.id,
      date: invoice.createdAt.toISOString().split('T')[0],
      amount: invoice.amountDue / 100, // Convert from cents
      status: invoice.status,
      downloadUrl: invoice.hostedInvoiceUrl || `/api/invoices/${invoice.id}/download`,
    }))

    const paymentMethod = paymentMethods.length > 0 ? {
      type: "card",
      last4: paymentMethods[0].card?.last4 || "0000",
      brand: paymentMethods[0].card?.brand || "unknown",
      expiresAt: `${paymentMethods[0].card?.exp_month}/${paymentMethods[0].card?.exp_year}`,
    } : null

    return NextResponse.json({
      currentPlan,
      invoices: billingInvoices,
      paymentMethod,
      hasActiveSubscription: stripeSubscription.status === 'active',
    })
  } catch (error) {
    console.error("Erro ao buscar dados de billing:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { action, planId } = await request.json()

    // Get user's subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
      with: {
        customer: true,
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 })
    }

    if (action === "change_plan") {
      // Get plan details
      const plans = getAllPlans()
      const newPlan = plans.find(p => p.id === planId)
      
      if (!newPlan) {
        return NextResponse.json({ error: "Plano inválido" }, { status: 400 })
      }

      // Create Stripe checkout session for plan change
      const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=billing&success=plan_changed`
      const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=billing`

      const session = await StripeService.createCheckoutSession(
        subscription.customer.stripeCustomerId,
        newPlan.stripePriceIdMonthly,
        planId as any,
        successUrl,
        cancelUrl
      )

      return NextResponse.json({
        message: "Redirecionando para alteração de plano",
        redirectUrl: session.url,
      })
    }

    if (action === "cancel_subscription") {
      // Cancel subscription in Stripe
      await StripeService.cancelSubscription(subscription.stripeSubscriptionId, false)

      return NextResponse.json({
        message: "Assinatura será cancelada no fim do período atual",
        cancellationDate: subscription.currentPeriodEnd,
      })
    }

    if (action === "update_payment_method") {
      // Create setup intent for updating payment method
      const setupIntent = await StripeService.createSetupIntent(subscription.customer.stripeCustomerId)
      
      return NextResponse.json({
        message: "Redirecionando para atualização de método de pagamento",
        clientSecret: setupIntent.client_secret,
      })
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  } catch (error) {
    console.error("Erro ao processar billing:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
