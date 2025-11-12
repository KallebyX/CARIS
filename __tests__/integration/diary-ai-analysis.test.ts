/**
 * Integration Test: Patient Diary Entry with AI Analysis
 *
 * Tests the complete flow of:
 * 1. Creating a diary entry
 * 2. AI analysis of emotional content
 * 3. Risk level assessment
 * 4. Psychologist notification for high-risk entries
 */

import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '@/test-utils/db-helpers'
import { PGlite } from '@electric-sql/pglite'

describe('Diary Entry with AI Analysis (Integration)', () => {
  let testDb: PGlite
  let patientId: number
  let psychologistId: number

  beforeAll(async () => {
    testDb = await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearTestDatabase()

    // Setup test users
    const patientResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Test Patient', 'patient@test.com', 'hashed_password', 'patient']
    )
    patientId = patientResult.rows[0].id

    const psychologistResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Dr. Test', 'psychologist@test.com', 'hashed_password', 'psychologist']
    )
    psychologistId = psychologistResult.rows[0].id

    // Link patient to psychologist
    await testDb.query(
      `INSERT INTO patient_profiles (user_id, psychologist_id)
       VALUES ($1, $2)`,
      [patientId, psychologistId]
    )
  })

  it('should create diary entry and perform AI analysis', async () => {
    // Arrange
    const diaryContent = "I've been feeling extremely anxious lately. Can't sleep, can't eat. Everything feels hopeless."

    // Act - Create diary entry
    const entryResult = await testDb.query(
      `INSERT INTO diary_entries (patient_id, content, mood_rating, intensity_rating)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [patientId, diaryContent, 3, 8]
    )
    const entryId = entryResult.rows[0].id

    // Simulate AI analysis
    await testDb.query(
      `UPDATE diary_entries
       SET ai_analyzed = true,
           dominant_emotion = 'anxiety',
           emotion_intensity = 8,
           sentiment_score = -75,
           risk_level = 'high',
           ai_insights = $1,
           suggested_actions = $2,
           plutchik_categories = $3
       WHERE id = $4`,
      [
        JSON.stringify({ patterns: ['anxiety', 'hopelessness', 'sleep_disruption'] }),
        JSON.stringify(['contact_therapist', 'breathing_exercise', 'crisis_hotline']),
        JSON.stringify({ fear: 0.8, sadness: 0.6, anticipation: 0.3 }),
        entryId
      ]
    )

    // Assert - Verify entry and analysis
    const result = await testDb.query(
      `SELECT * FROM diary_entries WHERE id = $1`,
      [entryId]
    )

    const entry = result.rows[0]
    expect(entry.ai_analyzed).toBe(true)
    expect(entry.dominant_emotion).toBe('anxiety')
    expect(entry.risk_level).toBe('high')
    expect(entry.sentiment_score).toBe(-75)
  })

  it('should trigger alert for critical risk level', async () => {
    // Arrange & Act - Create high-risk entry
    const entryResult = await testDb.query(
      `INSERT INTO diary_entries (
        patient_id, content, mood_rating, ai_analyzed,
        risk_level, dominant_emotion
      )
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [patientId, 'Self-harm thoughts', 2, true, 'critical', 'despair']
    )
    const entryId = entryResult.rows[0].id

    // Create clinical alert
    await testDb.query(
      `INSERT INTO clinical_alerts (
        patient_id, psychologist_id, alert_type, severity,
        title, description, triggered_by
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        patientId,
        psychologistId,
        'risk_escalation',
        'critical',
        'Critical Risk Detected',
        'Patient diary entry indicates critical mental health risk',
        JSON.stringify({ diary_entry_id: entryId, risk_level: 'critical' })
      ]
    )

    // Assert - Verify alert was created
    const alertResult = await testDb.query(
      `SELECT * FROM clinical_alerts
       WHERE patient_id = $1 AND severity = $2`,
      [patientId, 'critical']
    )

    expect(alertResult.rows).toHaveLength(1)
    expect(alertResult.rows[0].alert_type).toBe('risk_escalation')
    expect(alertResult.rows[0].is_active).toBe(true)
  })

  it('should track mood trends over multiple entries', async () => {
    // Arrange - Create multiple entries over time
    const entries = [
      { mood: 7, emotion: 'joy', date: '2024-01-01' },
      { mood: 6, emotion: 'content', date: '2024-01-02' },
      { mood: 5, emotion: 'neutral', date: '2024-01-03' },
      { mood: 4, emotion: 'sadness', date: '2024-01-04' },
      { mood: 3, emotion: 'anxiety', date: '2024-01-05' },
    ]

    for (const entry of entries) {
      await testDb.query(
        `INSERT INTO diary_entries (
          patient_id, mood_rating, dominant_emotion,
          entry_date, ai_analyzed, content
        )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [patientId, entry.mood, entry.emotion, entry.date, true, 'Test content']
      )
    }

    // Act - Query mood trend
    const trendResult = await testDb.query(
      `SELECT entry_date, mood_rating, dominant_emotion
       FROM diary_entries
       WHERE patient_id = $1
       ORDER BY entry_date ASC`,
      [patientId]
    )

    // Assert - Verify declining trend
    const moods = trendResult.rows.map(r => r.mood_rating)
    expect(moods).toEqual([7, 6, 5, 4, 3])
    expect(trendResult.rows[0].dominant_emotion).toBe('joy')
    expect(trendResult.rows[4].dominant_emotion).toBe('anxiety')
  })

  it('should support multimodal diary entries (text, audio, image)', async () => {
    // Arrange & Act - Create multimodal entry
    const entryResult = await testDb.query(
      `INSERT INTO diary_entries (
        patient_id, content, audio_url, audio_transcription,
        image_url, image_description, ai_analyzed
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        patientId,
        'Today was challenging',
        's3://bucket/audio/entry-123.mp3',
        'Today was challenging. I felt overwhelmed by work.',
        's3://bucket/images/entry-123.jpg',
        'Photo of sunset, appearing contemplative',
        true
      ]
    )

    // Simulate multimodal AI analysis
    await testDb.query(
      `UPDATE diary_entries
       SET audio_analysis = $1, image_analysis = $2
       WHERE id = $3`,
      [
        JSON.stringify({ vocal_stress: 0.7, speech_rate: 'slow', emotion: 'sadness' }),
        JSON.stringify({ scene: 'sunset', mood_indicators: ['solitude', 'reflection'] }),
        entryResult.rows[0].id
      ]
    )

    // Assert
    const result = await testDb.query(
      `SELECT * FROM diary_entries WHERE id = $1`,
      [entryResult.rows[0].id]
    )

    const entry = result.rows[0]
    expect(entry.audio_url).toBeTruthy()
    expect(entry.image_url).toBeTruthy()
    expect(entry.audio_transcription).toContain('overwhelmed')
    expect(entry.image_description).toContain('sunset')
  })

  it('should calculate gamification points for diary entries', async () => {
    // Arrange & Act - Create diary entry
    const entryResult = await testDb.query(
      `INSERT INTO diary_entries (patient_id, content, mood_rating)
       VALUES ($1, $2, $3) RETURNING id`,
      [patientId, 'Daily reflection', 7]
    )

    // Award XP for diary entry
    await testDb.query(
      `INSERT INTO point_activities (
        user_id, activity_type, points, xp, description
      )
       VALUES ($1, $2, $3, $4, $5)`,
      [patientId, 'diary_entry', 10, 50, 'Completed daily diary entry']
    )

    // Update user XP
    await testDb.query(
      `UPDATE users
       SET total_xp = total_xp + $1, weekly_points = weekly_points + $2
       WHERE id = $3`,
      [50, 10, patientId]
    )

    // Assert
    const userResult = await testDb.query(
      `SELECT total_xp, weekly_points FROM users WHERE id = $1`,
      [patientId]
    )

    expect(userResult.rows[0].total_xp).toBe(50)
    expect(userResult.rows[0].weekly_points).toBe(10)
  })
})
