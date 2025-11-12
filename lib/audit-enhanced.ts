/**
 * Enhanced Audit Logging System
 *
 * Extends the base audit.ts with:
 * - Security event logging
 * - Failed login attempt tracking
 * - Suspicious activity detection
 * - Compliance event logging (LGPD, GDPR, HIPAA)
 * - Real-time alerting for critical events
 *
 * @module audit-enhanced
 */

import { db } from "@/db"
import { auditLogs } from "@/db/schema"
import { logAuditEvent, getRequestInfo, type AuditLogEntry } from "./audit"
import type { NextRequest } from "next/server"

// ================================================================
// SECURITY EVENT TYPES
// ================================================================

export const SECURITY_EVENTS = {
  // Authentication events
  LOGIN_SUCCESS: "security:login_success",
  LOGIN_FAILED: "security:login_failed",
  LOGIN_BRUTE_FORCE: "security:login_brute_force",
  LOGOUT: "security:logout",
  SESSION_EXPIRED: "security:session_expired",
  PASSWORD_CHANGED: "security:password_changed",
  PASSWORD_RESET_REQUESTED: "security:password_reset_requested",
  PASSWORD_RESET_COMPLETED: "security:password_reset_completed",
  TWO_FACTOR_ENABLED: "security:2fa_enabled",
  TWO_FACTOR_DISABLED: "security:2fa_disabled",

  // Authorization events
  UNAUTHORIZED_ACCESS: "security:unauthorized_access",
  PERMISSION_DENIED: "security:permission_denied",
  ROLE_CHANGED: "security:role_changed",
  PRIVILEGE_ESCALATION_ATTEMPT: "security:privilege_escalation",

  // Data access events
  SENSITIVE_DATA_ACCESS: "security:sensitive_data_access",
  BULK_DATA_EXPORT: "security:bulk_data_export",
  DATA_DELETION: "security:data_deletion",
  ENCRYPTION_KEY_ACCESSED: "security:encryption_key_access",

  // Suspicious activities
  RAPID_REQUESTS: "security:rapid_requests",
  SQL_INJECTION_ATTEMPT: "security:sql_injection_attempt",
  XSS_ATTEMPT: "security:xss_attempt",
  CSRF_VIOLATION: "security:csrf_violation",
  PATH_TRAVERSAL_ATTEMPT: "security:path_traversal",
  UNUSUAL_USER_AGENT: "security:unusual_user_agent",
  TOR_ACCESS: "security:tor_access",
  VPN_ACCESS: "security:vpn_access",

  // System events
  CONFIG_CHANGED: "security:config_changed",
  SECRET_ROTATED: "security:secret_rotated",
  ADMIN_ACTION: "security:admin_action",
  BACKUP_CREATED: "security:backup_created",
  BACKUP_RESTORED: "security:backup_restored",
} as const

// ================================================================
// COMPLIANCE EVENT TYPES
// ================================================================

export const COMPLIANCE_EVENTS = {
  // LGPD/GDPR
  CONSENT_GIVEN: "compliance:consent_given",
  CONSENT_WITHDRAWN: "compliance:consent_withdrawn",
  DATA_PORTABILITY_REQUEST: "compliance:data_portability",
  RIGHT_TO_BE_FORGOTTEN: "compliance:right_to_be_forgotten",
  DATA_BREACH: "compliance:data_breach",
  THIRD_PARTY_SHARING: "compliance:third_party_sharing",

  // HIPAA (Health data)
  PHI_ACCESSED: "compliance:phi_accessed",
  PHI_DISCLOSED: "compliance:phi_disclosed",
  PHI_MODIFIED: "compliance:phi_modified",
  PHI_DELETED: "compliance:phi_deleted",
  MINIMUM_NECESSARY_REVIEW: "compliance:minimum_necessary",

  // Audit requirements
  AUDIT_LOG_ACCESSED: "compliance:audit_log_access",
  AUDIT_LOG_EXPORTED: "compliance:audit_log_export",
  RETENTION_POLICY_APPLIED: "compliance:retention_policy",
} as const

// ================================================================
// SUSPICIOUS ACTIVITY DETECTION
// ================================================================

interface SuspiciousActivityRule {
  threshold: number
  timeWindowMs: number
  severity: "low" | "medium" | "high" | "critical"
}

const SUSPICIOUS_ACTIVITY_RULES: Record<string, SuspiciousActivityRule> = {
  failed_logins: {
    threshold: 5,
    timeWindowMs: 15 * 60 * 1000, // 15 minutes
    severity: "high",
  },
  rapid_requests: {
    threshold: 100,
    timeWindowMs: 60 * 1000, // 1 minute
    severity: "medium",
  },
  data_exports: {
    threshold: 3,
    timeWindowMs: 60 * 60 * 1000, // 1 hour
    severity: "high",
  },
  permission_denials: {
    threshold: 10,
    timeWindowMs: 30 * 60 * 1000, // 30 minutes
    severity: "medium",
  },
}

/**
 * Track and detect suspicious activity patterns
 */
export async function detectSuspiciousActivity(
  userId: number | undefined,
  ipAddress: string,
  action: string
): Promise<{
  suspicious: boolean
  reason?: string
  severity?: string
}> {
  const now = new Date()

  // Check failed login attempts
  if (action === SECURITY_EVENTS.LOGIN_FAILED) {
    const rule = SUSPICIOUS_ACTIVITY_RULES.failed_logins
    const recentFailures = await db
      .select()
      .from(auditLogs)
      .where((log) => log.action === SECURITY_EVENTS.LOGIN_FAILED)
      .where((log) => log.ipAddress === ipAddress)
      .where((log) => log.timestamp > new Date(now.getTime() - rule.timeWindowMs))
      .limit(rule.threshold + 1)

    if (recentFailures.length >= rule.threshold) {
      return {
        suspicious: true,
        reason: `${recentFailures.length} failed login attempts in ${rule.timeWindowMs / 60000} minutes`,
        severity: rule.severity,
      }
    }
  }

  // Check rapid requests from same IP
  if (userId) {
    const rule = SUSPICIOUS_ACTIVITY_RULES.rapid_requests
    const recentRequests = await db
      .select()
      .from(auditLogs)
      .where((log) => log.userId === userId)
      .where((log) => log.timestamp > new Date(now.getTime() - rule.timeWindowMs))
      .limit(rule.threshold + 1)

    if (recentRequests.length >= rule.threshold) {
      return {
        suspicious: true,
        reason: `${recentRequests.length} requests in ${rule.timeWindowMs / 1000} seconds`,
        severity: rule.severity,
      }
    }
  }

  return { suspicious: false }
}

// ================================================================
// ENHANCED LOGGING FUNCTIONS
// ================================================================

/**
 * Log security event with automatic suspicious activity detection
 */
export async function logSecurityEvent(
  event: string,
  request: NextRequest | Request,
  metadata?: {
    userId?: number
    success?: boolean
    reason?: string
    [key: string]: any
  }
): Promise<void> {
  const { ipAddress, userAgent } = getRequestInfo(request)

  // Detect suspicious activity
  const suspiciousCheck = await detectSuspiciousActivity(
    metadata?.userId,
    ipAddress,
    event
  )

  const entry: AuditLogEntry = {
    userId: metadata?.userId,
    action: event,
    resourceType: "security",
    metadata: {
      ...metadata,
      suspicious: suspiciousCheck.suspicious,
      suspiciousReason: suspiciousCheck.reason,
      suspiciousSeverity: suspiciousCheck.severity,
    },
    severity: suspiciousCheck.suspicious ? "critical" : "warning",
    complianceRelated: false,
    ipAddress,
    userAgent,
  }

  await logAuditEvent(entry)

  // If suspicious and critical, trigger alert
  if (suspiciousCheck.suspicious && suspiciousCheck.severity === "critical") {
    await triggerSecurityAlert({
      event,
      userId: metadata?.userId,
      ipAddress,
      reason: suspiciousCheck.reason!,
      severity: suspiciousCheck.severity,
    })
  }
}

/**
 * Log compliance event (LGPD, GDPR, HIPAA)
 */
export async function logComplianceEvent(
  event: string,
  userId: number,
  request: NextRequest | Request,
  metadata?: {
    dataType?: string
    purpose?: string
    recipient?: string
    [key: string]: any
  }
): Promise<void> {
  const { ipAddress, userAgent } = getRequestInfo(request)

  const entry: AuditLogEntry = {
    userId,
    action: event,
    resourceType: "compliance",
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
      jurisdiction: "BR", // Brazil (LGPD)
    },
    severity: "info",
    complianceRelated: true,
    ipAddress,
    userAgent,
  }

  await logAuditEvent(entry)
}

/**
 * Log failed login attempt with brute force detection
 */
export async function logFailedLogin(
  email: string,
  request: NextRequest | Request,
  reason: string
): Promise<void> {
  const { ipAddress } = getRequestInfo(request)

  await logSecurityEvent(SECURITY_EVENTS.LOGIN_FAILED, request, {
    success: false,
    email,
    reason,
  })

  // Check if this triggers brute force detection
  const suspiciousCheck = await detectSuspiciousActivity(
    undefined,
    ipAddress,
    SECURITY_EVENTS.LOGIN_FAILED
  )

  if (suspiciousCheck.suspicious) {
    await logSecurityEvent(SECURITY_EVENTS.LOGIN_BRUTE_FORCE, request, {
      email,
      attempts: suspiciousCheck.reason,
      blocked: true,
    })
  }
}

/**
 * Log successful login
 */
export async function logSuccessfulLogin(
  userId: number,
  request: NextRequest | Request,
  metadata?: {
    method?: string
    [key: string]: any
  }
): Promise<void> {
  await logSecurityEvent(SECURITY_EVENTS.LOGIN_SUCCESS, request, {
    userId,
    success: true,
    ...metadata,
  })
}

/**
 * Log data access (for sensitive patient data)
 */
export async function logDataAccess(
  userId: number,
  resourceType: string,
  resourceId: string,
  request: NextRequest | Request,
  purpose?: string
): Promise<void> {
  const { ipAddress, userAgent } = getRequestInfo(request)

  // For mental health data, this is PHI under HIPAA
  const isPHI = ["patient_profile", "session", "diary_entry", "chat_message"].includes(
    resourceType
  )

  const entry: AuditLogEntry = {
    userId,
    action: isPHI ? COMPLIANCE_EVENTS.PHI_ACCESSED : SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
    resourceType,
    resourceId,
    metadata: {
      purpose: purpose || "clinical_care",
      accessTime: new Date().toISOString(),
    },
    severity: "info",
    complianceRelated: isPHI,
    ipAddress,
    userAgent,
  }

  await logAuditEvent(entry)
}

/**
 * Log bulk data export (high risk activity)
 */
export async function logBulkExport(
  userId: number,
  recordCount: number,
  request: NextRequest | Request,
  metadata?: {
    format?: string
    filters?: any
    [key: string]: any
  }
): Promise<void> {
  await logSecurityEvent(SECURITY_EVENTS.BULK_DATA_EXPORT, request, {
    userId,
    recordCount,
    ...metadata,
  })

  await logComplianceEvent(
    COMPLIANCE_EVENTS.DATA_PORTABILITY_REQUEST,
    userId,
    request,
    {
      recordCount,
      ...metadata,
    }
  )
}

/**
 * Log data deletion (irreversible action)
 */
export async function logDataDeletion(
  userId: number,
  resourceType: string,
  resourceId: string,
  request: NextRequest | Request,
  metadata?: {
    reason?: string
    permanent?: boolean
    [key: string]: any
  }
): Promise<void> {
  const { ipAddress, userAgent } = getRequestInfo(request)

  const isPHI = ["patient_profile", "session", "diary_entry"].includes(resourceType)

  const entry: AuditLogEntry = {
    userId,
    action: isPHI ? COMPLIANCE_EVENTS.PHI_DELETED : SECURITY_EVENTS.DATA_DELETION,
    resourceType,
    resourceId,
    metadata: {
      ...metadata,
      deletedAt: new Date().toISOString(),
    },
    severity: "warning",
    complianceRelated: true,
    ipAddress,
    userAgent,
  }

  await logAuditEvent(entry)
}

// ================================================================
// ALERTING SYSTEM
// ================================================================

interface SecurityAlert {
  event: string
  userId?: number
  ipAddress: string
  reason: string
  severity: string
}

/**
 * Trigger security alert for critical events
 * In production, this should integrate with PagerDuty, Slack, etc.
 */
async function triggerSecurityAlert(alert: SecurityAlert): Promise<void> {
  console.error("[SECURITY ALERT]", JSON.stringify(alert, null, 2))

  // TODO: Integrate with alerting service
  // - Send to Slack
  // - Create PagerDuty incident
  // - Send email to security team
  // - Trigger SMS for critical events

  // For now, just log to console
  // In production:
  // if (alert.severity === 'critical') {
  //   await sendSlackAlert(alert)
  //   await createPagerDutyIncident(alert)
  // }
}

// ================================================================
// AUDIT QUERY HELPERS
// ================================================================

/**
 * Get failed login attempts for an IP
 */
export async function getFailedLoginAttempts(
  ipAddress: string,
  timeWindowMinutes: number = 15
): Promise<number> {
  const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000)

  const attempts = await db
    .select()
    .from(auditLogs)
    .where((log) => log.action === SECURITY_EVENTS.LOGIN_FAILED)
    .where((log) => log.ipAddress === ipAddress)
    .where((log) => log.timestamp > since)

  return attempts.length
}

/**
 * Get user activity summary
 */
export async function getUserActivitySummary(
  userId: number,
  days: number = 30
): Promise<{
  totalActions: number
  securityEvents: number
  dataAccesses: number
  lastActivity: Date | null
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const logs = await db
    .select()
    .from(auditLogs)
    .where((log) => log.userId === userId)
    .where((log) => log.timestamp > since)

  const securityEvents = logs.filter((log) =>
    log.action.startsWith("security:")
  ).length

  const dataAccesses = logs.filter(
    (log) =>
      log.action === SECURITY_EVENTS.SENSITIVE_DATA_ACCESS ||
      log.action === COMPLIANCE_EVENTS.PHI_ACCESSED
  ).length

  const lastActivity = logs.length > 0
    ? new Date(Math.max(...logs.map((log) => log.timestamp.getTime())))
    : null

  return {
    totalActions: logs.length,
    securityEvents,
    dataAccesses,
    lastActivity,
  }
}

/**
 * Get security events by severity
 */
export async function getSecurityEventsBySeverity(
  severity: "info" | "warning" | "critical",
  limit: number = 100
): Promise<any[]> {
  return await db
    .select()
    .from(auditLogs)
    .where((log) => log.severity === severity)
    .where((log) => log.action.startsWith("security:"))
    .orderBy((log) => log.timestamp, "desc")
    .limit(limit)
}

/**
 * Get compliance audit trail for user
 */
export async function getComplianceAuditTrail(
  userId: number,
  eventType?: string
): Promise<any[]> {
  let query = db
    .select()
    .from(auditLogs)
    .where((log) => log.userId === userId)
    .where((log) => log.complianceRelated === true)
    .orderBy((log) => log.timestamp, "desc")

  if (eventType) {
    query = query.where((log) => log.action === eventType)
  }

  return await query.limit(1000)
}

// ================================================================
// COMPLIANCE REPORTING
// ================================================================

/**
 * Generate LGPD compliance report for user
 */
export async function generateLGPDReport(userId: number): Promise<{
  consents: any[]
  dataAccesses: any[]
  modifications: any[]
  deletions: any[]
  exports: any[]
}> {
  const logs = await getComplianceAuditTrail(userId)

  return {
    consents: logs.filter(
      (log) =>
        log.action === COMPLIANCE_EVENTS.CONSENT_GIVEN ||
        log.action === COMPLIANCE_EVENTS.CONSENT_WITHDRAWN
    ),
    dataAccesses: logs.filter(
      (log) => log.action === COMPLIANCE_EVENTS.PHI_ACCESSED
    ),
    modifications: logs.filter(
      (log) => log.action === COMPLIANCE_EVENTS.PHI_MODIFIED
    ),
    deletions: logs.filter(
      (log) => log.action === COMPLIANCE_EVENTS.PHI_DELETED
    ),
    exports: logs.filter(
      (log) => log.action === COMPLIANCE_EVENTS.DATA_PORTABILITY_REQUEST
    ),
  }
}

/**
 * Check if IP is blocked due to suspicious activity
 */
export async function isIPBlocked(ipAddress: string): Promise<boolean> {
  const failedAttempts = await getFailedLoginAttempts(ipAddress, 60)
  return failedAttempts >= 10 // Block after 10 failed attempts in 1 hour
}

// ================================================================
// TYPE EXPORTS
// ================================================================

export type { SecurityAlert }
