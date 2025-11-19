/**
 * Cache Invalidation Service for CÁRIS Platform
 *
 * Provides automatic cache invalidation when data changes.
 * Integrates with the API cache layer to maintain data consistency.
 *
 * @example
 * ```ts
 * // After creating a new session:
 * await createSession(sessionData)
 * await invalidateSessionCaches(psychologistId, patientId)
 * ```
 */

import {
  invalidateCache,
  invalidateCacheByTag,
  invalidateCacheByPattern,
  generateCacheKey
} from './api-cache'

// ================================================================
// INVALIDATION HELPERS
// ================================================================

/**
 * Invalidate admin statistics cache
 * Call this after: clinic creation, user registration, subscription changes
 */
export async function invalidateAdminStats(): Promise<void> {
  await invalidateCacheByTag('admin-stats')
  await invalidateCacheByTag('analytics')
  console.log('[Cache Invalidation] Admin stats invalidated')
}

/**
 * Invalidate psychologist dashboard cache
 * Call this after: session creation/update, patient assignment, diary entries
 */
export async function invalidatePsychologistDashboard(psychologistId: number): Promise<void> {
  const cacheKey = generateCacheKey(['psychologist', 'dashboard', psychologistId])
  await invalidateCache(cacheKey)
  await invalidateCacheByTag(`psychologist:${psychologistId}`)
  console.log(`[Cache Invalidation] Psychologist ${psychologistId} dashboard invalidated`)
}

/**
 * Invalidate patient statistics cache
 * Call this after: meditation session, diary entry, mood tracking
 */
export async function invalidatePatientStats(userId: number): Promise<void> {
  await invalidateCacheByTag(`user:${userId}`)
  await invalidateCacheByTag(`patient:${userId}`)
  await invalidateCacheByPattern(`*patient:${userId}*`)
  console.log(`[Cache Invalidation] Patient ${userId} stats invalidated`)
}

/**
 * Invalidate meditation statistics cache
 * Call this after: meditation session creation/update
 */
export async function invalidateMeditationStats(userId: number): Promise<void> {
  const cacheKey = generateCacheKey(['meditation', 'stats', userId])
  await invalidateCache(cacheKey)
  await invalidateCacheByTag(`meditation:${userId}`)
  console.log(`[Cache Invalidation] Meditation stats for user ${userId} invalidated`)
}

/**
 * Invalidate session caches
 * Call this after: session creation, update, cancellation
 */
export async function invalidateSessionCaches(
  psychologistId: number,
  patientId?: number
): Promise<void> {
  await invalidateCacheByTag('sessions')
  await invalidateCacheByTag(`psychologist:${psychologistId}`)

  if (patientId) {
    await invalidateCacheByTag(`patient:${patientId}`)
  }

  console.log('[Cache Invalidation] Session caches invalidated')
}

/**
 * Invalidate gamification caches
 * Call this after: points earned, level up, achievement unlocked
 */
export async function invalidateGamificationCaches(userId: number): Promise<void> {
  await invalidateCacheByTag(`gamification:${userId}`)
  await invalidateCacheByTag('leaderboard')
  await invalidateCacheByPattern(`*points:${userId}*`)
  console.log(`[Cache Invalidation] Gamification caches for user ${userId} invalidated`)
}

/**
 * Invalidate leaderboard cache
 * Call this after: any gamification event (points, achievements, challenges)
 */
export async function invalidateLeaderboard(): Promise<void> {
  await invalidateCacheByTag('leaderboard')
  await invalidateCacheByTag('gamification')
  console.log('[Cache Invalidation] Leaderboard invalidated')
}

/**
 * Invalidate diary entry caches
 * Call this after: diary entry creation, update, deletion
 */
export async function invalidateDiaryCaches(patientId: number): Promise<void> {
  await invalidateCacheByTag(`diary:${patientId}`)
  await invalidateCacheByTag(`patient:${patientId}`)
  console.log(`[Cache Invalidation] Diary caches for patient ${patientId} invalidated`)
}

/**
 * Invalidate chat caches
 * Call this after: new message, message deletion
 */
export async function invalidateChatCaches(roomId: string, userId: number): Promise<void> {
  const cacheKey = generateCacheKey(['chat', 'room', roomId])
  await invalidateCache(cacheKey)
  await invalidateCacheByTag(`chat:${roomId}`)
  await invalidateCacheByTag(`user:${userId}`)
  console.log(`[Cache Invalidation] Chat caches for room ${roomId} invalidated`)
}

/**
 * Invalidate clinic caches
 * Call this after: clinic creation, update, user assignment
 */
export async function invalidateClinicCaches(clinicId?: number): Promise<void> {
  if (clinicId) {
    await invalidateCacheByTag(`clinic:${clinicId}`)
  } else {
    await invalidateCacheByTag('clinics')
  }
  await invalidateAdminStats()
  console.log('[Cache Invalidation] Clinic caches invalidated')
}

/**
 * Invalidate user caches
 * Call this after: profile update, settings change
 */
export async function invalidateUserCaches(userId: number): Promise<void> {
  await invalidateCacheByTag(`user:${userId}`)
  await invalidateCacheByPattern(`*user:${userId}*`)
  console.log(`[Cache Invalidation] User ${userId} caches invalidated`)
}

/**
 * Invalidate AI-generated insights cache
 * Call this after: new insight generation, insight update
 */
export async function invalidateAIInsightsCaches(
  userId: number,
  insightType?: string
): Promise<void> {
  await invalidateCacheByTag(`ai-insights:${userId}`)

  if (insightType) {
    await invalidateCacheByTag(`ai-insights:${userId}:${insightType}`)
  }

  console.log(`[Cache Invalidation] AI insights for user ${userId} invalidated`)
}

/**
 * Invalidate calendar sync caches
 * Call this after: calendar sync, session creation with calendar
 */
export async function invalidateCalendarCaches(userId: number): Promise<void> {
  await invalidateCacheByTag(`calendar:${userId}`)
  await invalidateCacheByTag(`sessions:${userId}`)
  console.log(`[Cache Invalidation] Calendar caches for user ${userId} invalidated`)
}

// ================================================================
// COMPOSITE INVALIDATIONS
// ================================================================

/**
 * Invalidate all caches related to a session event
 * Comprehensive invalidation for session creation/update/cancellation
 */
export async function invalidateSessionEvent(
  psychologistId: number,
  patientId: number,
  sessionId?: number
): Promise<void> {
  await Promise.all([
    invalidateSessionCaches(psychologistId, patientId),
    invalidatePsychologistDashboard(psychologistId),
    invalidatePatientStats(patientId),
    invalidateAdminStats(),
  ])

  if (sessionId) {
    const cacheKey = generateCacheKey(['session', sessionId])
    await invalidateCache(cacheKey)
  }

  console.log('[Cache Invalidation] Session event caches invalidated (comprehensive)')
}

/**
 * Invalidate all caches related to a diary entry event
 * Comprehensive invalidation for diary creation/update
 */
export async function invalidateDiaryEvent(patientId: number): Promise<void> {
  await Promise.all([
    invalidateDiaryCaches(patientId),
    invalidatePatientStats(patientId),
    invalidateAIInsightsCaches(patientId),
  ])

  console.log('[Cache Invalidation] Diary event caches invalidated (comprehensive)')
}

/**
 * Invalidate all caches related to a meditation session event
 * Comprehensive invalidation for meditation completion
 */
export async function invalidateMeditationEvent(userId: number): Promise<void> {
  await Promise.all([
    invalidateMeditationStats(userId),
    invalidatePatientStats(userId),
    invalidateGamificationCaches(userId),
  ])

  console.log('[Cache Invalidation] Meditation event caches invalidated (comprehensive)')
}

/**
 * Invalidate all caches related to a gamification event
 * Comprehensive invalidation for points, achievements, challenges
 */
export async function invalidateGamificationEvent(userId: number): Promise<void> {
  await Promise.all([
    invalidateGamificationCaches(userId),
    invalidateLeaderboard(),
    invalidatePatientStats(userId),
  ])

  console.log('[Cache Invalidation] Gamification event caches invalidated (comprehensive)')
}

// ================================================================
// MONITORING
// ================================================================

/**
 * Track cache invalidation metrics
 * Useful for monitoring and debugging
 */
const invalidationStats = {
  totalInvalidations: 0,
  byType: {} as Record<string, number>,
  lastInvalidation: null as Date | null,
}

/**
 * Record cache invalidation for monitoring
 */
function recordInvalidation(type: string): void {
  invalidationStats.totalInvalidations++
  invalidationStats.byType[type] = (invalidationStats.byType[type] || 0) + 1
  invalidationStats.lastInvalidation = new Date()
}

/**
 * Get cache invalidation statistics
 */
export function getInvalidationStats() {
  return {
    ...invalidationStats,
    types: Object.entries(invalidationStats.byType).map(([type, count]) => ({
      type,
      count,
    })),
  }
}

/**
 * Reset invalidation statistics
 */
export function resetInvalidationStats(): void {
  invalidationStats.totalInvalidations = 0
  invalidationStats.byType = {}
  invalidationStats.lastInvalidation = null
}
