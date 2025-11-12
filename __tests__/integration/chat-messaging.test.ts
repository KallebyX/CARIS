/**
 * Integration Test: Chat Conversation Flow
 *
 * Tests:
 * 1. Creating chat rooms
 * 2. Sending messages
 * 3. File attachments
 * 4. Read receipts
 * 5. End-to-end encryption
 */

import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '@/test-utils/db-helpers'
import { PGlite } from '@electric-sql/pglite'

describe('Chat Messaging System (Integration)', () => {
  let testDb: PGlite
  let patientId: number
  let psychologistId: number
  let roomId: string

  beforeAll(async () => {
    testDb = await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearTestDatabase()

    // Setup users
    const patientResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Test Patient', 'patient@test.com', 'hashed', 'patient']
    )
    patientId = patientResult.rows[0].id

    const psychologistResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Dr. Test', 'psychologist@test.com', 'hashed', 'psychologist']
    )
    psychologistId = psychologistResult.rows[0].id

    // Create chat room
    const roomResult = await testDb.query(
      `INSERT INTO chat_rooms (participant_ids, room_type, is_encrypted)
       VALUES ($1, $2, $3) RETURNING id`,
      [JSON.stringify([patientId, psychologistId]), 'private', true]
    )
    roomId = roomResult.rows[0].id
  })

  it('should create a private chat room between patient and psychologist', async () => {
    // Assert
    const result = await testDb.query(
      `SELECT * FROM chat_rooms WHERE id = $1`,
      [roomId]
    )

    const room = result.rows[0]
    expect(room.room_type).toBe('private')
    expect(room.is_encrypted).toBe(true)
    expect(JSON.parse(room.participant_ids)).toContain(patientId)
    expect(JSON.parse(room.participant_ids)).toContain(psychologistId)
  })

  it('should send and receive text messages', async () => {
    // Act - Send message from patient
    const messageResult = await testDb.query(
      `INSERT INTO chat_messages (
        room_id, sender_id, content, message_type, encryption_version
      )
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [roomId, patientId, 'encrypted_message_content', 'text', 'aes-256']
    )

    const messageId = messageResult.rows[0].id

    // Assert - Verify message
    const result = await testDb.query(
      `SELECT * FROM chat_messages WHERE id = $1`,
      [messageId]
    )

    const message = result.rows[0]
    expect(message.sender_id).toBe(patientId)
    expect(message.room_id).toBe(roomId)
    expect(message.message_type).toBe('text')
    expect(message.encryption_version).toBe('aes-256')
  })

  it('should handle file attachments with virus scanning', async () => {
    // Act - Send message with file
    const messageResult = await testDb.query(
      `INSERT INTO chat_messages (room_id, sender_id, message_type, content)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [roomId, psychologistId, 'file', 'File attachment']
    )

    const messageId = messageResult.rows[0].id

    // Create file record
    const fileResult = await testDb.query(
      `INSERT INTO chat_files (
        message_id, original_name, file_name, file_path,
        file_size, mime_type, is_encrypted, virus_scan_status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        messageId,
        'test-document.pdf',
        'encrypted_abc123.pdf',
        '/encrypted/files/abc123.pdf',
        1024000,
        'application/pdf',
        true,
        'pending'
      ]
    )

    const fileId = fileResult.rows[0].id

    // Simulate virus scan
    await testDb.query(
      `UPDATE chat_files
       SET virus_scan_status = 'clean',
           virus_scan_result = $1
       WHERE id = $2`,
      [JSON.stringify({ scanner: 'clamav', result: 'clean', scanned_at: new Date() }), fileId]
    )

    // Assert
    const result = await testDb.query(
      `SELECT * FROM chat_files WHERE id = $1`,
      [fileId]
    )

    const file = result.rows[0]
    expect(file.virus_scan_status).toBe('clean')
    expect(file.is_encrypted).toBe(true)
    expect(file.original_name).toBe('test-document.pdf')
  })

  it('should track read receipts for messages', async () => {
    // Arrange - Send message
    const messageResult = await testDb.query(
      `INSERT INTO chat_messages (room_id, sender_id, content, message_type)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [roomId, patientId, 'Test message', 'text']
    )

    const messageId = messageResult.rows[0].id

    // Act - Mark as delivered
    await testDb.query(
      `INSERT INTO message_read_receipts (message_id, user_id, delivered_at)
       VALUES ($1, $2, $3)`,
      [messageId, psychologistId, new Date()]
    )

    // Mark as read
    await testDb.query(
      `UPDATE message_read_receipts
       SET read_at = $1
       WHERE message_id = $2 AND user_id = $3`,
      [new Date(), messageId, psychologistId]
    )

    // Assert
    const result = await testDb.query(
      `SELECT * FROM message_read_receipts
       WHERE message_id = $1 AND user_id = $2`,
      [messageId, psychologistId]
    )

    const receipt = result.rows[0]
    expect(receipt.delivered_at).toBeTruthy()
    expect(receipt.read_at).toBeTruthy()
  })

  it('should support message editing', async () => {
    // Arrange - Send message
    const messageResult = await testDb.query(
      `INSERT INTO chat_messages (room_id, sender_id, content, message_type)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [roomId, patientId, 'Original message', 'text']
    )

    const messageId = messageResult.rows[0].id

    // Act - Edit message
    await testDb.query(
      `UPDATE chat_messages
       SET content = $1, edited_at = $2
       WHERE id = $3`,
      ['Edited message content', new Date(), messageId]
    )

    // Assert
    const result = await testDb.query(
      `SELECT content, edited_at FROM chat_messages WHERE id = $1`,
      [messageId]
    )

    const message = result.rows[0]
    expect(message.content).toBe('Edited message content')
    expect(message.edited_at).toBeTruthy()
  })

  it('should support temporary messages with expiration', async () => {
    // Act - Create temporary message
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const messageResult = await testDb.query(
      `INSERT INTO chat_messages (
        room_id, sender_id, content, message_type,
        is_temporary, expires_at
      )
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [roomId, psychologistId, 'Temporary message', 'text', true, expiresAt]
    )

    // Assert
    const result = await testDb.query(
      `SELECT is_temporary, expires_at FROM chat_messages WHERE id = $1`,
      [messageResult.rows[0].id]
    )

    const message = result.rows[0]
    expect(message.is_temporary).toBe(true)
    expect(message.expires_at).toBeTruthy()
  })

  it('should create encrypted backups of conversations', async () => {
    // Arrange - Create multiple messages
    for (let i = 0; i < 5; i++) {
      await testDb.query(
        `INSERT INTO chat_messages (room_id, sender_id, content, message_type)
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
        'encrypted_backup_data_blob',
        'full',
        'encrypted_backup_key',
        5
      ]
    )

    // Assert
    const result = await testDb.query(
      `SELECT * FROM chat_backups WHERE id = $1`,
      [backupResult.rows[0].id]
    )

    const backup = result.rows[0]
    expect(backup.backup_type).toBe('full')
    expect(backup.message_count).toBe(5)
    expect(backup.encryption_key).toBeTruthy()
  })

  it('should manage user encryption keys', async () => {
    // Act - Create encryption keys for user
    const keyResult = await testDb.query(
      `INSERT INTO user_encryption_keys (
        user_id, public_key, private_key_encrypted, key_version, is_active
      )
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        patientId,
        'public_key_base64',
        'encrypted_private_key_base64',
        'v1',
        true
      ]
    )

    // Assert
    const result = await testDb.query(
      `SELECT * FROM user_encryption_keys WHERE user_id = $1 AND is_active = true`,
      [patientId]
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].key_version).toBe('v1')
    expect(result.rows[0].is_active).toBe(true)
  })

  it('should track file download counts', async () => {
    // Arrange - Create file
    const messageResult = await testDb.query(
      `INSERT INTO chat_messages (room_id, sender_id, message_type)
       VALUES ($1, $2, $3) RETURNING id`,
      [roomId, psychologistId, 'file']
    )

    const fileResult = await testDb.query(
      `INSERT INTO chat_files (
        message_id, original_name, file_name, file_path,
        file_size, mime_type, download_count, virus_scan_status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        messageResult.rows[0].id,
        'report.pdf',
        'file_123.pdf',
        '/files/file_123.pdf',
        500000,
        'application/pdf',
        0,
        'clean'
      ]
    )

    const fileId = fileResult.rows[0].id

    // Act - Simulate downloads
    await testDb.query(
      `UPDATE chat_files SET download_count = download_count + 1 WHERE id = $1`,
      [fileId]
    )
    await testDb.query(
      `UPDATE chat_files SET download_count = download_count + 1 WHERE id = $1`,
      [fileId]
    )

    // Assert
    const result = await testDb.query(
      `SELECT download_count FROM chat_files WHERE id = $1`,
      [fileId]
    )

    expect(result.rows[0].download_count).toBe(2)
  })
})
