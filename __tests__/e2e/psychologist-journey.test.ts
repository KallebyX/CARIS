/**
 * End-to-End Test: Complete Psychologist Journey
 *
 * Tests the full psychologist experience:
 * 1. Register and get verified
 * 2. Patient assignment
 * 3. Session management
 * 4. Review clinical insights
 * 5. Generate progress reports
 */

import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '@/test-utils/db-helpers'
import { PGlite } from '@electric-sql/pglite'

describe('Psychologist Journey (E2E)', () => {
  let testDb: PGlite
  let psychologistId: number
  let patientId: number
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
      ['Professional Clinic', 'prof-clinic', 1, 'active']
    )
    clinicId = clinicResult.rows[0].id
  })

  it('should complete full psychologist onboarding and patient management', async () => {
    // STEP 1: Register new psychologist
    const registerResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Dr. Maria Santos', 'maria.santos@clinic.com', 'hashed', 'psychologist']
    )
    psychologistId = registerResult.rows[0].id

    expect(psychologistId).toBeTruthy()

    // STEP 2: Complete professional profile
    await testDb.query(
      `INSERT INTO psychologist_profiles (
        user_id, crp, bio, specialties, experience, education,
        languages, hourly_rate, is_verified
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        psychologistId,
        'CRP-06/12345',
        'Clinical psychologist specializing in CBT and anxiety disorders',
        JSON.stringify(['CBT', 'Anxiety', 'Depression', 'Trauma']),
        '10 years of clinical experience',
        'PhD in Clinical Psychology, USP',
        JSON.stringify(['Portuguese', 'English', 'Spanish']),
        '200.00',
        false // Not yet verified
      ]
    )

    // STEP 3: Admin verifies psychologist credentials
    await testDb.query(
      `UPDATE psychologist_profiles
       SET is_verified = true, verified_at = $1
       WHERE user_id = $2`,
      [new Date(), psychologistId]
    )

    // Verify verification status
    const verifyCheck = await testDb.query(
      `SELECT is_verified, verified_at FROM psychologist_profiles
       WHERE user_id = $1`,
      [psychologistId]
    )

    expect(verifyCheck.rows[0].is_verified).toBe(true)

    // STEP 4: Join clinic
    await testDb.query(
      `INSERT INTO clinic_users (clinic_id, user_id, role, status)
       VALUES ($1, $2, $3, $4)`,
      [clinicId, psychologistId, 'psychologist', 'active']
    )

    // STEP 5: Set up availability and alert preferences
    await testDb.query(
      `INSERT INTO alert_configurations (
        psychologist_id, alert_type, is_enabled, threshold, frequency, notification_method
      )
       VALUES
         ($1, $2, $3, $4, $5, $6),
         ($7, $8, $9, $10, $11, $12)`,
      [
        psychologistId, 'mood_decline', true, 3, 'immediate', 'both',
        psychologistId, 'inactivity', true, 7, 'daily', 'email'
      ]
    )

    // STEP 6: Create custom fields for patient assessment
    await testDb.query(
      `INSERT INTO custom_fields (
        psychologist_id, field_name, field_type, is_required, display_order
      )
       VALUES
         ($1, $2, $3, $4, $5),
         ($6, $7, $8, $9, $10)`,
      [
        psychologistId, 'Previous therapy experience', 'text', false, 1,
        psychologistId, 'Medication status', 'select', false, 2
      ]
    )

    // STEP 7: Patient registers and is assigned
    const patientResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['João Silva', 'joao.silva@email.com', 'hashed', 'patient']
    )
    patientId = patientResult.rows[0].id

    await testDb.query(
      `INSERT INTO patient_profiles (
        user_id, psychologist_id, clinic_id, emergency_contact
      )
       VALUES ($1, $2, $3, $4)`,
      [
        patientId,
        psychologistId,
        clinicId,
        JSON.stringify({ name: 'Maria Silva', phone: '+5511987654321' })
      ]
    )

    // STEP 8: Schedule initial consultation
    const consultationResult = await testDb.query(
      `INSERT INTO sessions (
        clinic_id, psychologist_id, patient_id,
        scheduled_at, duration, type, status, session_value
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        clinicId,
        psychologistId,
        patientId,
        new Date('2024-12-20T10:00:00Z'),
        50,
        'consultation',
        'scheduled',
        '200.00'
      ]
    )

    const sessionId = consultationResult.rows[0].id

    // STEP 9: Patient creates diary entries (showing declining mood)
    const diaryEntries = [
      { date: '2024-12-15', mood: 4, content: 'Feeling anxious about work' },
      { date: '2024-12-16', mood: 3, content: 'Hard time sleeping, feeling overwhelmed' },
      { date: '2024-12-17', mood: 3, content: 'Struggling to concentrate' },
    ]

    for (const entry of diaryEntries) {
      const diaryResult = await testDb.query(
        `INSERT INTO diary_entries (
          patient_id, entry_date, mood_rating, content, ai_analyzed,
          dominant_emotion, sentiment_score, risk_level
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          patientId,
          entry.date,
          entry.mood,
          entry.content,
          true,
          'anxiety',
          -40,
          'medium'
        ]
      )
    }

    // STEP 10: AI generates clinical alert for mood decline
    await testDb.query(
      `INSERT INTO clinical_alerts (
        patient_id, psychologist_id, alert_type, severity,
        title, description, triggered_by
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        patientId,
        psychologistId,
        'mood_decline',
        'medium',
        'Mood Decline Detected',
        'Patient João Silva showing declining mood pattern over past 3 days',
        JSON.stringify({ trigger: 'mood_tracking', days: 3, average_mood: 3.3 })
      ]
    )

    // STEP 11: Psychologist reviews clinical insights
    const insightResult = await testDb.query(
      `INSERT INTO clinical_insights (
        patient_id, psychologist_id, type, title, content, severity, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        patientId,
        psychologistId,
        'pattern_detection',
        'Anxiety Pattern Identified',
        JSON.stringify({
          patterns: ['work-related stress', 'sleep disruption', 'concentration issues'],
          recommendations: ['CBT techniques', 'sleep hygiene', 'stress management']
        }),
        'warning',
        'active'
      ]
    )

    // STEP 12: Psychologist acknowledges alert
    await testDb.query(
      `UPDATE clinical_alerts
       SET acknowledged_at = $1, acknowledged_by = $2
       WHERE patient_id = $3 AND psychologist_id = $4`,
      [new Date(), psychologistId, patientId, psychologistId]
    )

    // STEP 13: Create therapeutic goals with patient
    const goalResult = await testDb.query(
      `INSERT INTO therapeutic_goals (
        patient_id, psychologist_id, title, description,
        target_value, unit, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        patientId,
        psychologistId,
        'Improve sleep quality',
        'Achieve consistent 7-8 hours of quality sleep',
        8,
        'hours',
        'active'
      ]
    )

    // STEP 14: Prescribe therapeutic task
    await testDb.query(
      `INSERT INTO tasks (
        patient_id, psychologist_id, title, description,
        category, difficulty, priority, due_date, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        patientId,
        psychologistId,
        'Sleep diary tracking',
        'Track your sleep patterns and quality for the next week',
        'homework',
        'easy',
        'alta',
        new Date('2024-12-27'),
        'pending'
      ]
    )

    // STEP 15: Complete first session with notes
    await testDb.query(
      `UPDATE sessions
       SET status = 'completed',
           notes = $1
       WHERE id = $2`,
      [
        'Initial consultation completed. Patient presents with anxiety symptoms. Created therapeutic goals and assigned homework.',
        sessionId
      ]
    )

    // STEP 16: Generate progress report
    const reportResult = await testDb.query(
      `INSERT INTO progress_reports (
        patient_id, psychologist_id, report_type, period,
        summary, key_findings, recommendations, progress_score
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        patientId,
        psychologistId,
        'session_summary',
        '2024-12-15_2024-12-20',
        'Initial assessment completed. Patient shows signs of work-related anxiety.',
        JSON.stringify([
          'Moderate anxiety levels',
          'Sleep disruption',
          'Work-related stress',
          'Good engagement with treatment'
        ]),
        JSON.stringify([
          'Continue CBT techniques',
          'Implement sleep hygiene protocol',
          'Weekly sessions recommended'
        ]),
        65
      ]
    )

    // FINAL VERIFICATION: Check psychologist dashboard
    const dashboardResult = await testDb.query(
      `SELECT
         (SELECT COUNT(*) FROM patient_profiles WHERE psychologist_id = $1) as total_patients,
         (SELECT COUNT(*) FROM sessions WHERE psychologist_id = $1 AND status = 'completed') as completed_sessions,
         (SELECT COUNT(*) FROM clinical_alerts WHERE psychologist_id = $1 AND is_active = true AND acknowledged_at IS NULL) as pending_alerts,
         (SELECT COUNT(*) FROM clinical_insights WHERE psychologist_id = $1 AND status = 'active') as active_insights,
         (SELECT COUNT(*) FROM therapeutic_goals WHERE psychologist_id = $1 AND status = 'active') as active_goals`,
      [psychologistId]
    )

    const dashboard = dashboardResult.rows[0]

    // ASSERTIONS
    expect(parseInt(dashboard.total_patients)).toBe(1)
    expect(parseInt(dashboard.completed_sessions)).toBe(1)
    expect(parseInt(dashboard.active_insights)).toBe(1)
    expect(parseInt(dashboard.active_goals)).toBe(1)

    // Verify psychologist can access patient's comprehensive data
    const patientDataResult = await testDb.query(
      `SELECT
         u.name,
         u.email,
         pp.emergency_contact,
         (SELECT COUNT(*) FROM diary_entries WHERE patient_id = u.id) as diary_count,
         (SELECT AVG(mood_rating) FROM diary_entries WHERE patient_id = u.id) as avg_mood,
         (SELECT COUNT(*) FROM sessions WHERE patient_id = u.id) as session_count
       FROM users u
       JOIN patient_profiles pp ON pp.user_id = u.id
       WHERE u.id = $1`,
      [patientId]
    )

    const patientData = patientDataResult.rows[0]
    expect(patientData.name).toBe('João Silva')
    expect(parseInt(patientData.diary_count)).toBe(3)
    expect(parseFloat(patientData.avg_mood)).toBeLessThan(4)
  })

  it('should manage multiple patients efficiently', async () => {
    // STEP 1: Setup psychologist
    const psychologistResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Dr. Multi Patient', 'multi@clinic.com', 'hashed', 'psychologist']
    )
    psychologistId = psychologistResult.rows[0].id

    await testDb.query(
      `INSERT INTO psychologist_profiles (user_id, crp, is_verified)
       VALUES ($1, $2, $3)`,
      [psychologistId, 'CRP-99999', true]
    )

    // STEP 2: Create multiple patients
    const patients = []
    for (let i = 1; i <= 5; i++) {
      const patientResult = await testDb.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [`Patient ${i}`, `patient${i}@test.com`, 'hashed', 'patient']
      )

      const patientId = patientResult.rows[0].id
      patients.push(patientId)

      await testDb.query(
        `INSERT INTO patient_profiles (user_id, psychologist_id, clinic_id)
         VALUES ($1, $2, $3)`,
        [patientId, psychologistId, clinicId]
      )

      // Schedule sessions for each patient
      await testDb.query(
        `INSERT INTO sessions (
          clinic_id, psychologist_id, patient_id,
          scheduled_at, duration, type, status
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          clinicId,
          psychologistId,
          patientId,
          new Date(`2024-12-2${i}T10:00:00Z`),
          50,
          'therapy',
          'scheduled'
        ]
      )
    }

    // STEP 3: Verify patient load
    const patientCountResult = await testDb.query(
      `SELECT COUNT(*) as count FROM patient_profiles
       WHERE psychologist_id = $1`,
      [psychologistId]
    )

    expect(parseInt(patientCountResult.rows[0].count)).toBe(5)

    // STEP 4: Check weekly schedule
    const scheduleResult = await testDb.query(
      `SELECT
         DATE(scheduled_at) as date,
         COUNT(*) as session_count
       FROM sessions
       WHERE psychologist_id = $1
       AND scheduled_at >= CURRENT_DATE
       GROUP BY DATE(scheduled_at)
       ORDER BY date`,
      [psychologistId]
    )

    expect(scheduleResult.rows.length).toBeGreaterThan(0)
  })
})
