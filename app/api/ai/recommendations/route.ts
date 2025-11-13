import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { diaryEntries, moodTracking, users, patientProfiles } from '@/db/schema'
import { eq, desc, gte } from 'drizzle-orm'
import { generateWeeklyInsight, generateWellnessTips, predictGoalAchievement } from '@/lib/ai/insights-generator'
import { recommendMeditations } from '@/lib/ai/emotional-intelligence'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, recommendationType = 'wellness' } = body

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID required' }, { status: 400 })
    }

    let result: any = {}

    if (recommendationType === 'wellness') {
      // Get current state
      const latestMood = await db
        .select()
        .from(moodTracking)
        .where(eq(moodTracking.patientId, patientId))
        .orderBy(desc(moodTracking.date))
        .limit(1)

      const latestDiary = await db
        .select()
        .from(diaryEntries)
        .where(eq(diaryEntries.patientId, patientId))
        .orderBy(desc(diaryEntries.entryDate))
        .limit(3)

      const recentEmotions = latestDiary
        .map((d) => d.dominantEmotion)
        .filter(Boolean) as string[]

      const tips = await generateWellnessTips({
        currentMood: latestMood[0]?.mood || 5,
        recentEmotions: recentEmotions.length > 0 ? recentEmotions : ['neutro'],
        sleepQuality: latestMood[0]?.sleepQuality || undefined,
        energyLevel: latestMood[0]?.energy || undefined,
        stressLevel: latestMood[0]?.stressLevel || undefined,
      })

      result = { tips }
    } else if (recommendationType === 'meditation') {
      // Get meditation recommendations
      const latestMood = await db
        .select()
        .from(moodTracking)
        .where(eq(moodTracking.patientId, patientId))
        .orderBy(desc(moodTracking.date))
        .limit(1)

      const latestDiary = await db
        .select()
        .from(diaryEntries)
        .where(eq(diaryEntries.patientId, patientId))
        .orderBy(desc(diaryEntries.entryDate))
        .limit(1)

      const meditations = await recommendMeditations({
        currentEmotion: latestDiary[0]?.dominantEmotion || 'neutro',
        intensity: latestDiary[0]?.emotionIntensity || 5,
        availableTime: 15,
        experienceLevel: 'beginner',
      })

      result = { meditations }
    } else if (recommendationType === 'weekly_insight') {
      // Generate weekly insight
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

      const thisWeekEntries = await db
        .select()
        .from(diaryEntries)
        .where(eq(diaryEntries.patientId, patientId))
        .where(gte(diaryEntries.entryDate, sevenDaysAgo))

      const thisWeekMoods = await db
        .select()
        .from(moodTracking)
        .where(eq(moodTracking.patientId, patientId))
        .where(gte(moodTracking.date, sevenDaysAgo))

      const lastWeekMoods = await db
        .select()
        .from(moodTracking)
        .where(eq(moodTracking.patientId, patientId))
        .where(gte(moodTracking.date, fourteenDaysAgo))

      const avgMood =
        thisWeekMoods.reduce((sum, m) => sum + (m.mood || 0), 0) / Math.max(thisWeekMoods.length, 1)

      const moodValues = thisWeekMoods.map((m) => m.mood || 5)

      const insight = await generateWeeklyInsight({
        weekData: {
          diaryEntries: thisWeekEntries.length,
          avgMood,
          moodRange: {
            min: Math.min(...moodValues, 5),
            max: Math.max(...moodValues, 5),
          },
          sessionsAttended: 0,
          tasksCompleted: 0,
          totalTasks: 0,
        },
        emotionalData: thisWeekMoods.map((m) => ({
          date: m.date.toISOString().split('T')[0],
          mood: m.mood || 5,
          emotions: [],
        })),
        significantEvents: [],
      })

      result = { insight }
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Error in recommendations API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}
