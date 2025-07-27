const { analyzeEmotionalContent, analyzeMoodPatterns, generateTherapeuticInsights } = require('../lib/ai-analysis.ts')

async function testAIAnalysis() {
  console.log('🧠 Testando análise de IA emocional...\n')

  // Teste 1: Análise de conteúdo emocional básico
  console.log('📝 Teste 1: Análise de conteúdo emocional')
  console.log('=' * 50)
  
  const testContent = "Hoje me senti muito triste e ansioso. Tive dificuldades para dormir e me concentrar no trabalho. Sinto que nada está dando certo na minha vida."
  
  try {
    const analysis = await analyzeEmotionalContent(testContent)
    console.log('Texto analisado:', testContent)
    console.log('\nResultado da análise:')
    console.log('- Emoção dominante:', analysis.dominantEmotion)
    console.log('- Intensidade emocional:', analysis.emotionIntensity)
    console.log('- Score de sentimento:', analysis.sentimentScore)
    console.log('- Nível de risco:', analysis.riskLevel)
    console.log('- Emoções detectadas:', analysis.detectedEmotions.join(', '))
    console.log('- Categorias Plutchik:', analysis.plutchikCategories.join(', '))
    console.log('- Insights:', analysis.insights.join('; '))
    console.log('- Ações sugeridas:', analysis.suggestedActions.join('; '))
  } catch (error) {
    console.error('❌ Erro na análise:', error.message)
  }

  console.log('\n' + '=' * 50)

  // Teste 2: Análise de padrões de humor
  console.log('📊 Teste 2: Análise de padrões de humor')
  console.log('=' * 50)

  const mockDiaryEntries = [
    { content: "Dia muito difícil, me senti deprimido", moodRating: 2, createdAt: new Date('2024-01-01') },
    { content: "Um pouco melhor hoje, mas ainda triste", moodRating: 3, createdAt: new Date('2024-01-02') },
    { content: "Dia neutro, sem grandes mudanças", moodRating: 5, createdAt: new Date('2024-01-03') },
    { content: "Me senti mais animado hoje!", moodRating: 7, createdAt: new Date('2024-01-04') },
    { content: "Ótimo dia, muito feliz e produtivo", moodRating: 9, createdAt: new Date('2024-01-05') }
  ]

  try {
    const patterns = await analyzeMoodPatterns(mockDiaryEntries)
    console.log('Padrões de humor analisados:')
    console.log('- Tendência:', patterns.trend)
    console.log('- Volatilidade:', patterns.volatility)
    console.log('- Humor médio:', patterns.averageMood)
    console.log('- Padrões preocupantes:', patterns.concerningPatterns.join('; ') || 'Nenhum')
  } catch (error) {
    console.error('❌ Erro na análise de padrões:', error.message)
  }

  console.log('\n' + '=' * 50)

  // Teste 3: Insights terapêuticos
  console.log('🎯 Teste 3: Insights terapêuticos')
  console.log('=' * 50)

  const recentEntries = [
    { content: "Estou me sentindo ansioso sobre o trabalho", moodRating: 4 },
    { content: "Tive uma sessão boa com meu terapeuta", moodRating: 6 },
    { content: "Pratiquei meditação e me senti mais calmo", moodRating: 7 }
  ]

  try {
    const insights = await generateTherapeuticInsights(recentEntries, { currentCycle: 'Cuidar' })
    console.log('Insights terapêuticos gerados:')
    console.log('- Insight semanal:', insights.weeklyInsight)
    console.log('- Técnicas recomendadas:', insights.recommendedTechniques.join(', '))
    console.log('- Áreas de foco:', insights.focusAreas.join(', '))
    console.log('- Notas de progresso:', insights.progressNotes.join('; '))
  } catch (error) {
    console.error('❌ Erro nos insights terapêuticos:', error.message)
  }

  console.log('\n✅ Testes de análise de IA concluídos!')
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  testAIAnalysis().catch(console.error)
}