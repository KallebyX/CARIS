/**
 * CÁRIS Database Seed Script
 *
 * Este script cria dados de exemplo para desenvolvimento e testes.
 * Usa o schema correto com password_hash, scheduled_at, etc.
 *
 * Executar: node scripts/seed.js
 */

const { neon } = require("@neondatabase/serverless")
const bcrypt = require("bcryptjs")

const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL)

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...")

  try {
    // Verificar se já existe dados
    const existingUsers = await sql`SELECT COUNT(*) as count FROM users`
    const userCount = parseInt(existingUsers[0].count)

    if (userCount > 1) {
      console.log(`⚠️ Já existem ${userCount} usuários. Pulando seed para evitar duplicatas.`)
      console.log("💡 Use a API /api/admin/setup para reset completo.")
      return
    }

    console.log("📦 Criando dados de exemplo...")

    // Senha segura para desenvolvimento (12+ caracteres com requisitos)
    const devPassword = "Teste@123456"
    const hashedPassword = await bcrypt.hash(devPassword, 12)

    // Psicólogo
    const [psychologist] = await sql`
      INSERT INTO users (email, password_hash, name, role, status)
      VALUES ('psicologo@caris.com.br', ${hashedPassword}, 'Dr. Silva Santos', 'psychologist', 'active')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, email
    `
    console.log(`  ✅ Psicólogo: ${psychologist.email}`)

    // Criar perfil do psicólogo
    await sql`
      INSERT INTO psychologist_profiles (user_id, crp, specialties, bio)
      VALUES (
        ${psychologist.id},
        '06/12345',
        '["Terapia Cognitivo-Comportamental", "Ansiedade", "Depressão"]',
        'Psicólogo especializado em TCC com mais de 10 anos de experiência.'
      )
      ON CONFLICT (user_id) DO NOTHING
    `

    // Pacientes
    const [patient1] = await sql`
      INSERT INTO users (email, password_hash, name, role, status)
      VALUES ('paciente1@caris.com.br', ${hashedPassword}, 'Maria Oliveira', 'patient', 'active')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, email
    `
    console.log(`  ✅ Paciente 1: ${patient1.email}`)

    const [patient2] = await sql`
      INSERT INTO users (email, password_hash, name, role, status)
      VALUES ('paciente2@caris.com.br', ${hashedPassword}, 'João Santos', 'patient', 'active')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, email
    `
    console.log(`  ✅ Paciente 2: ${patient2.email}`)

    // Criar perfis dos pacientes
    await sql`
      INSERT INTO patient_profiles (user_id, psychologist_id, current_cycle)
      VALUES
        (${patient1.id}, ${psychologist.id}, 'Crescer'),
        (${patient2.id}, ${psychologist.id}, 'Cuidar')
      ON CONFLICT (user_id) DO NOTHING
    `

    // Criar configurações para usuários
    for (const userId of [psychologist.id, patient1.id, patient2.id]) {
      await sql`
        INSERT INTO user_settings (user_id)
        VALUES (${userId})
        ON CONFLICT (user_id) DO NOTHING
      `
      await sql`
        INSERT INTO user_privacy_settings (user_id, data_processing_consent)
        VALUES (${userId}, true)
        ON CONFLICT (user_id) DO NOTHING
      `
    }

    // Criar sessões
    const now = new Date()
    const futureDate1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const futureDate2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const pastDate1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    await sql`
      INSERT INTO sessions (psychologist_id, patient_id, scheduled_at, duration, type, status, notes)
      VALUES
        (${psychologist.id}, ${patient1.id}, ${futureDate1.toISOString()}, 50, 'therapy', 'confirmed', 'Sessão de acompanhamento'),
        (${psychologist.id}, ${patient1.id}, ${futureDate2.toISOString()}, 50, 'therapy', 'scheduled', NULL),
        (${psychologist.id}, ${patient1.id}, ${pastDate1.toISOString()}, 50, 'therapy', 'completed', 'Trabalhamos técnicas de respiração'),
        (${psychologist.id}, ${patient2.id}, ${pastDate1.toISOString()}, 50, 'therapy', 'completed', 'Primeira sessão - anamnese')
    `
    console.log("  ✅ Sessões criadas")

    // Criar entradas no diário
    await sql`
      INSERT INTO diary_entries (patient_id, content, mood_rating, cycle)
      VALUES
        (${patient1.id}, 'Hoje foi meu primeiro dia na terapia. Me sinto esperançosa.', 4, 'Crescer'),
        (${patient1.id}, 'Acordei com ansiedade hoje, mas usei as técnicas de respiração.', 3, 'Crescer'),
        (${patient2.id}, 'Estou começando a entender melhor meus padrões de pensamento.', 4, 'Cuidar')
    `
    console.log("  ✅ Diário criado")

    // Criar tarefas
    await sql`
      INSERT INTO tasks (psychologist_id, patient_id, title, description, due_date, status, priority)
      VALUES
        (${psychologist.id}, ${patient1.id}, 'Exercício de respiração', 'Praticar a técnica 4-7-8 por 5 minutos, 2x ao dia', ${futureDate1.toISOString()}, 'in_progress', 'alta'),
        (${psychologist.id}, ${patient1.id}, 'Diário de gratidão', 'Escrever 3 coisas pelas quais é grata todos os dias', ${futureDate2.toISOString()}, 'pending', 'media'),
        (${psychologist.id}, ${patient2.id}, 'Registro de pensamentos', 'Anotar pensamentos negativos automáticos', ${futureDate1.toISOString()}, 'completed', 'alta')
    `
    console.log("  ✅ Tarefas criadas")

    // Criar registros de uso do SOS
    await sql`
      INSERT INTO sos_usages (patient_id, type, level, duration_minutes, completed)
      VALUES
        (${patient1.id}, 'breathing', 'mild', 5, true),
        (${patient1.id}, 'meditation', 'moderate', 10, true),
        (${patient2.id}, 'grounding', 'mild', 3, true)
    `
    console.log("  ✅ SOS registros criados")

    // Criar acompanhamento de humor
    for (let i = 0; i < 15; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const mood = Math.floor(Math.random() * 5) + 5 // 5-10
      const energy = Math.floor(Math.random() * 5) + 5
      const anxiety = Math.floor(Math.random() * 5) + 1 // 1-5

      await sql`
        INSERT INTO mood_tracking (patient_id, mood, energy, anxiety, date)
        VALUES (${patient1.id}, ${mood}, ${energy}, ${anxiety}, ${date.toISOString()})
      `
    }
    console.log("  ✅ Humor tracking criado")

    // Criar sala de chat e mensagens
    const roomParticipants = JSON.stringify([psychologist.id, patient1.id])
    const [chatRoom] = await sql`
      INSERT INTO chat_rooms (participant_ids, room_type, is_encrypted)
      VALUES (${roomParticipants}, 'private', true)
      RETURNING id
    `

    await sql`
      INSERT INTO chat_messages (room_id, sender_id, content, message_type)
      VALUES
        (${chatRoom.id}, ${patient1.id}, 'Olá, Dr. Silva! Como está?', 'text'),
        (${chatRoom.id}, ${psychologist.id}, 'Olá, Maria! Estou bem. Como você está se sentindo hoje?', 'text'),
        (${chatRoom.id}, ${patient1.id}, 'Estou me sentindo melhor depois da nossa última sessão.', 'text')
    `
    console.log("  ✅ Chat criado")

    console.log("")
    console.log("🎉 Seed concluído com sucesso!")
    console.log("")
    console.log("👤 Usuários criados (senha: Teste@123456):")
    console.log("   Psicólogo: psicologo@caris.com.br")
    console.log("   Paciente 1: paciente1@caris.com.br")
    console.log("   Paciente 2: paciente2@caris.com.br")
    console.log("")
    console.log("💡 Super Admin (use a API /api/admin/setup):")
    console.log("   Email: admin@caris.com.br")
    console.log("   Senha: Admin@Caris2024!")
  } catch (error) {
    console.error("❌ Erro durante o seed:", error)
    throw error
  }
}

seed().catch((error) => {
  console.error("❌ Falha no seed:", error)
  process.exit(1)
})
