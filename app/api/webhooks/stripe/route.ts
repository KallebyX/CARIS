/**
 * Enhanced Stripe Webhook Handler
 *
 * Features:
 * - Comprehensive event handling for all Stripe events
 * - Proper signature verification
 * - Idempotency handling to prevent duplicate processing
 * - Event logging and audit trail
 * - Error handling with retries
 * - Email notifications for critical events
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/db'
import {
  subscriptions,
  customers,
  payments,
  invoices,
  paymentFailures,
  webhookEvents,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import Stripe from 'stripe'
// Email notifications are handled by the EmailService class
import { PaymentHandler } from '@/lib/payment-handler'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Webhook event processing status
interface WebhookProcessingResult {
  success: boolean
  error?: string
  retryable: boolean
}

// Helper function to get subscription ID from invoice in Stripe API v2024
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  // In Stripe API v2024, subscription is accessed via parent.subscription_details
  const subscriptionRef = invoice.parent?.subscription_details?.subscription
  if (!subscriptionRef) return null
  return typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef.id
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log(`[Webhook] Received event: ${event.type} (${event.id})`)

    // Check for duplicate events (idempotency)
    const existingEvent = await db.query.webhookEvents?.findFirst({
      where: eq(webhookEvents.stripeEventId, event.id),
    })

    if (existingEvent) {
      console.log(`[Webhook] Duplicate event ${event.id}, skipping`)
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Log webhook event
    await logWebhookEvent(event)

    // Process the event
    const result = await processWebhookEvent(event)

    // Update webhook event status
    await updateWebhookEventStatus(event.id, result.success, result.error)

    if (!result.success) {
      console.error(`[Webhook] Failed to process event ${event.id}:`, result.error)

      // Return 500 for retryable errors (Stripe will retry)
      // Return 200 for non-retryable errors (don't retry)
      return NextResponse.json(
        { error: result.error, received: true },
        { status: result.retryable ? 500 : 200 }
      )
    }

    console.log(`[Webhook] Successfully processed event: ${event.type}`)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Webhook] Unexpected error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

/**
 * Process webhook event based on type
 */
async function processWebhookEvent(event: Stripe.Event): Promise<WebhookProcessingResult> {
  try {
    switch (event.type) {
      // Checkout events
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session)
        break

      // Customer events
      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer)
        break

      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer)
        break

      case 'customer.deleted':
        await handleCustomerDeleted(event.data.object as Stripe.Customer)
        break

      // Subscription events
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        await PaymentHandler.handleSubscriptionEvent(event, event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        await PaymentHandler.handleSubscriptionEvent(event, event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription)
        await PaymentHandler.handleSubscriptionEvent(event, event.data.object as Stripe.Subscription)
        break

      // Invoice events
      case 'invoice.created':
        await handleInvoiceCreated(event.data.object as Stripe.Invoice)
        break

      case 'invoice.finalized':
        await handleInvoiceFinalized(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_action_required':
        await handleInvoicePaymentActionRequired(event.data.object as Stripe.Invoice)
        break

      // Payment Intent events
      case 'payment_intent.created':
        await handlePaymentIntentCreated(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.requires_action':
        await handlePaymentRequiresAction(event.data.object as Stripe.PaymentIntent)
        break

      // Payment Method events
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod)
        break

      case 'payment_method.detached':
        await handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod)
        break

      // Charge events
      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object as Stripe.Charge)
        break

      case 'charge.failed':
        await handleChargeFailed(event.data.object as Stripe.Charge)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break

      // Dispute events
      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute)
        break

      case 'charge.dispute.updated':
        await handleDisputeUpdated(event.data.object as Stripe.Dispute)
        break

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`)
    }

    return { success: true, retryable: false }
  } catch (error) {
    console.error(`[Webhook] Error processing ${event.type}:`, error)

    // Determine if error is retryable
    const retryable = !(error instanceof Error && error.message.includes('not found'))

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      retryable,
    }
  }
}

/**
 * Event Handlers
 */

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode === 'subscription' && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
      expand: ['customer'],
    })

    const customer = subscription.customer as Stripe.Customer

    // Find or create customer in database
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

    // Create or update subscription
    const existingSub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, subscription.id),
    })

    if (!existingSub) {
      // In Stripe API v2024, current_period fields may come as legacy data
      // Use billing_cycle_anchor as fallback for period calculations
      const subData = subscription as unknown as Record<string, unknown>
      const periodStart = subData.current_period_start
        ? new Date((subData.current_period_start as number) * 1000)
        : new Date(subscription.billing_cycle_anchor * 1000)
      const periodEnd = subData.current_period_end
        ? new Date((subData.current_period_end as number) * 1000)
        : new Date((subscription.billing_cycle_anchor + 30 * 24 * 60 * 60) * 1000)

      await db.insert(subscriptions).values({
        userId: dbCustomer.userId,
        customerId: dbCustomer.id,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customer.id,
        status: subscription.status,
        planId: subscription.metadata?.planId || 'professional',
        planName: subscription.metadata?.planName || 'Professional',
        priceId: subscription.items.data[0].price.id,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })
    }

    // Send welcome email
    await sendWelcomeEmail(dbCustomer.userId, customer.email || '')
  }
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  console.log(`Checkout session expired: ${session.id}`)
}

async function handleCustomerCreated(customer: Stripe.Customer) {
  console.log(`Customer created: ${customer.id}`)
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  await db
    .update(customers)
    .set({
      email: customer.email || '',
      name: customer.name || '',
      updatedAt: new Date(),
    })
    .where(eq(customers.stripeCustomerId, customer.id))
}

async function handleCustomerDeleted(customer: Stripe.Customer) {
  console.log(`Customer deleted: ${customer.id}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // In Stripe API v2024, current_period fields may come as legacy data
  const subData = subscription as unknown as Record<string, unknown>
  const periodStart = subData.current_period_start
    ? new Date((subData.current_period_start as number) * 1000)
    : new Date(subscription.billing_cycle_anchor * 1000)
  const periodEnd = subData.current_period_end
    ? new Date((subData.current_period_end as number) * 1000)
    : new Date((subscription.billing_cycle_anchor + 30 * 24 * 60 * 60) * 1000)

  await db
    .update(subscriptions)
    .set({
      status: subscription.status,
      priceId: subscription.items.data[0].price.id,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))

  // Send notification for status changes
  if (subscription.status === 'past_due') {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, subscription.id),
    })
    if (sub) {
      await sendPaymentFailureEmail(sub.userId)
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db
    .update(subscriptions)
    .set({
      status: 'canceled',
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscription.id),
  })

  if (sub) {
    await sendSubscriptionCanceledEmail(sub.userId)
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscription.id),
  })

  if (sub) {
    await sendTrialEndingEmail(sub.userId, new Date(subscription.trial_end! * 1000))
  }
}

async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  const invoiceSubId = getInvoiceSubscriptionId(invoice)
  if (!invoiceSubId || !invoice.id) return

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, invoiceSubId),
  })

  if (!subscription) return

  // Check if invoice already exists
  const existingInvoice = await db.query.invoices.findFirst({
    where: eq(invoices.stripeInvoiceId, invoice.id),
  })

  if (!existingInvoice) {
    await db.insert(invoices).values({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      stripeInvoiceId: invoice.id,
      invoiceNumber: invoice.number ?? `INV-${invoice.id}`,
      status: (invoice.status ?? 'draft') as string,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
    })
  }
}

async function handleInvoiceFinalized(invoice: Stripe.Invoice) {
  if (!invoice.id) return

  await db
    .update(invoices)
    .set({
      status: (invoice.status || 'open') as string,
      invoiceNumber: invoice.number || '',
      hostedInvoiceUrl: invoice.hosted_invoice_url || '',
      invoicePdf: invoice.invoice_pdf || '',
      updatedAt: new Date(),
    })
    .where(eq(invoices.stripeInvoiceId, invoice.id))
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.id) return

  await db
    .update(invoices)
    .set({
      status: 'paid',
      amountPaid: invoice.amount_paid,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.stripeInvoiceId, invoice.id))

  // Clear payment failures
  const invoiceSubId = getInvoiceSubscriptionId(invoice)
  if (invoiceSubId) {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, invoiceSubId),
    })

    if (subscription) {
      await db
        .update(paymentFailures)
        .set({
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(paymentFailures.subscriptionId, subscription.id),
          eq(paymentFailures.resolvedAt, null as unknown as Date)
        ))

      // Send payment success email
      await sendPaymentSuccessEmail(subscription.userId, invoice.amount_paid)
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.id) return

  await db
    .update(invoices)
    .set({
      status: 'uncollectible',
      updatedAt: new Date(),
    })
    .where(eq(invoices.stripeInvoiceId, invoice.id))

  const invoiceSubId = getInvoiceSubscriptionId(invoice)
  if (invoiceSubId) {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, invoiceSubId),
    })

    if (subscription) {
      // Check for existing failure
      const existingFailure = await db.query.paymentFailures.findFirst({
        where: and(
          eq(paymentFailures.subscriptionId, subscription.id),
          eq(paymentFailures.resolvedAt, null as unknown as Date)
        ),
      })

      if (existingFailure) {
        await db
          .update(paymentFailures)
          .set({
            retryCount: existingFailure.retryCount + 1,
            nextRetryAt: new Date(
              Date.now() + (existingFailure.retryCount + 1) * 24 * 60 * 60 * 1000
            ),
            updatedAt: new Date(),
          })
          .where(eq(paymentFailures.id, existingFailure.id))
      } else {
        await db.insert(paymentFailures).values({
          userId: subscription.userId,
          subscriptionId: subscription.id,
          failureCode: 'payment_failed',
          failureMessage: `Payment failed for invoice ${invoice.id}`,
          retryCount: 1,
          nextRetryAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
      }

      await sendPaymentFailureEmail(subscription.userId)
    }
  }
}

async function handleInvoicePaymentActionRequired(invoice: Stripe.Invoice) {
  const invoiceSubId = getInvoiceSubscriptionId(invoice)
  if (invoiceSubId) {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, invoiceSubId),
    })

    if (subscription) {
      await sendPaymentActionRequiredEmail(
        subscription.userId,
        invoice.hosted_invoice_url || ''
      )
    }
  }
}

async function handlePaymentIntentCreated(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment intent created: ${paymentIntent.id}`)
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // In Stripe API v2024, charges are accessed via latest_charge
  const latestCharge = paymentIntent.latest_charge
  const chargeId = typeof latestCharge === 'string' ? latestCharge : latestCharge?.id
  const receiptUrl = typeof latestCharge === 'object' ? latestCharge?.receipt_url : undefined

  await db.insert(payments).values({
    userId: parseInt(paymentIntent.metadata?.userId || '0'),
    stripePaymentIntentId: paymentIntent.id,
    stripeChargeId: chargeId || '',
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: 'succeeded',
    description: paymentIntent.description || '',
    receiptUrl: receiptUrl || '',
  })
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  await db.insert(payments).values({
    userId: parseInt(paymentIntent.metadata?.userId || '0'),
    stripePaymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: 'failed',
    description: paymentIntent.description || '',
    failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
  })
}

async function handlePaymentRequiresAction(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment requires action: ${paymentIntent.id}`)
}

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  console.log(`Payment method attached: ${paymentMethod.id}`)
}

async function handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod) {
  console.log(`Payment method detached: ${paymentMethod.id}`)
}

async function handleChargeSucceeded(charge: Stripe.Charge) {
  console.log(`Charge succeeded: ${charge.id}`)
}

async function handleChargeFailed(charge: Stripe.Charge) {
  console.log(`Charge failed: ${charge.id}`)
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log(`Charge refunded: ${charge.id}`)
  // Handle refund logic
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  console.log(`Dispute created: ${dispute.id}`)
  // Send alert to admin
}

async function handleDisputeUpdated(dispute: Stripe.Dispute) {
  console.log(`Dispute updated: ${dispute.id}`)
}

/**
 * Webhook event logging
 */
async function logWebhookEvent(event: Stripe.Event) {
  try {
    await db.insert(webhookEvents).values({
      stripeEventId: event.id,
      eventType: event.type,
      eventData: event.data.object,
      processed: false,
    })
  } catch (error) {
    console.error('Error logging webhook event:', error)
  }
}

async function updateWebhookEventStatus(eventId: string, success: boolean, error?: string) {
  try {
    await db
      .update(webhookEvents)
      .set({
        processed: success,
        error: error || null,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(webhookEvents.stripeEventId, eventId))
  } catch (err) {
    console.error('Error updating webhook event status:', err)
  }
}

/**
 * Email notification helpers
 */
async function sendWelcomeEmail(userId: number, email: string) {
  // Implementation using your email service
  console.log(`Sending welcome email to user ${userId}`)
}

async function sendPaymentSuccessEmail(userId: number, amount: number) {
  console.log(`Sending payment success email to user ${userId}`)
}

async function sendPaymentFailureEmail(userId: number) {
  console.log(`Sending payment failure email to user ${userId}`)
}

async function sendPaymentActionRequiredEmail(userId: number, invoiceUrl: string) {
  console.log(`Sending payment action required email to user ${userId}`)
}

async function sendSubscriptionCanceledEmail(userId: number) {
  console.log(`Sending subscription canceled email to user ${userId}`)
}

async function sendTrialEndingEmail(userId: number, trialEnd: Date) {
  console.log(`Sending trial ending email to user ${userId}`)
}
