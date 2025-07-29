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
 */
export async function logAuditEvent(entry: AuditLogEntry) {
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
  } catch (error) {
    console.error('Erro ao registrar log de auditoria:', error)
    // Não relançar o erro para não quebrar a operação principal
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