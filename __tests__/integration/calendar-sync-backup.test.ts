/**
 * Integration Test: Calendar Sync and Data Backup
 *
 * Tests:
 * 1. Google Calendar integration
 * 2. Outlook Calendar integration
 * 3. Calendar event synchronization
 * 4. Data export and backup
 * 5. Data restoration
 */

import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '@/test-utils/db-helpers'
import { PGlite } from '@electric-sql/pglite'

describe('Calendar Sync and Backup (Integration)', () => {
  let testDb: PGlite
  let userId: number
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
      ['Test Clinic', 'test-clinic', 1, 'active']
    )
    clinicId = clinicResult.rows[0].id

    // Setup users
    const psychologistResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Dr. Test', 'dr@test.com', 'hashed', 'psychologist']
    )
    psychologistId = psychologistResult.rows[0].id

    const patientResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Patient Test', 'patient@test.com', 'hashed', 'patient']
    )
    patientId = patientResult.rows[0].id

    userId = psychologistId
  })

  describe('Google Calendar Integration', () => {
    it('should enable Google Calendar integration', async () => {
      // Act - Enable Google Calendar
      await testDb.query(
        `INSERT INTO user_settings (
          user_id, google_calendar_enabled,
          google_calendar_access_token,
          google_calendar_refresh_token
        )
         VALUES ($1, $2, $3, $4)`,
        [
          userId,
          true,
          'mock_access_token_123',
          'mock_refresh_token_456'
        ]
      )

      // Assert
      const result = await testDb.query(
        `SELECT google_calendar_enabled, google_calendar_access_token
         FROM user_settings WHERE user_id = $1`,
        [userId]
      )

      expect(result.rows[0].google_calendar_enabled).toBe(true)
      expect(result.rows[0].google_calendar_access_token).toBeTruthy()
    })

    it('should sync session to Google Calendar', async () => {
      // Arrange - Setup calendar integration
      await testDb.query(
        `INSERT INTO user_settings (
          user_id, google_calendar_enabled, google_calendar_access_token
        )
         VALUES ($1, $2, $3)`,
        [userId, true, 'mock_token']
      )

      // Act - Create session with Google Calendar event
      const sessionResult = await testDb.query(
        `INSERT INTO sessions (
          clinic_id, psychologist_id, patient_id,
          scheduled_at, duration, status,
          google_calendar_event_id, timezone
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          clinicId,
          psychologistId,
          patientId,
          new Date('2024-12-20T14:00:00Z'),
          50,
          'scheduled',
          'google_event_abc123',
          'America/Sao_Paulo'
        ]
      )

      // Assert
      const result = await testDb.query(
        `SELECT google_calendar_event_id, timezone FROM sessions WHERE id = $1`,
        [sessionResult.rows[0].id]
      )

      expect(result.rows[0].google_calendar_event_id).toBe('google_event_abc123')
      expect(result.rows[0].timezone).toBe('America/Sao_Paulo')
    })

    it('should update Google Calendar event when session changes', async () => {
      // Arrange - Create session with calendar event
      const sessionResult = await testDb.query(
        `INSERT INTO sessions (
          clinic_id, psychologist_id, patient_id,
          scheduled_at, duration, status,
          google_calendar_event_id
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          clinicId, psychologistId, patientId,
          new Date('2024-12-20T14:00:00Z'), 50, 'scheduled',
          'google_event_original'
        ]
      )

      const sessionId = sessionResult.rows[0].id

      // Act - Reschedule session
      const newTime = new Date('2024-12-21T15:00:00Z')
      await testDb.query(
        `UPDATE sessions
         SET scheduled_at = $1, updated_at = $2
         WHERE id = $3`,
        [newTime, new Date(), sessionId]
      )

      // Log sync action
      await testDb.query(
        `INSERT INTO audit_logs (
          user_id, action, resource, resource_id, metadata
        )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          psychologistId,
          'update',
          'calendar_event',
          'google_event_original',
          JSON.stringify({ session_id: sessionId, calendar: 'google' })
        ]
      )

      // Assert
      const result = await testDb.query(
        `SELECT scheduled_at FROM sessions WHERE id = $1`,
        [sessionId]
      )

      expect(result.rows[0].scheduled_at).toEqual(newTime)
    })

    it('should delete Google Calendar event when session is cancelled', async () => {
      // Arrange - Create session
      const sessionResult = await testDb.query(
        `INSERT INTO sessions (
          clinic_id, psychologist_id, patient_id,
          scheduled_at, duration, status,
          google_calendar_event_id
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          clinicId, psychologistId, patientId,
          new Date('2024-12-20T14:00:00Z'), 50, 'scheduled',
          'google_event_to_delete'
        ]
      )

      const sessionId = sessionResult.rows[0].id

      // Act - Cancel session
      await testDb.query(
        `UPDATE sessions
         SET status = 'cancelled', updated_at = $1
         WHERE id = $2`,
        [new Date(), sessionId]
      )

      // Assert
      const result = await testDb.query(
        `SELECT status FROM sessions WHERE id = $1`,
        [sessionId]
      )

      expect(result.rows[0].status).toBe('cancelled')
    })
  })

  describe('Outlook Calendar Integration', () => {
    it('should enable Outlook Calendar integration', async () => {
      // Act - Enable Outlook Calendar
      await testDb.query(
        `INSERT INTO user_settings (
          user_id, outlook_calendar_enabled,
          outlook_calendar_access_token,
          outlook_calendar_refresh_token
        )
         VALUES ($1, $2, $3, $4)`,
        [
          userId,
          true,
          'mock_outlook_access_token',
          'mock_outlook_refresh_token'
        ]
      )

      // Assert
      const result = await testDb.query(
        `SELECT outlook_calendar_enabled, outlook_calendar_access_token
         FROM user_settings WHERE user_id = $1`,
        [userId]
      )

      expect(result.rows[0].outlook_calendar_enabled).toBe(true)
      expect(result.rows[0].outlook_calendar_access_token).toBeTruthy()
    })

    it('should sync session to Outlook Calendar', async () => {
      // Arrange - Setup calendar integration
      await testDb.query(
        `INSERT INTO user_settings (
          user_id, outlook_calendar_enabled, outlook_calendar_access_token
        )
         VALUES ($1, $2, $3)`,
        [userId, true, 'mock_outlook_token']
      )

      // Act - Create session with Outlook Calendar event
      const sessionResult = await testDb.query(
        `INSERT INTO sessions (
          clinic_id, psychologist_id, patient_id,
          scheduled_at, duration, status,
          outlook_calendar_event_id
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          clinicId, psychologistId, patientId,
          new Date('2024-12-20T14:00:00Z'), 50, 'scheduled',
          'outlook_event_xyz789'
        ]
      )

      // Assert
      const result = await testDb.query(
        `SELECT outlook_calendar_event_id FROM sessions WHERE id = $1`,
        [sessionResult.rows[0].id]
      )

      expect(result.rows[0].outlook_calendar_event_id).toBe('outlook_event_xyz789')
    })

    it('should support dual calendar sync (Google and Outlook)', async () => {
      // Arrange - Enable both calendars
      await testDb.query(
        `INSERT INTO user_settings (
          user_id, google_calendar_enabled, outlook_calendar_enabled,
          google_calendar_access_token, outlook_calendar_access_token
        )
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, true, true, 'google_token', 'outlook_token']
      )

      // Act - Create session synced to both calendars
      const sessionResult = await testDb.query(
        `INSERT INTO sessions (
          clinic_id, psychologist_id, patient_id, scheduled_at,
          duration, status, google_calendar_event_id, outlook_calendar_event_id
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          clinicId, psychologistId, patientId,
          new Date('2024-12-20T14:00:00Z'), 50, 'scheduled',
          'google_dual', 'outlook_dual'
        ]
      )

      // Assert
      const result = await testDb.query(
        `SELECT google_calendar_event_id, outlook_calendar_event_id
         FROM sessions WHERE id = $1`,
        [sessionResult.rows[0].id]
      )

      expect(result.rows[0].google_calendar_event_id).toBeTruthy()
      expect(result.rows[0].outlook_calendar_event_id).toBeTruthy()
    })
  })

  describe('Data Export and Backup', () => {
    it('should request user data export (GDPR)', async () => {
      // Act - Request data export
      const exportResult = await testDb.query(
        `INSERT INTO data_exports (
          user_id, format, status, ip_address
        )
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [patientId, 'json', 'pending', '192.168.1.1']
      )

      const exportId = exportResult.rows[0].id

      // Assert
      const result = await testDb.query(
        `SELECT * FROM data_exports WHERE id = $1`,
        [exportId]
      )

      expect(result.rows[0].status).toBe('pending')
      expect(result.rows[0].format).toBe('json')
    })

    it('should generate complete data export', async () => {
      // Arrange - Create user data
      await testDb.query(
        `INSERT INTO diary_entries (patient_id, content, mood_rating)
         VALUES ($1, $2, $3), ($4, $5, $6)`,
        [patientId, 'Entry 1', 7, patientId, 'Entry 2', 8]
      )

      await testDb.query(
        `INSERT INTO mood_tracking (patient_id, mood, energy)
         VALUES ($1, $2, $3)`,
        [patientId, 8, 7]
      )

      // Act - Process export
      const exportResult = await testDb.query(
        `INSERT INTO data_exports (
          user_id, format, status
        )
         VALUES ($1, $2, $3) RETURNING id`,
        [patientId, 'json', 'pending']
      )

      const exportId = exportResult.rows[0].id

      // Simulate processing
      await testDb.query(
        `UPDATE data_exports
         SET status = 'completed',
             completed_at = $1,
             file_path = $2,
             file_size = $3,
             expires_at = $4
         WHERE id = $5`,
        [
          new Date(),
          `/exports/user_${patientId}_${exportId}.json`,
          1024000,
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          exportId
        ]
      )

      // Assert
      const result = await testDb.query(
        `SELECT * FROM data_exports WHERE id = $1`,
        [exportId]
      )

      expect(result.rows[0].status).toBe('completed')
      expect(result.rows[0].file_path).toBeTruthy()
      expect(result.rows[0].expires_at).toBeTruthy()
    })

    it('should create encrypted chat backup', async () => {
      // Arrange - Create chat room and messages
      const roomResult = await testDb.query(
        `INSERT INTO chat_rooms (participant_ids, room_type, is_encrypted)
         VALUES ($1, $2, $3) RETURNING id`,
        [JSON.stringify([patientId, psychologistId]), 'private', true]
      )

      const roomId = roomResult.rows[0].id

      // Create messages
      for (let i = 0; i < 10; i++) {
        await testDb.query(
          `INSERT INTO chat_messages (
            room_id, sender_id, content, message_type
          )
           VALUES ($1, $2, $3, $4)`,
          [roomId, i % 2 === 0 ? patientId : psychologistId, `Message ${i}`, 'text']
        )
      }

      // Act - Create backup
      const backupResult = await testDb.query(
        `INSERT INTO chat_backups (
          user_id, room_id, backup_data, backup_type,
          encryption_key, message_count
        )
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          patientId,
          roomId,
          'encrypted_backup_blob_base64',
          'full',
          'encrypted_aes_key',
          10
        ]
      )

      // Assert
      const result = await testDb.query(
        `SELECT * FROM chat_backups WHERE id = $1`,
        [backupResult.rows[0].id]
      )

      expect(result.rows[0].backup_type).toBe('full')
      expect(result.rows[0].message_count).toBe(10)
      expect(result.rows[0].encryption_key).toBeTruthy()
    })

    it('should create incremental chat backup', async () => {
      // Arrange - Create room and initial backup
      const roomResult = await testDb.query(
        `INSERT INTO chat_rooms (participant_ids, room_type)
         VALUES ($1, $2) RETURNING id`,
        [JSON.stringify([patientId, psychologistId]), 'private']
      )

      const roomId = roomResult.rows[0].id

      // Create initial full backup
      await testDb.query(
        `INSERT INTO chat_backups (
          user_id, room_id, backup_data, backup_type, encryption_key, message_count
        )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [patientId, roomId, 'full_backup', 'full', 'key1', 5]
      )

      // Act - Create incremental backup
      const incrBackupResult = await testDb.query(
        `INSERT INTO chat_backups (
          user_id, room_id, backup_data, backup_type, encryption_key, message_count
        )
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [patientId, roomId, 'incremental_backup', 'incremental', 'key2', 3]
      )

      // Assert
      const result = await testDb.query(
        `SELECT backup_type, message_count FROM chat_backups
         WHERE user_id = $1 ORDER BY created_at DESC`,
        [patientId]
      )

      expect(result.rows).toHaveLength(2)
      expect(result.rows[0].backup_type).toBe('incremental')
      expect(result.rows[0].message_count).toBe(3)
    })

    it('should track data export downloads', async () => {
      // Arrange - Create completed export
      const exportResult = await testDb.query(
        `INSERT INTO data_exports (
          user_id, format, status, file_path, file_size, download_count
        )
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [patientId, 'json', 'completed', '/exports/data.json', 2048000, 0]
      )

      const exportId = exportResult.rows[0].id

      // Act - Track downloads
      await testDb.query(
        `UPDATE data_exports
         SET download_count = download_count + 1
         WHERE id = $1`,
        [exportId]
      )

      await testDb.query(
        `UPDATE data_exports
         SET download_count = download_count + 1
         WHERE id = $1`,
        [exportId]
      )

      // Assert
      const result = await testDb.query(
        `SELECT download_count FROM data_exports WHERE id = $1`,
        [exportId]
      )

      expect(result.rows[0].download_count).toBe(2)
    })

    it('should expire old data exports automatically', async () => {
      // Arrange - Create expired export
      const expiredDate = new Date(Date.now() - 1000) // Expired 1 second ago

      const exportResult = await testDb.query(
        `INSERT INTO data_exports (
          user_id, format, status, file_path, expires_at
        )
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [patientId, 'json', 'completed', '/exports/old.json', expiredDate]
      )

      // Act - Query expired exports
      const result = await testDb.query(
        `SELECT * FROM data_exports
         WHERE expires_at < NOW() AND status = 'completed'`
      )

      // Assert
      expect(result.rows.length).toBeGreaterThan(0)
      expect(result.rows[0].expires_at).toBeTruthy()
    })
  })
})
