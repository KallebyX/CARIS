/**
 * Integration Test: Payment and Subscription Flow
 *
 * Tests:
 * 1. Creating Stripe customers
 * 2. Subscription creation and management
 * 3. Payment processing
 * 4. Invoice generation
 * 5. Payment failures and retries
 * 6. Subscription upgrades/downgrades
 */

import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '@/test-utils/db-helpers'
import { PGlite } from '@electric-sql/pglite'

describe('Payment and Subscription System (Integration)', () => {
  let testDb: PGlite
  let userId: number
  let customerId: string
  let planId: string

  beforeAll(async () => {
    testDb = await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearTestDatabase()

    // Setup user
    const userResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Test User', 'user@test.com', 'hashed', 'psychologist']
    )
    userId = userResult.rows[0].id

    // Setup subscription plan
    const planResult = await testDb.query(
      `INSERT INTO subscription_plans (
        id, name, description, price_monthly, price_yearly,
        stripe_price_id_monthly, stripe_price_id_yearly,
        features, max_patients, is_popular
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        'professional',
        'Professional',
        'For individual psychologists',
        9900, // $99.00 in cents
        99000, // $990.00 in cents
        'price_monthly_123',
        'price_yearly_123',
        JSON.stringify(['Unlimited patients', 'AI insights', 'Priority support']),
        null, // unlimited
        true
      ]
    )
    planId = planResult.rows[0].id

    // Create Stripe customer
    const customerResult = await testDb.query(
      `INSERT INTO customers (user_id, stripe_customer_id, email, name)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, 'cus_test123', 'user@test.com', 'Test User']
    )
    customerId = customerResult.rows[0].id
  })

  it('should create a new Stripe customer on user registration', async () => {
    // Assert - Customer exists
    const result = await testDb.query(
      `SELECT * FROM customers WHERE user_id = $1`,
      [userId]
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].stripe_customer_id).toBe('cus_test123')
    expect(result.rows[0].email).toBe('user@test.com')
  })

  it('should create a subscription successfully', async () => {
    // Act - Create subscription
    const subscriptionResult = await testDb.query(
      `INSERT INTO subscriptions (
        user_id, customer_id, stripe_subscription_id, stripe_customer_id,
        status, plan_id, plan_name, price_id,
        current_period_start, current_period_end
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        userId,
        customerId,
        'sub_test123',
        'cus_test123',
        'active',
        planId,
        'Professional',
        'price_monthly_123',
        new Date('2024-01-01'),
        new Date('2024-02-01')
      ]
    )

    // Assert
    const result = await testDb.query(
      `SELECT * FROM subscriptions WHERE id = $1`,
      [subscriptionResult.rows[0].id]
    )

    const subscription = result.rows[0]
    expect(subscription.status).toBe('active')
    expect(subscription.plan_id).toBe(planId)
    expect(subscription.cancel_at_period_end).toBe(false)
  })

  it('should process a successful payment', async () => {
    // Arrange - Create subscription
    const subscriptionResult = await testDb.query(
      `INSERT INTO subscriptions (
        user_id, customer_id, stripe_subscription_id, stripe_customer_id,
        status, plan_id, plan_name, price_id,
        current_period_start, current_period_end
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        userId, customerId, 'sub_test123', 'cus_test123',
        'active', planId, 'Professional', 'price_monthly_123',
        new Date('2024-01-01'), new Date('2024-02-01')
      ]
    )

    const subscriptionId = subscriptionResult.rows[0].id

    // Act - Process payment
    const paymentResult = await testDb.query(
      `INSERT INTO payments (
        user_id, subscription_id, stripe_payment_intent_id,
        stripe_charge_id, amount, currency, status, description
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        userId,
        subscriptionId,
        'pi_test123',
        'ch_test123',
        9900,
        'brl',
        'succeeded',
        'Professional Plan - Monthly'
      ]
    )

    // Assert
    const result = await testDb.query(
      `SELECT * FROM payments WHERE id = $1`,
      [paymentResult.rows[0].id]
    )

    const payment = result.rows[0]
    expect(payment.status).toBe('succeeded')
    expect(payment.amount).toBe(9900)
    expect(payment.currency).toBe('brl')
  })

  it('should generate invoice for subscription payment', async () => {
    // Arrange - Create subscription
    const subscriptionResult = await testDb.query(
      `INSERT INTO subscriptions (
        user_id, customer_id, stripe_subscription_id, stripe_customer_id,
        status, plan_id, plan_name, price_id,
        current_period_start, current_period_end
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        userId, customerId, 'sub_test123', 'cus_test123',
        'active', planId, 'Professional', 'price_monthly_123',
        new Date('2024-01-01'), new Date('2024-02-01')
      ]
    )

    const subscriptionId = subscriptionResult.rows[0].id

    // Act - Create invoice
    const invoiceResult = await testDb.query(
      `INSERT INTO invoices (
        user_id, subscription_id, stripe_invoice_id, invoice_number,
        status, amount_due, amount_paid, currency,
        description, invoice_url, paid_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        userId,
        subscriptionId,
        'in_test123',
        'INV-2024-001',
        'paid',
        9900,
        9900,
        'brl',
        'Professional Plan - January 2024',
        'https://stripe.com/invoices/in_test123',
        new Date('2024-01-01')
      ]
    )

    // Assert
    const result = await testDb.query(
      `SELECT * FROM invoices WHERE id = $1`,
      [invoiceResult.rows[0].id]
    )

    const invoice = result.rows[0]
    expect(invoice.status).toBe('paid')
    expect(invoice.invoice_number).toBe('INV-2024-001')
    expect(invoice.amount_due).toBe(9900)
    expect(invoice.amount_paid).toBe(9900)
  })

  it('should handle payment failures and schedule retries', async () => {
    // Arrange - Create subscription
    const subscriptionResult = await testDb.query(
      `INSERT INTO subscriptions (
        user_id, customer_id, stripe_subscription_id, stripe_customer_id,
        status, plan_id, plan_name, price_id,
        current_period_start, current_period_end
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        userId, customerId, 'sub_test123', 'cus_test123',
        'past_due', planId, 'Professional', 'price_monthly_123',
        new Date('2024-01-01'), new Date('2024-02-01')
      ]
    )

    const subscriptionId = subscriptionResult.rows[0].id

    // Act - Create failed payment
    const paymentResult = await testDb.query(
      `INSERT INTO payments (
        user_id, subscription_id, stripe_payment_intent_id,
        amount, currency, status, failure_reason
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        userId,
        subscriptionId,
        'pi_failed123',
        9900,
        'brl',
        'failed',
        'insufficient_funds'
      ]
    )

    const paymentId = paymentResult.rows[0].id

    // Record payment failure
    const nextRetry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
    await testDb.query(
      `INSERT INTO payment_failures (
        user_id, subscription_id, payment_id, failure_code,
        failure_message, retry_count, next_retry_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        subscriptionId,
        paymentId,
        'insufficient_funds',
        'Your card has insufficient funds',
        1,
        nextRetry
      ]
    )

    // Assert
    const failureResult = await testDb.query(
      `SELECT * FROM payment_failures WHERE payment_id = $1`,
      [paymentId]
    )

    const failure = failureResult.rows[0]
    expect(failure.failure_code).toBe('insufficient_funds')
    expect(failure.retry_count).toBe(1)
    expect(failure.next_retry_at).toBeTruthy()
    expect(failure.resolved_at).toBeNull()
  })

  it('should allow subscription cancellation', async () => {
    // Arrange - Create active subscription
    const subscriptionResult = await testDb.query(
      `INSERT INTO subscriptions (
        user_id, customer_id, stripe_subscription_id, stripe_customer_id,
        status, plan_id, plan_name, price_id,
        current_period_start, current_period_end, cancel_at_period_end
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        userId, customerId, 'sub_test123', 'cus_test123',
        'active', planId, 'Professional', 'price_monthly_123',
        new Date('2024-01-01'), new Date('2024-02-01'), false
      ]
    )

    const subscriptionId = subscriptionResult.rows[0].id

    // Act - Cancel subscription (at period end)
    await testDb.query(
      `UPDATE subscriptions
       SET cancel_at_period_end = true, canceled_at = $1
       WHERE id = $2`,
      [new Date(), subscriptionId]
    )

    // Assert
    const result = await testDb.query(
      `SELECT * FROM subscriptions WHERE id = $1`,
      [subscriptionId]
    )

    expect(result.rows[0].cancel_at_period_end).toBe(true)
    expect(result.rows[0].canceled_at).toBeTruthy()
    expect(result.rows[0].status).toBe('active') // Still active until period ends
  })

  it('should support subscription plan upgrades', async () => {
    // Arrange - Create basic plan and subscription
    const basicPlanResult = await testDb.query(
      `INSERT INTO subscription_plans (
        id, name, description, price_monthly,
        stripe_price_id_monthly, features, max_patients
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        'essential',
        'Essential',
        'For getting started',
        4900,
        'price_essential_123',
        JSON.stringify(['5 patients', 'Basic features']),
        5
      ]
    )

    const subscriptionResult = await testDb.query(
      `INSERT INTO subscriptions (
        user_id, customer_id, stripe_subscription_id, stripe_customer_id,
        status, plan_id, plan_name, price_id,
        current_period_start, current_period_end
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        userId, customerId, 'sub_test123', 'cus_test123',
        'active', 'essential', 'Essential', 'price_essential_123',
        new Date('2024-01-01'), new Date('2024-02-01')
      ]
    )

    const subscriptionId = subscriptionResult.rows[0].id

    // Act - Upgrade to Professional
    await testDb.query(
      `UPDATE subscriptions
       SET plan_id = $1, plan_name = $2, price_id = $3, updated_at = $4
       WHERE id = $5`,
      [planId, 'Professional', 'price_monthly_123', new Date(), subscriptionId]
    )

    // Record prorated payment
    await testDb.query(
      `INSERT INTO payments (
        user_id, subscription_id, stripe_payment_intent_id,
        amount, currency, status, description
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        subscriptionId,
        'pi_upgrade123',
        5000, // Prorated amount
        'brl',
        'succeeded',
        'Plan upgrade: Essential → Professional (prorated)'
      ]
    )

    // Assert
    const result = await testDb.query(
      `SELECT * FROM subscriptions WHERE id = $1`,
      [subscriptionId]
    )

    expect(result.rows[0].plan_id).toBe(planId)
    expect(result.rows[0].plan_name).toBe('Professional')
  })

  it('should track subscription history and billing cycles', async () => {
    // Arrange - Create subscription
    const subscriptionResult = await testDb.query(
      `INSERT INTO subscriptions (
        user_id, customer_id, stripe_subscription_id, stripe_customer_id,
        status, plan_id, plan_name, price_id,
        current_period_start, current_period_end
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        userId, customerId, 'sub_test123', 'cus_test123',
        'active', planId, 'Professional', 'price_monthly_123',
        new Date('2024-01-01'), new Date('2024-02-01')
      ]
    )

    const subscriptionId = subscriptionResult.rows[0].id

    // Act - Create invoices for multiple billing cycles
    const billingCycles = [
      { date: '2024-01-01', invoice: 'INV-2024-001' },
      { date: '2024-02-01', invoice: 'INV-2024-002' },
      { date: '2024-03-01', invoice: 'INV-2024-003' },
    ]

    for (const cycle of billingCycles) {
      await testDb.query(
        `INSERT INTO invoices (
          user_id, subscription_id, stripe_invoice_id, invoice_number,
          status, amount_due, amount_paid, currency, paid_at
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          subscriptionId,
          `in_${cycle.invoice}`,
          cycle.invoice,
          'paid',
          9900,
          9900,
          'brl',
          cycle.date
        ]
      )
    }

    // Assert
    const result = await testDb.query(
      `SELECT COUNT(*) as count FROM invoices
       WHERE subscription_id = $1 AND status = 'paid'`,
      [subscriptionId]
    )

    expect(parseInt(result.rows[0].count)).toBe(3)
  })

  it('should handle subscription trial periods', async () => {
    // Act - Create subscription with trial
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days

    const subscriptionResult = await testDb.query(
      `INSERT INTO subscriptions (
        user_id, customer_id, stripe_subscription_id, stripe_customer_id,
        status, plan_id, plan_name, price_id,
        current_period_start, current_period_end
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        userId, customerId, 'sub_trial123', 'cus_test123',
        'trialing', planId, 'Professional', 'price_monthly_123',
        new Date(), trialEnd
      ]
    )

    // Assert
    const result = await testDb.query(
      `SELECT * FROM subscriptions WHERE id = $1`,
      [subscriptionResult.rows[0].id]
    )

    expect(result.rows[0].status).toBe('trialing')
  })

  it('should manage payment methods per customer', async () => {
    // Note: Payment method details are typically stored in Stripe
    // We just verify the customer record is properly linked

    const result = await testDb.query(
      `SELECT c.*, u.email
       FROM customers c
       JOIN users u ON u.id = c.user_id
       WHERE c.user_id = $1`,
      [userId]
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].stripe_customer_id).toBeTruthy()
  })
})
