import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users, achievements, userAchievements, pointActivities } from "@/db/schema"
import { eq, desc, count, and, sql, gte } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"
import { calculateLevelFromXP, calculateXPForLevel } from "@/lib/gamification"
import { apiUnauthorized, apiBadRequest, apiSuccess, handleApiError } from "@/lib/api-response"
import { safeError } from "@/lib/safe-logger"

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return apiUnauthorized("Não autorizado")
  }

  try {
    // Buscar todas as conquistas disponíveis
    const allAchievements = await db.query.achievements.findMany({
      where: eq(achievements.isActive, true),
      orderBy: [achievements.category, achievements.rarity, achievements.requirement],
    })

    // Buscar conquistas desbloqueadas pelo usuário
    const unlockedAchievements = await db.query.userAchievements.findMany({
      where: eq(userAchievements.userId, userId),
      with: {
        achievement: true,
      },
      orderBy: [desc(userAchievements.unlockedAt)],
    })

    // Mapear conquistas com status de desbloqueio
    const achievementsWithStatus = allAchievements.map(achievement => {
      const userAchievement = unlockedAchievements.find(ua => ua.achievementId === achievement.id)
      return {
        ...achievement,
        unlocked: !!userAchievement,
        unlockedAt: userAchievement?.unlockedAt || null,
        progress: userAchievement?.progress || 0,
      }
    })

    // Agrupar por categoria
    const groupedAchievements = achievementsWithStatus.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = []
      }
      acc[achievement.category].push(achievement)
      return acc
    }, {} as Record<string, typeof achievementsWithStatus>)

    // Calcular estatísticas
    const totalAchievements = allAchievements.length
    const unlockedCount = unlockedAchievements.length
    const progressPercentage = totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0

    return apiSuccess({
      achievements: groupedAchievements,
      stats: {
        total: totalAchievements,
        unlocked: unlockedCount,
        progressPercentage,
      },
      recentUnlocked: unlockedAchievements.slice(0, 5),
    })
  } catch (error) {
    safeError('[ACHIEVEMENTS_GET]', 'Erro ao buscar conquistas:', error)
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return apiUnauthorized("Não autorizado")
  }

  try {
    const { checkAll } = await request.json()

    if (checkAll) {
      // Verificar todas as conquistas automaticamente
      const newAchievements = await checkAllAchievements(userId)
      return apiSuccess({
        newAchievements,
        message: `${newAchievements.length} nova(s) conquista(s) desbloqueada(s)!`,
      })
    }

    return apiBadRequest("Ação não especificada", { code: "MISSING_ACTION" })
  } catch (error) {
    safeError('[ACHIEVEMENTS_POST]', 'Erro ao processar conquistas:', error)
    return handleApiError(error)
  }
}

// Função para verificar todas as conquistas automaticamente
async function checkAllAchievements(userId: number) {
  const newAchievements = []

  // Buscar conquistas já desbloqueadas
  const existingAchievements = await db.query.userAchievements.findMany({
    where: eq(userAchievements.userId, userId),
    columns: { achievementId: true },
  })
  const existingIds = existingAchievements.map(ua => ua.achievementId)

  // Buscar todas as conquistas disponíveis
  const allAchievements = await db.query.achievements.findMany({
    where: eq(achievements.isActive, true),
  })

  // Verificar cada conquista
  for (const achievement of allAchievements) {
    if (existingIds.includes(achievement.id)) continue

    const shouldUnlock = await checkAchievementRequirement(userId, achievement)
    
    if (shouldUnlock) {
      // Desbloquear conquista
      await db.insert(userAchievements).values({
        userId,
        achievementId: achievement.id,
        progress: achievement.requirement,
      })

      // Adicionar XP de recompensa
      if (achievement.xpReward > 0) {
        await db.insert(pointActivities).values({
          userId,
          activityType: 'achievement_unlocked',
          points: 0,
          xp: achievement.xpReward,
          description: `Conquista desbloqueada: ${achievement.name}`,
          metadata: JSON.stringify({ achievementId: achievement.id }),
        })

        // Atualizar XP total do usuário
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { totalXP: true, currentLevel: true },
        })

        if (user) {
          const newTotalXP = user.totalXP + achievement.xpReward
          const newLevel = calculateLevelFromXP(newTotalXP)

          await db
            .update(users)
            .set({
              totalXP: newTotalXP,
              currentLevel: newLevel,
            })
            .where(eq(users.id, userId))
        }
      }

      newAchievements.push(achievement)
    }
  }

  return newAchievements
}

// Função para verificar se uma conquista deve ser desbloqueada
async function checkAchievementRequirement(userId: number, achievement: any): Promise<boolean> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  switch (achievement.type) {
    case 'activity':
      // Conquistas baseadas em quantidade de atividades
      const activityCount = await db
        .select({ count: count() })
        .from(pointActivities)
        .where(
          and(
            eq(pointActivities.userId, userId),
            eq(pointActivities.activityType, achievement.category)
          )
        )
      return activityCount[0]?.count >= achievement.requirement

    case 'streak':
      // Conquistas baseadas em sequências
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { streak: true },
      })
      return user ? user.streak >= achievement.requirement : false

    case 'milestone':
      // Conquistas baseadas em marcos (XP, nível)
      if (achievement.category === 'level') {
        const levelUser = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { currentLevel: true },
        })
        return levelUser ? levelUser.currentLevel >= achievement.requirement : false
      }
      if (achievement.category === 'xp') {
        const xpUser = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { totalXP: true },
        })
        return xpUser ? xpUser.totalXP >= achievement.requirement : false
      }
      break

    case 'special':
      // Conquistas especiais com lógica customizada
      return await checkSpecialAchievement(userId, achievement)

    default:
      return false
  }

  return false
}

// Função para verificar conquistas especiais
async function checkSpecialAchievement(userId: number, achievement: any): Promise<boolean> {
  // Implementar lógica específica para conquistas especiais
  switch (achievement.name) {
    case 'Primeira Meditação':
      const meditationCount = await db
        .select({ count: count() })
        .from(pointActivities)
        .where(
          and(
            eq(pointActivities.userId, userId),
            eq(pointActivities.activityType, 'meditation_completed')
          )
        )
      return meditationCount[0]?.count >= 1

    case 'Explorador Emocional':
      // Primeira entrada no diário
      const diaryCount = await db
        .select({ count: count() })
        .from(pointActivities)
        .where(
          and(
            eq(pointActivities.userId, userId),
            eq(pointActivities.activityType, 'diary_entry')
          )
        )
      return diaryCount[0]?.count >= 1

    default:
      return false
  }
}