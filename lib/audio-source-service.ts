import { AudioSource, recommendedSources, portugueseSearchTerms, requiredCategories } from './meditation-audio-sources'

interface SourceValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  metadata?: {
    actualDuration?: number
    fileSize?: number
    audioFormat?: string
    bitrate?: number
  }
}

interface DownloadResult {
  success: boolean
  localPath?: string
  error?: string
  size?: number
}

export class AudioSourceService {
  private baseStoragePath = '/public/audio/meditation/'

  /**
   * Valida uma fonte de áudio verificando URL, licença e metadados
   */
  async validateAudioSource(source: AudioSource): Promise<SourceValidation> {
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      // Validação básica de campos obrigatórios
      if (!source.title?.trim()) errors.push('Título é obrigatório')
      if (!source.url?.trim()) errors.push('URL é obrigatório')
      if (!source.author?.trim()) errors.push('Autor é obrigatório')
      if (!source.license) errors.push('Licença é obrigatória')
      if (!source.category) errors.push('Categoria é obrigatória')
      
      // Validação de URL
      try {
        new URL(source.url)
      } catch {
        errors.push('URL inválida')
      }

      // Validação de duração
      if (source.duration <= 0) {
        warnings.push('Duração não especificada ou inválida')
      }

      // Validação de licença
      const validLicenses = ['creative_commons', 'public_domain', 'royalty_free', 'fair_use']
      if (!validLicenses.includes(source.license)) {
        errors.push('Licença inválida')
      }

      // Validação de categoria
      const validCategories = ['meditation', 'nature', 'binaural', 'music', 'voice']
      if (!validCategories.includes(source.category)) {
        errors.push('Categoria inválida')
      }

      // Verificação de acessibilidade da URL (HEAD request)
      let metadata = {}
      try {
        const response = await fetch(source.url, { 
          method: 'HEAD',
          timeout: 10000 
        })
        
        if (!response.ok) {
          if (response.status === 404) {
            errors.push('URL não encontrada (404)')
          } else {
            warnings.push(`URL retornou status ${response.status}`)
          }
        } else {
          // Extrair metadados do cabeçalho
          const contentLength = response.headers.get('content-length')
          const contentType = response.headers.get('content-type')
          
          if (contentLength) {
            metadata = { 
              ...metadata, 
              fileSize: parseInt(contentLength) 
            }
          }
          
          if (contentType && !contentType.includes('audio')) {
            warnings.push('Tipo de conteúdo pode não ser áudio')
          }
        }
      } catch (error) {
        warnings.push('Não foi possível verificar a acessibilidade da URL')
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata
      }
    } catch (error) {
      return {
        isValid: false,
        errors: ['Erro interno durante validação'],
        warnings: []
      }
    }
  }

  /**
   * Baixa uma fonte de áudio e armazena localmente
   */
  async downloadAudioSource(source: AudioSource): Promise<DownloadResult> {
    try {
      // Verificar se a URL é válida e acessível
      const validation = await this.validateAudioSource(source)
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validação falhou: ${validation.errors.join(', ')}`
        }
      }

      // Criar nome de arquivo baseado no ID e formato
      const fileName = `${source.id}.${source.format}`
      const localPath = `${this.baseStoragePath}${fileName}`

      // Para demonstração, vamos simular o download
      // Em produção, implementar download real usando fetch ou biblioteca de download
      console.log(`Simulando download de ${source.url} para ${localPath}`)
      
      // Simular tempo de download
      await new Promise(resolve => setTimeout(resolve, 1000))

      return {
        success: true,
        localPath,
        size: validation.metadata?.fileSize || 0
      }
    } catch (error) {
      return {
        success: false,
        error: `Erro durante download: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Busca automaticamente por fontes de áudio em repositórios públicos
   */
  async searchForPortugueseMeditations(): Promise<AudioSource[]> {
    const foundSources: AudioSource[] = []

    for (const searchTerm of portugueseSearchTerms) {
      for (const source of recommendedSources) {
        try {
          // Simular busca em cada fonte
          // Em produção, implementar APIs específicas para cada repositório
          const searchResults = await this.simulateSearch(source, searchTerm)
          foundSources.push(...searchResults)
        } catch (error) {
          console.error(`Erro buscando em ${source.name}:`, error)
        }
      }
    }

    return foundSources
  }

  /**
   * Simula busca em repositórios (placeholder para implementação real)
   */
  private async simulateSearch(repository: any, searchTerm: string): Promise<AudioSource[]> {
    // Implementação simulada
    // Em produção, usar APIs específicas de cada repositório
    
    const mockResults: AudioSource[] = []
    
    if (repository.name === 'Freesound.org' && searchTerm === 'meditação guiada') {
      mockResults.push({
        id: `freesound-${Date.now()}`,
        title: `Meditação Guiada - ${searchTerm}`,
        description: `Encontrado em ${repository.name} para o termo "${searchTerm}"`,
        url: `${repository.url}/sounds/${Math.random().toString(36).substr(2, 9)}`,
        license: 'creative_commons',
        licenseDetails: 'CC BY 4.0',
        author: 'Autor Descoberto',
        duration: Math.floor(Math.random() * 1800) + 300, // 5-35 minutos
        category: 'meditation',
        tags: [searchTerm, 'português', 'descoberto'],
        language: 'pt-BR',
        quality: 'medium',
        format: 'mp3',
        isVerified: false,
        addedAt: new Date()
      })
    }

    return mockResults
  }

  /**
   * Verifica se há fontes suficientes para cada categoria necessária
   */
  async checkCategoryCompleteness(sources: AudioSource[]): Promise<{
    complete: boolean
    missing: string[]
    recommendations: string[]
  }> {
    const missing: string[] = []
    const recommendations: string[] = []

    for (const category of requiredCategories) {
      const categorySources = sources.filter(s => 
        s.tags.some(tag => 
          category.searchTerms.some(term => 
            tag.toLowerCase().includes(term.toLowerCase())
          )
        )
      )

      if (categorySources.length === 0) {
        missing.push(category.name)
        recommendations.push(
          `Buscar por: ${category.searchTerms.join(', ')} com duração ${category.duration[0]/60}-${category.duration[1]/60} minutos`
        )
      } else if (categorySources.length < 3 && category.priority === 'high') {
        recommendations.push(
          `Categoria "${category.name}" tem apenas ${categorySources.length} fontes. Recomendado: pelo menos 3 para categoria de alta prioridade`
        )
      }
    }

    return {
      complete: missing.length === 0,
      missing,
      recommendations
    }
  }

  /**
   * Atualiza automaticamente as fontes de áudio do sistema via API
   */
  async syncAudioSources(): Promise<{
    discovered: number
    validated: number
    downloaded: number
    errors: string[]
  }> {
    try {
      const response = await fetch('/api/admin/audio-sources/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        return result.data
      } else {
        return {
          discovered: 0,
          validated: 0,
          downloaded: 0,
          errors: [result.error || 'Erro na sincronização']
        }
      }
    } catch (error) {
      return {
        discovered: 0,
        validated: 0,
        downloaded: 0,
        errors: [`Erro durante sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
      }
    }
  }

  /**
   * Gera relatório de qualidade das fontes de áudio
   */
  generateQualityReport(sources: AudioSource[]): {
    totalSources: number
    verifiedSources: number
    byCategory: Record<string, number>
    byLicense: Record<string, number>
    byLanguage: Record<string, number>
    averageDuration: number
    qualityDistribution: Record<string, number>
    recommendations: string[]
  } {
    const recommendations: string[] = []
    
    const byCategory = sources.reduce((acc, source) => {
      acc[source.category] = (acc[source.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const byLicense = sources.reduce((acc, source) => {
      acc[source.license] = (acc[source.license] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const byLanguage = sources.reduce((acc, source) => {
      const lang = source.language || 'unknown'
      acc[lang] = (acc[lang] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const qualityDistribution = sources.reduce((acc, source) => {
      acc[source.quality] = (acc[source.quality] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const averageDuration = sources.reduce((sum, source) => sum + source.duration, 0) / sources.length

    // Gerar recomendações
    const verifiedPercentage = (sources.filter(s => s.isVerified).length / sources.length) * 100
    if (verifiedPercentage < 80) {
      recommendations.push('Verificar mais fontes de áudio para aumentar a confiabilidade')
    }

    const portugueseSources = sources.filter(s => s.language?.startsWith('pt')).length
    if (portugueseSources < sources.length * 0.6) {
      recommendations.push('Buscar mais conteúdo em português para melhor experiência do usuário brasileiro')
    }

    if (qualityDistribution.high < sources.length * 0.5) {
      recommendations.push('Priorizar fontes de alta qualidade para melhor experiência')
    }

    return {
      totalSources: sources.length,
      verifiedSources: sources.filter(s => s.isVerified).length,
      byCategory,
      byLicense,
      byLanguage,
      averageDuration,
      qualityDistribution,
      recommendations
    }
  }
}

export const audioSourceService = new AudioSourceService()