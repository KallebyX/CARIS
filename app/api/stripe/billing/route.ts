import { NextRequest, NextResponse } from 'next/server'
import { StripeService } from '@/lib/stripe'
import { getUserIdFromRequest } from '@/lib/auth'
import { db } from '@/db'
import { subscriptions, customers, invoices, payments, paymentFailures } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
      with: {
        customer: true,
      },
    })

    if (!subscription) {
      return NextResponse.json({
        subscription: null,
        invoices: [],
        paymentMethods: [],
        paymentFailures: [],
      })
    }

    // Get invoices
    const userInvoices = await db.query.invoices.findMany({
      where: eq(invoices.userId, userId),
      orderBy: [desc(invoices.createdAt)],
      limit: 10,
    })

    // Get payment methods from Stripe
    const paymentMethods = await StripeService.getCustomerPaymentMethods(
      subscription.customer.stripeCustomerId
    )

    // Get payment failures
    const failures = await db.query.paymentFailures.findMany({
      where: eq(paymentFailures.userId, userId),
      orderBy: [desc(paymentFailures.createdAt)],
      limit: 5,
    })

    // Get latest subscription data from Stripe
    const stripeSubscription = await StripeService.getSubscription(subscription.stripeSubscriptionId)

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: stripeSubscription.status ?? subscription.status,
        planId: subscription.planId,
        planName: subscription.planName,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ?? subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt,
      },
      invoices: userInvoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        amountDue: invoice.amountDue,
        amountPaid: invoice.amountPaid,
        currency: invoice.currency,
        description: invoice.description,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        invoiceUrl: invoice.hostedInvoiceUrl,
        downloadUrl: invoice.invoicePdf,
        createdAt: invoice.createdAt,
      })),
      paymentMethods: paymentMethods.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        } : null,
      })),
      paymentFailures: failures.map(failure => ({
        id: failure.id,
        failureCode: failure.failureCode,
        failureMessage: failure.failureMessage,
        retryCount: failure.retryCount,
        nextRetryAt: failure.nextRetryAt,
        resolvedAt: failure.resolvedAt,
        createdAt: failure.createdAt,
      })),
    })

  } catch (error) {
    console.error('Error retrieving billing data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, ...params } = await request.json()

    // Get user's customer
    const customer = await db.query.customers.findFirst({
      where: eq(customers.userId, userId),
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    switch (action) {
      case 'create_setup_intent': {
        // Create setup intent for adding payment method
        const setupIntent = await StripeService.createSetupIntent(customer.stripeCustomerId)
        
        return NextResponse.json({
          success: true,
          clientSecret: setupIntent.client_secret,
        })
      }

      case 'retry_payment': {
        const { invoiceId } = params
        if (!invoiceId) {
          return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 })
        }

        const invoice = await db.query.invoices.findFirst({
          where: eq(invoices.id, invoiceId),
        })

        if (!invoice || invoice.userId !== userId) {
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }

        // Retry payment in Stripe
        const stripeInvoice = await StripeService.retryFailedPayment(invoice.stripeInvoiceId)

        return NextResponse.json({
          success: true,
          message: 'Payment retry initiated',
          invoice: stripeInvoice,
        })
      }

      case 'download_invoice': {
        const { invoiceId } = params
        if (!invoiceId) {
          return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 })
        }

        const invoice = await db.query.invoices.findFirst({
          where: eq(invoices.id, invoiceId),
        })

        if (!invoice || invoice.userId !== userId) {
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          downloadUrl: invoice.invoicePdf,
          hostedUrl: invoice.hostedInvoiceUrl,
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error handling billing action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}