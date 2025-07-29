import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { meditationAudios, meditationCategories, users } from '@/db/schema'
import { getUserIdFromRequest } from '@/lib/auth'
import { eq, desc, and, ilike, or, sql } from 'drizzle-orm'
import jwt from 'jsonwebtoken'

// GET - Listar áudios de meditação (com filtros)
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user[0] || user[0].role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
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
        duration: meditationAudios.duration,
        difficulty: meditationAudios.difficulty,
        instructor: meditationAudios.instructor,
        audioUrl: meditationAudios.audioUrl,
        thumbnailUrl: meditationAudios.thumbnailUrl,
        language: meditationAudios.language,
        license: meditationAudios.license,
        attribution: meditationAudios.attribution,
        playCount: meditationAudios.playCount,
        averageRating: meditationAudios.averageRating,
        ratingCount: meditationAudios.ratingCount,
        status: meditationAudios.status,
        isPopular: meditationAudios.isPopular,
        isFeatured: meditationAudios.isFeatured,
        createdAt: meditationAudios.createdAt,
        updatedAt: meditationAudios.updatedAt,
      })
      .from(meditationAudios)
      .leftJoin(meditationCategories, eq(meditationAudios.categoryId, meditationCategories.id))

    // Aplicar filtros
    const conditions = []

    if (category && category !== 'all') {
      conditions.push(eq(meditationAudios.categoryId, category))
    }

    if (difficulty && difficulty !== 'all') {
      conditions.push(eq(meditationAudios.difficulty, difficulty))
    }

    if (status && status !== 'all') {
      conditions.push(eq(meditationAudios.status, status))
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
      .orderBy(desc(meditationAudios.createdAt))
      .limit(limit)
      .offset(offset)

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
        audios,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    })
  } catch (error) {
    console.error('Erro ao buscar áudios de meditação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo áudio de meditação
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user[0] || user[0].role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      categoryId,
      duration,
      difficulty,
      instructor,
      audioUrl,
      thumbnailUrl,
      transcript,
      guidedSteps,
      benefits,
      techniques,
      preparationSteps,
      tags,
      language = 'pt-BR',
      fileSize,
      format = 'mp3',
      bitrate,
      sampleRate,
      sourceUrl,
      license,
      attribution,
      isCommercialUse = false,
      status = 'active'
    } = body

    // Validar dados obrigatórios
    if (!title || !categoryId || !duration || !difficulty || !instructor || !audioUrl || !license) {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    // Verificar se a categoria existe
    const category = await db.select().from(meditationCategories).where(eq(meditationCategories.id, categoryId)).limit(1)
    if (!category[0]) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 400 }
      )
    }

    const audioData = {
      title,
      description: description || null,
      categoryId,
      duration,
      difficulty,
      instructor,
      audioUrl,
      thumbnailUrl: thumbnailUrl || null,
      transcript: transcript || null,
      guidedSteps: guidedSteps ? JSON.stringify(guidedSteps) : null,
      benefits: benefits ? JSON.stringify(benefits) : null,
      techniques: techniques ? JSON.stringify(techniques) : null,
      preparationSteps: preparationSteps ? JSON.stringify(preparationSteps) : null,
      tags: tags ? JSON.stringify(tags) : null,
      language,
      fileSize: fileSize || null,
      format,
      bitrate: bitrate || null,
      sampleRate: sampleRate || null,
      sourceUrl: sourceUrl || null,
      license,
      attribution: attribution || null,
      isCommercialUse,
      status,
      createdBy: userId,
      lastModifiedBy: userId
    }

    const [newAudio] = await db
      .insert(meditationAudios)
      .values(audioData)
      .returning()

    return NextResponse.json({
      success: true,
      data: newAudio
    })
  } catch (error) {
    console.error('Erro ao criar áudio de meditação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}