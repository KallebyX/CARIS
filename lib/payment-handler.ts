/**
 * Enhanced Payment Handler
 *
 * Provides comprehensive payment handling including:
 * - Payment intent management
 * - Automatic retry logic with exponential backoff
 * - 3D Secure (SCA) authentication support
 * - Payment method updates
 * - Subscription lifecycle event handling
 * - Dunning management (failed payment recovery)
 */

import Stripe from 'stripe'
import { stripe, StripeService } from './stripe'
import { db } from '@/db'
import { payments, paymentFailures, subscriptions, invoices } from '@/db/schema'
import { eq, and, isNull, lt } from 'drizzle-orm'
import { sendEmail } from './email'

export interface PaymentResult {
  success: boolean
  paymentIntentId?: string
  status: string
  requiresAction?: boolean
  clientSecret?: string
  error?: string
  errorCode?: string
}

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffFactor: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 4,
  baseDelay: 24 * 60 * 60 * 1000, // 24 hours
  maxDelay: 7 * 24 * 60 * 60 * 1000, // 7 days
  backoffFactor: 2,
}

export class PaymentHandler {
  /**
   * Create and confirm payment intent with SCA support
   */
  static async createAndConfirmPayment(
    amount: number,
    currency: string,
    customerId: string,
    paymentMethodId: string,
    userId: number,
    description?: string,
    metadata?: Record<string, string>
  ): Promise<PaymentResult> {
    try {
      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        payment_method: paymentMethodId,
        description,
        metadata: {
          userId: userId.toString(),
          ...metadata,
        },
        confirm: true,
        // Enable automatic payment methods and 3DS
        payment_method_types: ['card'],
        // Return URL for 3DS redirect
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?payment_intent=${'{PAYMENT_INTENT_ID}'}`,
        // Allow off-session payments (for subscriptions)
        off_session: false,
        // Request 3DS when required
        setup_future_usage: 'off_session',
      })

      // Record payment in database
      await db.insert(payments).values({
        userId,
        stripePaymentIntentId: paymentIntent.id,
        amount,
        currency,
        status: paymentIntent.status,
        description: description || '',
      })

      return this.mapPaymentIntentToResult(paymentIntent)
    } catch (error) {
      console.error('Payment creation failed:', error)

      if (error instanceof Stripe.errors.StripeCardError) {
        return {
          success: false,
          status: 'failed',
          error: error.message,
          errorCode: error.code,
        }
      }

      throw error
    }
  }

  /**
   * Handle payment intent that requires action (3DS)
   */
  static async handlePaymentAction(
    paymentIntentId: string,
    userId: number
  ): Promise<PaymentResult> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

      if (paymentIntent.status === 'requires_action') {
        return {
          success: false,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret || undefined,
        }
      }

      // Update payment status in database
      await db
        .update(payments)
        .set({
          status: paymentIntent.status,
          updatedAt: new Date(),
        })
        .where(eq(payments.stripePaymentIntentId, paymentIntentId))

      return this.mapPaymentIntentToResult(paymentIntent)
    } catch (error) {
      console.error('Error handling payment action:', error)
      throw error
    }
  }

  /**
   * Confirm payment after 3DS authentication
   */
  static async confirmPaymentAfterAuthentication(
    paymentIntentId: string
  ): Promise<PaymentResult> {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId)

      // Update payment status
      await db
        .update(payments)
        .set({
          status: paymentIntent.status,
          updatedAt: new Date(),
        })
        .where(eq(payments.stripePaymentIntentId, paymentIntentId))

      return this.mapPaymentIntentToResult(paymentIntent)
    } catch (error) {
      console.error('Payment confirmation failed:', error)

      if (error instanceof Stripe.errors.StripeCardError) {
        return {
          success: false,
          paymentIntentId,
          status: 'failed',
          error: error.message,
          errorCode: error.code,
        }
      }

      throw error
    }
  }

  /**
   * Update payment method for customer
   */
  static async updatePaymentMethod(
    customerId: string,
    paymentMethodId: string,
    subscriptionId?: string
  ): Promise<boolean> {
    try {
      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      })

      // Set as default payment method for customer
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      })

      // If subscription provided, update its default payment method
      if (subscriptionId) {
        await stripe.subscriptions.update(subscriptionId, {
          default_payment_method: paymentMethodId,
        })
      }

      return true
    } catch (error) {
      console.error('Error updating payment method:', error)
      return false
    }
  }

  /**
   * Retry failed payment with exponential backoff
   */
  static async retryFailedPayment(
    invoiceId: string,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<PaymentResult> {
    try {
      // Get invoice from database
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.stripeInvoiceId, invoiceId),
      })

      if (!invoice) {
        throw new Error('Invoice not found')
      }

      // Check if we've exceeded retry attempts
      const failures = await db.query.paymentFailures.findMany({
        where: and(
          eq(paymentFailures.subscriptionId, invoice.subscriptionId!),
          isNull(paymentFailures.resolvedAt)
        ),
      })

      const currentFailure = failures[0]
      if (currentFailure && currentFailure.retryCount >= config.maxAttempts) {
        // Max retries exceeded - mark subscription for cancellation
        await this.handleMaxRetriesExceeded(invoice.subscriptionId!)
        return {
          success: false,
          status: 'max_retries_exceeded',
          error: 'Maximum payment retry attempts exceeded',
        }
      }

      // Attempt to pay invoice
      const stripeInvoice = await stripe.invoices.pay(invoiceId, {
        paid_out_of_band: false,
      })

      if (stripeInvoice.status === 'paid') {
        // Clear payment failures
        if (currentFailure) {
          await db
            .update(paymentFailures)
            .set({
              resolvedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(paymentFailures.id, currentFailure.id))
        }

        // Send success email
        await this.sendPaymentSuccessEmail(invoice.userId)

        return {
          success: true,
          status: 'succeeded',
        }
      }

      // Payment still pending or failed
      return {
        success: false,
        status: stripeInvoice.status || 'failed',
      }
    } catch (error) {
      console.error('Payment retry failed:', error)

      if (error instanceof Stripe.errors.StripeCardError) {
        // Schedule next retry
        await this.scheduleNextRetry(invoiceId, config)

        return {
          success: false,
          status: 'failed',
          error: error.message,
          errorCode: error.code,
        }
      }

      throw error
    }
  }

  /**
   * Schedule next retry attempt with exponential backoff
   */
  private static async scheduleNextRetry(
    invoiceId: string,
    config: RetryConfig
  ): Promise<void> {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.stripeInvoiceId, invoiceId),
    })

    if (!invoice || !invoice.subscriptionId) return

    // Get current failure record
    const currentFailure = await db.query.paymentFailures.findFirst({
      where: and(
        eq(paymentFailures.subscriptionId, invoice.subscriptionId),
        isNull(paymentFailures.resolvedAt)
      ),
    })

    const retryCount = currentFailure ? currentFailure.retryCount + 1 : 1

    // Calculate next retry time with exponential backoff
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffFactor, retryCount - 1),
      config.maxDelay
    )
    const nextRetryAt = new Date(Date.now() + delay)

    if (currentFailure) {
      // Update existing failure record
      await db
        .update(paymentFailures)
        .set({
          retryCount,
          nextRetryAt,
          updatedAt: new Date(),
        })
        .where(eq(paymentFailures.id, currentFailure.id))
    } else {
      // Create new failure record
      await db.insert(paymentFailures).values({
        userId: invoice.userId,
        subscriptionId: invoice.subscriptionId,
        failureCode: 'payment_failed',
        failureMessage: 'Payment failed, scheduled for retry',
        retryCount,
        nextRetryAt,
      })
    }

    // Send dunning email
    await this.sendDunningEmail(invoice.userId, retryCount, nextRetryAt)
  }

  /**
   * Process pending payment retries (run via cron job)
   */
  static async processPendingRetries(): Promise<void> {
    try {
      // Get all failures that are due for retry
      const pendingRetries = await db.query.paymentFailures.findMany({
        where: and(
          isNull(paymentFailures.resolvedAt),
          lt(paymentFailures.nextRetryAt, new Date())
        ),
        with: {
          subscription: true,
        },
      })

      console.log(`Processing ${pendingRetries.length} pending payment retries`)

      for (const failure of pendingRetries) {
        try {
          // Get latest invoice for subscription
          const latestInvoice = await db.query.invoices.findFirst({
            where: and(
              eq(invoices.subscriptionId, failure.subscriptionId!),
              eq(invoices.status, 'open')
            ),
            orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
          })

          if (latestInvoice) {
            await this.retryFailedPayment(latestInvoice.stripeInvoiceId)
          }
        } catch (error) {
          console.error(`Error retrying payment for failure ${failure.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Error processing pending retries:', error)
    }
  }

  /**
   * Handle subscription when max retries exceeded
   */
  private static async handleMaxRetriesExceeded(subscriptionId: string): Promise<void> {
    try {
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.id, subscriptionId),
      })

      if (!subscription) return

      // Cancel subscription at period end
      await StripeService.cancelSubscription(subscription.stripeSubscriptionId, false)

      // Send final notice email
      await this.sendMaxRetriesEmail(subscription.userId)

      console.log(`Subscription ${subscriptionId} marked for cancellation due to max retries`)
    } catch (error) {
      console.error('Error handling max retries exceeded:', error)
    }
  }

  /**
   * Map Stripe PaymentIntent to our result format
   */
  private static mapPaymentIntentToResult(
    paymentIntent: Stripe.PaymentIntent
  ): PaymentResult {
    const requiresAction =
      paymentIntent.status === 'requires_action' ||
      paymentIntent.status === 'requires_source_action'

    return {
      success: paymentIntent.status === 'succeeded',
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      requiresAction,
      clientSecret: requiresAction ? paymentIntent.client_secret || undefined : undefined,
    }
  }

  /**
   * Email notification helpers
   */
  private static async sendPaymentSuccessEmail(userId: number): Promise<void> {
    // Implementation would use your email service
    console.log(`Sending payment success email to user ${userId}`)
  }

  private static async sendDunningEmail(
    userId: number,
    retryCount: number,
    nextRetryAt: Date
  ): Promise<void> {
    // Implementation would send dunning email based on retry count
    console.log(`Sending dunning email (attempt ${retryCount}) to user ${userId}`)
  }

  private static async sendMaxRetriesEmail(userId: number): Promise<void> {
    // Implementation would send final notice email
    console.log(`Sending max retries email to user ${userId}`)
  }

  /**
   * Handle subscription lifecycle events
   */
  static async handleSubscriptionEvent(
    event: Stripe.Event,
    subscription: Stripe.Subscription
  ): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
        await this.onSubscriptionCreated(subscription)
        break

      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(subscription)
        break

      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(subscription)
        break

      case 'customer.subscription.trial_will_end':
        await this.onTrialWillEnd(subscription)
        break
    }
  }

  private static async onSubscriptionCreated(
    subscription: Stripe.Subscription
  ): Promise<void> {
    console.log(`Subscription created: ${subscription.id}`)
    // Send welcome email, set up user account, etc.
  }

  private static async onSubscriptionUpdated(
    subscription: Stripe.Subscription
  ): Promise<void> {
    console.log(`Subscription updated: ${subscription.id}`)

    // Check if subscription is past_due
    if (subscription.status === 'past_due') {
      // Start dunning process
      const dbSubscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionId, subscription.id),
      })

      if (dbSubscription) {
        // Get latest open invoice
        const openInvoice = await stripe.invoices.list({
          subscription: subscription.id,
          status: 'open',
          limit: 1,
        })

        if (openInvoice.data.length > 0) {
          await this.scheduleNextRetry(openInvoice.data[0].id, DEFAULT_RETRY_CONFIG)
        }
      }
    }
  }

  private static async onSubscriptionDeleted(
    subscription: Stripe.Subscription
  ): Promise<void> {
    console.log(`Subscription deleted: ${subscription.id}`)
    // Send cancellation confirmation email
  }

  private static async onTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    console.log(`Trial ending soon for subscription: ${subscription.id}`)
    // Send trial ending reminder email
  }
}

/**
 * Dunning Management System
 *
 * Handles automated recovery of failed payments
 */
export class DunningManager {
  /**
   * Get dunning status for subscription
   */
  static async getDunningStatus(subscriptionId: string) {
    const failures = await db.query.paymentFailures.findMany({
      where: and(
        eq(paymentFailures.subscriptionId, subscriptionId),
        isNull(paymentFailures.resolvedAt)
      ),
      orderBy: (paymentFailures, { desc }) => [desc(paymentFailures.createdAt)],
    })

    if (failures.length === 0) {
      return {
        status: 'healthy',
        failureCount: 0,
      }
    }

    const latestFailure = failures[0]

    return {
      status: latestFailure.retryCount >= DEFAULT_RETRY_CONFIG.maxAttempts ? 'critical' : 'warning',
      failureCount: latestFailure.retryCount,
      nextRetryAt: latestFailure.nextRetryAt,
      maxAttempts: DEFAULT_RETRY_CONFIG.maxAttempts,
    }
  }

  /**
   * Manually trigger payment retry
   */
  static async manualRetry(subscriptionId: string): Promise<PaymentResult> {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, subscriptionId),
    })

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    // Get latest open invoice
    const openInvoices = await stripe.invoices.list({
      subscription: subscription.stripeSubscriptionId,
      status: 'open',
      limit: 1,
    })

    if (openInvoices.data.length === 0) {
      return {
        success: false,
        status: 'no_open_invoice',
        error: 'No open invoice found for this subscription',
      }
    }

    return PaymentHandler.retryFailedPayment(openInvoices.data[0].id)
  }
}
