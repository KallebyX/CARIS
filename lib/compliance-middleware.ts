import { NextRequest, NextResponse } from "next/server"
import { hasValidConsent, CONSENT_TYPES } from "./consent"
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES, getRequestInfo } from "./audit"

/**
 * Middleware para verificar consentimentos em operações sensíveis
 */
export interface ConsentRequirement {
  consentType: keyof typeof CONSENT_TYPES
  required: boolean
  fallbackAction?: 'deny' | 'continue' | 'anonymize'
}

export interface ComplianceCheckOptions {
  userId: number
  request: NextRequest
  operation: string
  resourceType: keyof typeof AUDIT_RESOURCES
  resourceId?: string
  requiredConsents: ConsentRequirement[]
  sensitiveData?: boolean
}

export interface ComplianceCheckResult {
  allowed: boolean
  missingConsents: string[]
  auditLogged: boolean
  response?: NextResponse
}

/**
 * Verifica conformidade antes de executar operações sensíveis
 */
export async function checkCompliance(options: ComplianceCheckOptions): Promise<ComplianceCheckResult> {
  const { userId, request, operation, resourceType, resourceId, requiredConsents, sensitiveData = false } = options
  const { ipAddress, userAgent } = getRequestInfo(request)
  
  const result: ComplianceCheckResult = {
    allowed: true,
    missingConsents: [],
    auditLogged: false,
  }

  try {
    // Verifica cada consentimento necessário
    for (const requirement of requiredConsents) {
      const hasConsent = await hasValidConsent(userId, CONSENT_TYPES[requirement.consentType])
      
      if (!hasConsent) {
        if (requirement.required) {
          result.allowed = false
          result.missingConsents.push(requirement.consentType)
        } else {
          // Consentimento opcional - log mas não bloqueia
          await logAuditEvent({
            userId,
            action: 'optional_consent_missing',
            resourceType: AUDIT_RESOURCES[resourceType],
            resourceId,
            complianceRelated: true,
            metadata: {
              operation,
              missingConsent: requirement.consentType,
              fallbackAction: requirement.fallbackAction || 'continue',
            },
            ipAddress,
            userAgent,
          })
        }
      }
    }

    // Log da verificação de compliance
    await logAuditEvent({
      userId,
      action: result.allowed ? 'compliance_check_passed' : 'compliance_check_failed',
      resourceType: AUDIT_RESOURCES[resourceType],
      resourceId,
      complianceRelated: true,
      severity: result.allowed ? 'info' : 'warning',
      metadata: {
        operation,
        requiredConsents: requiredConsents.map(r => r.consentType),
        missingConsents: result.missingConsents,
        sensitiveData,
      },
      ipAddress,
      userAgent,
    })
    
    result.auditLogged = true

    // Se não permitido, cria resposta de erro
    if (!result.allowed) {
      result.response = NextResponse.json({
        success: false,
        error: "Consentimento necessário",
        details: {
          missingConsents: result.missingConsents,
          message: "Esta operação requer consentimentos adicionais que não foram fornecidos.",
          action: "Visite as configurações de privacidade para gerenciar seus consentimentos."
        }
      }, { status: 403 })
    }

    return result

  } catch (error) {
    // Log de erro na verificação
    await logAuditEvent({
      userId,
      action: 'compliance_check_error',
      resourceType: AUDIT_RESOURCES[resourceType],
      resourceId,
      complianceRelated: true,
      severity: 'critical',
      metadata: {
        operation,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress,
      userAgent,
    })

    result.allowed = false
    result.auditLogged = true
    result.response = NextResponse.json({
      success: false,
      error: "Erro na verificação de compliance"
    }, { status: 500 })

    return result
  }
}

/**
 * Decorador para adicionar verificações de compliance a funções de API
 */
export function withComplianceCheck(
  operation: string,
  resourceType: keyof typeof AUDIT_RESOURCES,
  requiredConsents: ConsentRequirement[]
) {
  return function <T extends any[], R>(
    target: (...args: T) => Promise<R>,
    context: {
      getUserId: (...args: T) => number | undefined
      getRequest: (...args: T) => NextRequest
      getResourceId?: (...args: T) => string | undefined
    }
  ) {
    return async (...args: T): Promise<R | NextResponse> => {
      const userId = context.getUserId(...args)
      const request = context.getRequest(...args)
      const resourceId = context.getResourceId?.(...args)

      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as R
      }

      const complianceCheck = await checkCompliance({
        userId,
        request,
        operation,
        resourceType,
        resourceId,
        requiredConsents,
        sensitiveData: true,
      })

      if (!complianceCheck.allowed && complianceCheck.response) {
        return complianceCheck.response as R
      }

      return target(...args)
    }
  }
}

/**
 * Configurações padrão de consentimento para operações comuns
 */
export const COMMON_CONSENT_REQUIREMENTS = {
  // Operações básicas de dados
  DATA_PROCESSING: [
    { consentType: 'DATA_PROCESSING' as const, required: true }
  ],
  
  // Análise por IA
  AI_ANALYSIS: [
    { consentType: 'DATA_PROCESSING' as const, required: true },
    { consentType: 'AI_ANALYSIS' as const, required: false, fallbackAction: 'continue' as const }
  ],
  
  // Compartilhamento com psicólogo
  PSYCHOLOGIST_SHARING: [
    { consentType: 'DATA_PROCESSING' as const, required: true },
    { consentType: 'SHARE_WITH_PSYCHOLOGIST' as const, required: true }
  ],
  
  // Analytics
  ANALYTICS: [
    { consentType: 'ANALYTICS' as const, required: false, fallbackAction: 'anonymize' as const }
  ],
  
  // Marketing
  MARKETING: [
    { consentType: 'MARKETING' as const, required: true }
  ],
  
  // Exportação de dados
  DATA_EXPORT: [
    { consentType: 'DATA_PROCESSING' as const, required: true }
  ],
  
  // Gravação de sessões
  SESSION_RECORDING: [
    { consentType: 'DATA_PROCESSING' as const, required: true },
    { consentType: 'SESSION_RECORDING' as const, required: true }
  ],
  
  // Contato de emergência
  EMERGENCY_CONTACT: [
    { consentType: 'EMERGENCY_CONTACT' as const, required: false, fallbackAction: 'continue' as const }
  ]
} as const

/**
 * Verifica se uma operação específica é permitida para um usuário
 */
export async function isOperationAllowed(
  userId: number, 
  operation: keyof typeof COMMON_CONSENT_REQUIREMENTS
): Promise<boolean> {
  const requirements = COMMON_CONSENT_REQUIREMENTS[operation]
  
  for (const requirement of requirements) {
    const hasConsent = await hasValidConsent(userId, CONSENT_TYPES[requirement.consentType])
    if (!hasConsent && requirement.required) {
      return false
    }
  }
  
  return true
}

/**
 * Helper para logging de operações sensíveis
 */
export async function logSensitiveOperation(
  userId: number,
  request: NextRequest,
  operation: string,
  resourceType: keyof typeof AUDIT_RESOURCES,
  resourceId?: string,
  metadata?: Record<string, any>
) {
  const { ipAddress, userAgent } = getRequestInfo(request)
  
  await logAuditEvent({
    userId,
    action: operation,
    resourceType: AUDIT_RESOURCES[resourceType],
    resourceId,
    complianceRelated: true,
    metadata: {
      ...metadata,
      sensitiveOperation: true,
    },
    ipAddress,
    userAgent,
  })
}