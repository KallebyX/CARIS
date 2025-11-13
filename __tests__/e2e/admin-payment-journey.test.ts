/**
 * End-to-End Tests: Admin and Payment Journeys
 *
 * Combined E2E tests for:
 * - Admin user management
 * - Payment and subscription flows
 */

import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '@/test-utils/db-helpers'
import { PGlite } from '@electric-sql/pglite'

describe('Admin and Payment Journeys (E2E)', () => {
  let testDb: PGlite

  beforeAll(async () => {
    testDb = await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearTestDatabase()
  })

  describe('Admin Journey', () => {
    it('should manage platform users and generate system reports', async () => {
      // STEP 1: Create admin
      const adminResult = await testDb.query(
        `INSERT INTO users (name, email, password_hash, role, is_global_admin)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['Admin Master', 'admin@caris.com', 'hashed', 'admin', true]
      )
      const adminId = adminResult.rows[0].id

      // STEP 2: Create test clinic
      const clinicResult = await testDb.query(
        `INSERT INTO clinics (name, slug, owner_id, status, plan_type)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['Admin Test Clinic', 'admin-clinic', adminId, 'active', 'professional']
      )
      const clinicId = clinicResult.rows[0].id

      // STEP 3: Create users of different roles
      await testDb.query(
        `INSERT INTO users (name, email, password_hash, role, status)
         VALUES
           ($1, $2, $3, $4, $5),
           ($6, $7, $8, $9, $10),
           ($11, $12, $13, $14, $15)`,
        [
          'Dr. Admin Test', 'psychologist@admin.com', 'hashed', 'psychologist', 'active',
          'Patient Admin', 'patient@admin.com', 'hashed', 'patient', 'active',
          'Suspended User', 'suspended@admin.com', 'hashed', 'patient', 'suspended'
        ]
      )

      // STEP 4: Generate system statistics
      const statsResult = await testDb.query(
        `SELECT
           (SELECT COUNT(*) FROM users) as total_users,
           (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
           (SELECT COUNT(*) FROM users WHERE status = 'suspended') as suspended_users,
           (SELECT COUNT(*) FROM clinics WHERE status = 'active') as active_clinics`,
        []
      )

      const stats = statsResult.rows[0]
      expect(parseInt(stats.total_users)).toBeGreaterThanOrEqual(4)
      expect(parseInt(stats.active_users)).toBeGreaterThanOrEqual(3)
      expect(parseInt(stats.suspended_users)).toBeGreaterThanOrEqual(1)
      expect(parseInt(stats.active_clinics)).toBeGreaterThanOrEqual(1)

      // STEP 5: Audit log review
      await testDb.query(
        `INSERT INTO audit_logs (
          user_id, action, resource, severity, compliance_related
        )
         VALUES ($1, $2, $3, $4, $5)`,
        [adminId, 'export', 'user_data', 'warning', true]
      )

      const auditResult = await testDb.query(
        `SELECT COUNT(*) as count FROM audit_logs
         WHERE user_id = $1 AND compliance_related = true`,
        [adminId]
      )

      expect(parseInt(auditResult.rows[0].count)).toBeGreaterThan(0)
    })
  })

  describe('Payment Journey', () => {
    it('should complete full subscription lifecycle from trial to paid', async () => {
      // STEP 1: Create psychologist user
      const userResult = await testDb.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Dr. Payment', 'payment@test.com', 'hashed', 'psychologist']
      )
      const userId = userResult.rows[0].id

      // STEP 2: Create subscription plan
      await testDb.query(
        `INSERT INTO subscription_plans (
          id, name, description, price_monthly,
          stripe_price_id_monthly, features, is_active
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'professional',
          'Professional',
          'For professionals',
          9900,
          'price_test_123',
          JSON.stringify(['Unlimited patients', 'AI insights']),
          true
        ]
      )

      // STEP 3: Create Stripe customer
      const customerResult = await testDb.query(
        `INSERT INTO customers (user_id, stripe_customer_id, email)
         VALUES ($1, $2, $3) RETURNING id`,
        [userId, 'cus_payment_test', 'payment@test.com']
      )
      const customerId = customerResult.rows[0].id

      // STEP 4: Start trial subscription
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      const subscriptionResult = await testDb.query(
        `INSERT INTO subscriptions (
          user_id, customer_id, stripe_subscription_id, stripe_customer_id,
          status, plan_id, plan_name, price_id,
          current_period_start, current_period_end
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          userId, customerId, 'sub_trial', 'cus_payment_test',
          'trialing', 'professional', 'Professional', 'price_test_123',
          new Date(), trialEnd
        ]
      )
      const subscriptionId = subscriptionResult.rows[0].id

      // STEP 5: Trial converts to paid
      await testDb.query(
        `UPDATE subscriptions
         SET status = 'active', current_period_start = $1, current_period_end = $2
         WHERE id = $3`,
        [trialEnd, new Date(trialEnd.getTime() + 30 * 24 * 60 * 60 * 1000), subscriptionId]
      )

      // STEP 6: Process first payment
      const paymentResult = await testDb.query(
        `INSERT INTO payments (
          user_id, subscription_id, stripe_payment_intent_id,
          amount, currency, status, description
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          userId, subscriptionId, 'pi_first_payment',
          9900, 'brl', 'succeeded', 'Professional Plan - First Month'
        ]
      )

      // STEP 7: Generate invoice
      await testDb.query(
        `INSERT INTO invoices (
          user_id, subscription_id, stripe_invoice_id, invoice_number,
          status, amount_due, amount_paid, currency, paid_at
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId, subscriptionId, 'in_first', 'INV-2024-001',
          'paid', 9900, 9900, 'brl', new Date()
        ]
      )

      // STEP 8: Process subsequent monthly payments
      for (let month = 2; month <= 3; month++) {
        await testDb.query(
          `INSERT INTO payments (
            user_id, subscription_id, stripe_payment_intent_id,
            amount, currency, status
          )
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, subscriptionId, `pi_month_${month}`, 9900, 'brl', 'succeeded']
        )

        await testDb.query(
          `INSERT INTO invoices (
            user_id, subscription_id, stripe_invoice_id, invoice_number,
            status, amount_due, amount_paid, currency, paid_at
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            userId, subscriptionId, `in_month_${month}`, `INV-2024-00${month}`,
            'paid', 9900, 9900, 'brl', new Date()
          ]
        )
      }

      // STEP 9: User cancels subscription (at period end)
      await testDb.query(
        `UPDATE subscriptions
         SET cancel_at_period_end = true, canceled_at = $1
         WHERE id = $2`,
        [new Date(), subscriptionId]
      )

      // FINAL VERIFICATION
      const paymentHistoryResult = await testDb.query(
        `SELECT
           (SELECT COUNT(*) FROM payments WHERE user_id = $1 AND status = 'succeeded') as successful_payments,
           (SELECT COUNT(*) FROM invoices WHERE user_id = $1 AND status = 'paid') as paid_invoices,
           (SELECT SUM(amount) FROM payments WHERE user_id = $1 AND status = 'succeeded') as total_paid
         FROM users WHERE id = $1`,
        [userId]
      )

      const history = paymentHistoryResult.rows[0]
      expect(parseInt(history.successful_payments)).toBe(3)
      expect(parseInt(history.paid_invoices)).toBe(3)
      expect(parseInt(history.total_paid)).toBe(29700) // 3 months * $99

      const subscriptionCheck = await testDb.query(
        `SELECT cancel_at_period_end FROM subscriptions WHERE id = $1`,
        [subscriptionId]
      )

      expect(subscriptionCheck.rows[0].cancel_at_period_end).toBe(true)
    })

    it('should handle payment failure and recovery', async () => {
      // STEP 1: Setup user with subscription
      const userResult = await testDb.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Dr. Payment Fail', 'fail@test.com', 'hashed', 'psychologist']
      )
      const userId = userResult.rows[0].id

      const customerResult = await testDb.query(
        `INSERT INTO customers (user_id, stripe_customer_id, email)
         VALUES ($1, $2, $3) RETURNING id`,
        [userId, 'cus_fail', 'fail@test.com']
      )
      const customerId = customerResult.rows[0].id

      const subscriptionResult = await testDb.query(
        `INSERT INTO subscriptions (
          user_id, customer_id, stripe_subscription_id, stripe_customer_id,
          status, plan_id, plan_name, price_id,
          current_period_start, current_period_end
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          userId, customerId, 'sub_fail', 'cus_fail',
          'active', 'professional', 'Professional', 'price_test',
          new Date('2024-01-01'), new Date('2024-02-01')
        ]
      )
      const subscriptionId = subscriptionResult.rows[0].id

      // STEP 2: Payment fails
      const failedPaymentResult = await testDb.query(
        `INSERT INTO payments (
          user_id, subscription_id, stripe_payment_intent_id,
          amount, currency, status, failure_reason
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [userId, subscriptionId, 'pi_failed', 9900, 'brl', 'failed', 'insufficient_funds']
      )
      const paymentId = failedPaymentResult.rows[0].id

      // STEP 3: Record failure and schedule retry
      await testDb.query(
        `INSERT INTO payment_failures (
          user_id, subscription_id, payment_id,
          failure_code, failure_message, retry_count, next_retry_at
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId, subscriptionId, paymentId,
          'insufficient_funds', 'Your card has insufficient funds',
          1, new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        ]
      )

      // STEP 4: Update subscription status
      await testDb.query(
        `UPDATE subscriptions SET status = 'past_due' WHERE id = $1`,
        [subscriptionId]
      )

      // STEP 5: Retry succeeds
      const retryPaymentResult = await testDb.query(
        `INSERT INTO payments (
          user_id, subscription_id, stripe_payment_intent_id,
          amount, currency, status
        )
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [userId, subscriptionId, 'pi_retry_success', 9900, 'brl', 'succeeded']
      )

      // STEP 6: Resolve failure
      await testDb.query(
        `UPDATE payment_failures SET resolved_at = $1
         WHERE payment_id = $2`,
        [new Date(), paymentId]
      )

      await testDb.query(
        `UPDATE subscriptions SET status = 'active' WHERE id = $1`,
        [subscriptionId]
      )

      // VERIFICATION
      const failureCheck = await testDb.query(
        `SELECT resolved_at FROM payment_failures WHERE payment_id = $1`,
        [paymentId]
      )

      expect(failureCheck.rows[0].resolved_at).toBeTruthy()

      const subscriptionCheck = await testDb.query(
        `SELECT status FROM subscriptions WHERE id = $1`,
        [subscriptionId]
      )

      expect(subscriptionCheck.rows[0].status).toBe('active')
    })
  })
})
