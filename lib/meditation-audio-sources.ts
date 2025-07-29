export interface AudioSource {
  id: string
  title: string
  description: string
  url: string
  license: 'creative_commons' | 'public_domain' | 'royalty_free' | 'fair_use'
  licenseDetails: string
  attribution?: string
  author: string
  duration: number // em segundos
  category: 'meditation' | 'nature' | 'binaural' | 'music' | 'voice'
  tags: string[]
  language?: 'pt-BR' | 'pt-PT' | 'en' | 'es'
  quality: 'low' | 'medium' | 'high'
  format: 'mp3' | 'wav' | 'ogg'
  downloadUrl?: string
  embedUrl?: string
  isVerified: boolean
  addedAt: Date
}

export interface AudioCatalog {
  sources: AudioSource[]
  categories: string[]
  totalDuration: number
  lastUpdated: Date
}

// Catálogo inicial baseado na pesquisa realizada
export const meditationAudioSources: AudioSource[] = [
  {
    id: 'freesound-binaural-001',
    title: 'Binaural Beats - Alpha to Delta',
    description: 'Ondas binaurais para meditação profunda, progredindo de Alpha para Delta',
    url: 'https://freesound.org/people/WIM/sounds/676878/',
    license: 'creative_commons',
    licenseDetails: 'CC BY 4.0',
    attribution: 'WIM via Freesound.org',
    author: 'WIM',
    duration: 600, // 10 minutos
    category: 'binaural',
    tags: ['binaural', 'alpha', 'delta', 'meditation', 'brainwaves'],
    quality: 'high',
    format: 'mp3',
    isVerified: true,
    addedAt: new Date()
  },
  {
    id: 'freesound-nature-001',
    title: 'Forest Ambience for Meditation',
    description: 'Sons naturais de floresta para relaxamento e meditação',
    url: 'https://freesound.org/browse/tags/meditation/',
    license: 'creative_commons',
    licenseDetails: 'CC BY 3.0',
    attribution: 'Various artists via Freesound.org',
    author: 'Community',
    duration: 1800, // 30 minutos
    category: 'nature',
    tags: ['forest', 'nature', 'ambient', 'relaxation'],
    quality: 'high',
    format: 'wav',
    isVerified: true,
    addedAt: new Date()
  },
  {
    id: 'youtube-meditation-001',
    title: 'Música Relaxante para Meditação',
    description: 'Música instrumental relaxante da YouTube Audio Library',
    url: 'https://www.youtube.com/audiolibrary/music',
    license: 'royalty_free',
    licenseDetails: 'YouTube Audio Library Standard License',
    author: 'YouTube Audio Library',
    duration: 900, // 15 minutos
    category: 'music',
    tags: ['instrumental', 'relaxing', 'peaceful'],
    language: 'pt-BR',
    quality: 'high',
    format: 'mp3',
    isVerified: true,
    addedAt: new Date()
  },
  {
    id: 'archive-guided-001',
    title: 'Guided Meditation - Mindfulness',
    description: 'Meditação guiada em inglês do Archive.org',
    url: 'https://archive.org/details/PowerfulMindfulnessMeditation',
    license: 'public_domain',
    licenseDetails: 'Public Domain - Free to use',
    author: 'Swami Guruparananda',
    duration: 1200, // 20 minutos
    category: 'meditation',
    tags: ['guided', 'mindfulness', 'voice'],
    language: 'en',
    quality: 'medium',
    format: 'mp3',
    isVerified: true,
    addedAt: new Date()
  }
]

// Fontes recomendadas para pesquisa adicional
export const recommendedSources = [
  {
    name: 'Freesound.org',
    url: 'https://freesound.org',
    description: 'Maior repositório de sons Creative Commons',
    searchTerms: ['meditation', 'nature', 'binaural', 'ambient'],
    license: 'Creative Commons'
  },
  {
    name: 'Archive.org',
    url: 'https://archive.org',
    description: 'Arquivo digital com conteúdo de domínio público',
    searchTerms: ['guided meditation', 'relaxation', 'mindfulness'],
    license: 'Public Domain / Creative Commons'
  },
  {
    name: 'YouTube Audio Library',
    url: 'https://www.youtube.com/audiolibrary',
    description: 'Biblioteca de áudio gratuita do YouTube',
    searchTerms: ['meditation', 'relaxing', 'ambient'],
    license: 'Royalty Free / Creative Commons'
  },
  {
    name: 'Wikimedia Commons',
    url: 'https://commons.wikimedia.org',
    description: 'Repositório de mídia livre da Wikimedia',
    searchTerms: ['audio', 'meditation', 'music'],
    license: 'Creative Commons / Public Domain'
  },
  {
    name: 'Pixabay Music',
    url: 'https://pixabay.com/music',
    description: 'Música livre de direitos autorais',
    searchTerms: ['meditation', 'relaxing', 'ambient'],
    license: 'Pixabay License (Commercial use allowed)'
  }
]

// Termos de busca em português para encontrar conteúdo nacional
export const portugueseSearchTerms = [
  'meditação guiada',
  'relaxamento',
  'mindfulness português',
  'sons da natureza',
  'música para meditar',
  'respiração consciente',
  'body scan português',
  'visualização guiada',
  'mantras em português',
  'sons binaurais'
]

// Categorias específicas necessárias para o sistema
export const requiredCategories = [
  {
    id: 'ansiedade',
    name: 'Ansiedade',
    searchTerms: ['anxiety relief', 'calm anxiety', 'stress relief'],
    duration: [300, 900], // 5-15 minutos
    priority: 'high'
  },
  {
    id: 'sono',
    name: 'Sono',
    searchTerms: ['sleep meditation', 'bedtime', 'insomnia'],
    duration: [900, 3600], // 15-60 minutos
    priority: 'high'
  },
  {
    id: 'foco',
    name: 'Foco e Concentração',
    searchTerms: ['focus meditation', 'concentration', 'study music'],
    duration: [600, 1800], // 10-30 minutos
    priority: 'medium'
  },
  {
    id: 'autocompaixao',
    name: 'Autocompaixão',
    searchTerms: ['loving kindness', 'self compassion', 'metta'],
    duration: [900, 2400], // 15-40 minutos
    priority: 'medium'
  },
  {
    id: 'mindfulness',
    name: 'Mindfulness',
    searchTerms: ['mindfulness meditation', 'awareness', 'present moment'],
    duration: [300, 1800], // 5-30 minutos
    priority: 'high'
  }
]

export function validateAudioSource(source: AudioSource): boolean {
  return !!(
    source.id &&
    source.title &&
    source.url &&
    source.license &&
    source.author &&
    source.duration > 0 &&
    source.category &&
    source.format
  )
}

export function filterSourcesByCategory(sources: AudioSource[], category: string): AudioSource[] {
  return sources.filter(source => source.category === category)
}

export function filterSourcesByLicense(sources: AudioSource[], license: string): AudioSource[] {
  return sources.filter(source => source.license === license)
}

export function filterSourcesByLanguage(sources: AudioSource[], language: string): AudioSource[] {
  return sources.filter(source => source.language === language || !source.language)
}

export function getTotalDuration(sources: AudioSource[]): number {
  return sources.reduce((total, source) => total + source.duration, 0)
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}