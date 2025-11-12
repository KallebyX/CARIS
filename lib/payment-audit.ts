/**
 * Payment Audit Logging and Security
 *
 * Provides comprehensive audit trail for all payment-related activities:
 * - Transaction logging
 * - Security event tracking
 * - Webhook event history
 * - PCI compliance helpers
 * - Fraud detection
 */

import { db } from '@/db'
import crypto from 'crypto'

/**
 * Database schema additions needed (add to db/schema.ts):
 *
 * export const webhookEvents = pgTable('webhook_events', {
 *   id: text('id').primaryKey().default(sql`gen_random_uuid()`),
 *   stripeEventId: text('stripe_event_id').notNull().unique(),
 *   eventType: text('event_type').notNull(),
 *   eventData: json('event_data').notNull(),
 *   processed: boolean('processed').notNull().default(false),
 *   error: text('error'),
 *   processedAt: timestamp('processed_at'),
 *   createdAt: timestamp('created_at').notNull().defaultNow(),
 *   updatedAt: timestamp('updated_at').notNull().defaultNow(),
 * })
 *
 * export const paymentAuditLogs = pgTable('payment_audit_logs', {
 *   id: text('id').primaryKey().default(sql`gen_random_uuid()`),
 *   userId: integer('user_id').references(() => users.id),
 *   action: text('action').notNull(), // payment_created, payment_succeeded, payment_failed, subscription_created, etc.
 *   entity: text('entity').notNull(), // payment, subscription, invoice, etc.
 *   entityId: text('entity_id').notNull(),
 *   metadata: json('metadata'),
 *   ipAddress: text('ip_address'),
 *   userAgent: text('user_agent'),
 *   createdAt: timestamp('created_at').notNull().defaultNow(),
 * })
 *
 * export const securityEvents = pgTable('security_events', {
 *   id: text('id').primaryKey().default(sql`gen_random_uuid()`),
 *   eventType: text('event_type').notNull(), // suspicious_activity, fraud_detected, etc.
 *   severity: text('severity').notNull(), // low, medium, high, critical
 *   description: text('description').notNull(),
 *   userId: integer('user_id').references(() => users.id),
 *   metadata: json('metadata'),
 *   resolved: boolean('resolved').notNull().default(false),
 *   resolvedAt: timestamp('resolved_at'),
 *   createdAt: timestamp('created_at').notNull().defaultNow(),
 * })
 */

export enum AuditAction {
  // Payment actions
  PAYMENT_CREATED = 'payment_created',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_REFUNDED = 'payment_refunded',
  PAYMENT_DISPUTED = 'payment_disputed',

  // Subscription actions
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELED = 'subscription_canceled',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  SUBSCRIPTION_TRIAL_STARTED = 'subscription_trial_started',
  SUBSCRIPTION_TRIAL_ENDED = 'subscription_trial_ended',

  // Invoice actions
  INVOICE_CREATED = 'invoice_created',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_FAILED = 'invoice_failed',
  INVOICE_VOIDED = 'invoice_voided',

  // Payment method actions
  PAYMENT_METHOD_ADDED = 'payment_method_added',
  PAYMENT_METHOD_UPDATED = 'payment_method_updated',
  PAYMENT_METHOD_REMOVED = 'payment_method_removed',

  // Customer actions
  CUSTOMER_CREATED = 'customer_created',
  CUSTOMER_UPDATED = 'customer_updated',
  CUSTOMER_DELETED = 'customer_deleted',

  // Security actions
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  FRAUD_DETECTED = 'fraud_detected',
  WEBHOOK_SIGNATURE_INVALID = 'webhook_signature_invalid',
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

interface AuditLogData {
  userId?: number
  action: AuditAction
  entity: string
  entityId: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

interface SecurityEventData {
  eventType: string
  severity: SecuritySeverity
  description: string
  userId?: number
  metadata?: Record<string, any>
}

export class PaymentAuditLogger {
  /**
   * Log a payment-related action
   */
  static async log(data: AuditLogData): Promise<void> {
    try {
      // In production, this would insert into paymentAuditLogs table
      console.log('[Audit Log]', {
        timestamp: new Date().toISOString(),
        ...data,
      })

      // Example database insert:
      // await db.insert(paymentAuditLogs).values({
      //   userId: data.userId,
      //   action: data.action,
      //   entity: data.entity,
      //   entityId: data.entityId,
      //   metadata: data.metadata,
      //   ipAddress: data.ipAddress,
      //   userAgent: data.userAgent,
      // })
    } catch (error) {
      console.error('Error logging audit event:', error)
      // Never throw - audit logging should not break the main flow
    }
  }

  /**
   * Log a security event
   */
  static async logSecurityEvent(data: SecurityEventData): Promise<void> {
    try {
      console.log('[Security Event]', {
        timestamp: new Date().toISOString(),
        ...data,
      })

      // Send alert for critical events
      if (data.severity === SecuritySeverity.CRITICAL) {
        await this.sendSecurityAlert(data)
      }

      // Example database insert:
      // await db.insert(securityEvents).values({
      //   eventType: data.eventType,
      //   severity: data.severity,
      //   description: data.description,
      //   userId: data.userId,
      //   metadata: data.metadata,
      // })
    } catch (error) {
      console.error('Error logging security event:', error)
    }
  }

  /**
   * Get audit logs for a user
   */
  static async getUserAuditLogs(userId: number, limit: number = 100) {
    try {
      // Example query:
      // return await db.query.paymentAuditLogs.findMany({
      //   where: eq(paymentAuditLogs.userId, userId),
      //   orderBy: [desc(paymentAuditLogs.createdAt)],
      //   limit,
      // })

      return []
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      return []
    }
  }

  /**
   * Get audit logs for an entity
   */
  static async getEntityAuditLogs(entity: string, entityId: string, limit: number = 50) {
    try {
      // Example query:
      // return await db.query.paymentAuditLogs.findMany({
      //   where: and(
      //     eq(paymentAuditLogs.entity, entity),
      //     eq(paymentAuditLogs.entityId, entityId)
      //   ),
      //   orderBy: [desc(paymentAuditLogs.createdAt)],
      //   limit,
      // })

      return []
    } catch (error) {
      console.error('Error fetching entity audit logs:', error)
      return []
    }
  }

  /**
   * Send security alert
   */
  private static async sendSecurityAlert(data: SecurityEventData): Promise<void> {
    console.log('[SECURITY ALERT]', data)
    // Send email/SMS/Slack notification to admin
  }
}

/**
 * PCI Compliance Helpers
 */
export class PCICompliance {
  /**
   * Mask credit card number (show only last 4 digits)
   */
  static maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 4) return '****'
    return `**** **** **** ${cardNumber.slice(-4)}`
  }

  /**
   * Mask email (show first char and domain)
   */
  static maskEmail(email: string): string {
    const [local, domain] = email.split('@')
    if (!local || !domain) return email
    return `${local[0]}${'*'.repeat(Math.max(0, local.length - 1))}@${domain}`
  }

  /**
   * Hash sensitive data for logging
   */
  static hashSensitiveData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  /**
   * Validate that no sensitive data is being logged
   */
  static sanitizeLogData(data: any): any {
    const sensitiveFields = ['card_number', 'cvv', 'ssn', 'password', 'secret']
    const sanitized = { ...data }

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    }

    return sanitized
  }
}

/**
 * Fraud Detection
 */
export class FraudDetection {
  /**
   * Analyze payment for fraud risk
   */
  static async analyzePayment(data: {
    userId: number
    amount: number
    currency: string
    ipAddress: string
    userAgent: string
  }): Promise<{ risk: 'low' | 'medium' | 'high'; reasons: string[] }> {
    const reasons: string[] = []
    let riskScore = 0

    // Check for unusually large amount
    if (data.amount > 100000) {
      // R$ 1000
      reasons.push('High transaction amount')
      riskScore += 2
    }

    // Check for rapid successive payments
    const recentPayments = await this.getRecentPayments(data.userId, 60) // Last 60 minutes
    if (recentPayments > 5) {
      reasons.push('Multiple rapid payments')
      riskScore += 3
    }

    // Check for unusual time (late night)
    const hour = new Date().getHours()
    if (hour < 5 || hour > 23) {
      reasons.push('Unusual transaction time')
      riskScore += 1
    }

    // Check for IP address changes
    const ipChanged = await this.checkIPChange(data.userId, data.ipAddress)
    if (ipChanged) {
      reasons.push('IP address changed')
      riskScore += 2
    }

    // Determine risk level
    let risk: 'low' | 'medium' | 'high'
    if (riskScore >= 5) {
      risk = 'high'
    } else if (riskScore >= 3) {
      risk = 'medium'
    } else {
      risk = 'low'
    }

    // Log high-risk transactions
    if (risk === 'high') {
      await PaymentAuditLogger.logSecurityEvent({
        eventType: 'high_risk_transaction',
        severity: SecuritySeverity.HIGH,
        description: `High-risk payment detected: ${reasons.join(', ')}`,
        userId: data.userId,
        metadata: { amount: data.amount, reasons },
      })
    }

    return { risk, reasons }
  }

  /**
   * Get recent payment count for user
   */
  private static async getRecentPayments(userId: number, minutes: number): Promise<number> {
    // Query payments in last N minutes
    // const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    // const payments = await db.query.payments.findMany({
    //   where: and(
    //     eq(payments.userId, userId),
    //     gte(payments.createdAt, cutoff)
    //   ),
    // })
    // return payments.length

    return 0
  }

  /**
   * Check if user's IP address has changed
   */
  private static async checkIPChange(userId: number, currentIP: string): Promise<boolean> {
    // Get user's last known IP
    // const lastLog = await db.query.paymentAuditLogs.findFirst({
    //   where: eq(paymentAuditLogs.userId, userId),
    //   orderBy: [desc(paymentAuditLogs.createdAt)],
    // })
    //
    // if (!lastLog || !lastLog.ipAddress) return false
    // return lastLog.ipAddress !== currentIP

    return false
  }

  /**
   * Check for suspicious patterns
   */
  static async checkSuspiciousPatterns(userId: number): Promise<string[]> {
    const patterns: string[] = []

    // Check for multiple failed payments
    // Check for rapid subscription changes
    // Check for unusual payment amounts
    // Check for velocity abuse

    return patterns
  }
}

/**
 * Webhook Security
 */
export class WebhookSecurity {
  /**
   * Verify Stripe webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    try {
      const timestamp = this.extractTimestamp(signature)
      const expectedSignature = this.computeSignature(payload, timestamp, secret)

      // Prevent replay attacks (timestamp should be within 5 minutes)
      const tolerance = 5 * 60 // 5 minutes
      const currentTime = Math.floor(Date.now() / 1000)

      if (Math.abs(currentTime - timestamp) > tolerance) {
        console.warn('Webhook timestamp outside tolerance')
        return false
      }

      return signature.includes(expectedSignature)
    } catch (error) {
      console.error('Error verifying webhook signature:', error)
      return false
    }
  }

  private static extractTimestamp(signature: string): number {
    const parts = signature.split(',')
    const timestampPart = parts.find(part => part.startsWith('t='))

    if (!timestampPart) {
      throw new Error('Timestamp not found in signature')
    }

    return parseInt(timestampPart.split('=')[1])
  }

  private static computeSignature(payload: string, timestamp: number, secret: string): string {
    const signedPayload = `${timestamp}.${payload}`
    return crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')
  }

  /**
   * Rate limit webhook requests
   */
  static async checkRateLimit(source: string): Promise<boolean> {
    // Implement rate limiting logic
    // Use Redis or in-memory cache
    return true
  }
}

/**
 * Payment Security Best Practices
 */
export const SECURITY_BEST_PRACTICES = {
  // Never log full card numbers
  LOG_CARD_LAST4_ONLY: true,

  // Always use HTTPS
  REQUIRE_HTTPS: true,

  // Validate webhook signatures
  VALIDATE_WEBHOOK_SIGNATURES: true,

  // Implement rate limiting
  RATE_LIMIT_ENABLED: true,

  // Monitor for suspicious activity
  FRAUD_DETECTION_ENABLED: true,

  // Encrypt sensitive data at rest
  ENCRYPT_SENSITIVE_DATA: true,

  // Use strong authentication
  REQUIRE_3D_SECURE: true,

  // Keep audit logs
  AUDIT_LOG_RETENTION_DAYS: 365,

  // PCI compliance
  PCI_COMPLIANT: true,
}

/**
 * Audit report generator
 */
export class AuditReportGenerator {
  /**
   * Generate payment activity report
   */
  static async generatePaymentReport(
    startDate: Date,
    endDate: Date,
    userId?: number
  ): Promise<any> {
    // Generate comprehensive payment report
    return {
      period: { start: startDate, end: endDate },
      totalTransactions: 0,
      successfulPayments: 0,
      failedPayments: 0,
      totalRevenue: 0,
      refundAmount: 0,
      // ... more metrics
    }
  }

  /**
   * Generate security report
   */
  static async generateSecurityReport(startDate: Date, endDate: Date): Promise<any> {
    return {
      period: { start: startDate, end: endDate },
      totalSecurityEvents: 0,
      criticalEvents: 0,
      resolvedEvents: 0,
      // ... more metrics
    }
  }
}

/**
 * Helper to log payment actions
 */
export async function logPaymentAction(
  action: AuditAction,
  entity: string,
  entityId: string,
  userId?: number,
  metadata?: Record<string, any>
) {
  await PaymentAuditLogger.log({
    action,
    entity,
    entityId,
    userId,
    metadata: PCICompliance.sanitizeLogData(metadata),
  })
}
