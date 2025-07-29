import { db } from "@/db"
import { 
  users, 
  patientProfiles, 
  psychologistProfiles, 
  sessions, 
  diaryEntries, 
  meditationSessions,
  userConsents,
  userPrivacySettings,
  auditLogs
} from "@/db/schema"
import { eq, and, or, sql } from "drizzle-orm"
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES } from "./audit"
import { getPrivacySettings } from "./consent"

export interface AnonymizationOptions {
  userId: number
  preserveAggregateData?: boolean
  anonymizeImmediately?: boolean
  reason: 'user_request' | 'data_retention' | 'account_deletion'
  requestedBy?: number // ID do usuário que solicitou (admin, ou o próprio usuário)
  ipAddress?: string
  userAgent?: string
}

export interface AnonymizationResult {
  success: boolean
  anonymizedRecords: number
  preservedRecords: number
  errors: string[]
  completedAt: Date
}

/**
 * Gera dados anônimos para substituição
 */
function generateAnonymousData() {
  const anonymousNames = [
    'Usuário Anônimo', 'Participante', 'Paciente', 'Pessoa'
  ]
  const randomName = anonymousNames[Math.floor(Math.random() * anonymousNames.length)]
  const randomId = Math.random().toString(36).substr(2, 8)
  
  return {
    name: `${randomName} ${randomId}`,
    email: `anonimo_${randomId}@example.com`,
    anonymousContent: '[Conteúdo removido por solicitação de anonimização]',
    anonymousNotes: '[Notas removidas conforme política de privacidade]',
  }
}

/**
 * Anonimiza dados de um usuário
 */
export async function anonymizeUserData(options: AnonymizationOptions): Promise<AnonymizationResult> {
  const result: AnonymizationResult = {
    success: false,
    anonymizedRecords: 0,
    preservedRecords: 0,
    errors: [],
    completedAt: new Date(),
  }

  try {
    // Verifica configurações de privacidade do usuário
    const privacySettings = await getPrivacySettings(options.userId)
    if (!privacySettings?.anonymizeAfterDeletion && options.reason === 'account_deletion') {
      result.errors.push('Usuário optou por não anonimizar dados após exclusão')
      return result
    }

    const anonymousData = generateAnonymousData()
    
    // Log início da anonimização
    await logAuditEvent({
      userId: options.userId,
      action: AUDIT_ACTIONS.ANONYMIZE_DATA,
      resourceType: AUDIT_RESOURCES.USER,
      complianceRelated: true,
      severity: 'critical',
      metadata: {
        reason: options.reason,
        requestedBy: options.requestedBy,
        preserveAggregateData: options.preserveAggregateData,
      },
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    })

    // 1. Anonimizar dados do usuário principal
    try {
      await db.update(users)
        .set({
          name: anonymousData.name,
          email: anonymousData.email,
          avatarUrl: null,
        })
        .where(eq(users.id, options.userId))
      
      result.anonymizedRecords += 1
    } catch (error) {
      result.errors.push(`Erro ao anonimizar usuário: ${error}`)
    }

    // 2. Anonimizar perfil do paciente se existir
    try {
      const patientProfile = await db
        .select()
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, options.userId))
        .limit(1)

      if (patientProfile.length > 0) {
        await db.update(patientProfiles)
          .set({
            birthDate: null,
            currentCycle: null,
          })
          .where(eq(patientProfiles.userId, options.userId))
        
        result.anonymizedRecords += 1
      }
    } catch (error) {
      result.errors.push(`Erro ao anonimizar perfil do paciente: ${error}`)
    }

    // 3. Anonimizar perfil do psicólogo se existir
    try {
      const psychProfile = await db
        .select()
        .from(psychologistProfiles)
        .where(eq(psychologistProfiles.userId, options.userId))
        .limit(1)

      if (psychProfile.length > 0) {
        await db.update(psychologistProfiles)
          .set({
            crp: null,
            bio: anonymousData.anonymousContent,
          })
          .where(eq(psychologistProfiles.userId, options.userId))
        
        result.anonymizedRecords += 1
      }
    } catch (error) {
      result.errors.push(`Erro ao anonimizar perfil do psicólogo: ${error}`)
    }

    // 4. Anonimizar entradas do diário
    try {
      if (options.preserveAggregateData) {
        // Preserva ratings numéricos para análises agregadas, remove conteúdo textual
        await db.update(diaryEntries)
          .set({
            content: anonymousData.anonymousContent,
            emotions: null,
            aiInsights: null,
            suggestedActions: null,
          })
          .where(eq(diaryEntries.patientId, options.userId))
        
        const diaryCount = await db
          .select()
          .from(diaryEntries)
          .where(eq(diaryEntries.patientId, options.userId))
        
        result.anonymizedRecords += diaryCount.length
      } else {
        // Remove completamente os dados
        await db.delete(diaryEntries)
          .where(eq(diaryEntries.patientId, options.userId))
        
        result.anonymizedRecords += 1
      }
    } catch (error) {
      result.errors.push(`Erro ao anonimizar diário: ${error}`)
    }

    // 5. Anonimizar sessões
    try {
      if (options.preserveAggregateData) {
        // Preserva dados da sessão (datas, duração, tipo), remove notas
        await db.update(sessions)
          .set({
            notes: anonymousData.anonymousNotes,
          })
          .where(
            or(
              eq(sessions.patientId, options.userId),
              eq(sessions.psychologistId, options.userId)
            )
          )
        
        const sessionsCount = await db
          .select()
          .from(sessions)
          .where(
            or(
              eq(sessions.patientId, options.userId),
              eq(sessions.psychologistId, options.userId)
            )
          )
        
        result.anonymizedRecords += sessionsCount.length
      } else {
        // Marca como canceladas ou remove
        await db.update(sessions)
          .set({
            status: 'cancelada',
            notes: '[Sessão cancelada - dados anonimizados]',
          })
          .where(
            or(
              eq(sessions.patientId, options.userId),
              eq(sessions.psychologistId, options.userId)
            )
          )
        
        result.anonymizedRecords += 1
      }
    } catch (error) {
      result.errors.push(`Erro ao anonimizar sessões: ${error}`)
    }

    // 6. Anonimizar sessões de meditação
    try {
      if (options.preserveAggregateData) {
        await db.update(meditationSessions)
          .set({
            feedback: anonymousData.anonymousContent,
            notes: anonymousData.anonymousNotes,
          })
          .where(eq(meditationSessions.userId, options.userId))
      } else {
        await db.delete(meditationSessions)
          .where(eq(meditationSessions.userId, options.userId))
      }
      
      result.anonymizedRecords += 1
    } catch (error) {
      result.errors.push(`Erro ao anonimizar sessões de meditação: ${error}`)
    }

    // 7. Preservar logs de auditoria por obrigação legal (apenas anonimizar dados pessoais)
    try {
      // Não deletamos logs de auditoria, mas removemos dados pessoais
      await db.update(auditLogs)
        .set({
          ipAddress: '0.0.0.0',
          userAgent: 'Anonimizado',
          metadata: JSON.stringify({ anonymized: true }),
        })
        .where(eq(auditLogs.userId, options.userId))
      
      result.preservedRecords += 1
    } catch (error) {
      result.errors.push(`Erro ao anonimizar logs de auditoria: ${error}`)
    }

    // 8. Anonimizar configurações de privacidade mantendo registro da anonimização
    try {
      await db.update(userPrivacySettings)
        .set({
          notificationPreferences: JSON.stringify({ anonymized: true }),
          updatedAt: new Date(),
        })
        .where(eq(userPrivacySettings.userId, options.userId))
      
      result.anonymizedRecords += 1
    } catch (error) {
      result.errors.push(`Erro ao anonimizar configurações de privacidade: ${error}`)
    }

    // Log final da anonimização
    await logAuditEvent({
      userId: options.userId,
      action: AUDIT_ACTIONS.ANONYMIZE_DATA,
      resourceType: AUDIT_RESOURCES.USER,
      complianceRelated: true,
      severity: 'critical',
      metadata: {
        reason: options.reason,
        anonymizedRecords: result.anonymizedRecords,
        preservedRecords: result.preservedRecords,
        errors: result.errors,
        status: 'completed',
      },
    })

    result.success = result.errors.length === 0
    return result

  } catch (error) {
    result.errors.push(`Erro geral na anonimização: ${error}`)
    result.success = false
    
    // Log do erro
    await logAuditEvent({
      userId: options.userId,
      action: AUDIT_ACTIONS.ANONYMIZE_DATA,
      resourceType: AUDIT_RESOURCES.USER,
      complianceRelated: true,
      severity: 'critical',
      metadata: {
        reason: options.reason,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
    })

    return result
  }
}

/**
 * Verifica se um usuário pode ser anonimizado
 */
export async function canAnonymizeUser(userId: number): Promise<{ canAnonymize: boolean; reason?: string }> {
  try {
    // Verifica se há sessões futuras agendadas
    const futureSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          or(
            eq(sessions.patientId, userId),
            eq(sessions.psychologistId, userId)
          ),
          eq(sessions.status, 'agendada'),
          sql`session_date > NOW()`
        )
      )

    if (futureSessions.length > 0) {
      return {
        canAnonymize: false,
        reason: 'Usuário possui sessões futuras agendadas'
      }
    }

    // Verifica configurações de privacidade
    const privacySettings = await getPrivacySettings(userId)
    if (privacySettings && !privacySettings.anonymizeAfterDeletion) {
      return {
        canAnonymize: false,
        reason: 'Usuário optou por não anonimizar dados'
      }
    }

    return { canAnonymize: true }
  } catch (error) {
    console.error('Erro ao verificar se usuário pode ser anonimizado:', error)
    return {
      canAnonymize: false,
      reason: 'Erro interno na verificação'
    }
  }
}

/**
 * Agenda anonimização automática baseada em configurações de retenção
 */
export async function scheduleDataRetentionAnonymization(userId: number) {
  try {
    const privacySettings = await getPrivacySettings(userId)
    if (!privacySettings?.dataRetentionPreference || !privacySettings.anonymizeAfterDeletion) {
      return null
    }

    // Esta função seria implementada com um job scheduler real
    // Por agora, apenas registramos a intenção
    await logAuditEvent({
      userId,
      action: 'schedule_anonymization',
      resourceType: AUDIT_RESOURCES.USER,
      complianceRelated: true,
      metadata: {
        retentionPeriod: privacySettings.dataRetentionPreference,
        scheduledFor: new Date(Date.now() + privacySettings.dataRetentionPreference * 24 * 60 * 60 * 1000),
      },
    })

    return {
      scheduledFor: new Date(Date.now() + privacySettings.dataRetentionPreference * 24 * 60 * 60 * 1000),
      retentionPeriod: privacySettings.dataRetentionPreference,
    }
  } catch (error) {
    console.error('Erro ao agendar anonimização:', error)
    throw new Error('Falha ao agendar anonimização automática')
  }
}