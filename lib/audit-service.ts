import { db } from '@/db'
import { auditLogs } from '@/db/schema'
import { safeLog, safeError } from './safe-logger'

/**
 * Audit event types
 */
export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'anonymize'
  | 'access_denied_role'
  | 'access_denied_roles'
  | 'access_denied_permission'
  | string

export type AuditSeverity = 'info' | 'warning' | 'critical'

export type AuditResourceType =
  | 'user'
  | 'patient'
  | 'session'
  | 'payment'
  | 'endpoint'
  | 'diary'
  | 'chat'
  | 'settings'
  | string

export interface AuditEventParams {
  userId?: number | null
  clinicId?: number | null
  action: AuditAction
  resourceType: AuditResourceType
  resourceId?: string | null
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown> | null
  severity?: AuditSeverity
  complianceRelated?: boolean
}

/**
 * Log an audit event to the database
 *
 * @example
 * await logAuditEvent({
 *   userId: 1,
 *   action: 'create',
 *   resourceType: 'session',
 *   resourceId: '123',
 *   severity: 'info',
 * })
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const {
      userId,
      clinicId,
      action,
      resourceType,
      resourceId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      metadata,
      severity = 'info',
      complianceRelated = false,
    } = params

    await db.insert(auditLogs).values({
      userId: userId ?? null,
      clinicId: clinicId ?? null,
      action,
      resourceType,
      resourceId: resourceId ?? null,
      oldValues: oldValues ?? null,
      newValues: newValues ?? null,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      severity,
      complianceRelated,
    })

    safeLog('[AUDIT]', `${action} on ${resourceType}`, {
      userId,
      resourceId,
      severity,
    })
  } catch (error) {
    // Don't throw - audit logging should not break the application
    safeError('[AUDIT]', 'Failed to log audit event:', error)
  }
}

/**
 * Get the IP address from request headers
 */
export function getIpFromRequest(headers: Headers): string | null {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    null
  )
}

/**
 * Get the user agent from request headers
 */
export function getUserAgentFromRequest(headers: Headers): string | null {
  return headers.get('user-agent') || null
}
