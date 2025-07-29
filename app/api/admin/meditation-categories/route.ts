import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { meditationCategories, users } from '@/db/schema'
import { getUserIdFromRequest } from '@/lib/auth'
import { eq, desc, sql } from 'drizzle-orm'

// GET - Listar categorias de meditação
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = db.select().from(meditationCategories)

    if (!includeInactive) {
      query = query.where(eq(meditationCategories.isActive, true))
    }

    const categories = await query.orderBy(meditationCategories.displayOrder)

    return NextResponse.json({
      success: true,
      data: categories
    })
  } catch (error) {
    console.error('Erro ao buscar categorias de meditação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar nova categoria de meditação
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
      id,
      name,
      description,
      icon,
      color = '#6366f1',
      displayOrder = 0,
      isActive = true
    } = body

    // Validar dados obrigatórios
    if (!id || !name || !icon) {
      return NextResponse.json(
        { error: 'ID, nome e ícone são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o ID já existe
    const existingCategory = await db.select().from(meditationCategories).where(eq(meditationCategories.id, id)).limit(1)
    if (existingCategory.length > 0) {
      return NextResponse.json(
        { error: 'Categoria com este ID já existe' },
        { status: 400 }
      )
    }

    const categoryData = {
      id,
      name,
      description: description || null,
      icon,
      color,
      displayOrder,
      isActive
    }

    const [newCategory] = await db
      .insert(meditationCategories)
      .values(categoryData)
      .returning()

    return NextResponse.json({
      success: true,
      data: newCategory
    })
  } catch (error) {
    console.error('Erro ao criar categoria de meditação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}