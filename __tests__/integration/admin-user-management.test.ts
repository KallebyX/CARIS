/**
 * Integration Test: Admin User Management
 *
 * Tests:
 * 1. User CRUD operations
 * 2. Role management
 * 3. Clinic management
 * 4. Audit logging
 * 5. System statistics
 * 6. Financial reports
 */

import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '@/test-utils/db-helpers'
import { PGlite } from '@electric-sql/pglite'

describe('Admin User Management (Integration)', () => {
  let testDb: PGlite
  let adminId: number
  let clinicId: number

  beforeAll(async () => {
    testDb = await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearTestDatabase()

    // Setup admin user
    const adminResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role, is_global_admin)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['Admin User', 'admin@test.com', 'hashed', 'admin', true]
    )
    adminId = adminResult.rows[0].id

    // Setup test clinic
    const clinicResult = await testDb.query(
      `INSERT INTO clinics (
        name, slug, description, owner_id, status, plan_type,
        max_users, max_psychologists, max_patients
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        'Test Clinic',
        'test-clinic',
        'A test clinic for integration tests',
        adminId,
        'active',
        'professional',
        50,
        10,
        100
      ]
    )
    clinicId = clinicResult.rows[0].id
  })

  it('should list all users with filtering', async () => {
    // Arrange - Create multiple users
    await testDb.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES
         ($1, $2, $3, $4, $5),
         ($6, $7, $8, $9, $10),
         ($11, $12, $13, $14, $15)`,
      [
        'Patient One', 'patient1@test.com', 'hashed', 'patient', 'active',
        'Patient Two', 'patient2@test.com', 'hashed', 'patient', 'active',
        'Dr. Smith', 'psychologist@test.com', 'hashed', 'psychologist', 'active'
      ]
    )

    // Act - Query users by role
    const result = await testDb.query(
      `SELECT COUNT(*) as count FROM users WHERE role = $1`,
      ['patient']
    )

    // Assert
    expect(parseInt(result.rows[0].count)).toBe(2)
  })

  it('should create a new user and profile', async () => {
    // Act - Create psychologist
    const userResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Dr. New', 'dr.new@test.com', 'hashed', 'psychologist']
    )

    const userId = userResult.rows[0].id

    // Create psychologist profile
    await testDb.query(
      `INSERT INTO psychologist_profiles (
        user_id, crp, bio, specialties, hourly_rate
      )
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        'CRP-12345',
        'Experienced clinical psychologist',
        JSON.stringify(['CBT', 'Anxiety', 'Depression']),
        '200.00'
      ]
    )

    // Assert
    const result = await testDb.query(
      `SELECT u.*, pp.crp, pp.bio
       FROM users u
       JOIN psychologist_profiles pp ON pp.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].role).toBe('psychologist')
    expect(result.rows[0].crp).toBe('CRP-12345')
  })

  it('should suspend and reactivate user accounts', async () => {
    // Arrange - Create user
    const userResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['Test User', 'user@test.com', 'hashed', 'patient', 'active']
    )

    const userId = userResult.rows[0].id

    // Act - Suspend user
    await testDb.query(
      `UPDATE users SET status = 'suspended' WHERE id = $1`,
      [userId]
    )

    // Log action
    await testDb.query(
      `INSERT INTO audit_logs (
        user_id, action, resource, resource_id, metadata
      )
       VALUES ($1, $2, $3, $4, $5)`,
      [
        adminId,
        'update',
        'user',
        userId.toString(),
        JSON.stringify({ status_changed: 'active → suspended', reason: 'Admin action' })
      ]
    )

    // Assert
    const suspendResult = await testDb.query(
      `SELECT status FROM users WHERE id = $1`,
      [userId]
    )

    expect(suspendResult.rows[0].status).toBe('suspended')

    // Act - Reactivate
    await testDb.query(
      `UPDATE users SET status = 'active' WHERE id = $1`,
      [userId]
    )

    const activeResult = await testDb.query(
      `SELECT status FROM users WHERE id = $1`,
      [userId]
    )

    expect(activeResult.rows[0].status).toBe('active')
  })

  it('should manage clinic memberships', async () => {
    // Arrange - Create psychologist and patient
    const psychologistResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Dr. Clinic', 'dr.clinic@test.com', 'hashed', 'psychologist']
    )

    const patientResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Patient Clinic', 'patient.clinic@test.com', 'hashed', 'patient']
    )

    // Act - Add users to clinic
    await testDb.query(
      `INSERT INTO clinic_users (clinic_id, user_id, role, status)
       VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
      [
        clinicId, psychologistResult.rows[0].id, 'psychologist', 'active',
        clinicId, patientResult.rows[0].id, 'patient', 'active'
      ]
    )

    // Assert
    const result = await testDb.query(
      `SELECT COUNT(*) as count FROM clinic_users WHERE clinic_id = $1`,
      [clinicId]
    )

    expect(parseInt(result.rows[0].count)).toBe(2)
  })

  it('should track audit logs for sensitive operations', async () => {
    // Act - Perform multiple auditable actions
    const actions = [
      { action: 'login', resource: 'auth', userId: adminId },
      { action: 'export', resource: 'patient_data', userId: adminId },
      { action: 'delete', resource: 'session', userId: adminId },
    ]

    for (const log of actions) {
      await testDb.query(
        `INSERT INTO audit_logs (
          user_id, action, resource, ip_address, user_agent, severity
        )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          log.userId,
          log.action,
          log.resource,
          '192.168.1.1',
          'Mozilla/5.0',
          log.action === 'delete' ? 'warning' : 'info'
        ]
      )
    }

    // Assert
    const result = await testDb.query(
      `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC`,
      [adminId]
    )

    expect(result.rows.length).toBeGreaterThanOrEqual(3)
    expect(result.rows[0].action).toBe('delete')
    expect(result.rows[0].severity).toBe('warning')
  })

  it('should generate system statistics dashboard', async () => {
    // Arrange - Create test data
    await testDb.query(
      `INSERT INTO users (name, email, password_hash, role, created_at)
       VALUES
         ($1, $2, $3, $4, $5),
         ($6, $7, $8, $9, $10),
         ($11, $12, $13, $14, $15)`,
      [
        'Patient A', 'pa@test.com', 'hashed', 'patient', '2024-01-15',
        'Patient B', 'pb@test.com', 'hashed', 'patient', '2024-01-20',
        'Dr. Test', 'dr@test.com', 'hashed', 'psychologist', '2024-01-10'
      ]
    )

    // Act - Generate statistics
    const stats = {}

    // Total users
    const totalUsersResult = await testDb.query(
      `SELECT COUNT(*) as count FROM users`
    )
    stats.totalUsers = parseInt(totalUsersResult.rows[0].count)

    // Users by role
    const byRoleResult = await testDb.query(
      `SELECT role, COUNT(*) as count FROM users GROUP BY role`
    )
    stats.byRole = byRoleResult.rows

    // Active sessions this month
    const activeSessionsResult = await testDb.query(
      `SELECT COUNT(*) as count FROM sessions
       WHERE status = 'scheduled'
       AND scheduled_at >= date_trunc('month', CURRENT_DATE)`
    )
    stats.activeSessions = parseInt(activeSessionsResult.rows[0].count)

    // Assert
    expect(stats.totalUsers).toBeGreaterThanOrEqual(4) // admin + 3 new users
    expect(stats.byRole.length).toBeGreaterThan(0)
  })

  it('should generate financial reports for clinics', async () => {
    // Arrange - Create financial data
    const period = '2024-01'

    await testDb.query(
      `INSERT INTO financial_reports (
        clinic_id, report_type, period, total_revenue,
        total_sessions, new_patients, active_patients, churn_rate
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        clinicId,
        'monthly',
        period,
        '15000.00',
        45,
        12,
        38,
        '5.50'
      ]
    )

    // Act - Query report
    const result = await testDb.query(
      `SELECT * FROM financial_reports
       WHERE clinic_id = $1 AND period = $2`,
      [clinicId, period]
    )

    // Assert
    const report = result.rows[0]
    expect(report.total_revenue).toBe('15000.00')
    expect(report.total_sessions).toBe(45)
    expect(report.new_patients).toBe(12)
    expect(report.active_patients).toBe(38)
  })

  it('should verify psychologist credentials', async () => {
    // Arrange - Create psychologist
    const psychologistResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Dr. Verify', 'dr.verify@test.com', 'hashed', 'psychologist']
    )

    const psychologistId = psychologistResult.rows[0].id

    await testDb.query(
      `INSERT INTO psychologist_profiles (user_id, crp, is_verified)
       VALUES ($1, $2, $3)`,
      [psychologistId, 'CRP-54321', false]
    )

    // Act - Verify psychologist
    await testDb.query(
      `UPDATE psychologist_profiles
       SET is_verified = true, verified_at = $1
       WHERE user_id = $2`,
      [new Date(), psychologistId]
    )

    // Log verification
    await testDb.query(
      `INSERT INTO audit_logs (
        user_id, action, resource, resource_id, metadata, severity
      )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        adminId,
        'verify',
        'psychologist',
        psychologistId.toString(),
        JSON.stringify({ crp: 'CRP-54321', verified_by: 'Admin User' }),
        'info'
      ]
    )

    // Assert
    const result = await testDb.query(
      `SELECT is_verified, verified_at FROM psychologist_profiles
       WHERE user_id = $1`,
      [psychologistId]
    )

    expect(result.rows[0].is_verified).toBe(true)
    expect(result.rows[0].verified_at).toBeTruthy()
  })

  it('should manage clinic settings', async () => {
    // Act - Create various clinic settings
    const settings = [
      { category: 'general', key: 'business_hours', value: { open: '08:00', close: '18:00' } },
      { category: 'appearance', key: 'primary_color', value: '#6366f1' },
      { category: 'features', key: 'ai_analysis_enabled', value: true },
    ]

    for (const setting of settings) {
      await testDb.query(
        `INSERT INTO clinic_settings (clinic_id, category, key, value)
         VALUES ($1, $2, $3, $4)`,
        [clinicId, setting.category, setting.key, JSON.stringify(setting.value)]
      )
    }

    // Assert
    const result = await testDb.query(
      `SELECT * FROM clinic_settings WHERE clinic_id = $1`,
      [clinicId]
    )

    expect(result.rows).toHaveLength(3)
    expect(result.rows.find(s => s.key === 'ai_analysis_enabled')).toBeTruthy()
  })

  it('should delete user and anonymize data (GDPR compliance)', async () => {
    // Arrange - Create user with data
    const userResult = await testDb.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['User ToDelete', 'delete@test.com', 'hashed', 'patient']
    )

    const userId = userResult.rows[0].id

    // Create some user data
    await testDb.query(
      `INSERT INTO diary_entries (patient_id, content, mood_rating)
       VALUES ($1, $2, $3)`,
      [userId, 'Sensitive diary content', 7]
    )

    // Act - Anonymize user data
    await testDb.query(
      `UPDATE users
       SET name = 'Deleted User', email = $1, status = 'inactive'
       WHERE id = $2`,
      [`anonymized_${userId}@deleted.local`, userId]
    )

    // Anonymize diary content
    await testDb.query(
      `UPDATE diary_entries
       SET content = '[Content deleted for privacy]'
       WHERE patient_id = $1`,
      [userId]
    )

    // Log anonymization
    await testDb.query(
      `INSERT INTO audit_logs (
        user_id, action, resource, resource_id, compliance_related
      )
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'anonymize', 'user', userId.toString(), true]
    )

    // Assert
    const userCheck = await testDb.query(
      `SELECT name, email, status FROM users WHERE id = $1`,
      [userId]
    )

    expect(userCheck.rows[0].name).toBe('Deleted User')
    expect(userCheck.rows[0].email).toContain('anonymized_')
    expect(userCheck.rows[0].status).toBe('inactive')
  })
})
