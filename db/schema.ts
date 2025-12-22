import { pgTable, serial, text, integer, timestamp, boolean, varchar, date, decimal, json, jsonb, index, time } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

// Tabela de usuários
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }), // For SMS reminders
  password: text("password_hash").notNull(),
  role: text("role").notNull(), // 'psychologist', 'patient', 'admin', 'clinic_owner', 'clinic_admin'
  avatarUrl: text("avatar_url"),

  // Gamification fields
  totalXP: integer("total_xp").default(0).notNull(),
  currentLevel: integer("current_level").default(1).notNull(),
  weeklyPoints: integer("weekly_points").default(0).notNull(),
  monthlyPoints: integer("monthly_points").default(0).notNull(),
  streak: integer("streak").default(0).notNull(), // consecutive days with activity
  lastActivityDate: date("last_activity_date"),

  isGlobalAdmin: boolean("is_global_admin").default(false), // Super admin for platform
  status: text("status").notNull().default("active"), // 'active', 'suspended', 'inactive'
  lastLoginAt: timestamp("last_login_at"),
  passwordChangedAt: timestamp("password_changed_at"), // For token invalidation on password change

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Perfis de psicólogos
export const psychologistProfiles = pgTable("psychologist_profiles", {
  userId: integer("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .primaryKey(),
  crp: varchar("crp", { length: 20 }),
  bio: text("bio"),
  specialties: json("specialties"), // Array de especialidades
  experience: text("experience"),
  education: text("education"),
  languages: json("languages"), // Array de idiomas
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
})

// Perfis de pacientes
export const patientProfiles = pgTable("patient_profiles", {
  userId: integer("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .primaryKey(),
  psychologistId: integer("psychologist_id")
    .references(() => users.id, { onDelete: 'set null' }),
  clinicId: integer("clinic_id")
    .references(() => clinics.id, { onDelete: 'set null' }),
  birthDate: timestamp("birth_date"),
  currentCycle: text("current_cycle"),
  emergencyContact: json("emergency_contact"), // Nome, telefone, etc.
  medicalHistory: text("medical_history"),
  preferences: json("preferences"), // Preferências de terapia
})

// Sessões
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id")
    .references(() => clinics.id, { onDelete: 'set null' }),
  psychologistId: integer("psychologist_id")
    .references(() => users.id, { onDelete: 'set null' }),
  patientId: integer("patient_id")
    .references(() => users.id, { onDelete: 'set null' }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(50), // em minutos
  type: text("type").notNull().default('therapy'), // 'therapy', 'consultation', 'group'
  status: text("status").notNull().default('scheduled'), // 'scheduled', 'confirmed', 'completed', 'cancelled'
  notes: text("notes"),

  // Calendar integration fields
  googleCalendarEventId: text("google_calendar_event_id"),
  outlookCalendarEventId: text("outlook_calendar_event_id"),
  timezone: text("timezone"),

  // Recurring session fields
  recurringSeriesId: text("recurring_series_id"), // Links sessions in a recurring series
  recurrencePattern: text("recurrence_pattern"), // 'weekly', 'biweekly', 'monthly', or null for one-time
  isRecurring: boolean("is_recurring").default(false),
  parentSessionId: integer("parent_session_id"), // Reference to original session in series

  sessionValue: decimal("session_value", { precision: 8, scale: 2 }),
  paymentStatus: text("payment_status").default("pending"), // 'pending', 'paid', 'refunded'

  // Reminder tracking
  reminderSent24h: boolean("reminder_sent_24h").default(false),
  reminderSent1h: boolean("reminder_sent_1h").default(false),
  reminderSent15min: boolean("reminder_sent_15min").default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Entradas do diário
export const diaryEntries = pgTable("diary_entries", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  entryDate: timestamp("entry_date").defaultNow().notNull(),
  moodRating: integer("mood_rating"),
  intensityRating: integer("intensity_rating"),
  content: text("content"),
  cycle: text("cycle"),
  emotions: text("emotions"), // jsonb
  // Multimodal content
  audioUrl: text("audio_url"),
  audioTranscription: text("audio_transcription"),
  imageUrl: text("image_url"),
  imageDescription: text("image_description"),
  // AI Analysis fields
  aiAnalyzed: boolean("ai_analyzed").default(false),
  dominantEmotion: text("dominant_emotion"),
  emotionIntensity: integer("emotion_intensity"),
  sentimentScore: integer("sentiment_score"), // stored as integer (-100 to 100)
  riskLevel: text("risk_level"), // 'low', 'medium', 'high', 'critical'
  aiInsights: text("ai_insights"), // JSON string
  suggestedActions: text("suggested_actions"), // JSON string
  plutchikCategories: text("plutchik_categories"), // JSON string
  // Multimodal AI analysis
  imageAnalysis: text("image_analysis"), // JSON string for OpenAI Vision results
  audioAnalysis: text("audio_analysis"), // JSON string for audio emotion analysis
})

// Conquistas
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
  type: text("type").notNull(), // 'activity', 'milestone', 'streak', 'special'
  category: text("category").notNull(), // 'diary', 'meditation', 'tasks', 'sessions', 'social'
  requirement: integer("requirement").notNull(), // quantidade necessária para desbloquear
  xpReward: integer("xp_reward").default(0).notNull(),
  rarity: text("rarity").default('common').notNull(), // 'common', 'rare', 'epic', 'legendary'
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Conquistas do usuário
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  achievementId: integer("achievement_id")
    .references(() => achievements.id, { onDelete: 'cascade' })
    .notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  progress: integer("progress").default(0).notNull(),
})

// Sistema de pontos por atividade
export const pointActivities = pgTable("point_activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  activityType: text("activity_type").notNull(), // 'diary_entry', 'meditation', 'task_completed', 'session_attended'
  points: integer("points").notNull(),
  xp: integer("xp").notNull(),
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON com dados adicionais da atividade
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// MEDIUM-04: Configuração de gamificação (pontos e XP por tipo de atividade)
export const gamificationConfig = pgTable("gamification_config", {
  id: serial("id").primaryKey(),
  activityType: text("activity_type").notNull().unique(), // 'diary_entry', 'meditation_completed', 'task_completed', 'session_attended', etc.
  points: integer("points").notNull(), // Pontos ganhos por esta atividade
  xp: integer("xp").notNull(), // XP ganho por esta atividade
  description: text("description").notNull(), // Descrição da atividade em português
  category: varchar("category", { length: 50 }).notNull(), // 'diary', 'meditation', 'tasks', 'sessions', 'social'
  enabled: boolean("enabled").default(true).notNull(), // Se esta recompensa está ativa
  minLevel: integer("min_level").default(1), // Nível mínimo para ganhar esta recompensa
  maxDailyCount: integer("max_daily_count"), // Limite diário de vezes que pode ganhar (null = sem limite)
  cooldownMinutes: integer("cooldown_minutes"), // Tempo mínimo entre recompensas (null = sem cooldown)
  metadata: jsonb("metadata"), // Dados adicionais configuráveis (multiplicadores, condições especiais, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Desafios semanais
export const weeklyChallenges = pgTable("weekly_challenges", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
  type: text("type").notNull(), // 'diary', 'meditation', 'tasks', 'streak'
  target: integer("target").notNull(), // meta a ser atingida
  xpReward: integer("xp_reward").notNull(),
  pointsReward: integer("points_reward").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Progresso dos usuários nos desafios
export const userChallengeProgress = pgTable("user_challenge_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  challengeId: integer("challenge_id")
    .references(() => weeklyChallenges.id)
    .notNull(),
  progress: integer("progress").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Recompensas virtuais
export const virtualRewards = pgTable("virtual_rewards", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
  type: text("type").notNull(), // 'badge', 'title', 'avatar', 'theme'
  rarity: text("rarity").default('common').notNull(),
  requiredLevel: integer("required_level").default(1).notNull(),
  requiredXP: integer("required_xp").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Recompensas desbloqueadas pelos usuários
export const userRewards = pgTable("user_rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  rewardId: integer("reward_id")
    .references(() => virtualRewards.id, { onDelete: 'cascade' })
    .notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  isEquipped: boolean("is_equipped").default(false).notNull(),
})

// Sistema de ranking
export const leaderboards = pgTable("leaderboards", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // 'weekly', 'monthly', 'all_time'
  category: text("category").notNull(), // 'xp', 'points', 'streak', 'activities'
  startDate: date("start_date"),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Entradas do ranking
export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: serial("id").primaryKey(),
  leaderboardId: integer("leaderboard_id")
    .references(() => leaderboards.id)
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  score: integer("score").notNull(),
  rank: integer("rank").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Tabela de sessões de meditação
export const meditationSessions = pgTable('meditation_sessions', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: integer('user_id').references(() => users.id).notNull(),
  meditationId: text('meditation_id').notNull(),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  duration: integer('duration').notNull(), // em segundos
  wasCompleted: boolean('was_completed').notNull().default(false),
  rating: integer('rating'), // 1-5
  feedback: text('feedback'),
  moodBefore: integer('mood_before'), // 1-10
  moodAfter: integer('mood_after'), // 1-10
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Tarefas terapêuticas (MERGED)
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => users.id)
    .notNull(),
  psychologistId: integer("psychologist_id")
    .references(() => users.id)
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: text("category"),
  difficulty: text("difficulty"),
  estimatedTime: integer("estimated_time"), // em minutos
  status: text("status").default('pending').notNull(), // 'pending', 'in_progress', 'completed'
  priority: text("priority").default('media').notNull(), // 'baixa', 'media', 'alta'
  dueDate: timestamp("due_date"),
  assignedAt: timestamp("assigned_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Uso do sistema SOS (MERGED)
export const sosUsages = pgTable("sos_usages", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => users.id, { onDelete: 'set null' }),
  type: text("type"), // 'breathing', 'grounding', 'emergency'
  level: text("level").notNull(), // 'mild', 'moderate', 'severe', 'emergency'
  durationMinutes: integer("duration_minutes"),
  completed: boolean("completed").default(false),
  resolved: boolean("resolved").default(false),
  rating: integer("rating"), // 1-5
  feedback: text("feedback"),
  notes: text("notes"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Rastreamento de humor (MERGED)
export const moodTracking = pgTable("mood_tracking", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  date: timestamp("date").notNull().defaultNow(),
  mood: integer("mood").notNull(), // 1-10
  energy: integer("energy"), // 1-10
  anxiety: integer("anxiety"), // 1-10
  stressLevel: integer("stress_level"), // 1-10
  sleepQuality: integer("sleep_quality"), // 1-10
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Tabela de salas de chat
export const chatRooms = pgTable('chat_rooms', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  participantIds: text('participant_ids').notNull(), // JSON array de user IDs
  roomType: text('room_type').notNull().default('private'), // 'private', 'group'
  name: text('name'), // Para salas nomeadas
  isEncrypted: boolean('is_encrypted').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Tabela de mensagens do chat (KEEP FIRST VERSION - more complete with encryption)
export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  roomId: text('room_id').references(() => chatRooms.id, { onDelete: 'cascade' }).notNull(),
  senderId: integer('sender_id').references(() => users.id, { onDelete: 'set null' }),
  content: text('content'), // Conteúdo criptografado
  messageType: text('message_type').notNull().default('text'), // 'text', 'file', 'system'
  encryptionVersion: text('encryption_version').notNull().default('aes-256'),
  isTemporary: boolean('is_temporary').notNull().default(false),
  expiresAt: timestamp('expires_at'), // Para mensagens temporárias
  editedAt: timestamp('edited_at'),
  deletedAt: timestamp('deleted_at'),
  metadata: text('metadata'), // JSON para dados adicionais
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ==== MULTI-CLINIC TABLES ====

// Clínicas/Organizações
export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  logo: text("logo_url"),
  website: varchar("website", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  cnpj: varchar("cnpj", { length: 18 }),
  ownerId: integer("owner_id")
    .references(() => users.id)
    .notNull(),
  status: text("status").notNull().default("active"), // 'active', 'suspended', 'inactive'
  planType: text("plan_type").notNull().default("basic"), // 'basic', 'professional', 'enterprise'
  maxUsers: integer("max_users").notNull().default(10),
  maxPsychologists: integer("max_psychologists").notNull().default(5),
  maxPatients: integer("max_patients").notNull().default(50),
  settings: json("settings"), // Configurações gerais da clínica
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Usuários das clínicas (many-to-many relationship)
export const clinicUsers = pgTable("clinic_users", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id")
    .references(() => clinics.id)
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  role: text("role").notNull(), // 'owner', 'admin', 'psychologist', 'patient', 'staff'
  permissions: json("permissions"), // Permissões específicas do usuário na clínica
  status: text("status").notNull().default("active"), // 'active', 'suspended', 'pending'
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Configurações por clínica
export const clinicSettings = pgTable("clinic_settings", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id")
    .references(() => clinics.id)
    .notNull(),
  category: varchar("category", { length: 100 }).notNull(), // 'general', 'appearance', 'notifications', 'features'
  key: varchar("key", { length: 100 }).notNull(),
  value: json("value").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false), // Se a configuração é visível para usuários
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Logs de auditoria (MERGED - combined clinic support with compliance features)
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id")
    .references(() => clinics.id, { onDelete: 'set null' }),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: 'set null' }),
  action: varchar("action", { length: 100 }).notNull(), // 'create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'anonymize'
  resourceType: varchar("resource_type", { length: 50 }).notNull(), // 'user', 'patient', 'session', 'payment'
  resourceId: varchar("resource_id", { length: 50 }),
  oldValues: json("old_values"),
  newValues: json("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  metadata: text("metadata"), // JSON com dados adicionais
  timestamp: timestamp("timestamp").defaultNow(),
  severity: varchar("severity", { length: 20 }).default('info'), // 'info', 'warning', 'critical'
  complianceRelated: boolean("compliance_related").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Relatórios financeiros (cache para performance)
export const financialReports = pgTable("financial_reports", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id")
    .references(() => clinics.id)
    .notNull(),
  reportType: varchar("report_type", { length: 50 }).notNull(), // 'monthly', 'quarterly', 'yearly'
  period: varchar("period", { length: 20 }).notNull(), // '2024-01', '2024-Q1', '2024'
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).notNull().default("0"),
  totalSessions: integer("total_sessions").notNull().default(0),
  newPatients: integer("new_patients").notNull().default(0),
  activePatients: integer("active_patients").notNull().default(0),
  churnRate: decimal("churn_rate", { precision: 5, scale: 2 }).default("0"), // Percentage
  metrics: json("metrics"), // Métricas detalhadas
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
})

// Tabela de consentimentos LGPD/GDPR
export const userConsents = pgTable('user_consents', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  consentType: varchar('consent_type', { length: 100 }).notNull(), // 'data_processing', 'marketing', 'analytics', etc.
  consentGiven: boolean('consent_given').notNull(),
  consentDate: timestamp('consent_date').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  revokedAt: timestamp('revoked_at'),
  version: varchar('version', { length: 10 }).notNull().default('1.0'), // versão dos termos
  purpose: text('purpose').notNull(), // finalidade do tratamento
  legalBasis: varchar('legal_basis', { length: 50 }).notNull(), // base legal
  dataRetentionPeriod: integer('data_retention_period'), // em dias
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Tabela de arquivos do chat
export const chatFiles = pgTable('chat_files', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  messageId: text('message_id').references(() => chatMessages.id).notNull(),
  originalName: text('original_name').notNull(),
  fileName: text('file_name').notNull(), // Nome único no storage
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: text('mime_type').notNull(),
  isEncrypted: boolean('is_encrypted').notNull().default(true),
  encryptionKey: text('encryption_key'), // Chave específica do arquivo
  virusScanStatus: text('virus_scan_status').notNull().default('pending'), // 'pending', 'clean', 'infected'
  virusScanResult: text('virus_scan_result'), // JSON com detalhes do scan
  downloadCount: integer('download_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Tabela de recibos de leitura
export const messageReadReceipts = pgTable('message_read_receipts', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  messageId: text('message_id').references(() => chatMessages.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Tabela de chaves de criptografia por usuário
export const userEncryptionKeys = pgTable('user_encryption_keys', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: integer('user_id').references(() => users.id).notNull(),
  publicKey: text('public_key').notNull(),
  privateKeyEncrypted: text('private_key_encrypted').notNull(), // Chave privada criptografada com senha do usuário
  keyVersion: text('key_version').notNull().default('v1'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
})

// Tabela de backups criptografados
export const chatBackups = pgTable('chat_backups', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: integer('user_id').references(() => users.id).notNull(),
  roomId: text('room_id').references(() => chatRooms.id),
  backupData: text('backup_data').notNull(), // Dados criptografados
  backupType: text('backup_type').notNull().default('full'), // 'full', 'incremental'
  encryptionKey: text('encryption_key').notNull(),
  messageCount: integer('message_count').notNull().default(0),
  fileCount: integer('file_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Tabela de exportações de dados
export const dataExports = pgTable('data_exports', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  format: varchar('format', { length: 10 }).notNull(), // 'json', 'csv'
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  filePath: text('file_path'), // caminho do arquivo gerado
  fileSize: integer('file_size'), // tamanho em bytes
  expiresAt: timestamp('expires_at'), // quando o arquivo expira
  downloadCount: integer('download_count').notNull().default(0),
  ipAddress: varchar('ip_address', { length: 45 }),
  errorMessage: text('error_message'),
})

// Tabela de configurações de privacidade do usuário
export const userPrivacySettings = pgTable('user_privacy_settings', {
  userId: integer('user_id').references(() => users.id).primaryKey(),
  dataProcessingConsent: boolean('data_processing_consent').notNull().default(false),
  marketingConsent: boolean('marketing_consent').notNull().default(false),
  analyticsConsent: boolean('analytics_consent').notNull().default(false),
  shareDataWithPsychologist: boolean('share_data_with_psychologist').notNull().default(true),
  allowDataExport: boolean('allow_data_export').notNull().default(true),
  anonymizeAfterDeletion: boolean('anonymize_after_deletion').notNull().default(true),
  dataRetentionPreference: integer('data_retention_preference').default(2555), // em dias, padrão 7 anos
  notificationPreferences: text('notification_preferences'), // JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Tabela de insights clínicos gerados por IA
export const clinicalInsights = pgTable('clinical_insights', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => users.id).notNull(),
  psychologistId: integer('psychologist_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // 'session_analysis', 'pattern_detection', 'risk_assessment', 'progress_summary'
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(), // JSON string with insights
  severity: text('severity').notNull(), // 'info', 'warning', 'critical'
  status: text('status').notNull().default('active'), // 'active', 'reviewed', 'dismissed'
  metadata: text('metadata'), // JSON string with additional data
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: integer('reviewed_by').references(() => users.id),
})

// Tabela de alertas clínicos automáticos
export const clinicalAlerts = pgTable('clinical_alerts', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => users.id).notNull(),
  psychologistId: integer('psychologist_id').references(() => users.id).notNull(),
  alertType: text('alert_type').notNull(), // 'risk_escalation', 'pattern_change', 'mood_decline', 'session_concern'
  severity: text('severity').notNull(), // 'low', 'medium', 'high', 'critical'
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  recommendations: text('recommendations'), // JSON string with action recommendations
  triggeredBy: text('triggered_by'), // JSON string with trigger data
  isActive: boolean('is_active').notNull().default(true),
  acknowledgedAt: timestamp('acknowledged_at'),
  acknowledgedBy: integer('acknowledged_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Tabela de relatórios de progresso automáticos
export const progressReports = pgTable('progress_reports', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => users.id).notNull(),
  psychologistId: integer('psychologist_id').references(() => users.id).notNull(),
  reportType: text('report_type').notNull(), // 'weekly', 'monthly', 'session_summary', 'treatment_milestone'
  period: text('period').notNull(), // e.g., '2024-01-01_2024-01-07'
  summary: text('summary').notNull(),
  keyFindings: text('key_findings'), // JSON string
  recommendations: text('recommendations'), // JSON string
  moodTrends: text('mood_trends'), // JSON string
  riskAssessment: text('risk_assessment'), // JSON string
  progressScore: integer('progress_score'), // 0-100
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  sharedWithPatient: boolean('shared_with_patient').notNull().default(false),
  sharedAt: timestamp('shared_at'),
})

// User Settings for Calendar and Notifications (KEEP SECOND VERSION - more complete)
export const userSettings = pgTable("user_settings", {
  userId: integer("user_id")
    .references(() => users.id)
    .primaryKey(),
  timezone: text("timezone").default("America/Sao_Paulo"),
  theme: text("theme").default("light"),
  language: text("language").default("pt-BR"),
  // Notifications
  notifications: boolean("notifications").default(true),
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  pushNotifications: boolean("push_notifications").default(false),
  pushSubscription: text("push_subscription"), // JSON stringified PushSubscription
  // Calendar integrations
  googleCalendarEnabled: boolean("google_calendar_enabled").default(false),
  googleCalendarAccessToken: text("google_calendar_access_token"),
  googleCalendarRefreshToken: text("google_calendar_refresh_token"),
  outlookCalendarEnabled: boolean("outlook_calendar_enabled").default(false),
  outlookCalendarAccessToken: text("outlook_calendar_access_token"),
  outlookCalendarRefreshToken: text("outlook_calendar_refresh_token"),
  // Reminder preferences
  emailRemindersEnabled: boolean("email_reminders_enabled").default(true),
  smsRemindersEnabled: boolean("sms_reminders_enabled").default(false),
  reminderBefore24h: boolean("reminder_before_24h").default(true),
  reminderBefore1h: boolean("reminder_before_1h").default(true),
  reminderBefore15min: boolean("reminder_before_15min").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Tabela de notificações persistentes
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'message', 'session', 'sos', 'reminder', 'achievement', 'system'
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  priority: varchar("priority", { length: 20 }).default("normal"), // 'low', 'normal', 'high', 'urgent'
  category: varchar("category", { length: 50 }), // 'chat', 'therapy', 'emergency', 'gamification', 'admin'
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  actionUrl: text("action_url"), // URL to navigate when clicked
  actionLabel: varchar("action_label", { length: 100 }), // Label for action button
  metadata: jsonb("metadata"), // Additional data (IDs, context, etc.)
  expiresAt: timestamp("expires_at"), // Auto-delete after this date
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_notifications_user").on(table.userId),
  unreadIdx: index("idx_notifications_unread").on(table.userId, table.isRead, table.createdAt),
  typeIdx: index("idx_notifications_type").on(table.type, table.createdAt),
  expiresIdx: index("idx_notifications_expires").on(table.expiresAt),
}))

// Tabela de fontes de áudio para meditação
export const audioSources = pgTable('audio_sources', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  url: text('url').notNull(),
  license: text('license').notNull(), // 'creative_commons', 'public_domain', 'royalty_free', 'fair_use'
  licenseDetails: text('license_details'),
  attribution: text('attribution'),
  author: varchar('author', { length: 255 }).notNull(),
  duration: integer('duration').notNull().default(0), // em segundos
  category: text('category').notNull(), // 'meditation', 'nature', 'binaural', 'music', 'voice'
  tags: jsonb('tags').default([]), // array de strings
  language: varchar('language', { length: 10 }), // 'pt-BR', 'pt-PT', 'en', 'es'
  quality: text('quality').notNull().default('medium'), // 'low', 'medium', 'high'
  format: text('format').notNull().default('mp3'), // 'mp3', 'wav', 'ogg'
  downloadUrl: text('download_url'),
  embedUrl: text('embed_url'),
  isVerified: boolean('is_verified').default(false),
  addedBy: integer('added_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Tabela de categorias de meditação
export const meditationCategories = pgTable('meditation_categories', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 10 }).notNull(),
  color: varchar('color', { length: 7 }).notNull().default('#6366f1'),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Tabela de áudios de meditação
export const meditationAudios = pgTable('meditation_audios', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  categoryId: text('category_id').references(() => meditationCategories.id).notNull(),
  duration: integer('duration').notNull(), // em segundos
  difficulty: varchar('difficulty', { length: 20 }).notNull(), // 'iniciante', 'intermediario', 'avancado'
  instructor: varchar('instructor', { length: 255 }).notNull(),
  audioUrl: text('audio_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  transcript: text('transcript'),
  guidedSteps: text('guided_steps'), // JSON array
  benefits: text('benefits'), // JSON array
  techniques: text('techniques'), // JSON array
  preparationSteps: text('preparation_steps'), // JSON array
  tags: text('tags'), // JSON array
  language: varchar('language', { length: 10 }).notNull().default('pt-BR'),
  // Audio quality and technical info
  fileSize: integer('file_size'), // em bytes
  format: varchar('format', { length: 10 }).notNull().default('mp3'),
  bitrate: integer('bitrate'), // kbps
  sampleRate: integer('sample_rate'), // Hz
  // Legal and licensing
  sourceUrl: text('source_url'),
  license: varchar('license', { length: 100 }).notNull(),
  attribution: text('attribution'),
  isCommercialUse: boolean('is_commercial_use').notNull().default(false),
  // Statistics and engagement
  playCount: integer('play_count').notNull().default(0),
  averageRating: integer('average_rating').default(0), // stored as integer (rating * 100)
  ratingCount: integer('rating_count').notNull().default(0),
  // Status and moderation
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active', 'inactive', 'pending', 'archived'
  moderationNotes: text('moderation_notes'),
  isPopular: boolean('is_popular').notNull().default(false),
  isFeatured: boolean('is_featured').notNull().default(false),
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  lastModifiedBy: integer('last_modified_by').references(() => users.id),
})

// Tabela de trilhas de meditação
export const meditationTracks = pgTable('meditation_tracks', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  categoryId: text('category_id').references(() => meditationCategories.id).notNull(),
  difficulty: varchar('difficulty', { length: 20 }).notNull(),
  weekNumber: integer('week_number').notNull(),
  theme: varchar('theme', { length: 255 }).notNull(),
  objective: text('objective').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  // Statistics
  enrollmentCount: integer('enrollment_count').notNull().default(0),
  completionCount: integer('completion_count').notNull().default(0),
  averageRating: integer('average_rating').default(0),
  ratingCount: integer('rating_count').notNull().default(0),
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
})

// Tabela de relacionamento entre trilhas e áudios
export const meditationTrackAudios = pgTable('meditation_track_audios', {
  trackId: text('track_id').references(() => meditationTracks.id).notNull(),
  audioId: text('audio_id').references(() => meditationAudios.id).notNull(),
  week: integer('week').notNull(),
  day: integer('day').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  isRequired: boolean('is_required').notNull().default(true),
  unlockConditions: text('unlock_conditions'), // JSON
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Tabela de avaliações de áudios
export const meditationAudioRatings = pgTable('meditation_audio_ratings', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: integer('user_id').references(() => users.id).notNull(),
  audioId: text('audio_id').references(() => meditationAudios.id).notNull(),
  rating: integer('rating').notNull(), // 1-5
  review: text('review'),
  helpfulCount: integer('helpful_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Tabela de favoritos do usuário
export const userMeditationFavorites = pgTable('user_meditation_favorites', {
  userId: integer('user_id').references(() => users.id).notNull(),
  audioId: text('audio_id').references(() => meditationAudios.id).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Tabela de progresso do usuário em trilhas
export const userTrackProgress = pgTable('user_track_progress', {
  userId: integer('user_id').references(() => users.id).notNull(),
  trackId: text('track_id').references(() => meditationTracks.id).notNull(),
  currentWeek: integer('current_week').notNull().default(1),
  currentDay: integer('current_day').notNull().default(1),
  completedAudios: text('completed_audios'), // JSON array of audio IDs
  startedAt: timestamp('started_at').notNull().defaultNow(),
  lastAccessedAt: timestamp('last_accessed_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  rating: integer('rating'), // 1-5
  feedback: text('feedback'),
})

// Stripe Subscription System Tables
export const customers = pgTable('customers', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  stripeCustomerId: text('stripe_customer_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Subscriptions (KEEP STRIPE VERSION - more current)
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: integer('user_id').references(() => users.id).notNull(),
  customerId: text('customer_id').references(() => customers.id).notNull(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  stripeCustomerId: text('stripe_customer_id').notNull(),
  status: text('status').notNull(), // active, canceled, incomplete, incomplete_expired, past_due, trialing, unpaid
  planId: text('plan_id').notNull(), // essential, professional, clinic
  planName: text('plan_name').notNull(),
  priceId: text('price_id').notNull(),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  canceledAt: timestamp('canceled_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const subscriptionPlans = pgTable('subscription_plans', {
  id: text('id').primaryKey(), // essential, professional, clinic
  name: text('name').notNull(),
  description: text('description').notNull(),
  priceMonthly: integer('price_monthly').notNull(), // in cents
  priceYearly: integer('price_yearly'), // in cents
  stripePriceIdMonthly: text('stripe_price_id_monthly').notNull(),
  stripePriceIdYearly: text('stripe_price_id_yearly'),
  features: text('features').notNull(), // JSON array
  maxPatients: integer('max_patients'), // null = unlimited
  isPopular: boolean('is_popular').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Payments (KEEP STRIPE VERSION)
export const payments = pgTable('payments', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: integer('user_id').references(() => users.id).notNull(),
  subscriptionId: text('subscription_id').references(() => subscriptions.id),
  stripePaymentIntentId: text('stripe_payment_intent_id').notNull().unique(),
  stripeChargeId: text('stripe_charge_id'),
  amount: integer('amount').notNull(), // in cents
  currency: text('currency').notNull().default('brl'),
  status: text('status').notNull(), // succeeded, pending, failed, canceled, requires_action
  description: text('description'),
  receiptUrl: text('receipt_url'),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: integer('user_id').references(() => users.id).notNull(),
  subscriptionId: text('subscription_id').references(() => subscriptions.id),
  stripeInvoiceId: text('stripe_invoice_id').notNull().unique(),
  invoiceNumber: text('invoice_number').notNull(),
  status: text('status').notNull(), // draft, open, paid, void, uncollectible
  amountDue: integer('amount_due').notNull(), // in cents
  amountPaid: integer('amount_paid').notNull().default(0), // in cents
  currency: text('currency').notNull().default('brl'),
  description: text('description'),
  invoiceUrl: text('invoice_url'),
  hostedInvoiceUrl: text('hosted_invoice_url'),
  invoicePdf: text('invoice_pdf'),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const paymentFailures = pgTable('payment_failures', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: integer('user_id').references(() => users.id).notNull(),
  subscriptionId: text('subscription_id').references(() => subscriptions.id),
  paymentId: text('payment_id').references(() => payments.id),
  failureCode: text('failure_code'),
  failureMessage: text('failure_message'),
  retryCount: integer('retry_count').notNull().default(0),
  nextRetryAt: timestamp('next_retry_at'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Campos customizáveis para pacientes
export const customFields = pgTable("custom_fields", {
  id: serial("id").primaryKey(),
  psychologistId: integer("psychologist_id")
    .references(() => users.id)
    .notNull(),
  fieldName: varchar("field_name", { length: 255 }).notNull(),
  fieldType: text("field_type").notNull(), // 'text', 'number', 'select', 'date', 'boolean'
  fieldOptions: text("field_options"), // JSON for select options
  isRequired: boolean("is_required").default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Valores dos campos customizados
export const customFieldValues = pgTable("custom_field_values", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => users.id)
    .notNull(),
  customFieldId: integer("custom_field_id")
    .references(() => customFields.id)
    .notNull(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Métricas de progresso dos pacientes
export const progressMetrics = pgTable("progress_metrics", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => users.id)
    .notNull(),
  metricType: text("metric_type").notNull(), // 'mood_trend', 'session_frequency', 'diary_consistency', etc.
  value: integer("value").notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  period: text("period").notNull(), // 'daily', 'weekly', 'monthly'
})

// Metas terapêuticas
export const therapeuticGoals = pgTable("therapeutic_goals", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => users.id)
    .notNull(),
  psychologistId: integer("psychologist_id")
    .references(() => users.id)
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  targetValue: integer("target_value"),
  currentValue: integer("current_value").default(0),
  unit: varchar("unit", { length: 50 }), // 'sessions', 'days', 'points', etc.
  status: text("status").notNull().default("active"), // 'active', 'completed', 'paused', 'cancelled'
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
})

// Marcos de progresso das metas
export const goalMilestones = pgTable("goal_milestones", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id")
    .references(() => therapeuticGoals.id)
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  targetValue: integer("target_value").notNull(),
  achievedAt: timestamp("achieved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Configuração de alertas
export const alertConfigurations = pgTable("alert_configurations", {
  id: serial("id").primaryKey(),
  psychologistId: integer("psychologist_id")
    .references(() => users.id)
    .notNull(),
  alertType: text("alert_type").notNull(), // 'inactivity', 'mood_decline', 'goal_deadline', etc.
  isEnabled: boolean("is_enabled").default(true),
  threshold: integer("threshold"), // valor específico para trigger do alerta
  frequency: text("frequency").notNull(), // 'immediate', 'daily', 'weekly'
  notificationMethod: text("notification_method").notNull(), // 'email', 'push', 'both'
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Alertas gerados
export const generatedAlerts = pgTable("generated_alerts", {
  id: serial("id").primaryKey(),
  psychologistId: integer("psychologist_id")
    .references(() => users.id)
    .notNull(),
  patientId: integer("patient_id")
    .references(() => users.id)
    .notNull(),
  alertType: text("alert_type").notNull(),
  message: text("message").notNull(),
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  isRead: boolean("is_read").default(false),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
})

// Relatórios gerados
export const generatedReports = pgTable("generated_reports", {
  id: serial("id").primaryKey(),
  psychologistId: integer("psychologist_id")
    .references(() => users.id)
    .notNull(),
  patientId: integer("patient_id")
    .references(() => users.id),
  reportType: text("report_type").notNull(), // 'patient_progress', 'monthly_summary', 'goal_analysis', etc.
  format: text("format").notNull(), // 'pdf', 'doc', 'json'
  filePath: text("file_path"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  parameters: text("parameters"), // JSON com parâmetros utilizados
})

// ==== MEDICATION TRACKING SYSTEM (MEDIUM-12) ====

// Medications table - stores medication details
export const medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  genericName: varchar("generic_name", { length: 255 }),
  dosage: varchar("dosage", { length: 100 }).notNull(), // e.g., "10mg", "2.5ml", "1 tablet"
  form: varchar("form", { length: 50 }), // "tablet", "capsule", "liquid", "injection", "topical", "inhaler"
  purpose: text("purpose"), // Why this medication is prescribed
  prescribingDoctor: varchar("prescribing_doctor", { length: 255 }),
  prescriptionNumber: varchar("prescription_number", { length: 100 }),
  pharmacy: varchar("pharmacy", { length: 255 }),

  // Instructions
  instructions: text("instructions"), // How to take the medication
  foodInstructions: text("food_instructions"), // e.g., "Take with food", "On empty stomach"
  sideEffects: text("side_effects"), // Known side effects to monitor
  interactions: text("interactions"), // Drug interactions to be aware of

  // Dates
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // NULL for ongoing medications
  refillDate: date("refill_date"), // When to refill
  refillCount: integer("refill_count").default(0), // Number of refills allowed

  // Status
  isActive: boolean("is_active").default(true).notNull(),
  isAsNeeded: boolean("is_as_needed").default(false).notNull(), // PRN (Pro Re Nata) - take as needed

  // Tracking
  stockQuantity: integer("stock_quantity"), // Current stock
  lowStockThreshold: integer("low_stock_threshold"), // Alert when stock drops below this

  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userActiveIdx: index("idx_medications_user_active").on(table.userId, table.isActive),
  refillDateIdx: index("idx_medications_refill_date").on(table.refillDate),
}))

// Medication schedules - dosage schedules and reminders
export const medicationSchedules = pgTable("medication_schedules", {
  id: serial("id").primaryKey(),
  medicationId: integer("medication_id")
    .references(() => medications.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),

  // Schedule
  timeOfDay: time("time_of_day").notNull(), // e.g., "08:00", "14:00", "21:00"
  daysOfWeek: jsonb("days_of_week"), // [0,1,2,3,4,5,6] for Sunday-Saturday, NULL for every day
  frequency: varchar("frequency", { length: 50 }).notNull(), // "daily", "weekly", "monthly", "as_needed", "specific_days"

  // Dosage
  dosageAmount: varchar("dosage_amount", { length: 100 }).notNull(), // Amount to take at this time
  dosageUnit: varchar("dosage_unit", { length: 50 }), // "tablet(s)", "ml", "mg", "puff(s)"

  // Reminders
  reminderEnabled: boolean("reminder_enabled").default(true).notNull(),
  reminderMinutesBefore: integer("reminder_minutes_before").default(15), // Remind 15 minutes before
  notificationChannels: jsonb("notification_channels"), // ["push", "sms", "email"]

  // Status
  isActive: boolean("is_active").default(true).notNull(),

  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  medicationIdx: index("idx_medication_schedules_medication").on(table.medicationId, table.isActive),
  userActiveIdx: index("idx_medication_schedules_user_active").on(table.userId, table.isActive),
  timeIdx: index("idx_medication_schedules_time").on(table.timeOfDay),
}))

// Medication logs - track actual medication intake
export const medicationLogs = pgTable("medication_logs", {
  id: serial("id").primaryKey(),
  medicationId: integer("medication_id")
    .references(() => medications.id, { onDelete: 'cascade' })
    .notNull(),
  scheduleId: integer("schedule_id")
    .references(() => medicationSchedules.id, { onDelete: 'set null' }),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),

  // Timing
  scheduledTime: timestamp("scheduled_time", { withTimezone: true }).notNull(), // When it was supposed to be taken
  actualTime: timestamp("actual_time", { withTimezone: true }), // When it was actually taken (NULL if skipped)

  // Dosage
  dosageTaken: varchar("dosage_taken", { length: 100 }), // Actual dosage taken (may differ from scheduled)

  // Status
  status: varchar("status", { length: 50 }).notNull().default('pending'), // "taken", "skipped", "missed", "pending"
  skipReason: varchar("skip_reason", { length: 100 }), // If skipped: "forgot", "side_effects", "no_medication", "other"
  skipNotes: text("skip_notes"), // Additional notes if skipped

  // Side effects tracking
  hadSideEffects: boolean("had_side_effects").default(false),
  sideEffectsDescription: text("side_effects_description"),

  // Effectiveness
  effectivenessRating: integer("effectiveness_rating"), // 1-5 scale
  effectivenessNotes: text("effectiveness_notes"),

  // Mood/condition tracking
  moodBefore: integer("mood_before"), // 1-10 scale
  moodAfter: integer("mood_after"), // 1-10 scale
  symptomsBefore: text("symptoms_before"),
  symptomsAfter: text("symptoms_after"),

  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  medicationIdx: index("idx_medication_logs_medication").on(table.medicationId, table.scheduledTime),
  userIdx: index("idx_medication_logs_user").on(table.userId, table.scheduledTime),
  statusIdx: index("idx_medication_logs_status").on(table.status, table.scheduledTime),
  actualTimeIdx: index("idx_medication_logs_actual_time").on(table.actualTime),
}))

// Medication reminders - queue for cron processing
export const medicationReminders = pgTable("medication_reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  medicationId: integer("medication_id")
    .references(() => medications.id, { onDelete: 'cascade' })
    .notNull(),
  scheduleId: integer("schedule_id")
    .references(() => medicationSchedules.id, { onDelete: 'cascade' })
    .notNull(),
  logId: integer("log_id")
    .references(() => medicationLogs.id, { onDelete: 'set null' }),

  // Timing
  reminderTime: timestamp("reminder_time", { withTimezone: true }).notNull(), // When to send the reminder
  medicationTime: timestamp("medication_time", { withTimezone: true }).notNull(), // When the medication should be taken

  // Status
  status: varchar("status", { length: 50 }).notNull().default('pending'), // "pending", "sent", "acknowledged", "dismissed"
  sentAt: timestamp("sent_at", { withTimezone: true }),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),

  // Channels
  notificationChannels: jsonb("notification_channels").notNull(), // ["push", "sms", "email"]
  sentChannels: jsonb("sent_channels"), // Which channels were successfully sent

  // Metadata
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("idx_medication_reminders_user").on(table.userId, table.reminderTime),
  pendingIdx: index("idx_medication_reminders_pending").on(table.status, table.reminderTime),
  medicationIdx: index("idx_medication_reminders_medication").on(table.medicationId),
}))

// ==== RELATIONS ====

// Relações dos usuários
export const usersRelations = relations(users, ({ one, many }) => ({
  psychologistProfile: one(psychologistProfiles, {
    fields: [users.id],
    references: [psychologistProfiles.userId],
  }),
  patientProfile: one(patientProfiles, {
    fields: [users.id],
    references: [patientProfiles.userId],
  }),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  diaryEntries: many(diaryEntries),
  userAchievements: many(userAchievements),
  userChallengeProgress: many(userChallengeProgress),
  leaderboardEntries: many(leaderboardEntries),
  meditationSessions: many(meditationSessions),
  tasksAsPatient: many(tasks),
  tasksAsPsychologist: many(tasks),
  sosUsages: many(sosUsages),
  moodTracking: many(moodTracking),
  ownedClinics: many(clinics),
  clinicMemberships: many(clinicUsers),
  auditLogs: many(auditLogs),
  customFields: many(customFields),
  customFieldValues: many(customFieldValues),
  progressMetrics: many(progressMetrics),
  therapeuticGoals: many(therapeuticGoals),
  alertConfigurations: many(alertConfigurations),
  generatedAlerts: many(generatedAlerts),
  generatedReports: many(generatedReports),
  notifications: many(notifications),
  medications: many(medications),
  medicationSchedules: many(medicationSchedules),
  medicationLogs: many(medicationLogs),
  medicationReminders: many(medicationReminders),
}))

// Custom Fields Relations
export const customFieldsRelations = relations(customFields, ({ one, many }) => ({
  psychologist: one(users, {
    fields: [customFields.psychologistId],
    references: [users.id],
  }),
  values: many(customFieldValues),
}))

export const customFieldValuesRelations = relations(customFieldValues, ({ one }) => ({
  patient: one(users, {
    fields: [customFieldValues.patientId],
    references: [users.id],
  }),
  customField: one(customFields, {
    fields: [customFieldValues.customFieldId],
    references: [customFields.id],
  }),
}))

// Progress Metrics Relations
export const progressMetricsRelations = relations(progressMetrics, ({ one }) => ({
  patient: one(users, {
    fields: [progressMetrics.patientId],
    references: [users.id],
  }),
}))

// Therapeutic Goals Relations
export const therapeuticGoalsRelations = relations(therapeuticGoals, ({ one, many }) => ({
  patient: one(users, {
    fields: [therapeuticGoals.patientId],
    references: [users.id],
  }),
  psychologist: one(users, {
    fields: [therapeuticGoals.psychologistId],
    references: [users.id],
  }),
  milestones: many(goalMilestones),
}))

export const goalMilestonesRelations = relations(goalMilestones, ({ one }) => ({
  goal: one(therapeuticGoals, {
    fields: [goalMilestones.goalId],
    references: [therapeuticGoals.id],
  }),
}))

// Alert Configuration Relations
export const alertConfigurationsRelations = relations(alertConfigurations, ({ one }) => ({
  psychologist: one(users, {
    fields: [alertConfigurations.psychologistId],
    references: [users.id],
  }),
}))

export const generatedAlertsRelations = relations(generatedAlerts, ({ one }) => ({
  psychologist: one(users, {
    fields: [generatedAlerts.psychologistId],
    references: [users.id],
  }),
  patient: one(users, {
    fields: [generatedAlerts.patientId],
    references: [users.id],
  }),
}))

// Generated Reports Relations
export const generatedReportsRelations = relations(generatedReports, ({ one }) => ({
  psychologist: one(users, {
    fields: [generatedReports.psychologistId],
    references: [users.id],
  }),
  patient: one(users, {
    fields: [generatedReports.patientId],
    references: [users.id],
  }),
}))

export const psychologistProfilesRelations = relations(psychologistProfiles, ({ one }) => ({
  user: one(users, {
    fields: [psychologistProfiles.userId],
    references: [users.id],
  }),
}))

export const patientProfilesRelations = relations(patientProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [patientProfiles.userId],
    references: [users.id],
  }),
  psychologist: one(users, {
    fields: [patientProfiles.psychologistId],
    references: [users.id],
  }),
  clinic: one(clinics, {
    fields: [patientProfiles.clinicId],
    references: [clinics.id],
  }),
  sessions: many(sessions),
  diaryEntries: many(diaryEntries),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  clinic: one(clinics, {
    fields: [sessions.clinicId],
    references: [clinics.id],
  }),
  psychologist: one(users, {
    fields: [sessions.psychologistId],
    references: [users.id],
  }),
  patient: one(users, {
    fields: [sessions.patientId],
    references: [users.id],
  }),
}))

export const diaryEntriesRelations = relations(diaryEntries, ({ one }) => ({
  patient: one(users, {
    fields: [diaryEntries.patientId],
    references: [users.id],
  }),
}))

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}))

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}))

export const pointActivitiesRelations = relations(pointActivities, ({ one }) => ({
  user: one(users, {
    fields: [pointActivities.userId],
    references: [users.id],
  }),
}))

export const weeklyChallengesRelations = relations(weeklyChallenges, ({ many }) => ({
  userChallengeProgress: many(userChallengeProgress),
}))

export const userChallengeProgressRelations = relations(userChallengeProgress, ({ one }) => ({
  user: one(users, {
    fields: [userChallengeProgress.userId],
    references: [users.id],
  }),
  challenge: one(weeklyChallenges, {
    fields: [userChallengeProgress.challengeId],
    references: [weeklyChallenges.id],
  }),
}))

export const virtualRewardsRelations = relations(virtualRewards, ({ many }) => ({
  userRewards: many(userRewards),
}))

export const userRewardsRelations = relations(userRewards, ({ one }) => ({
  user: one(users, {
    fields: [userRewards.userId],
    references: [users.id],
  }),
  reward: one(virtualRewards, {
    fields: [userRewards.rewardId],
    references: [virtualRewards.id],
  }),
}))

export const leaderboardsRelations = relations(leaderboards, ({ many }) => ({
  leaderboardEntries: many(leaderboardEntries),
}))

export const leaderboardEntriesRelations = relations(leaderboardEntries, ({ one }) => ({
  leaderboard: one(leaderboards, {
    fields: [leaderboardEntries.leaderboardId],
    references: [leaderboards.id],
  }),
  user: one(users, {
    fields: [leaderboardEntries.userId],
    references: [users.id],
  }),
}))

export const meditationSessionsRelations = relations(meditationSessions, ({ one }) => ({
  user: one(users, {
    fields: [meditationSessions.userId],
    references: [users.id],
  }),
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
  patient: one(users, {
    fields: [tasks.patientId],
    references: [users.id],
  }),
  psychologist: one(users, {
    fields: [tasks.psychologistId],
    references: [users.id],
  }),
}))

export const sosUsagesRelations = relations(sosUsages, ({ one }) => ({
  patient: one(users, {
    fields: [sosUsages.patientId],
    references: [users.id],
  }),
}))

export const moodTrackingRelations = relations(moodTracking, ({ one }) => ({
  patient: one(users, {
    fields: [moodTracking.patientId],
    references: [users.id],
  }),
}))

// Chat Relations
export const chatRoomsRelations = relations(chatRooms, ({ many }) => ({
  messages: many(chatMessages),
  backups: many(chatBackups),
}))

export const chatMessagesRelations = relations(chatMessages, ({ one, many }) => ({
  room: one(chatRooms, {
    fields: [chatMessages.roomId],
    references: [chatRooms.id],
  }),
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
  }),
  files: many(chatFiles),
  readReceipts: many(messageReadReceipts),
}))

export const chatFilesRelations = relations(chatFiles, ({ one }) => ({
  message: one(chatMessages, {
    fields: [chatFiles.messageId],
    references: [chatMessages.id],
  }),
}))

export const messageReadReceiptsRelations = relations(messageReadReceipts, ({ one }) => ({
  message: one(chatMessages, {
    fields: [messageReadReceipts.messageId],
    references: [chatMessages.id],
  }),
  user: one(users, {
    fields: [messageReadReceipts.userId],
    references: [users.id],
  }),
}))

export const userEncryptionKeysRelations = relations(userEncryptionKeys, ({ one }) => ({
  user: one(users, {
    fields: [userEncryptionKeys.userId],
    references: [users.id],
  }),
}))

export const chatBackupsRelations = relations(chatBackups, ({ one }) => ({
  user: one(users, {
    fields: [chatBackups.userId],
    references: [users.id],
  }),
  room: one(chatRooms, {
    fields: [chatBackups.roomId],
    references: [chatRooms.id],
  }),
}))

// Multi-clinic Relations
export const clinicsRelations = relations(clinics, ({ one, many }) => ({
  owner: one(users, {
    fields: [clinics.ownerId],
    references: [users.id],
  }),
  clinicUsers: many(clinicUsers),
  settings: many(clinicSettings),
  auditLogs: many(auditLogs),
  financialReports: many(financialReports),
}))

export const clinicUsersRelations = relations(clinicUsers, ({ one }) => ({
  clinic: one(clinics, {
    fields: [clinicUsers.clinicId],
    references: [clinics.id],
  }),
  user: one(users, {
    fields: [clinicUsers.userId],
    references: [users.id],
  }),
}))

export const clinicSettingsRelations = relations(clinicSettings, ({ one }) => ({
  clinic: one(clinics, {
    fields: [clinicSettings.clinicId],
    references: [clinics.id],
  }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  clinic: one(clinics, {
    fields: [auditLogs.clinicId],
    references: [clinics.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}))

export const financialReportsRelations = relations(financialReports, ({ one }) => ({
  clinic: one(clinics, {
    fields: [financialReports.clinicId],
    references: [clinics.id],
  }),
}))

// GDPR/Privacy Relations
export const userConsentsRelations = relations(userConsents, ({ one }) => ({
  user: one(users, {
    fields: [userConsents.userId],
    references: [users.id],
  }),
}))

export const dataExportsRelations = relations(dataExports, ({ one }) => ({
  user: one(users, {
    fields: [dataExports.userId],
    references: [users.id],
  }),
}))

export const userPrivacySettingsRelations = relations(userPrivacySettings, ({ one }) => ({
  user: one(users, {
    fields: [userPrivacySettings.userId],
    references: [users.id],
  }),
}))

// Clinical AI Relations
export const clinicalInsightsRelations = relations(clinicalInsights, ({ one }) => ({
  patient: one(users, {
    fields: [clinicalInsights.patientId],
    references: [users.id],
  }),
  psychologist: one(users, {
    fields: [clinicalInsights.psychologistId],
    references: [users.id],
  }),
  reviewedByUser: one(users, {
    fields: [clinicalInsights.reviewedBy],
    references: [users.id],
  }),
}))

export const clinicalAlertsRelations = relations(clinicalAlerts, ({ one }) => ({
  patient: one(users, {
    fields: [clinicalAlerts.patientId],
    references: [users.id],
  }),
  psychologist: one(users, {
    fields: [clinicalAlerts.psychologistId],
    references: [users.id],
  }),
  acknowledgedByUser: one(users, {
    fields: [clinicalAlerts.acknowledgedBy],
    references: [users.id],
  }),
}))

export const progressReportsRelations = relations(progressReports, ({ one }) => ({
  patient: one(users, {
    fields: [progressReports.patientId],
    references: [users.id],
  }),
  psychologist: one(users, {
    fields: [progressReports.psychologistId],
    references: [users.id],
  }),
}))

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}))

export const audioSourcesRelations = relations(audioSources, ({ one }) => ({
  addedByUser: one(users, {
    fields: [audioSources.addedBy],
    references: [users.id],
  }),
}))

// Meditation Relations
export const meditationCategoriesRelations = relations(meditationCategories, ({ many }) => ({
  audios: many(meditationAudios),
  tracks: many(meditationTracks),
}))

export const meditationAudiosRelations = relations(meditationAudios, ({ one, many }) => ({
  category: one(meditationCategories, {
    fields: [meditationAudios.categoryId],
    references: [meditationCategories.id],
  }),
  sessions: many(meditationSessions),
  ratings: many(meditationAudioRatings),
  favorites: many(userMeditationFavorites),
  trackAudios: many(meditationTrackAudios),
  createdByUser: one(users, {
    fields: [meditationAudios.createdBy],
    references: [users.id],
  }),
  lastModifiedByUser: one(users, {
    fields: [meditationAudios.lastModifiedBy],
    references: [users.id],
  }),
}))

export const meditationTracksRelations = relations(meditationTracks, ({ one, many }) => ({
  category: one(meditationCategories, {
    fields: [meditationTracks.categoryId],
    references: [meditationCategories.id],
  }),
  trackAudios: many(meditationTrackAudios),
  userProgress: many(userTrackProgress),
  createdByUser: one(users, {
    fields: [meditationTracks.createdBy],
    references: [users.id],
  }),
}))

export const meditationTrackAudiosRelations = relations(meditationTrackAudios, ({ one }) => ({
  track: one(meditationTracks, {
    fields: [meditationTrackAudios.trackId],
    references: [meditationTracks.id],
  }),
  audio: one(meditationAudios, {
    fields: [meditationTrackAudios.audioId],
    references: [meditationAudios.id],
  }),
}))

export const meditationAudioRatingsRelations = relations(meditationAudioRatings, ({ one }) => ({
  user: one(users, {
    fields: [meditationAudioRatings.userId],
    references: [users.id],
  }),
  audio: one(meditationAudios, {
    fields: [meditationAudioRatings.audioId],
    references: [meditationAudios.id],
  }),
}))

export const userMeditationFavoritesRelations = relations(userMeditationFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userMeditationFavorites.userId],
    references: [users.id],
  }),
  audio: one(meditationAudios, {
    fields: [userMeditationFavorites.audioId],
    references: [meditationAudios.id],
  }),
}))

export const userTrackProgressRelations = relations(userTrackProgress, ({ one }) => ({
  user: one(users, {
    fields: [userTrackProgress.userId],
    references: [users.id],
  }),
  track: one(meditationTracks, {
    fields: [userTrackProgress.trackId],
    references: [meditationTracks.id],
  }),
}))

// Stripe Subscription Relations
export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  subscriptions: many(subscriptions),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [subscriptions.customerId],
    references: [customers.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [subscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  payments: many(payments),
  invoices: many(invoices),
  paymentFailures: many(paymentFailures),
}))

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
  }),
}))

export const invoicesRelations = relations(invoices, ({ one }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
}))

export const paymentFailuresRelations = relations(paymentFailures, ({ one }) => ({
  user: one(users, {
    fields: [paymentFailures.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [paymentFailures.subscriptionId],
    references: [subscriptions.id],
  }),
  payment: one(payments, {
    fields: [paymentFailures.paymentId],
    references: [payments.id],
  }),
}))

// Medication Tracking Relations
export const medicationsRelations = relations(medications, ({ one, many }) => ({
  user: one(users, {
    fields: [medications.userId],
    references: [users.id],
  }),
  schedules: many(medicationSchedules),
  logs: many(medicationLogs),
  reminders: many(medicationReminders),
}))

export const medicationSchedulesRelations = relations(medicationSchedules, ({ one, many }) => ({
  medication: one(medications, {
    fields: [medicationSchedules.medicationId],
    references: [medications.id],
  }),
  user: one(users, {
    fields: [medicationSchedules.userId],
    references: [users.id],
  }),
  logs: many(medicationLogs),
  reminders: many(medicationReminders),
}))

export const medicationLogsRelations = relations(medicationLogs, ({ one }) => ({
  medication: one(medications, {
    fields: [medicationLogs.medicationId],
    references: [medications.id],
  }),
  schedule: one(medicationSchedules, {
    fields: [medicationLogs.scheduleId],
    references: [medicationSchedules.id],
  }),
  user: one(users, {
    fields: [medicationLogs.userId],
    references: [users.id],
  }),
  reminder: one(medicationReminders, {
    fields: [medicationLogs.id],
    references: [medicationReminders.logId],
  }),
}))

export const medicationRemindersRelations = relations(medicationReminders, ({ one }) => ({
  user: one(users, {
    fields: [medicationReminders.userId],
    references: [users.id],
  }),
  medication: one(medications, {
    fields: [medicationReminders.medicationId],
    references: [medications.id],
  }),
  schedule: one(medicationSchedules, {
    fields: [medicationReminders.scheduleId],
    references: [medicationSchedules.id],
  }),
  log: one(medicationLogs, {
    fields: [medicationReminders.logId],
    references: [medicationLogs.id],
  }),
}))

// Webhook Events (for Stripe webhook idempotency and audit)
export const webhookEvents = pgTable('webhook_events', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  stripeEventId: text('stripe_event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  eventData: json('event_data').notNull(),
  processed: boolean('processed').notNull().default(false),
  error: text('error'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Payment Audit Logs (for compliance and security)
export const paymentAuditLogs = pgTable('payment_audit_logs', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  metadata: json('metadata'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Security Events (for fraud detection and monitoring)
export const securityEvents = pgTable('security_events', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  eventType: text('event_type').notNull(),
  severity: text('severity').notNull(),
  description: text('description').notNull(),
  userId: integer('user_id').references(() => users.id),
  metadata: json('metadata'),
  resolved: boolean('resolved').notNull().default(false),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: integer('resolved_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
