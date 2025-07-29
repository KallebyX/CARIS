import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { db } from '@/db'
import { users, progressReports, diaryEntries, sessions, patientProfiles } from '@/db/schema'
import { eq, and, desc, gte, lte } from 'drizzle-orm'
import { generateProgressReport } from '@/lib/ai-analysis'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a psychologist
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user[0] || user[0].role !== 'psychologist') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const patientId = url.searchParams.get('patientId')
    const reportType = url.searchParams.get('type')

    // Build query conditions
    let conditions = [eq(progressReports.psychologistId, userId)]
    
    if (patientId) {
      conditions.push(eq(progressReports.patientId, parseInt(patientId)))
    }

    if (reportType) {
      conditions.push(eq(progressReports.reportType, reportType))
    }

    // Get progress reports with patient information
    const reports = await db
      .select({
        id: progressReports.id,
        patientId: progressReports.patientId,
        reportType: progressReports.reportType,
        period: progressReports.period,
        summary: progressReports.summary,
        keyFindings: progressReports.keyFindings,
        recommendations: progressReports.recommendations,
        moodTrends: progressReports.moodTrends,
        riskAssessment: progressReports.riskAssessment,
        progressScore: progressReports.progressScore,
        generatedAt: progressReports.generatedAt,
        sharedWithPatient: progressReports.sharedWithPatient,
        sharedAt: progressReports.sharedAt,
        patientName: users.name,
        patientEmail: users.email,
      })
      .from(progressReports)
      .leftJoin(users, eq(progressReports.patientId, users.id))
      .where(and(...conditions))
      .orderBy(desc(progressReports.generatedAt))

    // Parse JSON fields
    const processedReports = reports.map(report => ({
      ...report,
      keyFindings: report.keyFindings ? JSON.parse(report.keyFindings) : [],
      recommendations: report.recommendations ? JSON.parse(report.recommendations) : [],
      moodTrends: report.moodTrends ? JSON.parse(report.moodTrends) : {},
      riskAssessment: report.riskAssessment ? JSON.parse(report.riskAssessment) : {},
    }))

    return NextResponse.json({
      success: true,
      data: processedReports,
    })
  } catch (error) {
    console.error('Error fetching progress reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a psychologist
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user[0] || user[0].role !== 'psychologist') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { patientId, reportType, startDate, endDate, customPeriod } = body

    if (!patientId || !reportType) {
      return NextResponse.json({ 
        error: 'Patient ID and report type required' 
      }, { status: 400 })
    }

    // Verify patient exists and is assigned to this psychologist
    const patient = await db
      .select()
      .from(users)
      .leftJoin(patientProfiles, eq(users.id, patientProfiles.userId))
      .where(and(
        eq(users.id, parseInt(patientId)),
        eq(users.role, 'patient'),
        eq(patientProfiles.psychologistId, userId)
      ))
      .limit(1)

    if (!patient[0]) {
      return NextResponse.json({ 
        error: 'Patient not found or not assigned to this psychologist' 
      }, { status: 404 })
    }

    // Calculate date range based on report type
    let start: Date, end: Date, period: string

    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
      period = customPeriod || `${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`
    } else {
      end = new Date()
      switch (reportType) {
        case 'weekly':
          start = new Date()
          start.setDate(end.getDate() - 7)
          period = `week_${end.toISOString().split('T')[0]}`
          break
        case 'monthly':
          start = new Date()
          start.setMonth(end.getMonth() - 1)
          period = `month_${end.getFullYear()}-${(end.getMonth() + 1).toString().padStart(2, '0')}`
          break
        case 'session_summary':
          start = new Date()
          start.setDate(end.getDate() - 14) // Last 2 weeks
          period = `session_summary_${end.toISOString().split('T')[0]}`
          break
        default:
          start = new Date()
          start.setMonth(end.getMonth() - 1)
          period = `custom_${end.toISOString().split('T')[0]}`
      }
    }

    // Get diary entries for the period
    const diaryData = await db
      .select()
      .from(diaryEntries)
      .where(and(
        eq(diaryEntries.patientId, parseInt(patientId)),
        gte(diaryEntries.entryDate, start),
        lte(diaryEntries.entryDate, end)
      ))
      .orderBy(desc(diaryEntries.entryDate))

    // Get sessions for the period
    const sessionData = await db
      .select()
      .from(sessions)
      .where(and(
        eq(sessions.patientId, parseInt(patientId)),
        eq(sessions.psychologistId, userId),
        gte(sessions.sessionDate, start),
        lte(sessions.sessionDate, end)
      ))
      .orderBy(desc(sessions.sessionDate))

    // Generate AI report
    const aiReport = await generateProgressReport(
      parseInt(patientId),
      { start, end },
      diaryData.map(e => ({
        content: e.content || '',
        moodRating: e.moodRating || 5,
        createdAt: e.entryDate,
        emotions: e.emotions || '',
        riskLevel: e.riskLevel || 'low',
      })),
      sessionData.map(s => ({
        sessionDate: s.sessionDate,
        notes: s.notes || '',
        duration: s.durationMinutes,
      }))
    )

    // Save the report to database
    const savedReport = await db.insert(progressReports).values({
      patientId: parseInt(patientId),
      psychologistId: userId,
      reportType,
      period,
      summary: `Relatório ${reportType} para ${patient[0].users.name} - ${period}`,
      keyFindings: JSON.stringify(aiReport.keyAchievements),
      recommendations: JSON.stringify(aiReport.recommendations),
      moodTrends: JSON.stringify(aiReport.moodTrends),
      riskAssessment: JSON.stringify({
        overallRisk: aiReport.moodTrends.average < 3 ? 'high' : aiReport.moodTrends.average < 5 ? 'medium' : 'low',
        concerns: aiReport.challengingAreas,
      }),
      progressScore: aiReport.overallProgress,
    }).returning()

    return NextResponse.json({
      success: true,
      data: {
        ...savedReport[0],
        aiReport,
      },
    })
  } catch (error) {
    console.error('Error generating progress report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a psychologist
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user[0] || user[0].role !== 'psychologist') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { reportId, shareWithPatient } = body

    if (!reportId) {
      return NextResponse.json({ 
        error: 'Report ID required' 
      }, { status: 400 })
    }

    // Verify report belongs to this psychologist
    const report = await db
      .select()
      .from(progressReports)
      .where(and(
        eq(progressReports.id, parseInt(reportId)),
        eq(progressReports.psychologistId, userId)
      ))
      .limit(1)

    if (!report[0]) {
      return NextResponse.json({ 
        error: 'Report not found' 
      }, { status: 404 })
    }

    // Update sharing status
    const updateData: any = {}
    
    if (typeof shareWithPatient === 'boolean') {
      updateData.sharedWithPatient = shareWithPatient
      if (shareWithPatient && !report[0].sharedAt) {
        updateData.sharedAt = new Date()
      } else if (!shareWithPatient) {
        updateData.sharedAt = null
      }
    }

    const updatedReport = await db
      .update(progressReports)
      .set(updateData)
      .where(eq(progressReports.id, parseInt(reportId)))
      .returning()

    return NextResponse.json({
      success: true,
      data: updatedReport[0],
    })
  } catch (error) {
    console.error('Error updating progress report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}