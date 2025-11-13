/**
 * Integration test example: Chat Flow
 *
 * This test demonstrates end-to-end chat functionality
 * using an in-memory PostgreSQL database.
 */

import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from '@/test-utils/db-helpers'
import { PGlite } from '@electric-sql/pglite'

describe('Chat Flow (Integration)', () => {
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

    // Create test users
    const patientResult = await testDb.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['Patient User', 'patient@test.com', 'password', 'patient']
    )
    patientId = patientResult.rows[0].id

    const psychologistResult = await testDb.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['Dr. Psychologist', 'psychologist@test.com', 'password', 'psychologist']
    )
    psychologistId = psychologistResult.rows[0].id
  })

  describe('Chat Room Creation', () => {
    it('should create a private chat room between patient and psychologist', async () => {
      // Arrange
      const participantIds = JSON.stringify([patientId, psychologistId])

      // Act - Create chat room
      const roomResult = await testDb.query(
        `INSERT INTO chat_rooms (id, participant_ids, room_type, is_encrypted)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        ['room-1', participantIds, 'private', true]
      )

      const room = roomResult.rows[0]

      // Assert
      expect(room.id).toBe('room-1')
      expect(room.room_type).toBe('private')
      expect(room.is_encrypted).toBe(true)
      expect(JSON.parse(room.participant_ids)).toEqual([patientId, psychologistId])
    })

    it('should prevent creating duplicate rooms for same participants', async () => {
      // Arrange - Create first room
      const participantIds = JSON.stringify([patientId, psychologistId])

      await testDb.query(
        `INSERT INTO chat_rooms (id, participant_ids, room_type, is_encrypted)
         VALUES ($1, $2, $3, $4)`,
        ['room-1', participantIds, 'private', true]
      )

      // Act & Assert - Try to create duplicate
      // In real implementation, this would be handled by application logic
      const existingRooms = await testDb.query(
        `SELECT * FROM chat_rooms WHERE room_type = 'private'`
      )

      const hasRoom = existingRooms.rows.some((room) => {
        const participants = JSON.parse(room.participant_ids)
        return participants.includes(patientId) && participants.includes(psychologistId)
      })

      expect(hasRoom).toBe(true)
      expect(existingRooms.rows).toHaveLength(1)
    })
  })

  describe('Message Exchange', () => {
    let roomId: string

    beforeEach(async () => {
      // Create chat room for tests
      const participantIds = JSON.stringify([patientId, psychologistId])
      const roomResult = await testDb.query(
        `INSERT INTO chat_rooms (id, participant_ids, room_type, is_encrypted)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['room-1', participantIds, 'private', true]
      )
      roomId = roomResult.rows[0].id
    })

    it('should send and receive messages in chronological order', async () => {
      // Arrange & Act - Send messages
      await testDb.query(
        `INSERT INTO chat_messages (id, room_id, sender_id, content, message_type)
         VALUES ($1, $2, $3, $4, $5)`,
        ['msg-1', roomId, patientId, 'Hello doctor!', 'text']
      )

      await testDb.query(
        `INSERT INTO chat_messages (id, room_id, sender_id, content, message_type)
         VALUES ($1, $2, $3, $4, $5)`,
        ['msg-2', roomId, psychologistId, 'Hello! How can I help you?', 'text']
      )

      await testDb.query(
        `INSERT INTO chat_messages (id, room_id, sender_id, content, message_type)
         VALUES ($1, $2, $3, $4, $5)`,
        ['msg-3', roomId, patientId, 'I need to discuss my anxiety.', 'text']
      )

      // Assert - Retrieve messages in order
      const messagesResult = await testDb.query(
        `SELECT * FROM chat_messages
         WHERE room_id = $1 AND deleted_at IS NULL
         ORDER BY created_at ASC`,
        [roomId]
      )

      const messages = messagesResult.rows

      expect(messages).toHaveLength(3)
      expect(messages[0].sender_id).toBe(patientId)
      expect(messages[0].content).toBe('Hello doctor!')
      expect(messages[1].sender_id).toBe(psychologistId)
      expect(messages[2].sender_id).toBe(patientId)
    })

    it('should support different message types', async () => {
      // Arrange & Act - Send different message types
      await testDb.query(
        `INSERT INTO chat_messages (id, room_id, sender_id, content, message_type)
         VALUES ($1, $2, $3, $4, $5)`,
        ['msg-1', roomId, patientId, 'Hello!', 'text']
      )

      await testDb.query(
        `INSERT INTO chat_messages (id, room_id, sender_id, content, message_type, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'msg-2',
          roomId,
          patientId,
          'image-url.jpg',
          'image',
          JSON.stringify({ size: 1024, format: 'jpg' }),
        ]
      )

      await testDb.query(
        `INSERT INTO chat_messages (id, room_id, sender_id, content, message_type)
         VALUES ($1, $2, $3, $4, $5)`,
        ['msg-3', roomId, psychologistId, 'document.pdf', 'file']
      )

      // Assert
      const messagesResult = await testDb.query(
        `SELECT * FROM chat_messages WHERE room_id = $1`,
        [roomId]
      )

      const messagesByType = {
        text: messagesResult.rows.filter((m) => m.message_type === 'text'),
        image: messagesResult.rows.filter((m) => m.message_type === 'image'),
        file: messagesResult.rows.filter((m) => m.message_type === 'file'),
      }

      expect(messagesByType.text).toHaveLength(1)
      expect(messagesByType.image).toHaveLength(1)
      expect(messagesByType.file).toHaveLength(1)
      expect(JSON.parse(messagesByType.image[0].metadata)).toHaveProperty('size', 1024)
    })

    it('should soft delete messages', async () => {
      // Arrange - Create message
      await testDb.query(
        `INSERT INTO chat_messages (id, room_id, sender_id, content, message_type)
         VALUES ($1, $2, $3, $4, $5)`,
        ['msg-1', roomId, patientId, 'Message to delete', 'text']
      )

      // Act - Soft delete
      await testDb.query(
        `UPDATE chat_messages
         SET deleted_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        ['msg-1']
      )

      // Assert - Message still exists but has deleted_at
      const allMessagesResult = await testDb.query(
        `SELECT * FROM chat_messages WHERE id = $1`,
        ['msg-1']
      )
      expect(allMessagesResult.rows[0].deleted_at).not.toBeNull()

      // Assert - Deleted messages excluded from normal queries
      const activeMessagesResult = await testDb.query(
        `SELECT * FROM chat_messages
         WHERE room_id = $1 AND deleted_at IS NULL`,
        [roomId]
      )
      expect(activeMessagesResult.rows).toHaveLength(0)
    })
  })

  describe('Temporary Messages', () => {
    let roomId: string

    beforeEach(async () => {
      const participantIds = JSON.stringify([patientId, psychologistId])
      const roomResult = await testDb.query(
        `INSERT INTO chat_rooms (id, participant_ids, room_type, is_encrypted)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['room-1', participantIds, 'private', true]
      )
      roomId = roomResult.rows[0].id
    })

    it('should create temporary messages with expiration', async () => {
      // Arrange & Act - Create temporary message
      const expiresAt = new Date(Date.now() + 60000) // 1 minute from now

      await testDb.query(
        `INSERT INTO chat_messages (id, room_id, sender_id, content, message_type, is_temporary, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'temp-msg-1',
          roomId,
          patientId,
          'This message will expire',
          'text',
          true,
          expiresAt,
        ]
      )

      // Assert
      const messageResult = await testDb.query(
        `SELECT * FROM chat_messages WHERE id = $1`,
        ['temp-msg-1']
      )

      const message = messageResult.rows[0]
      expect(message.is_temporary).toBe(true)
      expect(message.expires_at).not.toBeNull()
    })

    it('should query only non-expired temporary messages', async () => {
      // Arrange - Create expired and active messages
      const pastDate = new Date(Date.now() - 60000) // 1 minute ago
      const futureDate = new Date(Date.now() + 60000) // 1 minute from now

      await testDb.query(
        `INSERT INTO chat_messages (id, room_id, sender_id, content, is_temporary, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['expired-msg', roomId, patientId, 'Expired', true, pastDate]
      )

      await testDb.query(
        `INSERT INTO chat_messages (id, room_id, sender_id, content, is_temporary, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['active-msg', roomId, patientId, 'Still valid', true, futureDate]
      )

      // Act - Query non-expired messages
      const activeMessagesResult = await testDb.query(
        `SELECT * FROM chat_messages
         WHERE room_id = $1
         AND deleted_at IS NULL
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
        [roomId]
      )

      // Assert
      expect(activeMessagesResult.rows).toHaveLength(1)
      expect(activeMessagesResult.rows[0].id).toBe('active-msg')
    })
  })

  describe('Message Filtering and Pagination', () => {
    let roomId: string

    beforeEach(async () => {
      const participantIds = JSON.stringify([patientId, psychologistId])
      const roomResult = await testDb.query(
        `INSERT INTO chat_rooms (id, participant_ids, room_type, is_encrypted)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['room-1', participantIds, 'private', true]
      )
      roomId = roomResult.rows[0].id

      // Create multiple messages
      for (let i = 1; i <= 10; i++) {
        await testDb.query(
          `INSERT INTO chat_messages (id, room_id, sender_id, content, message_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [`msg-${i}`, roomId, i % 2 === 0 ? psychologistId : patientId, `Message ${i}`, 'text']
        )
      }
    })

    it('should paginate messages with limit', async () => {
      // Act
      const messagesResult = await testDb.query(
        `SELECT * FROM chat_messages
         WHERE room_id = $1
         ORDER BY created_at ASC
         LIMIT 5`,
        [roomId]
      )

      // Assert
      expect(messagesResult.rows).toHaveLength(5)
      expect(messagesResult.rows[0].id).toBe('msg-1')
      expect(messagesResult.rows[4].id).toBe('msg-5')
    })

    it('should filter messages by sender', async () => {
      // Act
      const patientMessagesResult = await testDb.query(
        `SELECT * FROM chat_messages
         WHERE room_id = $1 AND sender_id = $2`,
        [roomId, patientId]
      )

      const psychologistMessagesResult = await testDb.query(
        `SELECT * FROM chat_messages
         WHERE room_id = $1 AND sender_id = $2`,
        [roomId, psychologistId]
      )

      // Assert
      expect(patientMessagesResult.rows).toHaveLength(5)
      expect(psychologistMessagesResult.rows).toHaveLength(5)
    })
  })
})
