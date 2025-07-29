import { db } from "@/db"
import { userConsents, userPrivacySettings } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES } from "./audit"

export interface ConsentData {
  userId: number
  consentType: string
  consentGiven: boolean
  purpose: string
  legalBasis: string
  version?: string
  dataRetentionPeriod?: number
  ipAddress?: string
  userAgent?: string
}

/**
 * Tipos de consentimento disponíveis
 */
export const CONSENT_TYPES = {
  DATA_PROCESSING: 'data_processing',
  MARKETING: 'marketing', 
  ANALYTICS: 'analytics',
  RESEARCH: 'research',
  SHARE_WITH_PSYCHOLOGIST: 'share_with_psychologist',
  AI_ANALYSIS: 'ai_analysis',
  SESSION_RECORDING: 'session_recording',
  EMERGENCY_CONTACT: 'emergency_contact',
} as const

/**
 * Bases legais para processamento de dados (LGPD/GDPR)
 */
export const LEGAL_BASIS = {
  CONSENT: 'consent', // Consentimento
  CONTRACT: 'contract', // Execução de contrato
  LEGAL_OBLIGATION: 'legal_obligation', // Obrigação legal
  VITAL_INTERESTS: 'vital_interests', // Interesses vitais
  PUBLIC_TASK: 'public_task', // Exercício regular de direitos
  LEGITIMATE_INTERESTS: 'legitimate_interests', // Interesse legítimo
} as const

/**
 * Registra um novo consentimento
 */
export async function recordConsent(data: ConsentData) {
  try {
    // Primeiro, revoga consentimentos anteriores do mesmo tipo se necessário
    if (!data.consentGiven) {
      await db.update(userConsents)
        .set({ 
          revokedAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(userConsents.userId, data.userId),
            eq(userConsents.consentType, data.consentType),
            eq(userConsents.consentGiven, true)
          )
        )
    }
    
    // Insere o novo registro de consentimento
    const result = await db.insert(userConsents).values({
      userId: data.userId,
      consentType: data.consentType,
      consentGiven: data.consentGiven,
      purpose: data.purpose,
      legalBasis: data.legalBasis,
      version: data.version || '1.0',
      dataRetentionPeriod: data.dataRetentionPeriod,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    }).returning()

    // Log de auditoria
    await logAuditEvent({
      userId: data.userId,
      action: data.consentGiven ? AUDIT_ACTIONS.CONSENT_GIVEN : AUDIT_ACTIONS.CONSENT_REVOKED,
      resourceType: AUDIT_RESOURCES.CONSENT,
      resourceId: result[0]?.id.toString(),
      complianceRelated: true,
      metadata: {
        consentType: data.consentType,
        purpose: data.purpose,
        legalBasis: data.legalBasis,
      },
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    })

    return result[0]
  } catch (error) {
    console.error('Erro ao registrar consentimento:', error)
    throw new Error('Falha ao registrar consentimento')
  }
}

/**
 * Verifica se o usuário tem consentimento válido para um tipo específico
 */
export async function hasValidConsent(userId: number, consentType: string): Promise<boolean> {
  try {
    const latestConsent = await db
      .select()
      .from(userConsents)
      .where(
        and(
          eq(userConsents.userId, userId),
          eq(userConsents.consentType, consentType)
        )
      )
      .orderBy(desc(userConsents.consentDate))
      .limit(1)

    if (latestConsent.length === 0) {
      return false
    }

    const consent = latestConsent[0]
    return consent.consentGiven && !consent.revokedAt
  } catch (error) {
    console.error('Erro ao verificar consentimento:', error)
    return false
  }
}

/**
 * Obtém todos os consentimentos de um usuário
 */
export async function getUserConsents(userId: number) {
  try {
    const consents = await db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, userId))
      .orderBy(desc(userConsents.consentDate))

    return consents
  } catch (error) {
    console.error('Erro ao buscar consentimentos do usuário:', error)
    throw new Error('Falha ao buscar consentimentos')
  }
}

/**
 * Revoga um consentimento específico
 */
export async function revokeConsent(
  userId: number, 
  consentType: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await db.update(userConsents)
      .set({ 
        revokedAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(userConsents.userId, userId),
          eq(userConsents.consentType, consentType),
          eq(userConsents.consentGiven, true)
        )
      )

    // Log de auditoria
    await logAuditEvent({
      userId,
      action: AUDIT_ACTIONS.CONSENT_REVOKED,
      resourceType: AUDIT_RESOURCES.CONSENT,
      complianceRelated: true,
      metadata: {
        consentType,
        reason: 'user_request',
      },
      ipAddress,
      userAgent,
    })

    return true
  } catch (error) {
    console.error('Erro ao revogar consentimento:', error)
    throw new Error('Falha ao revogar consentimento')
  }
}

/**
 * Inicializa configurações de privacidade padrão para novo usuário
 */
export async function initializePrivacySettings(userId: number) {
  try {
    await db.insert(userPrivacySettings).values({
      userId,
      dataProcessingConsent: false, // Deve ser explicitamente consentido
      marketingConsent: false,
      analyticsConsent: false,
      shareDataWithPsychologist: true, // Necessário para o serviço
      allowDataExport: true,
      anonymizeAfterDeletion: true,
      dataRetentionPreference: 2555, // 7 anos padrão
    })

    await logAuditEvent({
      userId,
      action: AUDIT_ACTIONS.CREATE,
      resourceType: AUDIT_RESOURCES.PRIVACY_SETTINGS,
      complianceRelated: true,
      metadata: {
        reason: 'user_registration',
      },
    })
  } catch (error) {
    console.error('Erro ao inicializar configurações de privacidade:', error)
    throw new Error('Falha ao inicializar configurações de privacidade')
  }
}

/**
 * Atualiza configurações de privacidade do usuário
 */
export async function updatePrivacySettings(
  userId: number, 
  settings: Partial<typeof userPrivacySettings.$inferInsert>,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    const result = await db.update(userPrivacySettings)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(userPrivacySettings.userId, userId))
      .returning()

    await logAuditEvent({
      userId,
      action: AUDIT_ACTIONS.UPDATE,
      resourceType: AUDIT_RESOURCES.PRIVACY_SETTINGS,
      complianceRelated: true,
      metadata: {
        updatedFields: Object.keys(settings),
      },
      ipAddress,
      userAgent,
    })

    return result[0]
  } catch (error) {
    console.error('Erro ao atualizar configurações de privacidade:', error)
    throw new Error('Falha ao atualizar configurações de privacidade')
  }
}

/**
 * Obtém configurações de privacidade do usuário
 */
export async function getPrivacySettings(userId: number) {
  try {
    const settings = await db
      .select()
      .from(userPrivacySettings)
      .where(eq(userPrivacySettings.userId, userId))
      .limit(1)

    return settings[0] || null
  } catch (error) {
    console.error('Erro ao buscar configurações de privacidade:', error)
    throw new Error('Falha ao buscar configurações de privacidade')
  }
}