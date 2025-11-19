/**
 * MEDIUM-04: Database-driven Gamification System
 *
 * Centralized gamification logic that reads configuration from database
 * instead of hardcoded values. Supports:
 * - Configurable points and XP per activity type
 * - Daily limits and cooldowns
 * - Level requirements
 * - Enable/disable specific rewards
 */

import { db } from "@/db"
import { gamificationConfig, pointActivities, users } from "@/db/schema"
import { eq, and, gte, count } from "drizzle-orm"
import { safeError } from "./safe-logger"

// Cache for gamification config (refreshed periodically)
let configCache: Map<string, GamificationReward> | null = null
let lastCacheRefresh = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export interface GamificationReward {
  activityType: string
  points: number
  xp: number
  description: string
  category: string
  enabled: boolean
  minLevel?: number | null
  maxDailyCount?: number | null
  cooldownMinutes?: number | null
  metadata?: any
}

export interface AwardPointsResult {
  success: boolean
  points?: number
  xp?: number
  newTotalXP?: number
  newLevel?: number
  leveledUp?: boolean
  message?: string
  reason?: string
}

/**
 * Get gamification configuration from database (with caching)
 */
async function getGamificationConfig(): Promise<Map<string, GamificationReward>> {
  const now = Date.now()

  // Return cached config if still valid
  if (configCache && (now - lastCacheRefresh) < CACHE_TTL_MS) {
    return configCache
  }

  try {
    const config = await db
      .select()
      .from(gamificationConfig)
      .where(eq(gamificationConfig.enabled, true))

    const configMap = new Map<string, GamificationReward>()

    for (const item of config) {
      configMap.set(item.activityType, {
        activityType: item.activityType,
        points: item.points,
        xp: item.xp,
        description: item.description,
        category: item.category,
        enabled: item.enabled,
        minLevel: item.minLevel,
        maxDailyCount: item.maxDailyCount,
        cooldownMinutes: item.cooldownMinutes,
        metadata: item.metadata,
      })
    }

    // Update cache
    configCache = configMap
    lastCacheRefresh = now

    return configMap
  } catch (error) {
    safeError('[GAMIFICATION]', 'Failed to load gamification config:', error)

    // Return fallback config if database fails
    return getFallbackConfig()
  }
}

/**
 * Fallback configuration if database is unavailable
 * Uses the original hardcoded values
 */
function getFallbackConfig(): Map<string, GamificationReward> {
  const fallbackMap = new Map<string, GamificationReward>()

  const fallbackValues = [
    { activityType: 'diary_entry', points: 10, xp: 15, description: 'Entrada no diário', category: 'diary' },
    { activityType: 'meditation_completed', points: 15, xp: 20, description: 'Meditação completada', category: 'meditation' },
    { activityType: 'task_completed', points: 20, xp: 25, description: 'Tarefa completada', category: 'tasks' },
    { activityType: 'session_attended', points: 25, xp: 30, description: 'Sessão de terapia', category: 'sessions' },
  ]

  for (const config of fallbackValues) {
    fallbackMap.set(config.activityType, {
      ...config,
      enabled: true,
      minLevel: 1,
      maxDailyCount: null,
      cooldownMinutes: null,
      metadata: null,
    })
  }

  return fallbackMap
}

/**
 * Calculate level from total XP
 */
export function calculateLevelFromXP(totalXP: number): number {
  let level = 1
  while (calculateXPForLevel(level + 1) <= totalXP) {
    level++
  }
  return level
}

/**
 * Calculate XP required for a specific level
 */
export function calculateXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5))
}

/**
 * Check if user has reached daily limit for an activity
 */
async function checkDailyLimit(
  userId: number,
  activityType: string,
  maxDailyCount: number | null
): Promise<boolean> {
  if (!maxDailyCount) return false // No limit

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayCount = await db
    .select({ count: count() })
    .from(pointActivities)
    .where(
      and(
        eq(pointActivities.userId, userId),
        eq(pointActivities.activityType, activityType),
        gte(pointActivities.createdAt, today)
      )
    )

  return todayCount[0]?.count >= maxDailyCount
}

/**
 * Check if user is still in cooldown period for an activity
 */
async function checkCooldown(
  userId: number,
  activityType: string,
  cooldownMinutes: number | null
): Promise<boolean> {
  if (!cooldownMinutes) return false // No cooldown

  const cooldownThreshold = new Date()
  cooldownThreshold.setMinutes(cooldownThreshold.getMinutes() - cooldownMinutes)

  const recentActivity = await db
    .select()
    .from(pointActivities)
    .where(
      and(
        eq(pointActivities.userId, userId),
        eq(pointActivities.activityType, activityType),
        gte(pointActivities.createdAt, cooldownThreshold)
      )
    )
    .limit(1)

  return recentActivity.length > 0
}

/**
 * Award gamification points to a user (database-driven configuration)
 *
 * @param userId - The user ID
 * @param activityType - Type of activity (diary_entry, meditation_completed, etc.)
 * @param metadata - Optional metadata about the activity
 * @returns Result object with success status and details
 */
export async function awardGamificationPoints(
  userId: number,
  activityType: string,
  metadata?: any
): Promise<AwardPointsResult> {
  try {
    // Get configuration from database
    const config = await getGamificationConfig()
    const reward = config.get(activityType)

    if (!reward) {
      return {
        success: false,
        reason: 'unknown_activity_type',
        message: `Activity type "${activityType}" not configured`,
      }
    }

    if (!reward.enabled) {
      return {
        success: false,
        reason: 'reward_disabled',
        message: `Rewards for "${activityType}" are currently disabled`,
      }
    }

    // Get user data
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        totalXP: true,
        currentLevel: true,
        weeklyPoints: true,
        monthlyPoints: true,
      },
    })

    if (!user) {
      return {
        success: false,
        reason: 'user_not_found',
        message: 'User not found',
      }
    }

    // Check level requirement
    if (reward.minLevel && user.currentLevel < reward.minLevel) {
      return {
        success: false,
        reason: 'level_too_low',
        message: `Requires level ${reward.minLevel} (current: ${user.currentLevel})`,
      }
    }

    // Check daily limit
    const reachedDailyLimit = await checkDailyLimit(userId, activityType, reward.maxDailyCount)
    if (reachedDailyLimit) {
      return {
        success: false,
        reason: 'daily_limit_reached',
        message: `Daily limit of ${reward.maxDailyCount} reached for ${activityType}`,
      }
    }

    // Check cooldown
    const inCooldown = await checkCooldown(userId, activityType, reward.cooldownMinutes)
    if (inCooldown) {
      return {
        success: false,
        reason: 'in_cooldown',
        message: `Please wait ${reward.cooldownMinutes} minutes between ${activityType} rewards`,
      }
    }

    // Award points - insert point activity record
    await db.insert(pointActivities).values({
      userId,
      activityType,
      points: reward.points,
      xp: reward.xp,
      description: reward.description,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })

    // Calculate new totals
    const newTotalXP = user.totalXP + reward.xp
    const newLevel = calculateLevelFromXP(newTotalXP)
    const leveledUp = newLevel > user.currentLevel

    // Update user totals
    await db
      .update(users)
      .set({
        totalXP: newTotalXP,
        currentLevel: newLevel,
        weeklyPoints: user.weeklyPoints + reward.points,
        monthlyPoints: user.monthlyPoints + reward.points,
      })
      .where(eq(users.id, userId))

    return {
      success: true,
      points: reward.points,
      xp: reward.xp,
      newTotalXP,
      newLevel,
      leveledUp,
      message: `Earned ${reward.points} points and ${reward.xp} XP!`,
    }
  } catch (error) {
    safeError('[GAMIFICATION]', 'Failed to award points:', error)
    return {
      success: false,
      reason: 'internal_error',
      message: 'Failed to award points',
    }
  }
}

/**
 * Get reward configuration for a specific activity type
 */
export async function getRewardConfig(activityType: string): Promise<GamificationReward | null> {
  const config = await getGamificationConfig()
  return config.get(activityType) || null
}

/**
 * Get all enabled reward configurations
 */
export async function getAllRewardConfigs(): Promise<GamificationReward[]> {
  const config = await getGamificationConfig()
  return Array.from(config.values())
}

/**
 * Manually refresh the configuration cache
 * Call this after updating gamification_config table
 */
export function refreshGamificationCache(): void {
  configCache = null
  lastCacheRefresh = 0
}
