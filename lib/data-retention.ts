import { db } from "@/db"
import {
  users,
  userPrivacySettings,
  diaryEntries,
  chatMessages,
  sessions,
  meditationSessions,
  moodTracking,
  clinicalInsights,
  notifications,
  pointActivities,
  auditLogs
} from "@/db/schema"
import { eq, and, lt, sql, or } from "drizzle-orm"
import { anonymizeUserData } from "./anonymization"
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES } from "./audit"
import { safeError } from "./safe-logger"

export interface RetentionPolicy {
  userId: number
  retentionDays: number
  anonymizeAfterDeletion: boolean
  cutoffDate: Date
}

export interface DataRetentionResult {
  totalUsersProcessed: number
  totalRecordsDeleted: number
  totalRecordsAnonymized: number
  errors: Array<{ userId: number; error: string }>
  processedAt: Date
  dryRun: boolean
}

export interface DataDeletionStats {
  diaryEntries: number
  chatMessages: number
  sessions: number
  meditationSessions: number
  moodTracking: number
  clinicalInsights: number
  notifications: number
  pointActivities: number
}

/**
 * Calcula a data de corte para retenção de dados
 */
export function calculateCutoffDate(retentionDays: number): Date {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)
  return cutoff
}

/**
 * Busca usuários com políticas de retenção ativas
 */
export async function getUsersWithRetentionPolicies(): Promise<RetentionPolicy[]> {
  try {
    const usersWithPolicies = await db
      .select({
        userId: userPrivacySettings.userId,
        retentionDays: userPrivacySettings.dataRetentionPreference,
        anonymizeAfterDeletion: userPrivacySettings.anonymizeAfterDeletion,
      })
      .from(userPrivacySettings)
      .where(
        and(
          sql`${userPrivacySettings.dataRetentionPreference} IS NOT NULL`,
          sql`${userPrivacySettings.dataRetentionPreference} > 0`
        )
      )

    return usersWithPolicies.map(user => ({
      userId: user.userId,
      retentionDays: user.retentionDays || 2555, // Default 7 years
      anonymizeAfterDeletion: user.anonymizeAfterDeletion,
      cutoffDate: calculateCutoffDate(user.retentionDays || 2555),
    }))
  } catch (error) {
    safeError('[DATA_RETENTION]', 'Erro ao buscar políticas de retenção:', error)
    throw error
  }
}

/**
 * Deleta dados antigos de um usuário baseado na política de retenção
 */
export async function deleteExpiredUserData(
  userId: number,
  cutoffDate: Date,
  dryRun: boolean = false
): Promise<DataDeletionStats> {
  const stats: DataDeletionStats = {
    diaryEntries: 0,
    chatMessages: 0,
    sessions: 0,
    meditationSessions: 0,
    moodTracking: 0,
    clinicalInsights: 0,
    notifications: 0,
    pointActivities: 0,
  }

  try {
    // 1. Diary entries
    const diaryToDelete = await db
      .select({ id: diaryEntries.id })
      .from(diaryEntries)
      .where(
        and(
          eq(diaryEntries.patientId, userId),
          lt(diaryEntries.entryDate, cutoffDate)
        )
      )

    stats.diaryEntries = diaryToDelete.length

    if (!dryRun && diaryToDelete.length > 0) {
      await db
        .delete(diaryEntries)
        .where(
          and(
            eq(diaryEntries.patientId, userId),
            lt(diaryEntries.entryDate, cutoffDate)
          )
        )
    }

    // 2. Chat messages
    const chatToDelete = await db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.senderId, userId),
          lt(chatMessages.createdAt, cutoffDate)
        )
      )

    stats.chatMessages = chatToDelete.length

    if (!dryRun && chatToDelete.length > 0) {
      await db
        .delete(chatMessages)
        .where(
          and(
            eq(chatMessages.senderId, userId),
            lt(chatMessages.createdAt, cutoffDate)
          )
        )
    }

    // 3. Sessions (completed sessions only, preserve scheduled)
    const sessionsToDelete = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          or(
            eq(sessions.patientId, userId),
            eq(sessions.psychologistId, userId)
          ),
          lt(sessions.sessionDate, cutoffDate),
          sql`${sessions.status} IN ('concluída', 'cancelada')`
        )
      )

    stats.sessions = sessionsToDelete.length

    if (!dryRun && sessionsToDelete.length > 0) {
      await db
        .delete(sessions)
        .where(
          and(
            or(
              eq(sessions.patientId, userId),
              eq(sessions.psychologistId, userId)
            ),
            lt(sessions.sessionDate, cutoffDate),
            sql`${sessions.status} IN ('concluída', 'cancelada')`
          )
        )
    }

    // 4. Meditation sessions
    const meditationToDelete = await db
      .select({ id: meditationSessions.id })
      .from(meditationSessions)
      .where(
        and(
          eq(meditationSessions.userId, userId),
          lt(meditationSessions.startedAt, cutoffDate)
        )
      )

    stats.meditationSessions = meditationToDelete.length

    if (!dryRun && meditationToDelete.length > 0) {
      await db
        .delete(meditationSessions)
        .where(
          and(
            eq(meditationSessions.userId, userId),
            lt(meditationSessions.startedAt, cutoffDate)
          )
        )
    }

    // 5. Mood tracking
    const moodToDelete = await db
      .select({ id: moodTracking.id })
      .from(moodTracking)
      .where(
        and(
          eq(moodTracking.patientId, userId),
          lt(moodTracking.date, cutoffDate)
        )
      )

    stats.moodTracking = moodToDelete.length

    if (!dryRun && moodToDelete.length > 0) {
      await db
        .delete(moodTracking)
        .where(
          and(
            eq(moodTracking.patientId, userId),
            lt(moodTracking.date, cutoffDate)
          )
        )
    }

    // 6. Clinical insights
    const insightsToDelete = await db
      .select({ id: clinicalInsights.id })
      .from(clinicalInsights)
      .where(
        and(
          or(
            eq(clinicalInsights.patientId, userId),
            eq(clinicalInsights.psychologistId, userId)
          ),
          lt(clinicalInsights.createdAt, cutoffDate)
        )
      )

    stats.clinicalInsights = insightsToDelete.length

    if (!dryRun && insightsToDelete.length > 0) {
      await db
        .delete(clinicalInsights)
        .where(
          and(
            or(
              eq(clinicalInsights.patientId, userId),
              eq(clinicalInsights.psychologistId, userId)
            ),
            lt(clinicalInsights.createdAt, cutoffDate)
          )
        )
    }

    // 7. Notifications (keep recent ones)
    const notificationsToDelete = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          lt(notifications.createdAt, cutoffDate),
          eq(notifications.isRead, true) // Only delete read notifications
        )
      )

    stats.notifications = notificationsToDelete.length

    if (!dryRun && notificationsToDelete.length > 0) {
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            lt(notifications.createdAt, cutoffDate),
            eq(notifications.isRead, true)
          )
        )
    }

    // 8. Point activities (gamification history)
    const activitiesToDelete = await db
      .select({ id: pointActivities.id })
      .from(pointActivities)
      .where(
        and(
          eq(pointActivities.userId, userId),
          lt(pointActivities.createdAt, cutoffDate)
        )
      )

    stats.pointActivities = activitiesToDelete.length

    if (!dryRun && activitiesToDelete.length > 0) {
      await db
        .delete(pointActivities)
        .where(
          and(
            eq(pointActivities.userId, userId),
            lt(pointActivities.createdAt, cutoffDate)
          )
        )
    }

    // Log the deletion (or dry run)
    await logAuditEvent({
      userId,
      action: dryRun ? 'data_retention_dry_run' : AUDIT_ACTIONS.DELETE_DATA,
      resourceType: AUDIT_RESOURCES.USER,
      complianceRelated: true,
      severity: 'high',
      metadata: {
        cutoffDate: cutoffDate.toISOString(),
        dryRun,
        stats,
      },
    })

    return stats
  } catch (error) {
    safeError('[DATA_RETENTION]', `Erro ao deletar dados do usuário ${userId}:`, error)
    throw error
  }
}

/**
 * Executa o processo de retenção de dados para todos os usuários
 */
export async function enforceDataRetentionPolicies(
  options: {
    dryRun?: boolean
    batchSize?: number
    specificUserId?: number
  } = {}
): Promise<DataRetentionResult> {
  const { dryRun = false, batchSize = 50, specificUserId } = options

  const result: DataRetentionResult = {
    totalUsersProcessed: 0,
    totalRecordsDeleted: 0,
    totalRecordsAnonymized: 0,
    errors: [],
    processedAt: new Date(),
    dryRun,
  }

  try {
    // Get users with retention policies
    let policies = await getUsersWithRetentionPolicies()

    // Filter by specific user if provided
    if (specificUserId) {
      policies = policies.filter(p => p.userId === specificUserId)
    }

    // Log start of enforcement
    await logAuditEvent({
      userId: 0, // System
      action: 'data_retention_enforcement_start',
      resourceType: AUDIT_RESOURCES.SYSTEM,
      complianceRelated: true,
      severity: 'high',
      metadata: {
        totalUsers: policies.length,
        dryRun,
        batchSize,
        specificUserId,
      },
    })

    // Process in batches
    for (let i = 0; i < policies.length; i += batchSize) {
      const batch = policies.slice(i, i + batchSize)

      for (const policy of batch) {
        try {
          // Delete expired data
          const stats = await deleteExpiredUserData(
            policy.userId,
            policy.cutoffDate,
            dryRun
          )

          const totalDeleted = Object.values(stats).reduce((sum, val) => sum + val, 0)
          result.totalRecordsDeleted += totalDeleted

          // If user wants anonymization after deletion, and there's data to delete
          if (policy.anonymizeAfterDeletion && totalDeleted > 0 && !dryRun) {
            try {
              const anonymizeResult = await anonymizeUserData({
                userId: policy.userId,
                preserveAggregateData: true,
                anonymizeImmediately: true,
                reason: 'data_retention',
              })

              if (anonymizeResult.success) {
                result.totalRecordsAnonymized += anonymizeResult.anonymizedRecords
              } else {
                result.errors.push({
                  userId: policy.userId,
                  error: `Anonymization failed: ${anonymizeResult.errors.join(', ')}`,
                })
              }
            } catch (error) {
              result.errors.push({
                userId: policy.userId,
                error: `Anonymization error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              })
            }
          }

          result.totalUsersProcessed++
        } catch (error) {
          result.errors.push({
            userId: policy.userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      // Small delay between batches to avoid overloading DB
      if (i + batchSize < policies.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Log completion
    await logAuditEvent({
      userId: 0, // System
      action: 'data_retention_enforcement_complete',
      resourceType: AUDIT_RESOURCES.SYSTEM,
      complianceRelated: true,
      severity: 'high',
      metadata: {
        ...result,
        duration: Date.now() - result.processedAt.getTime(),
      },
    })

    return result
  } catch (error) {
    safeError('[DATA_RETENTION]', 'Erro crítico no enforcement de retenção:', error)

    await logAuditEvent({
      userId: 0,
      action: 'data_retention_enforcement_failed',
      resourceType: AUDIT_RESOURCES.SYSTEM,
      complianceRelated: true,
      severity: 'critical',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    throw error
  }
}

/**
 * Verifica quais dados serão afetados pela política de retenção (dry run)
 */
export async function previewDataRetention(userId: number): Promise<{
  cutoffDate: Date
  retentionDays: number
  stats: DataDeletionStats
  totalRecordsToDelete: number
}> {
  try {
    // Get user's retention policy
    const privacySettings = await db
      .select()
      .from(userPrivacySettings)
      .where(eq(userPrivacySettings.userId, userId))
      .limit(1)

    const retentionDays = privacySettings[0]?.dataRetentionPreference || 2555
    const cutoffDate = calculateCutoffDate(retentionDays)

    // Get stats without deleting
    const stats = await deleteExpiredUserData(userId, cutoffDate, true)
    const totalRecordsToDelete = Object.values(stats).reduce((sum, val) => sum + val, 0)

    return {
      cutoffDate,
      retentionDays,
      stats,
      totalRecordsToDelete,
    }
  } catch (error) {
    safeError('[DATA_RETENTION]', `Erro ao preview de retenção para usuário ${userId}:`, error)
    throw error
  }
}
