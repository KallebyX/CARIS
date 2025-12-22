import { db } from '@/db'
import { 
  diaryEntries, 
  clinicalAlerts, 
  users, 
  patientProfiles,
  sessions,
  clinicalInsights
} from '@/db/schema'
import { eq, and, desc, gte, isNull } from 'drizzle-orm'
import { 
  analyzeEmotionalContent, 
  detectClinicalAlerts, 
  analyzeSessionProgress 
} from '@/lib/ai-analysis'

interface ProcessingResult {
  entriesProcessed: number
  alertsGenerated: number
  insightsGenerated: number
  errors: string[]
}

export class ClinicalAIService {
  
  /**
   * Process unanalyzed diary entries and generate AI insights
   */
  static async processUnanalyzedEntries(): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      entriesProcessed: 0,
      alertsGenerated: 0,
      insightsGenerated: 0,
      errors: []
    }

    try {
      // Get unanalyzed diary entries from the last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const unanalyzedEntries = await db
        .select({
          id: diaryEntries.id,
          patientId: diaryEntries.patientId,
          content: diaryEntries.content,
          moodRating: diaryEntries.moodRating,
          entryDate: diaryEntries.entryDate,
          psychologistId: patientProfiles.psychologistId,
        })
        .from(diaryEntries)
        .leftJoin(patientProfiles, eq(diaryEntries.patientId, patientProfiles.userId))
        .where(and(
          eq(diaryEntries.aiAnalyzed, false),
          gte(diaryEntries.entryDate, sevenDaysAgo)
        ))
        .limit(50) // Process in batches to avoid timeouts

      for (const entry of unanalyzedEntries) {
        try {
          if (!entry.content || !entry.psychologistId) continue

          // Analyze emotional content
          const analysis = await analyzeEmotionalContent(entry.content)
          
          // Update diary entry with AI analysis
          await db
            .update(diaryEntries)
            .set({
              aiAnalyzed: true,
              dominantEmotion: analysis.dominantEmotion,
              emotionIntensity: analysis.emotionIntensity,
              sentimentScore: Math.round(analysis.sentimentScore * 100), // Convert to -100 to 100 scale
              riskLevel: analysis.riskLevel,
              aiInsights: JSON.stringify(analysis.insights),
              suggestedActions: JSON.stringify(analysis.suggestedActions),
              plutchikCategories: JSON.stringify(analysis.plutchikCategories),
            })
            .where(eq(diaryEntries.id, entry.id))

          result.entriesProcessed++

          // Generate clinical alert if high risk
          if (analysis.riskLevel === 'high' || analysis.riskLevel === 'critical') {
            await this.generateHighRiskAlert(
              entry.patientId,
              entry.psychologistId,
              analysis,
              entry
            )
            result.alertsGenerated++
          }

        } catch (error) {
          result.errors.push(`Error processing entry ${entry.id}: ${error}`)
          console.error('Error processing diary entry:', error)
        }
      }

      return result
    } catch (error) {
      result.errors.push(`Critical error in processing: ${error}`)
      console.error('Critical error in processUnanalyzedEntries:', error)
      return result
    }
  }

  /**
   * Generate periodic clinical insights for active patients
   */
  static async generatePeriodicInsights(): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      entriesProcessed: 0,
      alertsGenerated: 0,
      insightsGenerated: 0,
      errors: []
    }

    try {
      // Get active patient-psychologist relationships
      const activePatients = await db
        .select({
          patientId: patientProfiles.userId,
          psychologistId: patientProfiles.psychologistId,
          patientName: users.name,
        })
        .from(patientProfiles)
        .leftJoin(users, eq(patientProfiles.userId, users.id))
        .where(isNull(patientProfiles.psychologistId) === false)
        .limit(20) // Process in batches

      for (const patient of activePatients) {
        try {
          if (!patient.psychologistId) continue

          // Check if we need to generate weekly insights (check last insight date)
          const lastInsight = await db
            .select()
            .from(clinicalInsights)
            .where(and(
              eq(clinicalInsights.patientId, patient.patientId),
              eq(clinicalInsights.type, 'weekly_analysis')
            ))
            .orderBy(desc(clinicalInsights.generatedAt))
            .limit(1)

          const shouldGenerate = !lastInsight[0] || 
            (new Date().getTime() - new Date(lastInsight[0].generatedAt).getTime()) > (7 * 24 * 60 * 60 * 1000)

          if (!shouldGenerate) continue

          // Get recent data for analysis
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

          const recentEntries = await db
            .select()
            .from(diaryEntries)
            .where(and(
              eq(diaryEntries.patientId, patient.patientId),
              gte(diaryEntries.entryDate, sevenDaysAgo)
            ))
            .orderBy(desc(diaryEntries.entryDate))

          const recentSessions = await db
            .select()
            .from(sessions)
            .where(and(
              eq(sessions.patientId, patient.patientId),
              eq(sessions.psychologistId, patient.psychologistId),
              gte(sessions.scheduledAt, sevenDaysAgo)
            ))
            .orderBy(desc(sessions.scheduledAt))

          if (recentEntries.length === 0) continue

          // Generate session analysis
          const sessionAnalysis = await analyzeSessionProgress(
            recentSessions.map(s => ({
              sessionDate: s.scheduledAt,
              notes: s.notes || '',
              patientMood: 5, // Default if no mood tracking
              duration: s.duration,
              type: s.type,
            })),
            recentEntries.map(e => ({
              content: e.content || '',
              moodRating: e.moodRating || 5,
              createdAt: e.entryDate,
              emotions: e.emotions || '',
            }))
          )

          // Save weekly insight
          await db.insert(clinicalInsights).values({
            patientId: patient.patientId,
            psychologistId: patient.psychologistId,
            type: 'weekly_analysis',
            title: `Análise Semanal - ${patient.patientName}`,
            content: JSON.stringify(sessionAnalysis),
            severity: sessionAnalysis.overallProgress === 'critical' ? 'critical' 
                     : sessionAnalysis.overallProgress === 'concerning' ? 'warning' 
                     : 'info',
          })

          result.insightsGenerated++

          // Detect and generate clinical alerts
          const alerts = await detectClinicalAlerts(
            recentEntries.map(e => ({
              content: e.content || '',
              moodRating: e.moodRating || 5,
              createdAt: e.entryDate,
              riskLevel: e.riskLevel || 'low',
              emotions: e.emotions || '',
            })),
            recentSessions.map(s => ({
              sessionDate: s.scheduledAt,
              notes: s.notes || '',
              patientMood: 5,
            })),
            [] // Would need to fetch existing alerts
          )

          // Save new alerts
          for (const alert of alerts) {
            await db.insert(clinicalAlerts).values({
              patientId: patient.patientId,
              psychologistId: patient.psychologistId,
              alertType: alert.alertType,
              severity: alert.severity,
              title: alert.title,
              description: alert.description,
              recommendations: JSON.stringify(alert.recommendations),
              triggeredBy: JSON.stringify({
                analysisType: 'periodic_check',
                timestamp: new Date().toISOString(),
              }),
            })
            result.alertsGenerated++
          }

        } catch (error) {
          result.errors.push(`Error processing patient ${patient.patientId}: ${error}`)
          console.error('Error processing patient insights:', error)
        }
      }

      return result
    } catch (error) {
      result.errors.push(`Critical error in insight generation: ${error}`)
      console.error('Critical error in generatePeriodicInsights:', error)
      return result
    }
  }

  /**
   * Generate high-risk alert for concerning diary entries
   */
  private static async generateHighRiskAlert(
    patientId: number,
    psychologistId: number,
    analysis: any,
    entry: any
  ) {
    try {
      const patient = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, patientId))
        .limit(1)

      const patientName = patient[0]?.name || 'Paciente'

      await db.insert(clinicalAlerts).values({
        patientId,
        psychologistId,
        alertType: 'risk_escalation',
        severity: analysis.riskLevel,
        title: `Entrada de Alto Risco - ${patientName}`,
        description: `Detectado conteúdo de risco ${analysis.riskLevel} na entrada do diário. Emoção dominante: ${analysis.dominantEmotion}. Intensidade: ${analysis.emotionIntensity}/10.`,
        recommendations: JSON.stringify([
          'Entrar em contato com o paciente imediatamente',
          'Avaliar necessidade de sessão de emergência',
          'Considerar protocolo de segurança',
          ...analysis.suggestedActions.slice(0, 2)
        ]),
        triggeredBy: JSON.stringify({
          entryId: entry.id,
          entryDate: entry.entryDate,
          riskLevel: analysis.riskLevel,
          sentimentScore: analysis.sentimentScore,
        }),
      })
    } catch (error) {
      console.error('Error generating high-risk alert:', error)
    }
  }

  /**
   * Clean up old processed data to maintain performance
   */
  static async cleanupOldData(): Promise<void> {
    try {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      // Mark old resolved alerts as inactive
      await db
        .update(clinicalAlerts)
        .set({ isActive: false })
        .where(and(
          eq(clinicalAlerts.isActive, false),
          // resolvedAt is before 3 months ago
        ))

      console.log('Cleanup completed successfully')
    } catch (error) {
      console.error('Error in cleanup:', error)
    }
  }
}

// Export the main processing function for API use
export async function runAIProcessing(): Promise<ProcessingResult> {
  const entryResults = await ClinicalAIService.processUnanalyzedEntries()
  const insightResults = await ClinicalAIService.generatePeriodicInsights()
  
  return {
    entriesProcessed: entryResults.entriesProcessed,
    alertsGenerated: entryResults.alertsGenerated + insightResults.alertsGenerated,
    insightsGenerated: insightResults.insightsGenerated,
    errors: [...entryResults.errors, ...insightResults.errors],
  }
}