import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/db'
import { subscriptions, customers, payments, invoices, paymentFailures } from '@/db/schema'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('Received Stripe webhook:', event.type)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'invoice.created':
        await handleInvoiceCreated(event.data.object as Stripe.Invoice)
        break

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    if (session.mode === 'subscription' && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
        expand: ['customer'],
      })

      const customer = subscription.customer as Stripe.Customer

      // Find or create customer in our database
      let dbCustomer = await db.query.customers.findFirst({
        where: eq(customers.stripeCustomerId, customer.id),
      })

      if (!dbCustomer) {
        const [newCustomer] = await db.insert(customers).values({
          userId: parseInt(customer.metadata?.userId || '0'),
          stripeCustomerId: customer.id,
          email: customer.email || '',
          name: customer.name || '',
        }).returning()
        dbCustomer = newCustomer
      }

      // Create subscription record
      await db.insert(subscriptions).values({
        userId: dbCustomer.userId,
        customerId: dbCustomer.id,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customer.id,
        status: subscription.status,
        planId: subscription.metadata?.planId || 'professional',
        planName: subscription.metadata?.planName || 'Professional',
        priceId: subscription.items.data[0].price.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })

      console.log('Subscription created for customer:', customer.id)
    }
  } catch (error) {
    console.error('Error handling checkout completed:', error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    // Update subscription in database
    await db.update(subscriptions)
      .set({
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id))

    console.log('Subscription updated:', subscription.id)
  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    // Update subscription status to canceled
    await db.update(subscriptions)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id))

    console.log('Subscription canceled:', subscription.id)
  } catch (error) {
    console.error('Error handling subscription deleted:', error)
  }
}

async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  try {
    if (!invoice.subscription) return

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, invoice.subscription as string),
    })

    if (!subscription) return

    // Create invoice record
    await db.insert(invoices).values({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      stripeInvoiceId: invoice.id,
      invoiceNumber: invoice.number || '',
      status: invoice.status || 'draft',
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      description: invoice.description || '',
      invoiceUrl: invoice.invoice_pdf || '',
      hostedInvoiceUrl: invoice.hosted_invoice_url || '',
      invoicePdf: invoice.invoice_pdf || '',
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
    })

    console.log('Invoice created:', invoice.id)
  } catch (error) {
    console.error('Error handling invoice created:', error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    // Update invoice status
    await db.update(invoices)
      .set({
        status: 'paid',
        amountPaid: invoice.amount_paid,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.stripeInvoiceId, invoice.id))

    // Clear any payment failures for this subscription
    if (invoice.subscription) {
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionId, invoice.subscription as string),
      })

      if (subscription) {
        await db.update(paymentFailures)
          .set({
            resolvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(paymentFailures.subscriptionId, subscription.id))
      }
    }

    console.log('Invoice payment succeeded:', invoice.id)
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    // Update invoice status
    await db.update(invoices)
      .set({
        status: 'uncollectible',
        updatedAt: new Date(),
      })
      .where(eq(invoices.stripeInvoiceId, invoice.id))

    // Create payment failure record
    if (invoice.subscription) {
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionId, invoice.subscription as string),
      })

      if (subscription) {
        // Check for existing failure record
        const existingFailure = await db.query.paymentFailures.findFirst({
          where: eq(paymentFailures.subscriptionId, subscription.id),
        })

        if (existingFailure) {
          // Increment retry count
          await db.update(paymentFailures)
            .set({
              retryCount: existingFailure.retryCount + 1,
              nextRetryAt: new Date(Date.now() + (existingFailure.retryCount + 1) * 24 * 60 * 60 * 1000), // Exponential backoff
              updatedAt: new Date(),
            })
            .where(eq(paymentFailures.id, existingFailure.id))
        } else {
          // Create new failure record
          await db.insert(paymentFailures).values({
            userId: subscription.userId,
            subscriptionId: subscription.id,
            failureCode: 'payment_failed',
            failureMessage: `Payment failed for invoice ${invoice.id}`,
            retryCount: 1,
            nextRetryAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          })
        }
      }
    }

    console.log('Invoice payment failed:', invoice.id)
  } catch (error) {
    console.error('Error handling invoice payment failed:', error)
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Create payment record
    await db.insert(payments).values({
      userId: parseInt(paymentIntent.metadata?.userId || '0'),
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId: paymentIntent.charges.data[0]?.id || '',
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'succeeded',
      description: paymentIntent.description || '',
      receiptUrl: paymentIntent.charges.data[0]?.receipt_url || '',
    })

    console.log('Payment succeeded:', paymentIntent.id)
  } catch (error) {
    console.error('Error handling payment succeeded:', error)
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Create or update payment record
    await db.insert(payments).values({
      userId: parseInt(paymentIntent.metadata?.userId || '0'),
      stripePaymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'failed',
      description: paymentIntent.description || '',
      failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
    })

    console.log('Payment failed:', paymentIntent.id)
  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}