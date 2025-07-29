import { db } from '../db'
import { meditationCategories, meditationAudios } from '../db/schema'

async function seedMeditationData() {
  console.log('🌱 Seeding meditation data...')

  try {
    // Seed meditation categories
    const categories = [
      {
        id: 'ansiedade',
        name: 'Ansiedade',
        description: 'Meditações específicas para controle e redução da ansiedade',
        icon: '😰',
        color: '#ef4444',
        displayOrder: 1
      },
      {
        id: 'sono',
        name: 'Sono',
        description: 'Áudios para indução do sono e relaxamento noturno',
        icon: '😴',
        color: '#3b82f6',
        displayOrder: 2
      },
      {
        id: 'estresse',
        name: 'Estresse',
        description: 'Técnicas rápidas para redução de estresse',
        icon: '😤',
        color: '#f59e0b',
        displayOrder: 3
      },
      {
        id: 'mindfulness',
        name: 'Mindfulness',
        description: 'Práticas de atenção plena e presença',
        icon: '🧘‍♀️',
        color: '#10b981',
        displayOrder: 4
      },
      {
        id: 'autocompaixao',
        name: 'Autocompaixão',
        description: 'Exercícios de loving-kindness e autocompaixão',
        icon: '💝',
        color: '#ec4899',
        displayOrder: 5
      },
      {
        id: 'respiracao',
        name: 'Respiração',
        description: 'Guias respiratórios com instruções claras',
        icon: '🌬️',
        color: '#06b6d4',
        displayOrder: 6
      },
      {
        id: 'relaxamento',
        name: 'Relaxamento',
        description: 'Progressive muscle relaxation e técnicas de relaxamento',
        icon: '🛀',
        color: '#8b5cf6',
        displayOrder: 7
      },
      {
        id: 'foco',
        name: 'Foco',
        description: 'Meditações para concentração e produtividade',
        icon: '🎯',
        color: '#f97316',
        displayOrder: 8
      }
    ]

    console.log('Inserindo categorias...')
    await db.insert(meditationCategories).values(categories).onConflictDoNothing()

    // Sample meditation audios with free/open source content
    const sampleAudios = [
      {
        title: 'Respiração 4-7-8 para Ansiedade',
        description: 'Uma técnica simples de respiração que ajuda a acalmar a mente ansiosa em apenas 5 minutos. Baseada na técnica do Dr. Andrew Weil.',
        categoryId: 'ansiedade',
        duration: 300, // 5 minutos
        difficulty: 'iniciante',
        instructor: 'Ana Silva',
        audioUrl: 'https://archive.org/download/meditation-breathing-478/breathing-478-pt.mp3',
        thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&h=300&fit=crop',
        transcript: 'Encontre uma posição confortável... Vamos praticar a respiração 4-7-8...',
        guidedSteps: JSON.stringify([
          'Sente-se confortavelmente com a coluna reta',
          'Coloque a ponta da língua atrás dos dentes superiores',
          'Expire completamente pela boca',
          'Inspire pelo nariz contando até 4',
          'Segure a respiração contando até 7',
          'Expire pela boca contando até 8',
          'Repita o ciclo 4 vezes'
        ]),
        benefits: JSON.stringify([
          'Reduz ansiedade rapidamente',
          'Diminui a frequência cardíaca',
          'Ativa o sistema nervoso parassimpático',
          'Melhora a qualidade do sono'
        ]),
        techniques: JSON.stringify(['Respiração 4-7-8', 'Mindfulness']),
        preparationSteps: JSON.stringify([
          'Encontre um local silencioso',
          'Sente-se ou deite-se confortavelmente',
          'Desligue notificações',
          'Tenha água por perto'
        ]),
        tags: JSON.stringify(['respiração', 'ansiedade', 'rápido', 'iniciante']),
        language: 'pt-BR',
        format: 'mp3',
        sourceUrl: 'https://archive.org',
        license: 'Creative Commons Zero (CC0)',
        attribution: 'Técnica baseada nos ensinamentos do Dr. Andrew Weil',
        isCommercialUse: true,
        status: 'active',
        isPopular: true,
        isFeatured: true
      },
      {
        title: 'Body Scan Relaxante para Sono',
        description: 'Uma meditação de varredura corporal de 15 minutos para relaxar completamente e preparar o corpo para um sono restaurador.',
        categoryId: 'sono',
        duration: 900, // 15 minutos
        difficulty: 'iniciante',
        instructor: 'Carlos Mendes',
        audioUrl: 'https://archive.org/download/meditation-bodyscan-sleep/bodyscan-sleep-pt.mp3',
        thumbnailUrl: 'https://images.unsplash.com/photo-1485815457792-d6d15aca88c4?w=300&h=300&fit=crop',
        transcript: 'Deite-se confortavelmente... Vamos começar uma jornada pelo seu corpo...',
        guidedSteps: JSON.stringify([
          'Deite-se confortavelmente em sua cama',
          'Feche os olhos e respire profundamente',
          'Comece focando nos dedos dos pés',
          'Relaxe progressivamente cada parte do corpo',
          'Permita que a tensão se dissolva',
          'Termine com respiração suave'
        ]),
        benefits: JSON.stringify([
          'Melhora a qualidade do sono',
          'Reduz tensão muscular',
          'Diminui pensamentos acelerados',
          'Promove relaxamento profundo'
        ]),
        techniques: JSON.stringify(['Body Scan', 'Relaxamento Progressivo']),
        preparationSteps: JSON.stringify([
          'Prepare seu quarto para dormir',
          'Use roupas confortáveis',
          'Mantenha temperatura agradável',
          'Desligue todas as luzes'
        ]),
        tags: JSON.stringify(['sono', 'relaxamento', 'body scan', 'noite']),
        language: 'pt-BR',
        format: 'mp3',
        sourceUrl: 'https://archive.org',
        license: 'Creative Commons Attribution (CC BY)',
        attribution: 'Gravado por voluntários da comunidade de meditação',
        isCommercialUse: true,
        status: 'active',
        isPopular: true
      },
      {
        title: 'Mindfulness da Respiração',
        description: 'Prática fundamental de mindfulness focada na respiração natural. Ideal para iniciantes que querem desenvolver atenção plena.',
        categoryId: 'mindfulness',
        duration: 600, // 10 minutos
        difficulty: 'iniciante',
        instructor: 'Maria Santos',
        audioUrl: 'https://archive.org/download/meditation-mindfulness-breathing/mindfulness-breathing-pt.mp3',
        thumbnailUrl: 'https://images.unsplash.com/photo-1549577434-954df12fb62e?w=300&h=300&fit=crop',
        guidedSteps: JSON.stringify([
          'Sente-se em posição confortável',
          'Observe sua respiração natural',
          'Não tente controlar a respiração',
          'Quando a mente divagar, volte gentilmente',
          'Mantenha atitude de curiosidade gentil'
        ]),
        benefits: JSON.stringify([
          'Desenvolve concentração',
          'Reduz reatividade emocional',
          'Aumenta autoconsciência',
          'Melhora regulação emocional'
        ]),
        techniques: JSON.stringify(['Mindfulness', 'Atenção à Respiração']),
        tags: JSON.stringify(['mindfulness', 'respiração', 'concentração', 'presente']),
        language: 'pt-BR',
        format: 'mp3',
        sourceUrl: 'https://freesound.org',
        license: 'Creative Commons Attribution (CC BY)',
        isCommercialUse: true,
        status: 'active'
      },
      {
        title: 'Alívio Rápido do Estresse',
        description: 'Técnica de 5 minutos para redução imediata do estresse. Perfeita para usar durante o trabalho ou em momentos tensos.',
        categoryId: 'estresse',
        duration: 300, // 5 minutos
        difficulty: 'iniciante',
        instructor: 'João Costa',
        audioUrl: 'https://archive.org/download/meditation-stress-relief/stress-relief-quick-pt.mp3',
        thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop',
        guidedSteps: JSON.stringify([
          'Pare o que está fazendo',
          'Respire profundamente 3 vezes',
          'Relaxe os ombros e a mandíbula',
          'Imagine um local de paz',
          'Retorne renovado à atividade'
        ]),
        benefits: JSON.stringify([
          'Redução imediata do estresse',
          'Melhora clareza mental',
          'Diminui tensão física',
          'Restaura energia'
        ]),
        techniques: JSON.stringify(['Respiração Profunda', 'Visualização']),
        tags: JSON.stringify(['estresse', 'rápido', 'trabalho', 'emergência']),
        language: 'pt-BR',
        format: 'mp3',
        license: 'Creative Commons Zero (CC0)',
        isCommercialUse: true,
        status: 'active'
      },
      {
        title: 'Loving-Kindness em Português',
        description: 'Meditação de bondade amorosa adaptada para a cultura brasileira. Desenvolve compaixão por si mesmo e pelos outros.',
        categoryId: 'autocompaixao',
        duration: 720, // 12 minutos
        difficulty: 'intermediario',
        instructor: 'Luciana Oliveira',
        audioUrl: 'https://archive.org/download/meditation-loving-kindness/loving-kindness-pt-br.mp3',
        thumbnailUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=300&h=300&fit=crop',
        guidedSteps: JSON.stringify([
          'Conecte-se com sua intenção de bondade',
          'Envie bondade para si mesmo',
          'Estenda bondade para pessoas queridas',
          'Inclua pessoas neutras',
          'Abrace pessoas difíceis com compaixão',
          'Expanda para todos os seres'
        ]),
        benefits: JSON.stringify([
          'Aumenta autocompaixão',
          'Reduz autocrítica',
          'Melhora relacionamentos',
          'Desenvolve empatia'
        ]),
        techniques: JSON.stringify(['Loving-Kindness', 'Metta', 'Compaixão']),
        tags: JSON.stringify(['amor', 'compaixão', 'bondade', 'relacionamentos']),
        language: 'pt-BR',
        format: 'mp3',
        license: 'Creative Commons Attribution-ShareAlike (CC BY-SA)',
        attribution: 'Adaptado de tradições budistas por praticantes brasileiros',
        isCommercialUse: true,
        status: 'active'
      }
    ]

    console.log('Inserindo áudios de exemplo...')
    await db.insert(meditationAudios).values(sampleAudios).onConflictDoNothing()

    console.log('✅ Dados de meditação inseridos com sucesso!')
  } catch (error) {
    console.error('❌ Erro ao inserir dados de meditação:', error)
    throw error
  }
}

// Execute if run directly
if (require.main === module) {
  seedMeditationData()
    .then(() => {
      console.log('🎉 Seed completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Seed failed:', error)
      process.exit(1)
    })
}

export { seedMeditationData }