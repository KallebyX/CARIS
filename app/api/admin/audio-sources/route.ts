import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { audioSources } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { getUserIdFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar se o usuário é admin (implementar verificação de role)
    // Por enquanto, apenas verificamos se está logado

    const sources = await db.select().from(audioSources)

    return NextResponse.json({
      success: true,
      data: sources
    })
  } catch (error) {
    console.error('Error fetching audio sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audio sources' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      url,
      license,
      licenseDetails,
      attribution,
      author,
      duration,
      category,
      tags,
      language,
      quality,
      format,
      downloadUrl,
      embedUrl
    } = body

    // Validação básica
    if (!title || !url || !author || !category || !license) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const [newSource] = await db.insert(audioSources).values({
      title,
      description: description || '',
      url,
      license,
      licenseDetails: licenseDetails || '',
      attribution,
      author,
      duration: duration || 0,
      category,
      tags: tags || [],
      language,
      quality: quality || 'medium',
      format: format || 'mp3',
      downloadUrl,
      embedUrl,
      isVerified: false,
      addedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning()

    return NextResponse.json({
      success: true,
      data: newSource
    })
  } catch (error) {
    console.error('Error creating audio source:', error)
    return NextResponse.json(
      { error: 'Failed to create audio source' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      )
    }

    const [updatedSource] = await db
      .update(audioSources)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(audioSources.id, id))
      .returning()

    if (!updatedSource) {
      return NextResponse.json(
        { error: 'Audio source not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedSource
    })
  } catch (error) {
    console.error('Error updating audio source:', error)
    return NextResponse.json(
      { error: 'Failed to update audio source' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      )
    }

    const [deletedSource] = await db
      .delete(audioSources)
      .where(eq(audioSources.id, id))
      .returning()

    if (!deletedSource) {
      return NextResponse.json(
        { error: 'Audio source not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Audio source deleted successfully' }
    })
  } catch (error) {
    console.error('Error deleting audio source:', error)
    return NextResponse.json(
      { error: 'Failed to delete audio source' },
      { status: 500 }
    )
  }
}