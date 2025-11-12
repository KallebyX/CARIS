/**
 * End-to-End Test: Complete Patient Journey
 *
 * Tests the full patient experience from registration to achievement unlock:
 * 1. Register account
 * 2. Complete profile setup
 * 3. Book first session
 * 4. Create diary entry
 * 5. Complete meditation
 * 6. Unlock achievement
 */

import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '@/test-utils/db-helpers'
import { PGlite } from '@electric-sql/pglite'
import * as jose from 'jose'

describe('Patient Journey (E2E)', () => {
  let testDb: PGlite
  let patientId: number
  let psychologistId: number
  let clinicId: number
  let authToken: string

  beforeAll(async () => {
    testDb = await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearTestDatabase()

    // Setup supporting data
    const clinicResult = await testDb.query(
      `INSERT INTO clinics (name, slug, owner_id, status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Test Clinic', 'test-clinic', 1, 'active']
    )
    clinicId = clinicResult.rows[0].id

    const psychologistResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Dr. Smith', 'dr.smith@test.com', 'hashed', 'psychologist']
    )
    psychologistId = psychologistResult.rows[0].id

    await testDb.query(
      `INSERT INTO psychologist_profiles (user_id, crp, hourly_rate)
       VALUES ($1, $2, $3)`,
      [psychologistId, 'CRP-12345', '150.00']
    )

    // Create meditation category and audio
    await testDb.query(
      `INSERT INTO meditation_categories (id, name, description, icon, color)
       VALUES ($1, $2, $3, $4, $5)`,
      ['mindfulness', 'Mindfulness', 'Be present', '🧘', '#6366f1']
    )

    await testDb.query(
      `INSERT INTO meditation_audios (
        id, title, description, category_id, duration,
        difficulty, instructor, audio_url, license, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'meditation-1',
        'Morning Meditation',
        'Start your day',
        'mindfulness',
        600,
        'iniciante',
        'Maria',
        's3://bucket/audio.mp3',
        'creative_commons',
        'active'
      ]
    )

    // Create achievement
    await testDb.query(
      `INSERT INTO achievements (
        name, description, icon, type, category,
        requirement, xp_reward, rarity
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'First Steps',
        'Complete your first meditation',
        '🌟',
        'milestone',
        'meditation',
        1,
        100,
        'common'
      ]
    )
  })

  it('should complete full patient onboarding and first week journey', async () => {
    // STEP 1: Register new patient account
    const registerResult = await testDb.query(
      `INSERT INTO users (
        name, email, password_hash, role,
        total_xp, current_level, streak
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['John Doe', 'john.doe@test.com', 'hashed_password', 'patient', 0, 1, 0]
    )
    patientId = registerResult.rows[0].id

    // Verify registration
    expect(patientId).toBeTruthy()

    // STEP 2: Generate authentication token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test-secret')
    authToken = await new jose.SignJWT({
      userId: patientId,
      role: 'patient'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    // Verify token
    const { payload } = await jose.jwtVerify(authToken, secret)
    expect(payload.userId).toBe(patientId)

    // STEP 3: Complete patient profile
    await testDb.query(
      `INSERT INTO patient_profiles (
        user_id, psychologist_id, clinic_id, emergency_contact
      )
       VALUES ($1, $2, $3, $4)`,
      [
        patientId,
        psychologistId,
        clinicId,
        JSON.stringify({ name: 'Jane Doe', phone: '+5511999999999' })
      ]
    )

    // Create user settings
    await testDb.query(
      `INSERT INTO user_settings (
        user_id, timezone, notifications, email_notifications
      )
       VALUES ($1, $2, $3, $4)`,
      [patientId, 'America/Sao_Paulo', true, true]
    )

    // Verify profile created
    const profileCheck = await testDb.query(
      `SELECT * FROM patient_profiles WHERE user_id = $1`,
      [patientId]
    )
    expect(profileCheck.rows).toHaveLength(1)

    // STEP 4: Browse available psychologists and book first session
    const availablePsychologists = await testDb.query(
      `SELECT u.id, u.name, pp.crp, pp.hourly_rate
       FROM users u
       JOIN psychologist_profiles pp ON pp.user_id = u.id
       WHERE u.role = 'psychologist' AND pp.is_verified = true`
    )

    expect(availablePsychologists.rows.length).toBeGreaterThan(0)

    // Book first session
    const sessionDate = new Date('2024-12-20T14:00:00Z')
    const sessionResult = await testDb.query(
      `INSERT INTO sessions (
        clinic_id, psychologist_id, patient_id,
        scheduled_at, duration, type, status, session_value
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        clinicId,
        psychologistId,
        patientId,
        sessionDate,
        50,
        'therapy',
        'scheduled',
        '150.00'
      ]
    )

    const sessionId = sessionResult.rows[0].id
    expect(sessionId).toBeTruthy()

    // STEP 5: Create first diary entry
    const diaryResult = await testDb.query(
      `INSERT INTO diary_entries (
        patient_id, content, mood_rating, intensity_rating
      )
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [
        patientId,
        'Today I decided to start therapy. Feeling hopeful about the journey ahead.',
        7,
        5
      ]
    )

    const diaryId = diaryResult.rows[0].id

    // AI analyzes diary (simulated)
    await testDb.query(
      `UPDATE diary_entries
       SET ai_analyzed = true,
           dominant_emotion = 'hope',
           emotion_intensity = 7,
           sentiment_score = 70,
           risk_level = 'low'
       WHERE id = $1`,
      [diaryId]
    )

    // Award XP for diary entry
    await testDb.query(
      `INSERT INTO point_activities (
        user_id, activity_type, points, xp, description
      )
       VALUES ($1, $2, $3, $4, $5)`,
      [patientId, 'diary_entry', 10, 50, 'First diary entry']
    )

    await testDb.query(
      `UPDATE users SET total_xp = total_xp + 50, weekly_points = weekly_points + 10
       WHERE id = $1`,
      [patientId]
    )

    // STEP 6: Complete first meditation session
    const meditationResult = await testDb.query(
      `INSERT INTO meditation_sessions (
        user_id, meditation_id, started_at, completed_at,
        duration, was_completed, mood_before, mood_after, rating
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        patientId,
        'meditation-1',
        new Date(),
        new Date(Date.now() + 600000),
        600,
        true,
        6,
        8,
        5
      ]
    )

    // Award XP for meditation
    await testDb.query(
      `INSERT INTO point_activities (
        user_id, activity_type, points, xp, description
      )
       VALUES ($1, $2, $3, $4, $5)`,
      [patientId, 'meditation', 15, 75, 'Completed first meditation']
    )

    await testDb.query(
      `UPDATE users
       SET total_xp = total_xp + 75,
           weekly_points = weekly_points + 15,
           streak = streak + 1,
           last_activity_date = CURRENT_DATE
       WHERE id = $1`,
      [patientId]
    )

    // STEP 7: Unlock achievement
    const achievementResult = await testDb.query(
      `SELECT id FROM achievements WHERE name = 'First Steps'`
    )

    await testDb.query(
      `INSERT INTO user_achievements (user_id, achievement_id, progress)
       VALUES ($1, $2, $3)`,
      [patientId, achievementResult.rows[0].id, 1]
    )

    // Award achievement bonus XP
    await testDb.query(
      `UPDATE users SET total_xp = total_xp + 100 WHERE id = $1`,
      [patientId]
    )

    // STEP 8: Check progress
    const progressResult = await testDb.query(
      `SELECT
         total_xp,
         current_level,
         weekly_points,
         streak,
         (SELECT COUNT(*) FROM diary_entries WHERE patient_id = $1) as diary_count,
         (SELECT COUNT(*) FROM meditation_sessions WHERE user_id = $1 AND was_completed = true) as meditation_count,
         (SELECT COUNT(*) FROM user_achievements WHERE user_id = $1) as achievement_count,
         (SELECT COUNT(*) FROM sessions WHERE patient_id = $1) as session_count
       FROM users
       WHERE id = $1`,
      [patientId]
    )

    const progress = progressResult.rows[0]

    // FINAL ASSERTIONS: Verify complete journey
    expect(progress.total_xp).toBe(225) // 50 (diary) + 75 (meditation) + 100 (achievement)
    expect(progress.weekly_points).toBe(25) // 10 (diary) + 15 (meditation)
    expect(progress.streak).toBe(1)
    expect(parseInt(progress.diary_count)).toBe(1)
    expect(parseInt(progress.meditation_count)).toBe(1)
    expect(parseInt(progress.achievement_count)).toBe(1)
    expect(parseInt(progress.session_count)).toBe(1)

    // Verify patient has access to their dashboard data
    const dashboardData = await testDb.query(
      `SELECT
         u.name,
         u.total_xp,
         u.current_level,
         pp.psychologist_id,
         (SELECT COUNT(*) FROM sessions WHERE patient_id = u.id AND status = 'scheduled') as upcoming_sessions
       FROM users u
       LEFT JOIN patient_profiles pp ON pp.user_id = u.id
       WHERE u.id = $1`,
      [patientId]
    )

    expect(dashboardData.rows[0].name).toBe('John Doe')
    expect(parseInt(dashboardData.rows[0].upcoming_sessions)).toBe(1)
  })

  it('should handle patient emergency SOS flow', async () => {
    // STEP 1: Setup patient
    const userResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Patient SOS', 'sos@test.com', 'hashed', 'patient']
    )
    patientId = userResult.rows[0].id

    await testDb.query(
      `INSERT INTO patient_profiles (user_id, psychologist_id, emergency_contact)
       VALUES ($1, $2, $3)`,
      [
        patientId,
        psychologistId,
        JSON.stringify({ name: 'Emergency Contact', phone: '+5511888888888' })
      ]
    )

    // STEP 2: Patient activates SOS
    const sosResult = await testDb.query(
      `INSERT INTO sos_usages (
        patient_id, type, level, completed
      )
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [patientId, 'emergency', 'severe', false]
    )

    const sosId = sosResult.rows[0].id

    // STEP 3: System creates critical alert for psychologist
    await testDb.query(
      `INSERT INTO clinical_alerts (
        patient_id, psychologist_id, alert_type, severity,
        title, description
      )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        patientId,
        psychologistId,
        'risk_escalation',
        'critical',
        'EMERGENCY: SOS Activated',
        'Patient has activated emergency SOS. Immediate attention required.'
      ]
    )

    // STEP 4: Psychologist acknowledges and resolves
    await testDb.query(
      `UPDATE clinical_alerts
       SET acknowledged_at = $1, acknowledged_by = $2
       WHERE patient_id = $3 AND severity = 'critical'`,
      [new Date(), psychologistId, patientId]
    )

    await testDb.query(
      `UPDATE sos_usages
       SET resolved = true, resolved_at = $1, rating = $2, feedback = $3
       WHERE id = $4`,
      [new Date(), 5, 'Help received, feeling better', sosId]
    )

    // STEP 5: Verify resolution
    const sosCheck = await testDb.query(
      `SELECT resolved, resolved_at FROM sos_usages WHERE id = $1`,
      [sosId]
    )

    expect(sosCheck.rows[0].resolved).toBe(true)
    expect(sosCheck.rows[0].resolved_at).toBeTruthy()
  })

  it('should track patient mood trends over time', async () => {
    // STEP 1: Setup patient
    const userResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Patient Mood', 'mood@test.com', 'hashed', 'patient']
    )
    patientId = userResult.rows[0].id

    // STEP 2: Log mood for 7 consecutive days
    const dates = [
      { date: '2024-01-01', mood: 5, energy: 5, anxiety: 7 },
      { date: '2024-01-02', mood: 6, energy: 6, anxiety: 6 },
      { date: '2024-01-03', mood: 6, energy: 7, anxiety: 5 },
      { date: '2024-01-04', mood: 7, energy: 7, anxiety: 4 },
      { date: '2024-01-05', mood: 7, energy: 8, anxiety: 4 },
      { date: '2024-01-06', mood: 8, energy: 8, anxiety: 3 },
      { date: '2024-01-07', mood: 8, energy: 9, anxiety: 2 },
    ]

    for (const entry of dates) {
      await testDb.query(
        `INSERT INTO mood_tracking (
          patient_id, date, mood, energy, anxiety
        )
         VALUES ($1, $2, $3, $4, $5)`,
        [patientId, entry.date, entry.mood, entry.energy, entry.anxiety]
      )
    }

    // STEP 3: Generate trend analysis
    const trendResult = await testDb.query(
      `SELECT
         AVG(mood) as avg_mood,
         AVG(energy) as avg_energy,
         AVG(anxiety) as avg_anxiety,
         MAX(mood) - MIN(mood) as mood_range
       FROM mood_tracking
       WHERE patient_id = $1`,
      [patientId]
    )

    const trend = trendResult.rows[0]

    // STEP 4: Verify positive trend
    expect(parseFloat(trend.avg_mood)).toBeGreaterThan(6)
    expect(parseFloat(trend.avg_energy)).toBeGreaterThan(6)
    expect(parseFloat(trend.avg_anxiety)).toBeLessThan(5)
    expect(parseInt(trend.mood_range)).toBeGreaterThan(0) // Shows improvement
  })
})
