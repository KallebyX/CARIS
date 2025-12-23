import { db } from "@/db"
import { auditLogs } from "@/db/schema"
import type { NextRequest } from "next/server"

export interface AuditLogEntry {
  userId?: number
  action: string
  resourceType: string
  resourceId?: string
  metadata?: Record<string, any>
  severity?: 'info' | 'warning' | 'critical'
  complianceRelated?: boolean
  ipAddress?: string
  userAgent?: string
}

/**
 * Registra uma entrada de auditoria
 * Esta função falha silenciosamente para não interromper operações críticas
 * como login/registro quando a tabela de auditoria não existir
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      severity: entry.severity || 'info',
      complianceRelated: entry.complianceRelated || false,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    })
  } catch (error: unknown) {
    // Fail silently - audit logging should never break main operations
    // Check if it's a "table doesn't exist" error and log appropriately
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isTableMissing = errorMessage.includes('does not exist') ||
                           errorMessage.includes('42P01') // PostgreSQL error code for undefined table

    if (isTableMissing) {
      // Only log once to avoid spam - table migration is needed
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AUDIT] audit_logs table not found - run database migrations')
      }
    } else {
      console.error('[AUDIT] Failed to log audit event:', errorMessage)
    }
    // Never re-throw - this prevents cascading failures in auth flows
  }
}

/**
 * Extrai informações da requisição para auditoria
 */
export function getRequestInfo(request: NextRequest | Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ipAddress = forwarded?.split(',')[0] || realIp || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return { ipAddress, userAgent }
}

/**
 * Wrapper para registrar operações CRUD automaticamente
 */
export function withAudit<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  auditInfo: Omit<AuditLogEntry, 'userId'>,
  getUserId: (...args: T) => number | undefined
) {
  return async (...args: T): Promise<R> => {
    const userId = getUserId(...args)
    const startTime = Date.now()
    
    try {
      const result = await operation(...args)
      
      await logAuditEvent({
        ...auditInfo,
        userId,
        metadata: {
          ...auditInfo.metadata,
          duration: Date.now() - startTime,
          success: true,
        },
      })
      
      return result
    } catch (error) {
      await logAuditEvent({
        ...auditInfo,
        userId,
        severity: 'critical',
        metadata: {
          ...auditInfo.metadata,
          duration: Date.now() - startTime,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
      
      throw error
    }
  }
}

/**
 * Tipos de ações para auditoria
 */
export const AUDIT_ACTIONS = {
  // Operações CRUD básicas
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  
  // Operações de compliance
  EXPORT_DATA: 'export_data',
  ANONYMIZE_DATA: 'anonymize_data',
  CONSENT_GIVEN: 'consent_given',
  CONSENT_REVOKED: 'consent_revoked',
  
  // Operações de autenticação
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  
  // Operações sensíveis
  SENSITIVE_DATA_ACCESS: 'sensitive_data_access',
  ADMIN_ACTION: 'admin_action',
  BULK_OPERATION: 'bulk_operation',
} as const

/**
 * Tipos de recursos para auditoria
 */
export const AUDIT_RESOURCES = {
  USER: 'user',
  PATIENT_PROFILE: 'patient_profile',
  PSYCHOLOGIST_PROFILE: 'psychologist_profile',
  SESSION: 'session',
  DIARY_ENTRY: 'diary_entry',
  CONSENT: 'consent',
  PRIVACY_SETTINGS: 'privacy_settings',
  MEDITATION_SESSION: 'meditation_session',
  ACHIEVEMENT: 'achievement',
  AUDIT_LOG: 'audit_log',
  DATA_EXPORT: 'data_export',
} as const