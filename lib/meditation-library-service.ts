import { db } from '@/db'
import { 
  meditationAudios, 
  meditationCategories, 
  userMeditationFavorites,
  meditationAudioRatings,
  meditationSessions 
} from '@/db/schema'
import { eq, desc, and, ilike, or, sql, avg, count, inArray } from 'drizzle-orm'

export interface MeditationAudio {
  id: string
  title: string
  description: string
  categoryId: string
  categoryName?: string
  categoryIcon?: string
  categoryColor?: string
  duration: number // em segundos
  difficulty: 'iniciante' | 'intermediario' | 'avancado'
  instructor: string
  audioUrl: string
  thumbnailUrl?: string
  transcript?: string
  guidedSteps?: string[]
  benefits?: string[]
  techniques?: string[]
  preparationSteps?: string[]
  tags?: string[]
  language: string
  playCount: number
  averageRating: number // 0-5
  ratingCount: number
  isPopular: boolean
  isFeatured: boolean
  isFavorite?: boolean
  createdAt: Date
}

export interface MeditationCategory {
  id: string
  name: string
  description?: string
  icon: string
  color: string
  displayOrder: number
  isActive: boolean
}

export interface MeditationFilters {
  categoryId?: string
  difficulty?: string
  search?: string
  featured?: boolean
  popular?: boolean
  minDuration?: number
  maxDuration?: number
  userId?: number
}

export interface MeditationPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export class MeditationLibraryService {
  // Buscar categorias ativas
  static async getCategories(): Promise<MeditationCategory[]> {
    const categories = await db
      .select()
      .from(meditationCategories)
      .where(eq(meditationCategories.isActive, true))
      .orderBy(meditationCategories.displayOrder)

    return categories
  }

  // Buscar áudios com filtros
  static async getAudios(
    filters: MeditationFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ audios: MeditationAudio[], pagination: MeditationPagination }> {
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

    if (filters.categoryId) {
      conditions.push(eq(meditationAudios.categoryId, filters.categoryId))
    }

    if (filters.difficulty) {
      conditions.push(eq(meditationAudios.difficulty, filters.difficulty))
    }

    if (filters.featured) {
      conditions.push(eq(meditationAudios.isFeatured, true))
    }

    if (filters.popular) {
      conditions.push(eq(meditationAudios.isPopular, true))
    }

    if (filters.minDuration) {
      conditions.push(sql`${meditationAudios.duration} >= ${filters.minDuration}`)
    }

    if (filters.maxDuration) {
      conditions.push(sql`${meditationAudios.duration} <= ${filters.maxDuration}`)
    }

    if (filters.search) {
      conditions.push(
        or(
          ilike(meditationAudios.title, `%${filters.search}%`),
          ilike(meditationAudios.description, `%${filters.search}%`),
          ilike(meditationAudios.instructor, `%${filters.search}%`)
        )
      )
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const audios = await query
      .orderBy(
        desc(meditationAudios.isFeatured),
        desc(meditationAudios.playCount),
        desc(meditationAudios.createdAt)
      )
      .limit(limit)
      .offset(offset)

    // Processar dados dos áudios
    const processedAudios: MeditationAudio[] = audios.map(audio => ({
      ...audio,
      averageRating: audio.averageRating ? audio.averageRating / 100 : 0,
      guidedSteps: audio.guidedSteps ? JSON.parse(audio.guidedSteps) : [],
      benefits: audio.benefits ? JSON.parse(audio.benefits) : [],
      techniques: audio.techniques ? JSON.parse(audio.techniques) : [],
      preparationSteps: audio.preparationSteps ? JSON.parse(audio.preparationSteps) : [],
      tags: audio.tags ? JSON.parse(audio.tags) : [],
    }))

    // Adicionar favoritos do usuário se userId fornecido
    if (filters.userId) {
      const userFavorites = await db
        .select({ audioId: userMeditationFavorites.audioId })
        .from(userMeditationFavorites)
        .where(eq(userMeditationFavorites.userId, filters.userId))

      const favoriteIds = new Set(userFavorites.map(f => f.audioId))
      
      processedAudios.forEach(audio => {
        audio.isFavorite = favoriteIds.has(audio.id)
      })
    }

    // Contar total para paginação
    const totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(meditationAudios)

    if (conditions.length > 0) {
      totalQuery.where(and(...conditions))
    }

    const [{ count }] = await totalQuery

    return {
      audios: processedAudios,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  }

  // Buscar áudio por ID
  static async getAudioById(id: string, userId?: number): Promise<MeditationAudio | null> {
    const [audio] = await db
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
      .where(and(
        eq(meditationAudios.id, id),
        eq(meditationAudios.status, 'active')
      ))
      .limit(1)

    if (!audio) return null

    const processedAudio: MeditationAudio = {
      ...audio,
      averageRating: audio.averageRating ? audio.averageRating / 100 : 0,
      guidedSteps: audio.guidedSteps ? JSON.parse(audio.guidedSteps) : [],
      benefits: audio.benefits ? JSON.parse(audio.benefits) : [],
      techniques: audio.techniques ? JSON.parse(audio.techniques) : [],
      preparationSteps: audio.preparationSteps ? JSON.parse(audio.preparationSteps) : [],
      tags: audio.tags ? JSON.parse(audio.tags) : [],
    }

    // Verificar se é favorito do usuário
    if (userId) {
      const [favorite] = await db
        .select()
        .from(userMeditationFavorites)
        .where(and(
          eq(userMeditationFavorites.userId, userId),
          eq(userMeditationFavorites.audioId, id)
        ))
        .limit(1)

      processedAudio.isFavorite = !!favorite
    }

    return processedAudio
  }

  // Buscar áudios populares
  static async getPopularAudios(limit: number = 10): Promise<MeditationAudio[]> {
    const result = await this.getAudios({ popular: true }, 1, limit)
    return result.audios
  }

  // Buscar áudios em destaque
  static async getFeaturedAudios(limit: number = 10): Promise<MeditationAudio[]> {
    const result = await this.getAudios({ featured: true }, 1, limit)
    return result.audios
  }

  // Buscar recomendações baseadas no histórico do usuário
  static async getRecommendedAudios(userId: number, limit: number = 10): Promise<MeditationAudio[]> {
    // Buscar categorias mais praticadas pelo usuário
    const userCategories = await db
      .select({
        categoryId: meditationAudios.categoryId,
        count: sql<number>`count(*)`
      })
      .from(meditationSessions)
      .leftJoin(meditationAudios, eq(meditationSessions.meditationId, meditationAudios.id))
      .where(eq(meditationSessions.userId, userId))
      .groupBy(meditationAudios.categoryId)
      .orderBy(desc(sql`count(*)`))
      .limit(3)

    const preferredCategories = userCategories.map(c => c.categoryId).filter(Boolean)

    if (preferredCategories.length === 0) {
      // Se não há histórico, retornar áudios populares para iniciantes
      const result = await this.getAudios({ 
        difficulty: 'iniciante', 
        popular: true 
      }, 1, limit)
      return result.audios
    }

    // Buscar áudios das categorias preferidas que o usuário ainda não praticou
    const practiceAudioIds = await db
      .select({ audioId: meditationSessions.meditationId })
      .from(meditationSessions)
      .where(eq(meditationSessions.userId, userId))

    const practiceIds = practiceAudioIds.map(p => p.audioId)

    const conditions = [
      eq(meditationAudios.status, 'active'),
      inArray(meditationAudios.categoryId, preferredCategories),
    ]

    if (practiceIds.length > 0) {
      conditions.push(sql`${meditationAudios.id} NOT IN (${practiceIds.join(',')})`)
    }

    const recommendedAudios = await db
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
      .where(and(...conditions))
      .orderBy(desc(meditationAudios.averageRating), desc(meditationAudios.playCount))
      .limit(limit)

    return recommendedAudios.map(audio => ({
      ...audio,
      averageRating: audio.averageRating ? audio.averageRating / 100 : 0,
      guidedSteps: audio.guidedSteps ? JSON.parse(audio.guidedSteps) : [],
      benefits: audio.benefits ? JSON.parse(audio.benefits) : [],
      techniques: audio.techniques ? JSON.parse(audio.techniques) : [],
      preparationSteps: audio.preparationSteps ? JSON.parse(audio.preparationSteps) : [],
      tags: audio.tags ? JSON.parse(audio.tags) : [],
    }))
  }

  // Incrementar contador de reprodução
  static async incrementPlayCount(audioId: string): Promise<void> {
    await db
      .update(meditationAudios)
      .set({ 
        playCount: sql`${meditationAudios.playCount} + 1`
      })
      .where(eq(meditationAudios.id, audioId))
  }

  // Adicionar/remover favorito
  static async toggleFavorite(userId: number, audioId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(userMeditationFavorites)
      .where(and(
        eq(userMeditationFavorites.userId, userId),
        eq(userMeditationFavorites.audioId, audioId)
      ))
      .limit(1)

    if (existing) {
      // Remover favorito
      await db
        .delete(userMeditationFavorites)
        .where(and(
          eq(userMeditationFavorites.userId, userId),
          eq(userMeditationFavorites.audioId, audioId)
        ))
      return false
    } else {
      // Adicionar favorito
      await db
        .insert(userMeditationFavorites)
        .values({ userId, audioId })
      return true
    }
  }

  // Buscar favoritos do usuário
  static async getUserFavorites(userId: number, page: number = 1, limit: number = 20): Promise<{ audios: MeditationAudio[], pagination: MeditationPagination }> {
    const offset = (page - 1) * limit

    const favoriteAudios = await db
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
        favoriteCreatedAt: userMeditationFavorites.createdAt,
      })
      .from(userMeditationFavorites)
      .leftJoin(meditationAudios, eq(userMeditationFavorites.audioId, meditationAudios.id))
      .leftJoin(meditationCategories, eq(meditationAudios.categoryId, meditationCategories.id))
      .where(and(
        eq(userMeditationFavorites.userId, userId),
        eq(meditationAudios.status, 'active')
      ))
      .orderBy(desc(userMeditationFavorites.createdAt))
      .limit(limit)
      .offset(offset)

    const processedAudios: MeditationAudio[] = favoriteAudios.map(audio => ({
      ...audio,
      isFavorite: true,
      averageRating: audio.averageRating ? audio.averageRating / 100 : 0,
      guidedSteps: audio.guidedSteps ? JSON.parse(audio.guidedSteps) : [],
      benefits: audio.benefits ? JSON.parse(audio.benefits) : [],
      techniques: audio.techniques ? JSON.parse(audio.techniques) : [],
      preparationSteps: audio.preparationSteps ? JSON.parse(audio.preparationSteps) : [],
      tags: audio.tags ? JSON.parse(audio.tags) : [],
    }))

    // Contar total de favoritos
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userMeditationFavorites)
      .leftJoin(meditationAudios, eq(userMeditationFavorites.audioId, meditationAudios.id))
      .where(and(
        eq(userMeditationFavorites.userId, userId),
        eq(meditationAudios.status, 'active')
      ))

    return {
      audios: processedAudios,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  }
}