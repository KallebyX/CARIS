export interface MeditationPractice {
  id: string
  title: string
  description: string
  category: 'ansiedade' | 'sono' | 'foco' | 'autocompaixao' | 'mindfulness' | 'relaxamento' | 'estresse' | 'depressao'
  duration: number // em minutos
  difficulty: 'iniciante' | 'intermediario' | 'avancado'
  instructor: string
  audioUrl?: string
  transcript?: string
  guidedSteps: string[]
  benefits: string[]
  techniques: string[]
  contraindications?: string[]
  preparationSteps: string[]
  backgroundMusic?: string
  tags: string[]
  popularity: number // 1-100
  effectivenessRating: number // 1-5
  createdAt: Date
  updatedAt: Date
}

export interface MeditationSession {
  id: string
  userId: number
  meditationId: string
  startedAt: Date
  completedAt?: Date
  duration: number // em segundos
  wasCompleted: boolean
  rating?: number // 1-5
  feedback?: string
  moodBefore?: number // 1-10
  moodAfter?: number // 1-10
  notes?: string
}

export interface MeditationTrack {
  id: string
  title: string
  description: string
  weekNumber: number
  meditations: string[] // IDs das meditações
  theme: string
  objective: string
}

export const meditationLibrary: MeditationPractice[] = [
  {
    id: 'med-001',
    title: 'Respiração Consciente para Ansiedade',
    description: 'Uma prática simples de respiração para acalmar a mente ansiosa e reduzir os sintomas de ansiedade.',
    category: 'ansiedade',
    duration: 10,
    difficulty: 'iniciante',
    instructor: 'Dr. Ana Silva',
    transcript: 'Encontre uma posição confortável... Feche os olhos suavemente... Respire naturalmente...',
    guidedSteps: [
      'Encontre uma posição confortável, sentado ou deitado',
      'Feche os olhos suavemente e relaxe os ombros',
      'Observe sua respiração natural, sem forçar',
      'Conte mentalmente: inspire 1, expire 2, inspire 3...',
      'Se a mente divagar, gentilmente volte à contagem',
      'Continue até 10, depois recomece do 1',
      'Nos últimos minutos, apenas observe sem contar',
      'Abra os olhos lentamente quando estiver pronto'
    ],
    benefits: [
      'Reduz sintomas de ansiedade',
      'Diminui a frequência cardíaca',
      'Melhora a concentração',
      'Promove sensação de calma'
    ],
    techniques: ['Respiração 4-7-8', 'Contagem respiratória', 'Mindfulness'],
    preparationSteps: [
      'Escolha um local silencioso',
      'Desligue notificações do celular',
      'Use roupas confortáveis',
      'Tenha um copo d\'água por perto'
    ],
    backgroundMusic: 'natureza-suave',
    tags: ['respiração', 'ansiedade', 'calma', 'iniciante'],
    popularity: 95,
    effectivenessRating: 4.8,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'med-002',
    title: 'Body Scan para Sono Profundo',
    description: 'Uma meditação de varredura corporal para relaxar completamente e preparar o corpo para o sono.',
    category: 'sono',
    duration: 20,
    difficulty: 'iniciante',
    instructor: 'Prof. Carlos Mendes',
    guidedSteps: [
      'Deite-se confortavelmente em sua cama',
      'Feche os olhos e respire profundamente três vezes',
      'Comece focando nos dedos dos pés',
      'Sinta cada parte do pé relaxando completamente',
      'Suba lentamente pelas pernas, relaxando cada músculo',
      'Continue pelo tronco, braços e pescoço',
      'Termine relaxando completamente o rosto e couro cabeludo',
      'Permita-se adormecer naturalmente'
    ],
    benefits: [
      'Melhora a qualidade do sono',
      'Reduz tensão muscular',
      'Diminui pensamentos acelerados',
      'Promove relaxamento profundo'
    ],
    techniques: ['Body scan', 'Relaxamento progressivo', 'Visualização'],
    preparationSteps: [
      'Faça esta prática na cama, pronto para dormir',
      'Mantenha o quarto escuro e fresco',
      'Evite telas 1 hora antes',
      'Use um travesseiro confortável'
    ],
    backgroundMusic: 'ondas-oceano',
    tags: ['sono', 'relaxamento', 'body scan', 'noite'],
    popularity: 88,
    effectivenessRating: 4.6,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-16')
  },
  {
    id: 'med-003',
    title: 'Foco e Concentração - Meditação da Vela',
    description: 'Desenvolva foco laser através da concentração em uma chama de vela virtual.',
    category: 'foco',
    duration: 15,
    difficulty: 'intermediario',
    instructor: 'Mestre João Santos',
    guidedSteps: [
      'Sente-se com a coluna ereta, mas relaxada',
      'Visualize uma vela acesa à sua frente',
      'Foque completamente na chama dourada',
      'Observe como ela dança suavemente',
      'Quando a mente divagar, volte à chama',
      'Sinta a luz preenchendo toda sua atenção',
      'Mantenha este foco pelos próximos minutos',
      'Gradualmente amplie a consciência'
    ],
    benefits: [
      'Aumenta capacidade de concentração',
      'Melhora foco mental',
      'Reduz dispersão mental',
      'Desenvolve disciplina mental'
    ],
    techniques: ['Concentração focal', 'Visualização', 'Trataka'],
    preparationSteps: [
      'Sente-se em posição confortável',
      'Mantenha a coluna ereta',
      'Minimize distrações externas',
      'Defina intenção de foco'
    ],
    backgroundMusic: 'silencio-ambiente',
    tags: ['foco', 'concentração', 'visualização', 'produtividade'],
    popularity: 75,
    effectivenessRating: 4.4,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-17')
  },
  {
    id: 'med-004',
    title: 'Autocompaixão - Loving Kindness',
    description: 'Cultive amor próprio e compaixão através de frases de bondade direcionadas.',
    category: 'autocompaixao',
    duration: 18,
    difficulty: 'intermediario',
    instructor: 'Dra. Maria Compassiva',
    guidedSteps: [
      'Sente-se confortavelmente e feche os olhos',
      'Traga à mente uma imagem sua como criança',
      'Envie amor para essa criança: "Que eu seja feliz"',
      'Continue: "Que eu esteja em paz, que eu seja gentil comigo"',
      'Sinta o calor da compaixão em seu coração',
      'Agora pense em alguém que você ama',
      'Envie as mesmas frases para essa pessoa',
      'Termine enviando amor para você no presente'
    ],
    benefits: [
      'Aumenta autoestima',
      'Reduz autocrítica',
      'Desenvolve compaixão',
      'Melhora relacionamentos'
    ],
    techniques: ['Loving kindness', 'Autocompaixão', 'Metta'],
    preparationSteps: [
      'Encontre um momento de privacidade',
      'Permita-se ser vulnerável',
      'Não julgue sentimentos que surgirem',
      'Tenha lenços por perto se necessário'
    ],
    backgroundMusic: 'harpa-celestial',
    tags: ['autocompaixão', 'amor próprio', 'bondade', 'cura emocional'],
    popularity: 82,
    effectivenessRating: 4.7,
    createdAt: new Date('2024-01-04'),
    updatedAt: new Date('2024-01-18')
  },
  {
    id: 'med-005',
    title: 'Mindfulness dos 5 Sentidos',
    description: 'Ancoragem no presente através da consciência dos cinco sentidos.',
    category: 'mindfulness',
    duration: 12,
    difficulty: 'iniciante',
    instructor: 'Prof. Presente Agora',
    guidedSteps: [
      'Sente-se confortavelmente onde está',
      'Identifique 5 coisas que você pode VER',
      'Observe-as com curiosidade, sem julgar',
      'Agora 4 coisas que você pode TOCAR',
      'Sinta a textura, temperatura, forma',
      'Identifique 3 coisas que você pode OUVIR',
      'Escute com atenção total',
      'Agora 2 coisas que você pode CHEIRAR',
      'E 1 coisa que você pode SABOREAR',
      'Respire e agradeça este momento presente'
    ],
    benefits: [
      'Reduz ansiedade rapidamente',
      'Conecta com o momento presente',
      'Diminui ruminação mental',
      'Promove grounding emocional'
    ],
    techniques: ['Grounding 5-4-3-2-1', 'Mindfulness', 'Ancoragem sensorial'],
    preparationSteps: [
      'Pode ser feito em qualquer lugar',
      'Não precisa fechar os olhos',
      'Ideal para momentos de crise',
      'Pratique regularmente'
    ],
    backgroundMusic: 'ambiente-natural',
    tags: ['mindfulness', 'presente', 'sentidos', 'grounding'],
    popularity: 91,
    effectivenessRating: 4.5,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-19')
  },
  {
    id: 'med-006',
    title: 'Relaxamento Muscular Progressivo',
    description: 'Técnica sistemática para relaxar completamente o corpo através da tensão e relaxamento.',
    category: 'relaxamento',
    duration: 25,
    difficulty: 'iniciante',
    instructor: 'Dr. Relax Silva',
    guidedSteps: [
      'Deite-se ou sente-se confortavelmente',
      'Comece tensionando os pés por 5 segundos',
      'Solte e sinta o relaxamento por 10 segundos',
      'Suba para as panturrilhas, tense e relaxe',
      'Continue com coxas, glúteos, abdômen',
      'Tense as mãos fazendo punhos, depois relaxe',
      'Continue com antebraços, braços, ombros',
      'Termine com pescoço e músculos faciais',
      'Permaneça relaxado por alguns minutos'
    ],
    benefits: [
      'Reduz tensão muscular',
      'Diminui estresse físico',
      'Melhora consciência corporal',
      'Promove relaxamento profundo'
    ],
    techniques: ['Relaxamento progressivo', 'Jacobson', 'Tensão-relaxamento'],
    preparationSteps: [
      'Use roupas confortáveis',
      'Escolha superfície adequada',
      'Não faça se tiver lesões musculares',
      'Pratique regularmente'
    ],
    backgroundMusic: 'chuva-suave',
    tags: ['relaxamento', 'tensão', 'músculos', 'físico'],
    popularity: 78,
    effectivenessRating: 4.3,
    createdAt: new Date('2024-01-06'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: 'med-007',
    title: 'Meditação Anti-Estresse Rápida',
    description: 'Técnica de 5 minutos para reduzir rapidamente os níveis de estresse.',
    category: 'estresse',
    duration: 5,
    difficulty: 'iniciante',
    instructor: 'Dra. Calm Down',
    guidedSteps: [
      'Respire profundamente 3 vezes',
      'Solte os ombros e relaxe a mandíbula',
      'Imagine uma luz dourada descendo pelo seu corpo',
      'Esta luz dissolve toda tensão que encontra',
      'Sinta ela passando pela cabeça, pescoço, braços',
      'Continue pelo peito, abdômen, pernas',
      'A luz leva embora todo o estresse',
      'Respire essa sensação de alívio'
    ],
    benefits: [
      'Reduz estresse rapidamente',
      'Baixa cortisol',
      'Acalma sistema nervoso',
      'Pode ser feita em qualquer lugar'
    ],
    techniques: ['Visualização', 'Respiração consciente', 'Relaxamento rápido'],
    preparationSteps: [
      'Pode ser feita sentado ou em pé',
      'Ideal para pausas no trabalho',
      'Não precisa de local especial',
      'Use quando sentir estresse'
    ],
    backgroundMusic: 'vento-folhas',
    tags: ['estresse', 'rápido', 'trabalho', 'emergência'],
    popularity: 94,
    effectivenessRating: 4.2,
    createdAt: new Date('2024-01-07'),
    updatedAt: new Date('2024-01-21')
  },
  {
    id: 'med-008',
    title: 'Luz Interior - Superando a Tristeza',
    description: 'Meditação para momentos de tristeza, conectando com a luz interior resiliente.',
    category: 'depressao',
    duration: 22,
    difficulty: 'intermediario',
    instructor: 'Terapeuta Esperança',
    guidedSteps: [
      'Reconheça sua tristeza sem julgamento',
      'Respire com a tristeza, não contra ela',
      'Imagine um pequeno ponto de luz em seu coração',
      'Esta luz sempre esteve lá, mesmo nos momentos difíceis',
      'Veja a luz crescendo gentilmente a cada respiração',
      'Ela não afasta a tristeza, mas a acolhe',
      'Sinta a luz se expandindo por todo seu ser',
      'Esta é sua força interior, sempre presente',
      'Agradeça por sua coragem de estar aqui'
    ],
    benefits: [
      'Oferece esperança em momentos difíceis',
      'Conecta com recursos internos',
      'Reduz sentimentos de desespero',
      'Promove autocompaixão'
    ],
    techniques: ['Visualização da luz', 'Aceitação emocional', 'Mindfulness'],
    contraindications: ['Se sentir pensamentos de autolesão, procure ajuda imediatamente'],
    preparationSteps: [
      'Seja gentil consigo mesmo',
      'Não exija sentir-se "melhor" imediatamente',
      'Tenha apoio disponível se necessário',
      'Pratique com regularidade'
    ],
    backgroundMusic: 'piano-esperanca',
    tags: ['depressão', 'tristeza', 'esperança', 'luz interior'],
    popularity: 67,
    effectivenessRating: 4.6,
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-22')
  }
]

export const meditationTracks: MeditationTrack[] = [
  {
    id: 'track-beginner',
    title: 'Jornada do Iniciante',
    description: 'Uma introdução gradual ao mundo da meditação',
    weekNumber: 4,
    meditations: ['med-001', 'med-005', 'med-007', 'med-002'],
    theme: 'Fundamentos da Meditação',
    objective: 'Estabelecer uma prática básica de meditação'
  },
  {
    id: 'track-anxiety',
    title: 'Libertação da Ansiedade',
    description: 'Práticas específicas para gerenciar e reduzir ansiedade',
    weekNumber: 6,
    meditations: ['med-001', 'med-005', 'med-007', 'med-006'],
    theme: 'Controle da Ansiedade',
    objective: 'Desenvolver ferramentas para ansiedade'
  },
  {
    id: 'track-sleep',
    title: 'Sono Restaurador',
    description: 'Meditações para melhorar a qualidade do sono',
    weekNumber: 3,
    meditations: ['med-002', 'med-006', 'med-007'],
    theme: 'Qualidade do Sono',
    objective: 'Estabelecer rotina de sono saudável'
  }
]

export function getMeditationsByCategory(category: string): MeditationPractice[] {
  return meditationLibrary.filter(meditation => meditation.category === category)
}

export function getMeditationsByDifficulty(difficulty: string): MeditationPractice[] {
  return meditationLibrary.filter(meditation => meditation.difficulty === difficulty)
}

export function getMeditationsByDuration(minDuration: number, maxDuration: number): MeditationPractice[] {
  return meditationLibrary.filter(meditation => 
    meditation.duration >= minDuration && meditation.duration <= maxDuration
  )
}

export function searchMeditations(query: string): MeditationPractice[] {
  const searchTerms = query.toLowerCase().split(' ')
  
  return meditationLibrary.filter(meditation => {
    const searchableText = [
      meditation.title,
      meditation.description,
      meditation.instructor,
      ...meditation.benefits,
      ...meditation.tags
    ].join(' ').toLowerCase()
    
    return searchTerms.every(term => searchableText.includes(term))
  })
}

export function getMeditationById(id: string): MeditationPractice | undefined {
  return meditationLibrary.find(meditation => meditation.id === id)
}

export function getPopularMeditations(limit: number = 5): MeditationPractice[] {
  return meditationLibrary
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
}

export function getRecommendedMeditations(userPreferences: {
  categories?: string[]
  difficulty?: string
  maxDuration?: number
}): MeditationPractice[] {
  let filtered = meditationLibrary

  if (userPreferences.categories && userPreferences.categories.length > 0) {
    filtered = filtered.filter(meditation => 
      userPreferences.categories!.includes(meditation.category)
    )
  }

  if (userPreferences.difficulty) {
    filtered = filtered.filter(meditation => 
      meditation.difficulty === userPreferences.difficulty
    )
  }

  if (userPreferences.maxDuration) {
    filtered = filtered.filter(meditation => 
      meditation.duration <= userPreferences.maxDuration!
    )
  }

  return filtered.sort((a, b) => b.effectivenessRating - a.effectivenessRating)
}

export const meditationCategories = [
  { id: 'ansiedade', name: 'Ansiedade', description: 'Práticas para acalmar a mente ansiosa', icon: '🧘‍♀️' },
  { id: 'sono', name: 'Sono', description: 'Meditações para melhor qualidade do sono', icon: '😴' },
  { id: 'foco', name: 'Foco', description: 'Desenvolvimento de concentração e atenção', icon: '🎯' },
  { id: 'autocompaixao', name: 'Autocompaixão', description: 'Cultivo de amor próprio e bondade', icon: '💝' },
  { id: 'mindfulness', name: 'Mindfulness', description: 'Consciência plena do momento presente', icon: '🌸' },
  { id: 'relaxamento', name: 'Relaxamento', description: 'Técnicas para relaxamento corporal', icon: '🌊' },
  { id: 'estresse', name: 'Estresse', description: 'Gestão e redução do estresse', icon: '🌱' },
  { id: 'depressao', name: 'Depressão', description: 'Apoio para momentos de tristeza', icon: '☀️' }
]