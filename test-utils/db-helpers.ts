import { PGlite } from '@electric-sql/pglite'

/**
 * In-memory PostgreSQL database for integration tests
 */
let testDb: PGlite | null = null

/**
 * Initialize an in-memory test database
 */
export async function setupTestDatabase(): Promise<PGlite> {
  if (testDb) {
    return testDb
  }

  testDb = new PGlite()

  // Create test schema
  await testDb.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Patient profiles
    CREATE TABLE IF NOT EXISTS patient_profiles (
      id VARCHAR(255) PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      phone VARCHAR(50),
      date_of_birth DATE,
      gender VARCHAR(50),
      emergency_contact VARCHAR(255),
      emergency_phone VARCHAR(50),
      medical_history TEXT,
      current_medications TEXT,
      allergies TEXT,
      previous_therapy BOOLEAN,
      therapy_goals TEXT,
      preferred_therapy_type VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Chat rooms
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id VARCHAR(255) PRIMARY KEY,
      participant_ids TEXT NOT NULL,
      room_type VARCHAR(50) NOT NULL,
      is_encrypted BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Chat messages
    CREATE TABLE IF NOT EXISTS chat_messages (
      id VARCHAR(255) PRIMARY KEY,
      room_id VARCHAR(255) REFERENCES chat_rooms(id),
      sender_id INTEGER REFERENCES users(id),
      content TEXT NOT NULL,
      message_type VARCHAR(50) DEFAULT 'text',
      encryption_version VARCHAR(50),
      is_temporary BOOLEAN DEFAULT false,
      expires_at TIMESTAMP,
      metadata TEXT,
      deleted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- User settings
    CREATE TABLE IF NOT EXISTS user_settings (
      id VARCHAR(255) PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      email_notifications BOOLEAN DEFAULT true,
      push_notifications BOOLEAN DEFAULT true,
      session_reminders BOOLEAN DEFAULT true,
      diary_reminders BOOLEAN DEFAULT true,
      theme VARCHAR(50) DEFAULT 'light',
      language VARCHAR(10) DEFAULT 'pt-BR',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)

  return testDb
}

/**
 * Clean up test database
 */
export async function teardownTestDatabase() {
  if (testDb) {
    await testDb.close()
    testDb = null
  }
}

/**
 * Clear all data from test database
 */
export async function clearTestDatabase() {
  if (!testDb) {
    throw new Error('Test database not initialized')
  }

  await testDb.exec(`
    TRUNCATE TABLE chat_messages CASCADE;
    TRUNCATE TABLE chat_rooms CASCADE;
    TRUNCATE TABLE user_settings CASCADE;
    TRUNCATE TABLE patient_profiles CASCADE;
    TRUNCATE TABLE users CASCADE;
  `)
}

/**
 * Insert test data into database
 */
export async function seedTestData(db: PGlite, data: any) {
  // Insert users
  if (data.users) {
    for (const user of data.users) {
      await db.exec(`
        INSERT INTO users (id, name, email, password, role)
        VALUES (${user.id}, '${user.name}', '${user.email}', '${user.password}', '${user.role}')
      `)
    }
  }

  // Insert other data as needed
  if (data.chatRooms) {
    for (const room of data.chatRooms) {
      await db.exec(`
        INSERT INTO chat_rooms (id, participant_ids, room_type, is_encrypted)
        VALUES ('${room.id}', '${room.participant_ids}', '${room.room_type}', ${room.is_encrypted})
      `)
    }
  }

  if (data.chatMessages) {
    for (const message of data.chatMessages) {
      await db.exec(`
        INSERT INTO chat_messages (id, room_id, sender_id, content, message_type)
        VALUES ('${message.id}', '${message.room_id}', ${message.sender_id}, '${message.content}', '${message.message_type}')
      `)
    }
  }
}

/**
 * Get test database instance
 */
export function getTestDatabase(): PGlite {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.')
  }
  return testDb
}
