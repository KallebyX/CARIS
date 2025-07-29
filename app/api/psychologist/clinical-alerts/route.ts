import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth'
import { db } from '@/db'
import { users, clinicalAlerts, patientProfiles } from '@/db/schema'
import { eq, and, desc, isNull, sql } from 'drizzle-orm'

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
    const status = url.searchParams.get('status') || 'active'
    const severity = url.searchParams.get('severity')
    const patientId = url.searchParams.get('patientId')

    // Build query conditions
    let conditions = [eq(clinicalAlerts.psychologistId, userId)]
    
    if (status === 'active') {
      conditions.push(eq(clinicalAlerts.isActive, true))
      conditions.push(isNull(clinicalAlerts.acknowledgedAt))
    } else if (status === 'acknowledged') {
      conditions.push(eq(clinicalAlerts.isActive, true))
      conditions.push(sql`${clinicalAlerts.acknowledgedAt} IS NOT NULL`)
    } else if (status === 'resolved') {
      conditions.push(eq(clinicalAlerts.isActive, false))
    }

    if (severity) {
      conditions.push(eq(clinicalAlerts.severity, severity))
    }

    if (patientId) {
      conditions.push(eq(clinicalAlerts.patientId, parseInt(patientId)))
    }

    // Get alerts with patient information
    const alerts = await db
      .select({
        id: clinicalAlerts.id,
        patientId: clinicalAlerts.patientId,
        alertType: clinicalAlerts.alertType,
        severity: clinicalAlerts.severity,
        title: clinicalAlerts.title,
        description: clinicalAlerts.description,
        recommendations: clinicalAlerts.recommendations,
        triggeredBy: clinicalAlerts.triggeredBy,
        isActive: clinicalAlerts.isActive,
        acknowledgedAt: clinicalAlerts.acknowledgedAt,
        acknowledgedBy: clinicalAlerts.acknowledgedBy,
        resolvedAt: clinicalAlerts.resolvedAt,
        createdAt: clinicalAlerts.createdAt,
        patientName: users.name,
        patientEmail: users.email,
      })
      .from(clinicalAlerts)
      .leftJoin(users, eq(clinicalAlerts.patientId, users.id))
      .where(and(...conditions))
      .orderBy(desc(clinicalAlerts.createdAt))

    // Parse JSON fields
    const processedAlerts = alerts.map(alert => ({
      ...alert,
      recommendations: alert.recommendations ? JSON.parse(alert.recommendations) : [],
      triggeredBy: alert.triggeredBy ? JSON.parse(alert.triggeredBy) : {},
    }))

    return NextResponse.json({
      success: true,
      data: processedAlerts,
    })
  } catch (error) {
    console.error('Error fetching clinical alerts:', error)
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
    const { 
      patientId, 
      alertType, 
      severity, 
      title, 
      description, 
      recommendations,
      triggeredBy 
    } = body

    if (!patientId || !alertType || !severity || !title || !description) {
      return NextResponse.json({ 
        error: 'Missing required fields: patientId, alertType, severity, title, description' 
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

    // Create the alert
    const alert = await db.insert(clinicalAlerts).values({
      patientId: parseInt(patientId),
      psychologistId: userId,
      alertType,
      severity,
      title,
      description,
      recommendations: JSON.stringify(recommendations || []),
      triggeredBy: JSON.stringify(triggeredBy || {}),
    }).returning()

    return NextResponse.json({
      success: true,
      data: alert[0],
    })
  } catch (error) {
    console.error('Error creating clinical alert:', error)
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
    const { alertId, action } = body

    if (!alertId || !action) {
      return NextResponse.json({ 
        error: 'Alert ID and action required' 
      }, { status: 400 })
    }

    // Verify alert belongs to this psychologist
    const alert = await db
      .select()
      .from(clinicalAlerts)
      .where(and(
        eq(clinicalAlerts.id, parseInt(alertId)),
        eq(clinicalAlerts.psychologistId, userId)
      ))
      .limit(1)

    if (!alert[0]) {
      return NextResponse.json({ 
        error: 'Alert not found' 
      }, { status: 404 })
    }

    let updateData: any = {}

    switch (action) {
      case 'acknowledge':
        updateData = {
          acknowledgedAt: new Date(),
          acknowledgedBy: userId,
        }
        break
      case 'resolve':
        updateData = {
          isActive: false,
          resolvedAt: new Date(),
          acknowledgedAt: alert[0].acknowledgedAt || new Date(),
          acknowledgedBy: alert[0].acknowledgedBy || userId,
        }
        break
      case 'reactivate':
        updateData = {
          isActive: true,
          resolvedAt: null,
        }
        break
      default:
        return NextResponse.json({ 
          error: 'Invalid action. Use: acknowledge, resolve, or reactivate' 
        }, { status: 400 })
    }

    const updatedAlert = await db
      .update(clinicalAlerts)
      .set(updateData)
      .where(eq(clinicalAlerts.id, parseInt(alertId)))
      .returning()

    return NextResponse.json({
      success: true,
      data: updatedAlert[0],
    })
  } catch (error) {
    console.error('Error updating clinical alert:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}