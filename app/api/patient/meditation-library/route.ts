import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { 
  meditationAudios, 
  meditationCategories, 
  userMeditationFavorites,
  meditationAudioRatings,
  meditationSessions 
} from '@/db/schema'
import { getUserIdFromRequest } from '@/lib/auth'
import { eq, desc, and, ilike, or, sql, avg, count } from 'drizzle-orm'

// GET - Listar áudios de meditação para pacientes
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured') === 'true'
    const popular = searchParams.get('popular') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = db
      .select({
        id: meditationAudios.id,
        title: meditationAudios.title,
        description: meditationAudios.description,
        categoryId: meditationAudios.categoryId,
        categoryName: meditationCategories.name,
        categoryIcon: meditationCategories.icon,
        categoryColor: meditationCategories.color,
        duration: meditationAudios.duration,
        difficulty: meditationAudios.difficulty,
        instructor: meditationAudios.instructor,
        audioUrl: meditationAudios.audioUrl,
        thumbnailUrl: meditationAudios.thumbnailUrl,
        transcript: meditationAudios.transcript,
        guidedSteps: meditationAudios.guidedSteps,
        benefits: meditationAudios.benefits,
        techniques: meditationAudios.techniques,
        preparationSteps: meditationAudios.preparationSteps,
        tags: meditationAudios.tags,
        language: meditationAudios.language,
        playCount: meditationAudios.playCount,
        averageRating: meditationAudios.averageRating,
        ratingCount: meditationAudios.ratingCount,
        isPopular: meditationAudios.isPopular,
        isFeatured: meditationAudios.isFeatured,
        createdAt: meditationAudios.createdAt,
      })
      .from(meditationAudios)
      .leftJoin(meditationCategories, eq(meditationAudios.categoryId, meditationCategories.id))

    // Aplicar filtros
    const conditions = [eq(meditationAudios.status, 'active')]

    if (category && category !== 'all') {
      conditions.push(eq(meditationAudios.categoryId, category))
    }

    if (difficulty && difficulty !== 'all') {
      conditions.push(eq(meditationAudios.difficulty, difficulty))
    }

    if (featured) {
      conditions.push(eq(meditationAudios.isFeatured, true))
    }

    if (popular) {
      conditions.push(eq(meditationAudios.isPopular, true))
    }

    if (search) {
      conditions.push(
        or(
          ilike(meditationAudios.title, `%${search}%`),
          ilike(meditationAudios.description, `%${search}%`),
          ilike(meditationAudios.instructor, `%${search}%`)
        )
      )
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const audios = await query
      .orderBy(desc(meditationAudios.isFeatured), desc(meditationAudios.playCount), desc(meditationAudios.createdAt))
      .limit(limit)
      .offset(offset)

    // Buscar favoritos do usuário
    const userFavorites = await db
      .select({ audioId: userMeditationFavorites.audioId })
      .from(userMeditationFavorites)
      .where(eq(userMeditationFavorites.userId, userId))

    const favoriteIds = new Set(userFavorites.map(f => f.audioId))

    // Adicionar informação de favorito aos áudios
    const audiosWithFavorites = audios.map(audio => ({
      ...audio,
      isFavorite: favoriteIds.has(audio.id),
      averageRating: audio.averageRating ? audio.averageRating / 100 : 0, // Converter de integer para decimal
      guidedSteps: audio.guidedSteps ? JSON.parse(audio.guidedSteps) : [],
      benefits: audio.benefits ? JSON.parse(audio.benefits) : [],
      techniques: audio.techniques ? JSON.parse(audio.techniques) : [],
      preparationSteps: audio.preparationSteps ? JSON.parse(audio.preparationSteps) : [],
      tags: audio.tags ? JSON.parse(audio.tags) : [],
    }))

    // Contar total para paginação
    const totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(meditationAudios)

    if (conditions.length > 0) {
      totalQuery.where(and(...conditions))
    }

    const [{ count }] = await totalQuery

    return NextResponse.json({
      success: true,
      data: {
        audios: audiosWithFavorites,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    })
  } catch (error) {
    console.error('Erro ao buscar biblioteca de meditação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}