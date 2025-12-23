/**
 * CÁRIS Database Setup Script
 *
 * Este script cria todas as tabelas necessárias e o super admin.
 * Pode ser executado via:
 * - npx tsx scripts/setup-database.ts
 * - API endpoint /api/admin/setup (com secret key)
 */

import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.DIRECT_URL

if (!DATABASE_URL) {
  console.error("❌ POSTGRES_URL, DATABASE_URL ou DIRECT_URL não configurados")
  process.exit(1)
}

const sql = neon(DATABASE_URL)

// Senha padrão do super admin - DEVE SER ALTERADA APÓS PRIMEIRO LOGIN
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "admin@caris.com.br"
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "Admin@Caris2024!"
const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME || "Administrador CÁRIS"

async function setupDatabase() {
  console.log("🚀 Iniciando setup do banco de dados CÁRIS...")
  console.log(`📍 Database URL: ${DATABASE_URL?.substring(0, 30)}...`)

  try {
    // ========================================
    // 1. CRIAR TABELAS PRINCIPAIS
    // ========================================
    console.log("\n📦 Criando tabelas principais...")

    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        phone VARCHAR(20),
        role TEXT NOT NULL,
        avatar_url TEXT,
        total_xp INTEGER DEFAULT 0 NOT NULL,
        current_level INTEGER DEFAULT 1 NOT NULL,
        weekly_points INTEGER DEFAULT 0 NOT NULL,
        monthly_points INTEGER DEFAULT 0 NOT NULL,
        streak INTEGER DEFAULT 0 NOT NULL,
        last_activity_date DATE,
        is_global_admin BOOLEAN DEFAULT false,
        status TEXT DEFAULT 'active' NOT NULL,
        last_login_at TIMESTAMP,
        password_changed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ users")

    // Psychologist profiles
    await sql`
      CREATE TABLE IF NOT EXISTS psychologist_profiles (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        crp VARCHAR(20),
        bio TEXT,
        specialties JSON,
        experience TEXT,
        education TEXT,
        languages JSON,
        hourly_rate DECIMAL(8, 2),
        is_verified BOOLEAN DEFAULT false,
        verified_at TIMESTAMP
      )
    `
    console.log("  ✅ psychologist_profiles")

    // Patient profiles
    await sql`
      CREATE TABLE IF NOT EXISTS patient_profiles (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        psychologist_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        clinic_id INTEGER,
        birth_date TIMESTAMP,
        current_cycle TEXT,
        emergency_contact JSON,
        medical_history TEXT,
        preferences JSON
      )
    `
    console.log("  ✅ patient_profiles")

    // Clinics table
    await sql`
      CREATE TABLE IF NOT EXISTS clinics (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        logo_url TEXT,
        website VARCHAR(255),
        phone VARCHAR(20),
        email VARCHAR(255),
        address TEXT,
        cnpj VARCHAR(18),
        owner_id INTEGER NOT NULL REFERENCES users(id),
        status TEXT DEFAULT 'active' NOT NULL,
        plan_type TEXT DEFAULT 'basic' NOT NULL,
        max_users INTEGER DEFAULT 10 NOT NULL,
        max_psychologists INTEGER DEFAULT 5 NOT NULL,
        max_patients INTEGER DEFAULT 50 NOT NULL,
        settings JSON,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ clinics")

    // Add clinic_id FK to patient_profiles
    await sql`
      DO $$ BEGIN
        ALTER TABLE patient_profiles ADD CONSTRAINT patient_profiles_clinic_id_fk
        FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `

    // Sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER REFERENCES clinics(id) ON DELETE SET NULL,
        psychologist_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        patient_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        scheduled_at TIMESTAMP NOT NULL,
        duration INTEGER DEFAULT 50 NOT NULL,
        type TEXT DEFAULT 'therapy' NOT NULL,
        status TEXT DEFAULT 'scheduled' NOT NULL,
        notes TEXT,
        google_calendar_event_id TEXT,
        outlook_calendar_event_id TEXT,
        timezone TEXT,
        recurring_series_id TEXT,
        recurrence_pattern TEXT,
        is_recurring BOOLEAN DEFAULT false,
        parent_session_id INTEGER,
        session_value DECIMAL(8, 2),
        payment_status TEXT DEFAULT 'pending',
        reminder_sent_24h BOOLEAN DEFAULT false,
        reminder_sent_1h BOOLEAN DEFAULT false,
        reminder_sent_15min BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ sessions")

    // Diary entries
    await sql`
      CREATE TABLE IF NOT EXISTS diary_entries (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entry_date TIMESTAMP DEFAULT NOW() NOT NULL,
        mood_rating INTEGER,
        intensity_rating INTEGER,
        content TEXT,
        cycle TEXT,
        emotions TEXT,
        audio_url TEXT,
        audio_transcription TEXT,
        image_url TEXT,
        image_description TEXT,
        ai_analyzed BOOLEAN DEFAULT false,
        dominant_emotion TEXT,
        emotion_intensity INTEGER,
        sentiment_score INTEGER,
        risk_level TEXT,
        ai_insights TEXT,
        suggested_actions TEXT,
        plutchik_categories TEXT,
        image_analysis TEXT,
        audio_analysis TEXT
      )
    `
    console.log("  ✅ diary_entries")

    // User settings
    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id),
        timezone TEXT DEFAULT 'America/Sao_Paulo',
        theme TEXT DEFAULT 'light',
        language TEXT DEFAULT 'pt-BR',
        notifications BOOLEAN DEFAULT true,
        email_notifications BOOLEAN DEFAULT true,
        sms_notifications BOOLEAN DEFAULT false,
        push_notifications BOOLEAN DEFAULT false,
        push_subscription TEXT,
        google_calendar_enabled BOOLEAN DEFAULT false,
        google_calendar_access_token TEXT,
        google_calendar_refresh_token TEXT,
        outlook_calendar_enabled BOOLEAN DEFAULT false,
        outlook_calendar_access_token TEXT,
        outlook_calendar_refresh_token TEXT,
        email_reminders_enabled BOOLEAN DEFAULT true,
        sms_reminders_enabled BOOLEAN DEFAULT false,
        reminder_before_24h BOOLEAN DEFAULT true,
        reminder_before_1h BOOLEAN DEFAULT true,
        reminder_before_15min BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ user_settings")

    // Audit logs
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER REFERENCES clinics(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(50),
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        metadata TEXT,
        timestamp TIMESTAMP DEFAULT NOW(),
        severity VARCHAR(20) DEFAULT 'info',
        compliance_related BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ audit_logs")

    // User consents
    await sql`
      CREATE TABLE IF NOT EXISTS user_consents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        consent_type VARCHAR(100) NOT NULL,
        consent_given BOOLEAN NOT NULL,
        consent_date TIMESTAMP DEFAULT NOW() NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        revoked_at TIMESTAMP,
        version VARCHAR(10) DEFAULT '1.0' NOT NULL,
        purpose TEXT NOT NULL,
        legal_basis VARCHAR(50) NOT NULL,
        data_retention_period INTEGER,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ user_consents")

    // User privacy settings
    await sql`
      CREATE TABLE IF NOT EXISTS user_privacy_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id),
        data_processing_consent BOOLEAN DEFAULT false NOT NULL,
        marketing_consent BOOLEAN DEFAULT false NOT NULL,
        analytics_consent BOOLEAN DEFAULT false NOT NULL,
        share_data_with_psychologist BOOLEAN DEFAULT true NOT NULL,
        allow_data_export BOOLEAN DEFAULT true NOT NULL,
        anonymize_after_deletion BOOLEAN DEFAULT true NOT NULL,
        data_retention_preference INTEGER DEFAULT 2555,
        notification_preferences TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ user_privacy_settings")

    // Notifications
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        category VARCHAR(50),
        is_read BOOLEAN DEFAULT false NOT NULL,
        read_at TIMESTAMP,
        action_url TEXT,
        action_label VARCHAR(100),
        metadata JSONB,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ notifications")

    // Chat rooms
    await sql`
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        participant_ids TEXT NOT NULL,
        room_type TEXT DEFAULT 'private' NOT NULL,
        name TEXT,
        is_encrypted BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ chat_rooms")

    // Chat messages
    await sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        content TEXT,
        message_type TEXT DEFAULT 'text' NOT NULL,
        encryption_version TEXT DEFAULT 'aes-256' NOT NULL,
        is_temporary BOOLEAN DEFAULT false NOT NULL,
        expires_at TIMESTAMP,
        edited_at TIMESTAMP,
        deleted_at TIMESTAMP,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ chat_messages")

    // Tasks
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES users(id),
        psychologist_id INTEGER NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category TEXT,
        difficulty TEXT,
        estimated_time INTEGER,
        status TEXT DEFAULT 'pending' NOT NULL,
        priority TEXT DEFAULT 'media' NOT NULL,
        due_date TIMESTAMP,
        assigned_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        feedback TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ tasks")

    // Mood tracking
    await sql`
      CREATE TABLE IF NOT EXISTS mood_tracking (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TIMESTAMP DEFAULT NOW() NOT NULL,
        mood INTEGER NOT NULL,
        energy INTEGER,
        anxiety INTEGER,
        stress_level INTEGER,
        sleep_quality INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ mood_tracking")

    // SOS usages
    await sql`
      CREATE TABLE IF NOT EXISTS sos_usages (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        type TEXT,
        level TEXT NOT NULL,
        duration_minutes INTEGER,
        completed BOOLEAN DEFAULT false,
        resolved BOOLEAN DEFAULT false,
        rating INTEGER,
        feedback TEXT,
        notes TEXT,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ sos_usages")

    // Achievements
    await sql`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        icon VARCHAR(50) NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        requirement INTEGER NOT NULL,
        xp_reward INTEGER DEFAULT 0 NOT NULL,
        rarity TEXT DEFAULT 'common' NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ achievements")

    // User achievements
    await sql`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        unlocked_at TIMESTAMP DEFAULT NOW() NOT NULL,
        progress INTEGER DEFAULT 0 NOT NULL
      )
    `
    console.log("  ✅ user_achievements")

    // Gamification config
    await sql`
      CREATE TABLE IF NOT EXISTS gamification_config (
        id SERIAL PRIMARY KEY,
        activity_type TEXT NOT NULL UNIQUE,
        points INTEGER NOT NULL,
        xp INTEGER NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        enabled BOOLEAN DEFAULT true NOT NULL,
        min_level INTEGER DEFAULT 1,
        max_daily_count INTEGER,
        cooldown_minutes INTEGER,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ gamification_config")

    // Subscription plans
    await sql`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price_monthly INTEGER NOT NULL,
        price_yearly INTEGER,
        stripe_price_id_monthly TEXT NOT NULL,
        stripe_price_id_yearly TEXT,
        features TEXT NOT NULL,
        max_patients INTEGER,
        is_popular BOOLEAN DEFAULT false NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        sort_order INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ subscription_plans")

    // Customers (Stripe)
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
        stripe_customer_id TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ customers")

    // Subscriptions
    await sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id),
        customer_id TEXT NOT NULL REFERENCES customers(id),
        stripe_subscription_id TEXT NOT NULL UNIQUE,
        stripe_customer_id TEXT NOT NULL,
        status TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        plan_name TEXT NOT NULL,
        price_id TEXT NOT NULL,
        current_period_start TIMESTAMP NOT NULL,
        current_period_end TIMESTAMP NOT NULL,
        cancel_at_period_end BOOLEAN DEFAULT false NOT NULL,
        canceled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ subscriptions")

    // Meditation categories
    await sql`
      CREATE TABLE IF NOT EXISTS meditation_categories (
        id TEXT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(10) NOT NULL,
        color VARCHAR(7) DEFAULT '#6366f1' NOT NULL,
        display_order INTEGER DEFAULT 0 NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ meditation_categories")

    // Meditation audios
    await sql`
      CREATE TABLE IF NOT EXISTS meditation_audios (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category_id TEXT NOT NULL REFERENCES meditation_categories(id),
        duration INTEGER NOT NULL,
        difficulty VARCHAR(20) NOT NULL,
        instructor VARCHAR(255) NOT NULL,
        audio_url TEXT NOT NULL,
        thumbnail_url TEXT,
        transcript TEXT,
        guided_steps TEXT,
        benefits TEXT,
        techniques TEXT,
        preparation_steps TEXT,
        tags TEXT,
        language VARCHAR(10) DEFAULT 'pt-BR' NOT NULL,
        file_size INTEGER,
        format VARCHAR(10) DEFAULT 'mp3' NOT NULL,
        bitrate INTEGER,
        sample_rate INTEGER,
        source_url TEXT,
        license VARCHAR(100) NOT NULL,
        attribution TEXT,
        is_commercial_use BOOLEAN DEFAULT false NOT NULL,
        play_count INTEGER DEFAULT 0 NOT NULL,
        average_rating INTEGER DEFAULT 0,
        rating_count INTEGER DEFAULT 0 NOT NULL,
        status VARCHAR(20) DEFAULT 'active' NOT NULL,
        moderation_notes TEXT,
        is_popular BOOLEAN DEFAULT false NOT NULL,
        is_featured BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        created_by INTEGER REFERENCES users(id),
        last_modified_by INTEGER REFERENCES users(id)
      )
    `
    console.log("  ✅ meditation_audios")

    // Meditation sessions
    await sql`
      CREATE TABLE IF NOT EXISTS meditation_sessions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id),
        meditation_id TEXT NOT NULL,
        started_at TIMESTAMP DEFAULT NOW() NOT NULL,
        completed_at TIMESTAMP,
        duration INTEGER NOT NULL,
        was_completed BOOLEAN DEFAULT false NOT NULL,
        rating INTEGER,
        feedback TEXT,
        mood_before INTEGER,
        mood_after INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    console.log("  ✅ meditation_sessions")

    // ========================================
    // 2. CRIAR ÍNDICES
    // ========================================
    console.log("\n📊 Criando índices...")

    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_psychologist ON sessions(psychologist_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_patient ON sessions(patient_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_scheduled ON sessions(scheduled_at)`
    await sql`CREATE INDEX IF NOT EXISTS idx_diary_patient ON diary_entries(patient_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at)`
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_mood_tracking_patient ON mood_tracking(patient_id)`

    console.log("  ✅ Índices criados")

    // ========================================
    // 3. CRIAR SUPER ADMIN
    // ========================================
    console.log("\n👤 Criando super admin...")

    // Verificar se já existe
    const existingAdmin = await sql`
      SELECT id, email FROM users WHERE email = ${SUPER_ADMIN_EMAIL}
    `

    if (existingAdmin.length > 0) {
      console.log(`  ⚠️ Super admin já existe: ${SUPER_ADMIN_EMAIL}`)
    } else {
      const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12)

      const [admin] = await sql`
        INSERT INTO users (name, email, password_hash, role, is_global_admin, status)
        VALUES (${SUPER_ADMIN_NAME}, ${SUPER_ADMIN_EMAIL}, ${hashedPassword}, 'admin', true, 'active')
        RETURNING id, email
      `

      // Criar settings para o admin
      await sql`
        INSERT INTO user_settings (user_id)
        VALUES (${admin.id})
        ON CONFLICT (user_id) DO NOTHING
      `

      // Criar privacy settings para o admin
      await sql`
        INSERT INTO user_privacy_settings (user_id, data_processing_consent, share_data_with_psychologist)
        VALUES (${admin.id}, true, false)
        ON CONFLICT (user_id) DO NOTHING
      `

      console.log(`  ✅ Super admin criado: ${SUPER_ADMIN_EMAIL}`)
    }

    // ========================================
    // 4. SEED DADOS BÁSICOS
    // ========================================
    console.log("\n🌱 Inserindo dados básicos...")

    // Gamification config
    const gamificationConfigs = [
      { type: 'diary_entry', points: 10, xp: 15, desc: 'Escrever entrada no diário', cat: 'diary' },
      { type: 'meditation_completed', points: 15, xp: 20, desc: 'Completar meditação', cat: 'meditation' },
      { type: 'task_completed', points: 20, xp: 25, desc: 'Completar tarefa terapêutica', cat: 'tasks' },
      { type: 'session_attended', points: 50, xp: 75, desc: 'Participar de sessão', cat: 'sessions' },
      { type: 'daily_login', points: 5, xp: 5, desc: 'Login diário', cat: 'engagement' },
      { type: 'mood_logged', points: 5, xp: 8, desc: 'Registrar humor', cat: 'diary' },
    ]

    for (const config of gamificationConfigs) {
      await sql`
        INSERT INTO gamification_config (activity_type, points, xp, description, category)
        VALUES (${config.type}, ${config.points}, ${config.xp}, ${config.desc}, ${config.cat})
        ON CONFLICT (activity_type) DO NOTHING
      `
    }
    console.log("  ✅ Configurações de gamificação")

    // Meditation categories
    const meditationCategories = [
      { id: 'mindfulness', name: 'Mindfulness', desc: 'Práticas de atenção plena', icon: '🧘', color: '#6366f1', order: 1 },
      { id: 'relaxation', name: 'Relaxamento', desc: 'Técnicas de relaxamento', icon: '😌', color: '#10b981', order: 2 },
      { id: 'sleep', name: 'Sono', desc: 'Meditações para dormir melhor', icon: '🌙', color: '#8b5cf6', order: 3 },
      { id: 'anxiety', name: 'Ansiedade', desc: 'Práticas para ansiedade', icon: '💆', color: '#f59e0b', order: 4 },
      { id: 'focus', name: 'Foco', desc: 'Meditações para concentração', icon: '🎯', color: '#3b82f6', order: 5 },
    ]

    for (const cat of meditationCategories) {
      await sql`
        INSERT INTO meditation_categories (id, name, description, icon, color, display_order)
        VALUES (${cat.id}, ${cat.name}, ${cat.desc}, ${cat.icon}, ${cat.color}, ${cat.order})
        ON CONFLICT (id) DO NOTHING
      `
    }
    console.log("  ✅ Categorias de meditação")

    // Achievements
    const achievements = [
      { name: 'Primeiro Passo', desc: 'Complete seu cadastro', icon: '🎉', type: 'milestone', cat: 'engagement', req: 1, xp: 50, rarity: 'common' },
      { name: 'Escritor Iniciante', desc: 'Escreva sua primeira entrada no diário', icon: '📝', type: 'activity', cat: 'diary', req: 1, xp: 25, rarity: 'common' },
      { name: 'Meditador', desc: 'Complete sua primeira meditação', icon: '🧘', type: 'activity', cat: 'meditation', req: 1, xp: 25, rarity: 'common' },
      { name: 'Constância', desc: 'Mantenha 7 dias de streak', icon: '🔥', type: 'streak', cat: 'engagement', req: 7, xp: 100, rarity: 'rare' },
      { name: 'Mestre do Diário', desc: 'Escreva 30 entradas no diário', icon: '📚', type: 'milestone', cat: 'diary', req: 30, xp: 200, rarity: 'epic' },
      { name: 'Zen Master', desc: 'Complete 50 meditações', icon: '☯️', type: 'milestone', cat: 'meditation', req: 50, xp: 300, rarity: 'legendary' },
    ]

    for (const ach of achievements) {
      await sql`
        INSERT INTO achievements (name, description, icon, type, category, requirement, xp_reward, rarity)
        VALUES (${ach.name}, ${ach.desc}, ${ach.icon}, ${ach.type}, ${ach.cat}, ${ach.req}, ${ach.xp}, ${ach.rarity})
        ON CONFLICT DO NOTHING
      `
    }
    console.log("  ✅ Conquistas")

    console.log("\n✅ Setup do banco de dados concluído com sucesso!")
    console.log("\n📋 Informações do Super Admin:")
    console.log(`   Email: ${SUPER_ADMIN_EMAIL}`)
    console.log(`   Senha: ${SUPER_ADMIN_PASSWORD}`)
    console.log("\n⚠️  IMPORTANTE: Altere a senha do super admin após o primeiro login!")

    return { success: true }
  } catch (error) {
    console.error("\n❌ Erro durante o setup:", error)
    throw error
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { setupDatabase }
