import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users, leaderboards, leaderboardEntries } from "@/db/schema"
import { eq, desc, and, gte, sql } from "drizzle-orm"
import { getUserIdFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'weekly'
    const category = searchParams.get('category') || 'xp'

    // Buscar leaderboard ativo
    const leaderboard = await db.query.leaderboards.findFirst({
      where: and(
        eq(leaderboards.type, type),
        eq(leaderboards.category, category),
        eq(leaderboards.isActive, true)
      ),
    })

    if (!leaderboard) {
      // Se não existe, criar um novo
      const newLeaderboard = await createLeaderboard(type, category)
      if (!newLeaderboard) {
        return NextResponse.json({ error: "Erro ao criar leaderboard" }, { status: 500 })
      }
      return getLeaderboardData(newLeaderboard.id, userId)
    }

    return getLeaderboardData(leaderboard.id, userId)
  } catch (error) {
    console.error("Erro ao buscar leaderboard:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { action, type, category } = await request.json()

    if (action === 'update_leaderboards') {
      // Atualizar todos os leaderboards
      const updatedCount = await updateAllLeaderboards()
      return NextResponse.json({
        success: true,
        data: {
          message: `${updatedCount} leaderboards atualizados`,
        },
      })
    }

    if (action === 'create') {
      // Criar novo leaderboard
      const newLeaderboard = await createLeaderboard(type, category)
      return NextResponse.json({
        success: true,
        data: newLeaderboard,
      })
    }

    return NextResponse.json({ error: "Ação não especificada" }, { status: 400 })
  } catch (error) {
    console.error("Erro ao processar leaderboard:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// Função para buscar dados do leaderboard
async function getLeaderboardData(leaderboardId: number, userId: number) {
  // Buscar entradas do leaderboard
  const entries = await db.query.leaderboardEntries.findMany({
    where: eq(leaderboardEntries.leaderboardId, leaderboardId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: [leaderboardEntries.rank],
    limit: 100,
  })

  // Encontrar posição do usuário atual
  const userEntry = entries.find(entry => entry.userId === userId)
  const userRank = userEntry?.rank || null

  // Buscar informações do leaderboard
  const leaderboard = await db.query.leaderboards.findFirst({
    where: eq(leaderboards.id, leaderboardId),
  })

  return NextResponse.json({
    success: true,
    data: {
      leaderboard,
      entries,
      userRank,
      userScore: userEntry?.score || 0,
      totalParticipants: entries.length,
    },
  })
}

// Função para criar um novo leaderboard
async function createLeaderboard(type: string, category: string) {
  const today = new Date()
  let startDate = new Date(today)
  let endDate = new Date(today)

  // Configurar datas baseado no tipo
  switch (type) {
    case 'weekly':
      // Começa na segunda-feira desta semana
      const dayOfWeek = today.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      startDate.setDate(today.getDate() - daysToMonday)
      endDate.setDate(startDate.getDate() + 6)
      break
    case 'monthly':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      break
    case 'all_time':
      startDate = new Date('2024-01-01')
      endDate = new Date('2099-12-31')
      break
  }

  const name = `${getCategoryName(category)} - ${getTypeName(type)}`
  const description = `Ranking de ${getCategoryName(category).toLowerCase()} ${getTypeName(type).toLowerCase()}`

  const [leaderboard] = await db.insert(leaderboards).values({
    name,
    description,
    type,
    category,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    isActive: true,
  }).returning()

  // Populr o leaderboard
  await updateLeaderboard(leaderboard.id)

  return leaderboard
}

// Função para atualizar um leaderboard específico
async function updateLeaderboard(leaderboardId: number) {
  const leaderboard = await db.query.leaderboards.findFirst({
    where: eq(leaderboards.id, leaderboardId),
  })

  if (!leaderboard) return

  // Limpar entradas antigas
  await db.delete(leaderboardEntries).where(eq(leaderboardEntries.leaderboardId, leaderboardId))

  let query: any
  
  switch (leaderboard.category) {
    case 'xp':
      query = db
        .select({
          userId: users.id,
          score: users.totalXP,
        })
        .from(users)
        .where(eq(users.role, 'patient'))
        .orderBy(desc(users.totalXP))
      break
    
    case 'points':
      if (leaderboard.type === 'weekly') {
        query = db
          .select({
            userId: users.id,
            score: users.weeklyPoints,
          })
          .from(users)
          .where(eq(users.role, 'patient'))
          .orderBy(desc(users.weeklyPoints))
      } else {
        query = db
          .select({
            userId: users.id,
            score: users.monthlyPoints,
          })
          .from(users)
          .where(eq(users.role, 'patient'))
          .orderBy(desc(users.monthlyPoints))
      }
      break
    
    case 'streak':
      query = db
        .select({
          userId: users.id,
          score: users.streak,
        })
        .from(users)
        .where(eq(users.role, 'patient'))
        .orderBy(desc(users.streak))
      break
    
    default:
      return
  }

  const results = await query.limit(100)

  // Inserir novas entradas com ranks
  const entries = results.map((result: any, index: number) => ({
    leaderboardId,
    userId: result.userId,
    score: result.score,
    rank: index + 1,
  }))

  if (entries.length > 0) {
    await db.insert(leaderboardEntries).values(entries)
  }
}

// Função para atualizar todos os leaderboards ativos
async function updateAllLeaderboards() {
  const activeLeaderboards = await db.query.leaderboards.findMany({
    where: eq(leaderboards.isActive, true),
  })

  for (const leaderboard of activeLeaderboards) {
    await updateLeaderboard(leaderboard.id)
  }

  return activeLeaderboards.length
}

// Funções auxiliares para nomes
function getCategoryName(category: string): string {
  const names = {
    xp: 'Experiência',
    points: 'Pontos',
    streak: 'Sequência',
    activities: 'Atividades',
  }
  return names[category as keyof typeof names] || category
}

function getTypeName(type: string): string {
  const names = {
    weekly: 'Semanal',
    monthly: 'Mensal',
    all_time: 'Todo Tempo',
  }
  return names[type as keyof typeof names] || type
}