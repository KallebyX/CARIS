import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users, pointActivities } from "@/db/schema"
import { eq, desc, sum, and, gte } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

// Tabela de configuração de pontos por atividade
const ACTIVITY_POINTS = {
  diary_entry: { points: 10, xp: 15 },
  meditation_completed: { points: 15, xp: 20 },
  task_completed: { points: 20, xp: 25 },
  session_attended: { points: 25, xp: 30 },
  streak_maintained: { points: 5, xp: 10 },
  challenge_completed: { points: 50, xp: 75 },
} as const

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
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
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
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

    return NextResponse.json({
      success: true,
      data: {
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
        activityPoints: ACTIVITY_POINTS,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar pontos:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { activityType, metadata } = await request.json()

    if (!activityType || !ACTIVITY_POINTS[activityType as keyof typeof ACTIVITY_POINTS]) {
      return NextResponse.json({ error: "Tipo de atividade inválido" }, { status: 400 })
    }

    const points = ACTIVITY_POINTS[activityType as keyof typeof ACTIVITY_POINTS]
    const description = getActivityDescription(activityType, metadata)

    // Registrar a atividade
    await db.insert(pointActivities).values({
      userId,
      activityType,
      points: points.points,
      xp: points.xp,
      description,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })

    // Atualizar pontos do usuário
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
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const newTotalXP = user.totalXP + points.xp
    const newLevel = calculateLevelFromXP(newTotalXP)
    const leveledUp = newLevel > user.currentLevel

    await db
      .update(users)
      .set({
        totalXP: newTotalXP,
        currentLevel: newLevel,
        weeklyPoints: user.weeklyPoints + points.points,
        monthlyPoints: user.monthlyPoints + points.points,
      })
      .where(eq(users.id, userId))

    return NextResponse.json({
      success: true,
      data: {
        pointsEarned: points.points,
        xpEarned: points.xp,
        newTotalXP,
        newLevel,
        leveledUp,
        description,
      },
    })
  } catch (error) {
    console.error("Erro ao adicionar pontos:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// Função para calcular XP necessário para um nível
function calculateXPForLevel(level: number): number {
  // Fórmula: XP = 100 * level^1.5
  return Math.floor(100 * Math.pow(level, 1.5))
}

// Função para calcular nível baseado no XP total
function calculateLevelFromXP(totalXP: number): number {
  let level = 1
  while (calculateXPForLevel(level + 1) <= totalXP) {
    level++
  }
  return level
}

// Função para gerar descrição da atividade
function getActivityDescription(activityType: string, metadata: any): string {
  const descriptions = {
    diary_entry: "Entrada no diário",
    meditation_completed: "Sessão de meditação concluída",
    task_completed: "Tarefa terapêutica concluída",
    session_attended: "Sessão com psicólogo",
    streak_maintained: "Sequência mantida",
    challenge_completed: "Desafio semanal concluído",
  }

  let baseDescription = descriptions[activityType as keyof typeof descriptions] || "Atividade"
  
  if (metadata?.title) {
    baseDescription += `: ${metadata.title}`
  }

  return baseDescription
}