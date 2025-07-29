import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { audioSources } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getUserIdFromRequest } from '@/lib/auth'
import { meditationAudioSources, validateAudioSource } from '@/lib/meditation-audio-sources'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar se o usuário é admin (implementar verificação de role)
    // Por enquanto, apenas verificamos se está logado

    let discovered = 0
    let validated = 0
    let inserted = 0
    const errors: string[] = []

    // Sincronizar fontes iniciais da biblioteca
    for (const source of meditationAudioSources) {
      discovered++
      
      // Validar fonte
      if (!validateAudioSource(source)) {
        errors.push(`Fonte "${source.title}" falhou na validação`)
        continue
      }
      validated++

      try {
        // Verificar se já existe
        const existing = await db.select()
          .from(audioSources)
          .where(eq(audioSources.url, source.url))
          .limit(1)

        if (existing.length === 0) {
          // Inserir nova fonte
          await db.insert(audioSources).values({
            id: source.id,
            title: source.title,
            description: source.description || '',
            url: source.url,
            license: source.license,
            licenseDetails: source.licenseDetails || '',
            attribution: source.attribution,
            author: source.author,
            duration: source.duration,
            category: source.category,
            tags: source.tags || [],
            language: source.language,
            quality: source.quality,
            format: source.format,
            downloadUrl: source.downloadUrl,
            embedUrl: source.embedUrl,
            isVerified: source.isVerified,
            addedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          inserted++
        }
      } catch (insertError) {
        errors.push(`Erro inserindo "${source.title}": ${insertError instanceof Error ? insertError.message : 'Erro desconhecido'}`)
      }
    }

    // Simular busca por novas fontes (placeholder)
    const additionalSources = await simulateExternalSearch()
    
    for (const source of additionalSources) {
      discovered++
      
      if (!validateAudioSource(source)) {
        errors.push(`Fonte descoberta "${source.title}" falhou na validação`)
        continue
      }
      validated++

      try {
        // Verificar se já existe
        const existing = await db.select()
          .from(audioSources)
          .where(eq(audioSources.url, source.url))
          .limit(1)

        if (existing.length === 0) {
          await db.insert(audioSources).values({
            title: source.title,
            description: source.description || '',
            url: source.url,
            license: source.license,
            licenseDetails: source.licenseDetails || '',
            attribution: source.attribution,
            author: source.author,
            duration: source.duration,
            category: source.category,
            tags: source.tags || [],
            language: source.language,
            quality: source.quality,
            format: source.format,
            downloadUrl: source.downloadUrl,
            embedUrl: source.embedUrl,
            isVerified: false, // Novas fontes precisam ser verificadas
            addedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          inserted++
        }
      } catch (insertError) {
        errors.push(`Erro inserindo fonte descoberta "${source.title}": ${insertError instanceof Error ? insertError.message : 'Erro desconhecido'}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        discovered,
        validated,
        downloaded: inserted, // Usando inserted como proxy para downloaded
        errors
      }
    })
  } catch (error) {
    console.error('Error syncing audio sources:', error)
    return NextResponse.json(
      { error: 'Failed to sync audio sources' },
      { status: 500 }
    )
  }
}

// Simulação de busca externa (placeholder para implementação real)
async function simulateExternalSearch() {
  // Simular descoberta de fontes adicionais
  const discoveredSources = [
    {
      id: `discovered-${Date.now()}-1`,
      title: 'Meditação Matinal - Sons da Floresta',
      description: 'Meditação guiada com sons naturais da floresta brasileira',
      url: 'https://example.com/meditation/forest-morning',
      license: 'creative_commons' as const,
      licenseDetails: 'CC BY-SA 4.0',
      attribution: 'Instituto de Mindfulness Brasil',
      author: 'Dr. Maria Silva',
      duration: 900, // 15 minutos
      category: 'meditation' as const,
      tags: ['meditação', 'manhã', 'floresta', 'natureza', 'português'],
      language: 'pt-BR' as const,
      quality: 'high' as const,
      format: 'mp3' as const,
      isVerified: false,
      addedAt: new Date()
    },
    {
      id: `discovered-${Date.now()}-2`,
      title: 'Respiração Consciente para Ansiedade',
      description: 'Técnica de respiração para reduzir ansiedade e estresse',
      url: 'https://example.com/meditation/anxiety-breathing',
      license: 'public_domain' as const,
      licenseDetails: 'Domínio Público',
      author: 'Centro de Bem-Estar Mental',
      duration: 600, // 10 minutos
      category: 'meditation' as const,
      tags: ['ansiedade', 'respiração', 'estresse', 'calma'],
      language: 'pt-BR' as const,
      quality: 'medium' as const,
      format: 'mp3' as const,
      isVerified: false,
      addedAt: new Date()
    },
    {
      id: `discovered-${Date.now()}-3`,
      title: 'Sons Binaurais para Sono Profundo',
      description: 'Frequências binaurais específicas para induzir sono relaxante',
      url: 'https://example.com/binaural/deep-sleep',
      license: 'royalty_free' as const,
      licenseDetails: 'Royalty Free License',
      author: 'SoundTherapy Labs',
      duration: 3600, // 60 minutos
      category: 'binaural' as const,
      tags: ['binaural', 'sono', 'delta', 'relaxamento'],
      quality: 'high' as const,
      format: 'wav' as const,
      isVerified: false,
      addedAt: new Date()
    }
  ]

  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 500))
  
  return discoveredSources
}