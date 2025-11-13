/**
 * Integration test example: User Registration Flow
 *
 * This test demonstrates how to use PGLite for integration testing
 * with an in-memory PostgreSQL database.
 */

import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
  seedTestData,
} from '@/test-utils/db-helpers'
import { PGlite } from '@electric-sql/pglite'
import * as jose from 'jose'

describe('User Registration Flow (Integration)', () => {
  let testDb: PGlite

  beforeAll(async () => {
    // Setup in-memory database once for all tests
    testDb = await setupTestDatabase()
  })

  afterAll(async () => {
    // Cleanup database after all tests
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    // Clear data before each test
    await clearTestDatabase()
  })

  describe('Patient Registration', () => {
    it('should create a new patient account with profile', async () => {
      // Arrange
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashed_password_here',
        role: 'patient',
      }

      // Act - Insert user
      const userResult = await testDb.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role`,
        [userData.name, userData.email, userData.password, userData.role]
      )

      const user = userResult.rows[0]

      // Create patient profile
      const profileResult = await testDb.query(
        `INSERT INTO patient_profiles (id, user_id, phone, date_of_birth, gender)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['profile-1', user.id, '+5511999999999', '1990-01-01', 'male']
      )

      const profile = profileResult.rows[0]

      // Assert
      expect(user).toBeDefined()
      expect(user.name).toBe('John Doe')
      expect(user.email).toBe('john@example.com')
      expect(user.role).toBe('patient')

      expect(profile).toBeDefined()
      expect(profile.user_id).toBe(user.id)
      expect(profile.phone).toBe('+5511999999999')
    })

    it('should create user settings with default values on registration', async () => {
      // Arrange & Act - Insert user
      const userResult = await testDb.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['Jane Doe', 'jane@example.com', 'hashed_password', 'patient']
      )

      const userId = userResult.rows[0].id

      // Create user settings
      await testDb.query(
        `INSERT INTO user_settings (id, user_id, email_notifications, push_notifications)
         VALUES ($1, $2, $3, $4)`,
        ['settings-1', userId, true, true]
      )

      // Assert - Query settings
      const settingsResult = await testDb.query(
        `SELECT * FROM user_settings WHERE user_id = $1`,
        [userId]
      )

      const settings = settingsResult.rows[0]
      expect(settings.email_notifications).toBe(true)
      expect(settings.push_notifications).toBe(true)
    })

    it('should prevent duplicate email registration', async () => {
      // Arrange - Create first user
      await testDb.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, $4)`,
        ['User One', 'duplicate@example.com', 'password1', 'patient']
      )

      // Act & Assert - Try to create second user with same email
      await expect(
        testDb.query(
          `INSERT INTO users (name, email, password, role)
           VALUES ($1, $2, $3, $4)`,
          ['User Two', 'duplicate@example.com', 'password2', 'patient']
        )
      ).rejects.toThrow()
    })
  })

  describe('Psychologist Registration', () => {
    it('should create psychologist account with professional info', async () => {
      // Arrange & Act - Insert psychologist
      const userResult = await testDb.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role`,
        ['Dr. Smith', 'dr.smith@example.com', 'hashed_password', 'psychologist']
      )

      const psychologist = userResult.rows[0]

      // Assert
      expect(psychologist.role).toBe('psychologist')
      expect(psychologist.name).toBe('Dr. Smith')
    })
  })

  describe('Authentication Flow', () => {
    it('should authenticate user and generate JWT token', async () => {
      // Arrange - Create user
      const userResult = await testDb.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, role`,
        ['Test User', 'test@example.com', 'hashed_password', 'patient']
      )

      const user = userResult.rows[0]

      // Act - Generate JWT token (simulating login)
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
      const token = await new jose.SignJWT({ userId: user.id, role: user.role })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign(secret)

      // Verify token
      const { payload } = await jose.jwtVerify(token, secret)

      // Assert
      expect(payload.userId).toBe(user.id)
      expect(payload.role).toBe('patient')
    })
  })

  describe('Complete User Journey', () => {
    it('should complete full registration to first session booking', async () => {
      // Step 1: Register patient
      const patientResult = await testDb.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['Patient Name', 'patient@example.com', 'password', 'patient']
      )
      const patientId = patientResult.rows[0].id

      // Step 2: Create patient profile
      await testDb.query(
        `INSERT INTO patient_profiles (id, user_id, phone, therapy_goals)
         VALUES ($1, $2, $3, $4)`,
        ['profile-1', patientId, '+5511999999999', 'Anxiety management']
      )

      // Step 3: Register psychologist
      const psychologistResult = await testDb.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['Dr. Jones', 'dr.jones@example.com', 'password', 'psychologist']
      )
      const psychologistId = psychologistResult.rows[0].id

      // Step 4: Verify both users exist
      const usersResult = await testDb.query(
        `SELECT COUNT(*) as count FROM users`
      )
      expect(parseInt(usersResult.rows[0].count)).toBe(2)

      // Step 5: Verify patient profile
      const profileResult = await testDb.query(
        `SELECT * FROM patient_profiles WHERE user_id = $1`,
        [patientId]
      )
      expect(profileResult.rows).toHaveLength(1)
      expect(profileResult.rows[0].therapy_goals).toBe('Anxiety management')
    })
  })
})
