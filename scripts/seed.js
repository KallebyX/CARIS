const { neon } = require("@neondatabase/serverless")
const bcrypt = require("bcryptjs")

const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL)

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...")

  try {
    // Limpar dados existentes
    await sql`DELETE FROM achievements`
    await sql`DELETE FROM mood_tracking`
    await sql`DELETE FROM sos_usages`
    await sql`DELETE FROM tasks`
    await sql`DELETE FROM user_settings`
    await sql`DELETE FROM chat_messages`
    await sql`DELETE FROM diary_entries`
    await sql`DELETE FROM sessions`
    await sql`DELETE FROM patient_profiles`
    await sql`DELETE FROM psychologist_profiles`
    await sql`DELETE FROM users`

    console.log("✅ Dados existentes removidos")

    // Criar usuários
    const hashedPassword = await bcrypt.hash("123456", 10)

    // Admin
    const [admin] = await sql`
      INSERT INTO users (email, password, name, role)
      VALUES ('admin@caris.com.br', ${hashedPassword}, 'Administrador', 'admin')
      RETURNING id
    `

    // Psicólogo
    const [psychologist] = await sql`
      INSERT INTO users (email, password, name, role)
      VALUES ('psicologo@caris.com.br', ${hashedPassword}, 'Dr. Silva Santos', 'psychologist')
      RETURNING id
    `

    // Pacientes
    const [patient1] = await sql`
      INSERT INTO users (email, password, name, role)
      VALUES ('paciente1@caris.com.br', ${hashedPassword}, 'Maria Oliveira', 'patient')
      RETURNING id
    `

    const [patient2] = await sql`
      INSERT INTO users (email, password, name, role)
      VALUES ('paciente2@caris.com.br', ${hashedPassword}, 'João Santos', 'patient')
      RETURNING id
    `

    console.log("✅ Usuários criados")

    // Criar perfil do psicólogo
    await sql`
      INSERT INTO psychologist_profiles (user_id, crp, specialties, bio)
      VALUES (
        ${psychologist.id},
        '06/12345',
        'Terapia Cognitivo-Comportamental, Ansiedade, Depressão',
        'Psicólogo especializado em TCC com mais de 10 anos de experiência no tratamento de transtornos de ansiedade e depressão.'
      )
    `

    // Criar perfis dos pacientes
    await sql`
      INSERT INTO patient_profiles (user_id, psychologist_id, birth_date, phone, current_cycle)
      VALUES 
        (${patient1.id}, ${psychologist.id}, '1990-05-15', '(11) 99999-1111', 'Crescer'),
        (${patient2.id}, ${psychologist.id}, '1985-08-22', '(11) 99999-2222', 'Cuidar')
    `

    console.log("✅ Perfis criados")

    // Criar configurações padrão para todos os usuários
    await sql`
      INSERT INTO user_settings (user_id)
      VALUES (${admin.id}), (${psychologist.id}), (${patient1.id}), (${patient2.id})
    `

    // Criar sessões
    const now = new Date()
    const futureDate1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // +7 dias
    const futureDate2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // +14 dias
    const pastDate1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // -7 dias
    const pastDate2 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) // -14 dias

    await sql`
      INSERT INTO sessions (psychologist_id, patient_id, session_date, duration_minutes, type, status, notes)
      VALUES 
        (${psychologist.id}, ${patient1.id}, ${futureDate1.toISOString()}, 50, 'online', 'confirmada', 'Sessão de acompanhamento'),
        (${psychologist.id}, ${patient1.id}, ${futureDate2.toISOString()}, 50, 'online', 'agendada', NULL),
        (${psychologist.id}, ${patient1.id}, ${pastDate1.toISOString()}, 50, 'online', 'realizada', 'Trabalhamos técnicas de respiração'),
        (${psychologist.id}, ${patient2.id}, ${pastDate2.toISOString()}, 50, 'presencial', 'realizada', 'Primeira sessão - anamnese')
    `

    console.log("✅ Sessões criadas")

    // Criar entradas no diário
    await sql`
      INSERT INTO diary_entries (patient_id, title, content, mood, tags, is_private)
      VALUES 
        (${patient1.id}, 'Primeiro dia', 'Hoje foi meu primeiro dia na terapia. Me sinto esperançosa.', 4, '["terapia", "esperança"]', false),
        (${patient1.id}, 'Ansiedade matinal', 'Acordei com ansiedade hoje, mas usei as técnicas de respiração.', 3, '["ansiedade", "respiração"]', false),
        (${patient2.id}, 'Reflexões', 'Estou começando a entender melhor meus padrões de pensamento.', 4, '["reflexão", "autoconhecimento"]', false)
    `

    // Criar tarefas
    await sql`
      INSERT INTO tasks (psychologist_id, patient_id, title, description, due_date, status, priority)
      VALUES 
        (${psychologist.id}, ${patient1.id}, 'Exercício de respiração', 'Praticar a técnica 4-7-8 por 5 minutos, 2x ao dia', ${futureDate1.toISOString()}, 'em_progresso', 'alta'),
        (${psychologist.id}, ${patient1.id}, 'Diário de gratidão', 'Escrever 3 coisas pelas quais é grata todos os dias', ${futureDate2.toISOString()}, 'pendente', 'media'),
        (${psychologist.id}, ${patient2.id}, 'Registro de pensamentos', 'Anotar pensamentos negativos automáticos quando surgirem', ${futureDate1.toISOString()}, 'concluida', 'alta')
    `

    // Criar registros de uso do SOS
    await sql`
      INSERT INTO sos_usages (patient_id, tool_name, duration_minutes)
      VALUES 
        (${patient1.id}, 'breathing', 5),
        (${patient1.id}, 'meditation', 10),
        (${patient2.id}, 'grounding', 3)
    `

    // Criar acompanhamento de humor
    const dates = []
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      dates.push(date.toISOString().split("T")[0])
    }

    for (const date of dates.slice(0, 15)) {
      const mood = Math.floor(Math.random() * 5) + 1
      const energy = Math.floor(Math.random() * 5) + 1
      const anxiety = Math.floor(Math.random() * 5) + 1

      await sql`
        INSERT INTO mood_tracking (patient_id, mood, energy, anxiety, date)
        VALUES (${patient1.id}, ${mood}, ${energy}, ${anxiety}, ${date})
      `
    }

    // Criar conquistas
    await sql`
      INSERT INTO achievements (patient_id, type, title, description)
      VALUES 
        (${patient1.id}, 'first_entry', 'Primeira Entrada', 'Fez sua primeira entrada no diário'),
        (${patient1.id}, 'sos_usage', 'Ato de Coragem', 'Usou as ferramentas SOS quando precisou'),
        (${patient2.id}, 'task_completion', 'Primeira Tarefa', 'Concluiu sua primeira tarefa terapêutica')
    `

    // Criar mensagens de chat
    await sql`
      INSERT INTO chat_messages (sender_id, receiver_id, content, is_read)
      VALUES 
        (${patient1.id}, ${psychologist.id}, 'Olá, Dr. Silva! Como está?', true),
        (${psychologist.id}, ${patient1.id}, 'Olá, Maria! Estou bem, obrigado. Como você está se sentindo hoje?', true),
        (${patient1.id}, ${psychologist.id}, 'Estou me sentindo melhor depois da nossa última sessão.', false)
    `

    console.log("✅ Dados de exemplo criados")
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
  }
}

seed().catch((error) => {
  console.error("❌ Falha no seed:", error)
  process.exit(1)
})
