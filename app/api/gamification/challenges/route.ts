import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users, weeklyChallenges, userChallengeProgress, pointActivities } from "@/db/schema"
import { eq, desc, and, gte, lte, sql } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Buscar desafios ativos
    const activeChallenges = await db.query.weeklyChallenges.findMany({
      where: and(
        eq(weeklyChallenges.isActive, true),
        lte(weeklyChallenges.startDate, today),
        gte(weeklyChallenges.endDate, today)
      ),
      orderBy: [weeklyChallenges.endDate],
    })

    // Buscar progresso do usuário nos desafios ativos
    const userProgress = await db.query.userChallengeProgress.findMany({
      where: and(
        eq(userChallengeProgress.userId, userId),
        sql`challenge_id IN (${activeChallenges.map(c => c.id).join(',')})`
      ),
      with: {
        challenge: true,
      },
    })

    // Mapear desafios com progresso
    const challengesWithProgress = activeChallenges.map(challenge => {
      const progress = userProgress.find(up => up.challengeId === challenge.id)
      const progressPercentage = challenge.target > 0 ? Math.min(100, Math.round((progress?.progress || 0) / challenge.target * 100)) : 0
      
      return {
        ...challenge,
        userProgress: progress?.progress || 0,
        progressPercentage,
        completed: progress?.completed || false,
        completedAt: progress?.completedAt || null,
      }
    })

    // Buscar desafios completados recentemente
    const completedChallenges = await db.query.userChallengeProgress.findMany({
      where: and(
        eq(userChallengeProgress.userId, userId),
        eq(userChallengeProgress.completed, true)
      ),
      with: {
        challenge: true,
      },
      orderBy: [desc(userChallengeProgress.completedAt)],
      limit: 10,
    })

    return NextResponse.json({
      success: true,
      data: {
        activeChallenges: challengesWithProgress,
        completedChallenges,
        stats: {
          active: challengesWithProgress.length,
          completed: completedChallenges.length,
          inProgress: challengesWithProgress.filter(c => c.userProgress > 0 && !c.completed).length,
        },
      },
    })
  } catch (error) {
    console.error("Erro ao buscar desafios:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { action, challengeId, progress } = await request.json()

    if (action === 'update_progress') {
      if (!challengeId || progress === undefined) {
        return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
      }

      const challenge = await db.query.weeklyChallenges.findFirst({
        where: eq(weeklyChallenges.id, challengeId),
      })

      if (!challenge) {
        return NextResponse.json({ error: "Desafio não encontrado" }, { status: 404 })
      }

      // Verificar se o usuário já tem progresso neste desafio
      let userProgress = await db.query.userChallengeProgress.findFirst({
        where: and(
          eq(userChallengeProgress.userId, userId),
          eq(userChallengeProgress.challengeId, challengeId)
        ),
      })

      const newProgress = Math.min(challenge.target, progress)
      const completed = newProgress >= challenge.target

      if (userProgress) {
        // Atualizar progresso existente
        await db
          .update(userChallengeProgress)
          .set({
            progress: newProgress,
            completed,
            completedAt: completed ? new Date() : null,
          })
          .where(eq(userChallengeProgress.id, userProgress.id))
      } else {
        // Criar novo progresso
        await db.insert(userChallengeProgress).values({
          userId,
          challengeId,
          progress: newProgress,
          completed,
          completedAt: completed ? new Date() : null,
        })
      }

      // Se completou o desafio, adicionar recompensas
      if (completed && (!userProgress || !userProgress.completed)) {
        await db.insert(pointActivities).values({
          userId,
          activityType: 'challenge_completed',
          points: challenge.pointsReward,
          xp: challenge.xpReward,
          description: `Desafio concluído: ${challenge.title}`,
          metadata: JSON.stringify({ challengeId }),
        })

        // Atualizar pontos e XP do usuário
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: {
            totalXP: true,
            currentLevel: true,
            weeklyPoints: true,
            monthlyPoints: true,
          },
        })

        if (user) {
          const newTotalXP = user.totalXP + challenge.xpReward
          const newLevel = calculateLevelFromXP(newTotalXP)

          await db
            .update(users)
            .set({
              totalXP: newTotalXP,
              currentLevel: newLevel,
              weeklyPoints: user.weeklyPoints + challenge.pointsReward,
              monthlyPoints: user.monthlyPoints + challenge.pointsReward,
            })
            .where(eq(users.id, userId))
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          progress: newProgress,
          completed,
          rewardEarned: completed && (!userProgress || !userProgress.completed),
          pointsEarned: completed ? challenge.pointsReward : 0,
          xpEarned: completed ? challenge.xpReward : 0,
        },
      })
    }

    if (action === 'create_weekly') {
      // Criar desafios semanais automáticos
      const newChallenges = await createWeeklyChallenges()
      return NextResponse.json({
        success: true,
        data: {
          challengesCreated: newChallenges.length,
          challenges: newChallenges,
        },
      })
    }

    return NextResponse.json({ error: "Ação não especificada" }, { status: 400 })
  } catch (error) {
    console.error("Erro ao processar desafio:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// Função para criar desafios semanais automáticos
async function createWeeklyChallenges() {
  const today = new Date()
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7)
  
  const startDate = nextMonday.toISOString().split('T')[0]
  const endDate = new Date(nextMonday)
  endDate.setDate(nextMonday.getDate() + 6)
  const endDateStr = endDate.toISOString().split('T')[0]

  const weeklyTemplates = [
    {
      title: "Escriba Diário",
      description: "Faça 5 entradas no diário esta semana",
      icon: "BookOpen",
      type: "diary",
      target: 5,
      xpReward: 100,
      pointsReward: 75,
    },
    {
      title: "Mindfulness",
      description: "Complete 3 sessões de meditação",
      icon: "Brain",
      type: "meditation",
      target: 3,
      xpReward: 75,
      pointsReward: 50,
    },
    {
      title: "Produtividade",
      description: "Complete 5 tarefas terapêuticas",
      icon: "CheckCircle",
      type: "tasks",
      target: 5,
      xpReward: 150,
      pointsReward: 100,
    },
    {
      title: "Constância",
      description: "Mantenha uma sequência de 7 dias",
      icon: "Calendar",
      type: "streak",
      target: 7,
      xpReward: 200,
      pointsReward: 150,
    },
  ]

  const newChallenges = []

  for (const template of weeklyTemplates) {
    const [challenge] = await db.insert(weeklyChallenges).values({
      ...template,
      startDate,
      endDate: endDateStr,
      isActive: true,
    }).returning()

    newChallenges.push(challenge)
  }

  return newChallenges
}

// Função para calcular nível baseado no XP total
function calculateLevelFromXP(totalXP: number): number {
  let level = 1
  while (calculateXPForLevel(level + 1) <= totalXP) {
    level++
  }
  return level
}

// Função para calcular XP necessário para um nível
function calculateXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5))
}