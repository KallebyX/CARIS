/**
 * Test script for AI Clinical Assistant functionality
 * Run with: node scripts/test-ai-clinical.js
 */

const { db } = require('../db/index.js')
const { analyzeEmotionalContent, detectClinicalAlerts, generateProgressReport } = require('../lib/ai-analysis.js')

async function testAIAnalysis() {
  console.log('🧠 Testing AI Clinical Assistant...\n')

  // Test 1: Emotional Analysis
  console.log('1. Testing Emotional Analysis')
  try {
    const testEntry = "Hoje me sinto muito triste e desesperado. Não consigo ver uma saída para os meus problemas e tenho pensado em desistir de tudo."
    
    const analysis = await analyzeEmotionalContent(testEntry)
    console.log('✅ Emotional analysis completed:')
    console.log(`   - Dominant emotion: ${analysis.dominantEmotion}`)
    console.log(`   - Risk level: ${analysis.riskLevel}`)
    console.log(`   - Sentiment score: ${analysis.sentimentScore}`)
    console.log(`   - Insights: ${analysis.insights.slice(0, 2).join(', ')}`)
    console.log('')
  } catch (error) {
    console.log('❌ Emotional analysis failed:', error.message)
    console.log('')
  }

  // Test 2: Clinical Alerts Detection
  console.log('2. Testing Clinical Alerts Detection')
  try {
    const mockEntries = [
      {
        content: "Me sinto muito mal hoje, sem energia para nada",
        moodRating: 2,
        createdAt: new Date(),
        riskLevel: 'medium'
      },
      {
        content: "Outro dia terrível, não vejo melhora",
        moodRating: 1,
        createdAt: new Date(Date.now() - 24*60*60*1000),
        riskLevel: 'high'
      },
      {
        content: "Penso constantemente em desistir",
        moodRating: 1,
        createdAt: new Date(Date.now() - 2*24*60*60*1000),
        riskLevel: 'critical'
      }
    ]

    const alerts = await detectClinicalAlerts(mockEntries, [], [])
    console.log(`✅ Clinical alerts detection completed: ${alerts.length} alerts generated`)
    
    alerts.forEach((alert, index) => {
      console.log(`   Alert ${index + 1}: ${alert.title} (${alert.severity})`)
    })
    console.log('')
  } catch (error) {
    console.log('❌ Clinical alerts detection failed:', error.message)
    console.log('')
  }

  // Test 3: Progress Report Generation
  console.log('3. Testing Progress Report Generation')
  try {
    const mockDiaryEntries = [
      { content: "Hoje foi um bom dia", moodRating: 7, createdAt: new Date(), emotions: 'alegria' },
      { content: "Me sinto melhor", moodRating: 6, createdAt: new Date(Date.now() - 24*60*60*1000), emotions: 'otimismo' },
      { content: "Dia difícil", moodRating: 3, createdAt: new Date(Date.now() - 2*24*60*60*1000), emotions: 'tristeza' }
    ]

    const mockSessions = [
      { sessionDate: new Date(), notes: "Sessão produtiva", duration: 50 },
      { sessionDate: new Date(Date.now() - 7*24*60*60*1000), notes: "Trabalhamos ansiedade", duration: 50 }
    ]

    const report = await generateProgressReport(
      1, // patientId
      { 
        start: new Date(Date.now() - 30*24*60*60*1000), 
        end: new Date() 
      },
      mockDiaryEntries,
      mockSessions,
      ['Reduzir ansiedade', 'Melhorar autoestima']
    )

    console.log('✅ Progress report generation completed:')
    console.log(`   - Overall progress: ${report.overallProgress}%`)
    console.log(`   - Mood trend: ${report.moodTrends.trend}`)
    console.log(`   - Average mood: ${report.moodTrends.average}/10`)
    console.log(`   - Key achievements: ${report.keyAchievements.slice(0, 2).join(', ')}`)
    console.log('')
  } catch (error) {
    console.log('❌ Progress report generation failed:', error.message)
    console.log('')
  }

  console.log('✨ AI Clinical Assistant testing completed!')
}

// Check if OpenAI API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.log('⚠️  Warning: OPENAI_API_KEY not found in environment variables')
  console.log('   Some AI features may fall back to default responses')
  console.log('')
}

// Run tests
testAIAnalysis().catch(console.error)