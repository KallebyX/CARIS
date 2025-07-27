const { Client } = require("pg")
const bcrypt = require("bcryptjs")

const client = new Client({
  host: "localhost",
  port: 5445,
  database: "caris",
  user: "kalleby"
})

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados local...")

  try {
    await client.connect()
    console.log("✅ Conectado ao PostgreSQL")

    // Criar as tabelas se não existirem
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS psychologist_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        crp VARCHAR(20) NOT NULL,
        specialties TEXT,
        bio TEXT,
        avatar TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        psychologist_id INTEGER REFERENCES users(id) NOT NULL,
        birth_date DATE,
        phone VARCHAR(20),
        emergency_contact VARCHAR(20),
        current_cycle TEXT DEFAULT 'Criar',
        avatar TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        email_notifications BOOLEAN DEFAULT true,
        push_notifications BOOLEAN DEFAULT true,
        session_reminders BOOLEAN DEFAULT true,
        diary_reminders BOOLEAN DEFAULT true,
        theme TEXT DEFAULT 'light',
        language TEXT DEFAULT 'pt-BR',
        push_subscription TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)

    console.log("✅ Tabelas criadas")

    // Limpar dados existentes
    await client.query('DELETE FROM user_settings')
    await client.query('DELETE FROM patient_profiles')
    await client.query('DELETE FROM psychologist_profiles')
    await client.query('DELETE FROM users')

    console.log("✅ Dados existentes removidos")

    // Criar usuários
    const hashedPassword = await bcrypt.hash("123456", 10)

    // Admin
    const adminResult = await client.query(`
      INSERT INTO users (email, password, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['admin@caris.com.br', hashedPassword, 'Administrador', 'admin'])
    const adminId = adminResult.rows[0].id

    // Psicólogo
    const psychologistResult = await client.query(`
      INSERT INTO users (email, password, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['psicologo@caris.com.br', hashedPassword, 'Dr. Silva Santos', 'psychologist'])
    const psychologistId = psychologistResult.rows[0].id

    // Pacientes
    const patient1Result = await client.query(`
      INSERT INTO users (email, password, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['paciente1@caris.com.br', hashedPassword, 'Maria Oliveira', 'patient'])
    const patient1Id = patient1Result.rows[0].id

    const patient2Result = await client.query(`
      INSERT INTO users (email, password, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['paciente2@caris.com.br', hashedPassword, 'João Santos', 'patient'])
    const patient2Id = patient2Result.rows[0].id

    console.log("✅ Usuários criados")

    // Criar perfil do psicólogo
    await client.query(`
      INSERT INTO psychologist_profiles (user_id, crp, specialties, bio)
      VALUES ($1, $2, $3, $4)
    `, [
      psychologistId,
      '06/12345',
      'Terapia Cognitivo-Comportamental, Ansiedade, Depressão',
      'Psicólogo especializado em TCC com mais de 10 anos de experiência no tratamento de transtornos de ansiedade e depressão.'
    ])

    // Criar perfis dos pacientes
    await client.query(`
      INSERT INTO patient_profiles (user_id, psychologist_id, birth_date, phone, current_cycle)
      VALUES 
        ($1, $2, $3, $4, $5),
        ($6, $7, $8, $9, $10)
    `, [
      patient1Id, psychologistId, '1990-05-15', '(11) 99999-1111', 'Crescer',
      patient2Id, psychologistId, '1985-08-22', '(11) 99999-2222', 'Cuidar'
    ])

    console.log("✅ Perfis criados")

    // Criar configurações padrão para todos os usuários
    await client.query(`
      INSERT INTO user_settings (user_id)
      VALUES ($1), ($2), ($3), ($4)
    `, [adminId, psychologistId, patient1Id, patient2Id])

    console.log("✅ Configurações criadas")
    console.log("🎉 Seed concluído com sucesso!")
    console.log("")
    console.log("👤 Usuários criados:")
    console.log("   Admin: admin@caris.com.br / 123456")
    console.log("   Psicólogo: psicologo@caris.com.br / 123456")
    console.log("   Paciente 1: paciente1@caris.com.br / 123456")
    console.log("   Paciente 2: paciente2@caris.com.br / 123456")

  } catch (error) {
    console.error("❌ Erro durante o seed:", error)
    throw error
  } finally {
    await client.end()
  }
}

seed().catch((error) => {
  console.error("❌ Falha no seed:", error)
  process.exit(1)
})