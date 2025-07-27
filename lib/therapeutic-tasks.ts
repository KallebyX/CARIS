export interface TherapeuticTask {
  id: string
  title: string
  description: string
  objective: string
  approach: 'TCC' | 'ACT' | 'DBT' | 'Sistêmica' | 'Humanística' | 'Psicodinâmica'
  category: 'regulacao_emocional' | 'autoconhecimento' | 'relacionamentos' | 'ansiedade' | 'depressao' | 'autoestima' | 'trauma' | 'comunicacao'
  difficulty: 'baixa' | 'media' | 'alta'
  estimatedTime: number // em minutos
  instructions: string[]
  materials?: string[]
  warnings?: string[]
  targetSymptoms: string[]
  contraindications?: string[]
  followUpQuestions: string[]
  adaptations?: {
    children?: string
    adolescents?: string
    elderly?: string
    groupTherapy?: string
  }
  evidenceLevel: 'alto' | 'medio' | 'baixo'
  references?: string[]
}

export const therapeuticTasksLibrary: TherapeuticTask[] = [
  {
    id: 'tcc-001',
    title: 'Registro de Pensamentos Automáticos',
    description: 'Identificar e questionar pensamentos automáticos negativos',
    objective: 'Desenvolver consciência sobre padrões de pensamento disfuncionais',
    approach: 'TCC',
    category: 'regulacao_emocional',
    difficulty: 'media',
    estimatedTime: 15,
    instructions: [
      'Durante a próxima semana, carregue um pequeno caderno ou use o app do celular',
      'Quando sentir uma emoção intensa (tristeza, ansiedade, raiva), pare e anote:',
      '- Situação: O que estava acontecendo?',
      '- Pensamento: Que pensamento passou pela sua cabeça?',
      '- Emoção: Como você se sentiu? (0-10)',
      '- Comportamento: O que você fez em seguida?',
      'Ao final do dia, revise seus registros',
      'Questione cada pensamento: "Isso é realmente verdade? Há evidências?"',
      'Tente reformular o pensamento de forma mais equilibrada'
    ],
    materials: ['Caderno ou app de anotações', 'Caneta'],
    targetSymptoms: ['ansiedade', 'depressão', 'baixa autoestima', 'pensamentos negativos'],
    followUpQuestions: [
      'Quais padrões de pensamento você identificou?',
      'Qual foi o pensamento automático mais frequente?',
      'Como se sentiu ao questionar esses pensamentos?',
      'Conseguiu reformular algum pensamento? Como foi?'
    ],
    evidenceLevel: 'alto',
    references: ['Beck, A. T. (1976). Cognitive Therapy and the Emotional Disorders']
  },
  {
    id: 'act-001',
    title: 'Exercício de Aceitação: Folha na Correnteza',
    description: 'Praticar aceitação de pensamentos e sentimentos difíceis',
    objective: 'Desenvolver capacidade de observar experiências internas sem julgamento',
    approach: 'ACT',
    category: 'regulacao_emocional',
    difficulty: 'baixa',
    estimatedTime: 10,
    instructions: [
      'Encontre um local silencioso e sente-se confortavelmente',
      'Feche os olhos e respire naturalmente',
      'Imagine que você está sentado na margem de um riacho',
      'Visualize folhas caindo na água e sendo levadas pela correnteza',
      'Quando um pensamento ou sentimento difícil surgir, imagine-o como uma folha',
      'Coloque esse pensamento/sentimento na folha e observe-a flutuar',
      'Não tente empurrar a folha ou segurá-la, apenas observe',
      'Se a folha grudar na margem, gentilmente a solte de volta à correnteza',
      'Continue por 10 minutos, observando suas folhas irem e virem'
    ],
    targetSymptoms: ['ansiedade', 'ruminação', 'resistência emocional', 'evitação'],
    warnings: ['Se sentir muito desconforto, abra os olhos e respire profundamente'],
    followUpQuestions: [
      'Como foi observar seus pensamentos como folhas?',
      'Algum pensamento foi difícil de "soltar"?',
      'Notou diferença na intensidade dos sentimentos?',
      'Conseguiu manter a postura de observador?'
    ],
    adaptations: {
      children: 'Use brinquedos pequenos flutuando em uma bacia com água',
      elderly: 'Pode ser feito com os olhos abertos, observando nuvens no céu'
    },
    evidenceLevel: 'alto'
  },
  {
    id: 'dbt-001',
    title: 'TIPP - Regulação de Crise',
    description: 'Técnica para reduzir rapidamente a intensidade emocional em momentos de crise',
    objective: 'Aprender habilidade de tolerância ao distresse',
    approach: 'DBT',
    category: 'regulacao_emocional',
    difficulty: 'media',
    estimatedTime: 5,
    instructions: [
      'Use esta técnica quando a emoção estiver muito intensa (8-10)',
      'T - Temperatura: Mergulhe o rosto em água fria ou segure gelo',
      'I - Intenso exercício: Faça exercício intenso por 15 minutos',
      'P - Respiração Paced: Expire mais devagar que inspira (inspire 4, expire 6)',
      'P - Progressivo relaxamento muscular: Tensione e relaxe grupos musculares',
      'Escolha UMA técnica por vez, não todas juntas',
      'Use apenas em momentos de crise real',
      'Depois, pratique outras habilidades de regulação emocional'
    ],
    materials: ['Água fria ou gelo', 'Espaço para exercício (opcional)'],
    targetSymptoms: ['crise emocional', 'impulsos autodestrutivos', 'raiva intensa', 'pânico'],
    warnings: [
      'Não use água muito fria se tiver problemas cardíacos',
      'Não faça exercício intenso se tiver condições médicas restritivas',
      'Esta é uma técnica de emergência, não substitui tratamento'
    ],
    contraindications: ['Transtornos alimentares (para temperatura)', 'Problemas cardíacos graves'],
    followUpQuestions: [
      'Qual técnica TIPP funcionou melhor para você?',
      'Conseguiu reduzir a intensidade emocional?',
      'Em que situações pretende usar esta técnica?',
      'Precisou de tempo adicional para se acalmar?'
    ],
    evidenceLevel: 'alto'
  },
  {
    id: 'humanistica-001',
    title: 'Diário de Gratidão e Autocompaixão',
    description: 'Cultivar atitude de gratidão e autocompaixão através de escrita reflexiva',
    objective: 'Desenvolver autoaceitação e perspectiva positiva',
    approach: 'Humanística',
    category: 'autoestima',
    difficulty: 'baixa',
    estimatedTime: 10,
    instructions: [
      'Reserve 10 minutos antes de dormir todos os dias',
      'Escreva em um diário ou caderno especial',
      'Complete as seguintes frases:',
      '- Hoje eu sou grato(a) por... (3 coisas)',
      '- Uma coisa que eu fiz bem hoje foi...',
      '- Uma qualidade minha que me ajudou hoje foi...',
      '- Se meu melhor amigo passasse pelo que passei hoje, eu diria...',
      '- Amanhã eu quero ser gentil comigo quando...',
      'Escreva sem julgar, seja honesto e compassivo',
      'Releia suas entradas uma vez por semana'
    ],
    materials: ['Diário ou caderno', 'Caneta'],
    targetSymptoms: ['baixa autoestima', 'autocrítica', 'perfeccionismo', 'tristeza'],
    followUpQuestions: [
      'O que mais te surpreendeu ao escrever?',
      'Foi difícil encontrar coisas pelas quais ser grato?',
      'Como foi falar consigo mesmo com compaixão?',
      'Notou mudanças no seu humor ou autoestima?'
    ],
    adaptations: {
      children: 'Use desenhos além de palavras',
      adolescents: 'Pode ser feito através de áudios no celular'
    },
    evidenceLevel: 'medio'
  },
  {
    id: 'sistemica-001',
    title: 'Genograma Emocional',
    description: 'Mapear padrões emocionais e relacionais na família',
    objective: 'Compreender influências familiares nos padrões emocionais atuais',
    approach: 'Sistêmica',
    category: 'relacionamentos',
    difficulty: 'alta',
    estimatedTime: 45,
    instructions: [
      'Desenhe sua árvore genealógica até os avós (pelo menos)',
      'Use símbolos: quadrados para homens, círculos para mulheres',
      'Marque cada pessoa com cores representando emoções predominantes:',
      '- Vermelho: raiva, irritabilidade',
      '- Azul: tristeza, melancolia',
      '- Amarelo: ansiedade, preocupação',
      '- Verde: calma, equilíbrio',
      '- Roxo: criatividade, sensibilidade',
      'Desenhe linhas entre pessoas: grossas (relacionamento próximo), finas (distante), cortadas (rompido)',
      'Anote padrões que observa',
      'Reflita: que padrões você repetiu ou rejeitou?'
    ],
    materials: ['Papel grande', 'Lápis coloridos', 'Borracha'],
    targetSymptoms: ['dificuldades relacionais', 'padrões repetitivos', 'conflitos familiares'],
    warnings: ['Pode trazer à tona emoções intensas sobre a família'],
    followUpQuestions: [
      'Que padrões emocionais você identificou na família?',
      'Quais você repetiu em sua vida?',
      'Quais você conscientemente mudou?',
      'Que compreensões surgiram sobre seus relacionamentos atuais?'
    ],
    evidenceLevel: 'medio'
  },
  {
    id: 'tcc-002',
    title: 'Experimento Comportamental',
    description: 'Testar crenças através de experimentos práticos',
    objective: 'Desafiar crenças limitantes através da experiência',
    approach: 'TCC',
    category: 'ansiedade',
    difficulty: 'alta',
    estimatedTime: 60,
    instructions: [
      'Identifique uma crença limitante (ex: "Se eu falar em público, vou fazer papel de bobo")',
      'Desenvolva uma hipótese testável',
      'Planeje um experimento seguro para testar a crença',
      'Antes do experimento, anote:',
      '- Sua predição (o que acha que vai acontecer)',
      '- Nível de ansiedade (0-10)',
      '- Estratégias de enfrentamento que usará',
      'Execute o experimento',
      'Depois, anote:',
      '- O que realmente aconteceu',
      '- Como se sentiu durante e depois',
      '- O que aprendeu sobre sua crença',
      'Reflita sobre os resultados e modifique a crença se necessário'
    ],
    targetSymptoms: ['ansiedade social', 'evitação', 'crenças limitantes', 'baixa autoconfiança'],
    warnings: ['Comece com situações de baixo risco', 'Tenha um plano de segurança'],
    followUpQuestions: [
      'Sua predição se confirmou?',
      'O que foi diferente do esperado?',
      'Como sua crença mudou após o experimento?',
      'Que novos experimentos gostaria de tentar?'
    ],
    evidenceLevel: 'alto'
  }
]

export function getTasksByCategory(category: string): TherapeuticTask[] {
  return therapeuticTasksLibrary.filter(task => task.category === category)
}

export function getTasksByApproach(approach: string): TherapeuticTask[] {
  return therapeuticTasksLibrary.filter(task => task.approach === approach)
}

export function getTasksByDifficulty(difficulty: string): TherapeuticTask[] {
  return therapeuticTasksLibrary.filter(task => task.difficulty === difficulty)
}

export function searchTasks(query: string): TherapeuticTask[] {
  const searchTerms = query.toLowerCase().split(' ')
  
  return therapeuticTasksLibrary.filter(task => {
    const searchableText = [
      task.title,
      task.description,
      task.objective,
      ...task.targetSymptoms,
      ...task.instructions
    ].join(' ').toLowerCase()
    
    return searchTerms.every(term => searchableText.includes(term))
  })
}

export function getTaskById(id: string): TherapeuticTask | undefined {
  return therapeuticTasksLibrary.find(task => task.id === id)
}

export const taskCategories = [
  { id: 'regulacao_emocional', name: 'Regulação Emocional', description: 'Técnicas para gerenciar emoções intensas' },
  { id: 'autoconhecimento', name: 'Autoconhecimento', description: 'Exploração de padrões pessoais e valores' },
  { id: 'relacionamentos', name: 'Relacionamentos', description: 'Habilidades interpessoais e vínculos' },
  { id: 'ansiedade', name: 'Ansiedade', description: 'Técnicas específicas para ansiedade' },
  { id: 'depressao', name: 'Depressão', description: 'Estratégias para humor deprimido' },
  { id: 'autoestima', name: 'Autoestima', description: 'Desenvolvimento da autoimagem positiva' },
  { id: 'trauma', name: 'Trauma', description: 'Processamento de experiências traumáticas' },
  { id: 'comunicacao', name: 'Comunicação', description: 'Habilidades de expressão e escuta' }
]

export const therapeuticApproaches = [
  { id: 'TCC', name: 'Terapia Cognitivo-Comportamental', description: 'Foco em pensamentos e comportamentos' },
  { id: 'ACT', name: 'Terapia de Aceitação e Compromisso', description: 'Aceitação e flexibilidade psicológica' },
  { id: 'DBT', name: 'Terapia Comportamental Dialética', description: 'Regulação emocional e tolerância ao distresse' },
  { id: 'Sistêmica', name: 'Terapia Sistêmica', description: 'Padrões relacionais e familiares' },
  { id: 'Humanística', name: 'Abordagem Humanística', description: 'Autocompaixão e crescimento pessoal' },
  { id: 'Psicodinâmica', name: 'Abordagem Psicodinâmica', description: 'Inconsciente e padrões profundos' }
]