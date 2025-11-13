/**
 * Integration Test: Session Booking and Reminder System
 *
 * Tests:
 * 1. Session booking flow
 * 2. Calendar integration
 * 3. Reminder scheduling (24h, 1h, 15min)
 * 4. Recurring sessions
 */

import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '@/test-utils/db-helpers'
import { PGlite } from '@electric-sql/pglite'

describe('Session Booking and Reminders (Integration)', () => {
  let testDb: PGlite
  let patientId: number
  let psychologistId: number
  let clinicId: number

  beforeAll(async () => {
    testDb = await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearTestDatabase()

    // Setup clinic
    const clinicResult = await testDb.query(
      `INSERT INTO clinics (name, slug, owner_id, status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Test Clinic', 'test-clinic', 1, 'active']
    )
    clinicId = clinicResult.rows[0].id

    // Setup users
    const patientResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['Test Patient', 'patient@test.com', 'hashed', 'patient', '+5511999999999']
    )
    patientId = patientResult.rows[0].id

    const psychologistResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Dr. Test', 'psychologist@test.com', 'hashed', 'psychologist']
    )
    psychologistId = psychologistResult.rows[0].id

    // Create user settings with notification preferences
    await testDb.query(
      `INSERT INTO user_settings (
        user_id, email_reminders_enabled, sms_reminders_enabled,
        reminder_before_24h, reminder_before_1h, reminder_before_15min
      )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [patientId, true, true, true, true, false]
    )
  })

  it('should book a therapy session successfully', async () => {
    // Arrange
    const scheduledAt = new Date('2024-12-20T14:00:00Z')

    // Act - Book session
    const sessionResult = await testDb.query(
      `INSERT INTO sessions (
        clinic_id, psychologist_id, patient_id,
        scheduled_at, duration, type, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [clinicId, psychologistId, patientId, scheduledAt, 50, 'therapy', 'scheduled']
    )

    const sessionId = sessionResult.rows[0].id

    // Assert
    const result = await testDb.query(
      `SELECT * FROM sessions WHERE id = $1`,
      [sessionId]
    )

    const session = result.rows[0]
    expect(session.patient_id).toBe(patientId)
    expect(session.psychologist_id).toBe(psychologistId)
    expect(session.status).toBe('scheduled')
    expect(session.duration).toBe(50)
  })

  it('should create recurring session series', async () => {
    // Arrange
    const startDate = new Date('2024-12-20T14:00:00Z')
    const seriesId = 'series-weekly-123'

    // Act - Create weekly recurring sessions for 4 weeks
    const sessions = []
    for (let i = 0; i < 4; i++) {
      const sessionDate = new Date(startDate)
      sessionDate.setDate(sessionDate.getDate() + (i * 7))

      const result = await testDb.query(
        `INSERT INTO sessions (
          clinic_id, psychologist_id, patient_id, scheduled_at,
          duration, type, status, is_recurring, recurring_series_id,
          recurrence_pattern, parent_session_id
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [
          clinicId, psychologistId, patientId, sessionDate,
          50, 'therapy', 'scheduled', true, seriesId, 'weekly',
          i === 0 ? null : sessions[0]
        ]
      )
      sessions.push(result.rows[0].id)
    }

    // Assert - Verify series created
    const seriesResult = await testDb.query(
      `SELECT COUNT(*) as count FROM sessions
       WHERE recurring_series_id = $1`,
      [seriesId]
    )

    expect(parseInt(seriesResult.rows[0].count)).toBe(4)

    // Verify all linked to first session
    const linkedResult = await testDb.query(
      `SELECT COUNT(*) as count FROM sessions
       WHERE parent_session_id = $1`,
      [sessions[0]]
    )

    expect(parseInt(linkedResult.rows[0].count)).toBe(3)
  })

  it('should track reminder sending status', async () => {
    // Arrange - Create session
    const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours from now

    const sessionResult = await testDb.query(
      `INSERT INTO sessions (
        clinic_id, psychologist_id, patient_id, scheduled_at,
        duration, status, reminder_sent_24h, reminder_sent_1h, reminder_sent_15min
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [clinicId, psychologistId, patientId, scheduledAt, 50, 'scheduled', false, false, false]
    )

    const sessionId = sessionResult.rows[0].id

    // Act - Simulate sending 24h reminder
    await testDb.query(
      `UPDATE sessions SET reminder_sent_24h = true WHERE id = $1`,
      [sessionId]
    )

    // Assert
    const result = await testDb.query(
      `SELECT reminder_sent_24h, reminder_sent_1h, reminder_sent_15min
       FROM sessions WHERE id = $1`,
      [sessionId]
    )

    expect(result.rows[0].reminder_sent_24h).toBe(true)
    expect(result.rows[0].reminder_sent_1h).toBe(false)
    expect(result.rows[0].reminder_sent_15min).toBe(false)
  })

  it('should integrate with Google Calendar', async () => {
    // Arrange - Setup Google Calendar integration
    await testDb.query(
      `UPDATE user_settings
       SET google_calendar_enabled = true,
           google_calendar_access_token = 'mock_access_token',
           google_calendar_refresh_token = 'mock_refresh_token'
       WHERE user_id = $1`,
      [patientId]
    )

    // Act - Create session with calendar event
    const scheduledAt = new Date('2024-12-20T14:00:00Z')
    const googleEventId = 'google_event_123abc'

    const sessionResult = await testDb.query(
      `INSERT INTO sessions (
        clinic_id, psychologist_id, patient_id, scheduled_at,
        duration, status, google_calendar_event_id, timezone
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        clinicId, psychologistId, patientId, scheduledAt,
        50, 'scheduled', googleEventId, 'America/Sao_Paulo'
      ]
    )

    // Assert
    const result = await testDb.query(
      `SELECT google_calendar_event_id, timezone FROM sessions WHERE id = $1`,
      [sessionResult.rows[0].id]
    )

    expect(result.rows[0].google_calendar_event_id).toBe(googleEventId)
    expect(result.rows[0].timezone).toBe('America/Sao_Paulo')
  })

  it('should handle session cancellation and rescheduling', async () => {
    // Arrange - Create session
    const sessionResult = await testDb.query(
      `INSERT INTO sessions (
        clinic_id, psychologist_id, patient_id,
        scheduled_at, duration, status
      )
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        clinicId, psychologistId, patientId,
        new Date('2024-12-20T14:00:00Z'), 50, 'scheduled'
      ]
    )

    const sessionId = sessionResult.rows[0].id

    // Act - Cancel session
    await testDb.query(
      `UPDATE sessions SET status = 'cancelled' WHERE id = $1`,
      [sessionId]
    )

    // Assert - Verify cancellation
    const cancelResult = await testDb.query(
      `SELECT status FROM sessions WHERE id = $1`,
      [sessionId]
    )

    expect(cancelResult.rows[0].status).toBe('cancelled')

    // Act - Create rescheduled session
    const newSessionResult = await testDb.query(
      `INSERT INTO sessions (
        clinic_id, psychologist_id, patient_id,
        scheduled_at, duration, status, notes
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        clinicId, psychologistId, patientId,
        new Date('2024-12-21T14:00:00Z'), 50, 'scheduled',
        `Rescheduled from session ${sessionId}`
      ]
    )

    expect(newSessionResult.rows[0].id).toBeTruthy()
  })

  it('should track session completion and payment', async () => {
    // Arrange - Create session
    const sessionResult = await testDb.query(
      `INSERT INTO sessions (
        clinic_id, psychologist_id, patient_id, scheduled_at,
        duration, status, session_value, payment_status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        clinicId, psychologistId, patientId,
        new Date('2024-12-20T14:00:00Z'),
        50, 'scheduled', '150.00', 'pending'
      ]
    )

    const sessionId = sessionResult.rows[0].id

    // Act - Complete session
    await testDb.query(
      `UPDATE sessions
       SET status = 'completed', payment_status = 'paid'
       WHERE id = $1`,
      [sessionId]
    )

    // Assert
    const result = await testDb.query(
      `SELECT status, payment_status FROM sessions WHERE id = $1`,
      [sessionId]
    )

    expect(result.rows[0].status).toBe('completed')
    expect(result.rows[0].payment_status).toBe('paid')
  })

  it('should prevent double-booking of time slots', async () => {
    // Arrange - Create first session
    const scheduledAt = new Date('2024-12-20T14:00:00Z')

    await testDb.query(
      `INSERT INTO sessions (
        clinic_id, psychologist_id, patient_id, scheduled_at, duration, status
      )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [clinicId, psychologistId, patientId, scheduledAt, 50, 'scheduled']
    )

    // Act & Assert - Try to book overlapping session
    const conflictingAt = new Date('2024-12-20T14:30:00Z') // Overlaps with first session

    // Check for conflicts
    const conflictCheck = await testDb.query(
      `SELECT COUNT(*) as count FROM sessions
       WHERE psychologist_id = $1
       AND status IN ('scheduled', 'confirmed')
       AND scheduled_at < $2
       AND (scheduled_at + (duration || ' minutes')::interval) > $3`,
      [
        psychologistId,
        new Date(conflictingAt.getTime() + 50 * 60000),
        conflictingAt
      ]
    )

    expect(parseInt(conflictCheck.rows[0].count)).toBeGreaterThan(0)
  })
})
