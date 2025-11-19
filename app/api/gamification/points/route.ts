import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users, pointActivities } from "@/db/schema"
import { eq, desc, sum, and, gte } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"
import {
  awardGamificationPoints,
  getAllRewardConfigs,
  calculateXPForLevel,
  calculateLevelFromXP,
} from "@/lib/gamification"
import { apiUnauthorized, apiNotFound, apiBadRequest, apiSuccess, handleApiError } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return apiUnauthorized("Não autorizado")
  }

  try {
    // Buscar informações do usuário
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        totalXP: true,
        currentLevel: true,
        weeklyPoints: true,
        monthlyPoints: true,
        streak: true,
      },
    })

    if (!user) {
      return apiNotFound("Usuário não encontrado")
    }

    // Buscar atividades recentes (últimos 30 dias)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentActivities = await db.query.pointActivities.findMany({
      where: and(
        eq(pointActivities.userId, userId),
        gte(pointActivities.createdAt, thirtyDaysAgo)
      ),
      orderBy: [desc(pointActivities.createdAt)],
      limit: 50,
    })

    // Calcular XP necessário para o próximo nível
    const nextLevelXP = calculateXPForLevel(user.currentLevel + 1)
    const currentLevelXP = calculateXPForLevel(user.currentLevel)
    const progressToNextLevel = user.totalXP - currentLevelXP
    const xpNeededForNextLevel = nextLevelXP - user.totalXP

    // Get reward configurations from database
    const rewardConfigs = await getAllRewardConfigs()

    return apiSuccess({
      user: {
        totalXP: user.totalXP,
        currentLevel: user.currentLevel,
        weeklyPoints: user.weeklyPoints,
        monthlyPoints: user.monthlyPoints,
        streak: user.streak,
        progressToNextLevel,
        xpNeededForNextLevel,
        nextLevelXP,
      },
      recentActivities,
      rewardConfigs, // Database-driven reward configuration
    })
  } catch (error) {
    console.error("Erro ao buscar pontos:", error)
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return apiUnauthorized("Não autorizado")
  }

  try {
    const { activityType, metadata } = await request.json()

    if (!activityType) {
      return apiBadRequest("Tipo de atividade é obrigatório", {
        code: "MISSING_ACTIVITY_TYPE"
      })
    }

    // Award points using centralized gamification service
    const result = await awardGamificationPoints(userId, activityType, metadata)

    if (!result.success) {
      // Handle specific failure reasons
      if (result.reason === 'unknown_activity_type') {
        return apiBadRequest(result.message!, { code: 'INVALID_ACTIVITY_TYPE' })
      }
      if (result.reason === 'reward_disabled') {
        return apiBadRequest(result.message!, { code: 'REWARD_DISABLED' })
      }
      if (result.reason === 'level_too_low') {
        return apiBadRequest(result.message!, { code: 'LEVEL_TOO_LOW' })
      }
      if (result.reason === 'daily_limit_reached') {
        return apiBadRequest(result.message!, { code: 'DAILY_LIMIT_REACHED' })
      }
      if (result.reason === 'in_cooldown') {
        return apiBadRequest(result.message!, { code: 'IN_COOLDOWN' })
      }

      // Generic failure
      return apiBadRequest(result.message || "Falha ao adicionar pontos")
    }

    return apiSuccess({
      pointsEarned: result.points,
      xpEarned: result.xp,
      newTotalXP: result.newTotalXP,
      newLevel: result.newLevel,
      leveledUp: result.leveledUp,
      message: result.message,
    })
  } catch (error) {
    console.error("Erro ao adicionar pontos:", error)
    return handleApiError(error)
  }
}