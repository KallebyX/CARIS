import { pgTable, serial, text, integer, timestamp, boolean, varchar, date, decimal, json } from "drizzle-orm/pg-core"
import { pgTable, serial, text, integer, timestamp, boolean, varchar, date, jsonb } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

// Tabela de usuários
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password_hash").notNull(),
  role: text("role").notNull(), // 'psychologist', 'patient', 'admin', 'clinic_owner', 'clinic_admin'
  avatarUrl: text("avatar_url"),
  isGlobalAdmin: boolean("is_global_admin").default(false), // Super admin for platform
  status: text("status").notNull().default("active"), // 'active', 'suspended', 'inactive'
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Perfis de psicólogos
export const psychologistProfiles = pgTable("psychologist_profiles", {
  userId: integer("user_id")
    .references(() => users.id)
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
    .references(() => users.id)
    .primaryKey(),
  psychologistId: integer("psychologist_id")
    .references(() => users.id),
  clinicId: integer("clinic_id")
    .references(() => clinics.id),
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
    .references(() => clinics.id)
    .notNull(),
  psychologistId: integer("psychologist_id")
    .references(() => users.id)
    .notNull(),
  patientId: integer("patient_id")
    .references(() => users.id)
    .notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(50), // em minutos
  type: text("type").notNull().default('therapy'), // 'therapy', 'consultation', 'group'
  status: text("status").notNull().default('scheduled'), // 'scheduled', 'confirmed', 'completed', 'cancelled'
  notes: text("notes"),
  sessionValue: decimal("session_value", { precision: 8, scale: 2 }),
  paymentStatus: text("payment_status").default("pending"), // 'pending', 'paid', 'refunded'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Entradas do diário
export const diaryEntries = pgTable("diary_entries", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => users.id)
    .notNull(),
  entryDate: timestamp("entry_date").defaultNow().notNull(),
  moodRating: integer("mood_rating"),
  intensityRating: integer("intensity_rating"),
  content: text("content"),
  cycle: text("cycle"),
  emotions: text("emotions"), // jsonb
  // AI Analysis fields
  aiAnalyzed: boolean("ai_analyzed").default(false),
  dominantEmotion: text("dominant_emotion"),
  emotionIntensity: integer("emotion_intensity"),
  sentimentScore: integer("sentiment_score"), // stored as integer (-100 to 100)
  riskLevel: text("risk_level"), // 'low', 'medium', 'high', 'critical'
  aiInsights: text("ai_insights"), // JSON string
  suggestedActions: text("suggested_actions"), // JSON string
  plutchikCategories: text("plutchik_categories"), // JSON string
})

// Conquistas
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
})

// Conquistas do usuário
export const userAchievements = pgTable("user_achievements", {
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  achievementId: integer("achievement_id")
    .references(() => achievements.id)
    .notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
})

// Relações
export const usersRelations = relations(users, ({ one, many }) => ({
  psychologistProfile: one(psychologistProfiles, {
    fields: [users.id],
    references: [psychologistProfiles.userId],
  }),
  patientProfile: one(patientProfiles, {
    fields: [users.id],
    references: [patientProfiles.userId],
  }),
  diaryEntries: many(diaryEntries),
  userAchievements: many(userAchievements),
  ownedClinics: many(clinics),
  clinicMemberships: many(clinicUsers),
  auditLogs: many(auditLogs),
}))

export const psychologistProfilesRelations = relations(psychologistProfiles, ({ one }) => ({
  user: one(users, {
    fields: [psychologistProfiles.userId],
    references: [users.id],
  }),
}))

export const patientProfilesRelations = relations(patientProfiles, ({ one }) => ({
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

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}))

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

export const meditationSessionsRelations = relations(meditationSessions, ({ one }) => ({
  user: one(users, {
    fields: [meditationSessions.userId],
    references: [users.id],
  }),
}))

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

// Tabela de mensagens do chat
export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  roomId: text('room_id').references(() => chatRooms.id).notNull(),
  senderId: integer('sender_id').references(() => users.id).notNull(),
  content: text('content'), // Conteúdo criptografado
  messageType: text('message_type').notNull().default('text'), // 'text', 'file', 'system'
  encryptionVersion: text('encryption_version').notNull().default('aes-256'),
  isTemporary: boolean('is_temporary').notNull().default(false),
  expiresAt: timestamp('expires_at'), // Para mensagens temporárias
  editedAt: timestamp('edited_at'),
  deletedAt: timestamp('deleted_at'),
  metadata: text('metadata'), // JSON para dados adicionais

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

// Assinaturas/Planos
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id")
    .references(() => clinics.id)
    .notNull(),
  planType: text("plan_type").notNull(), // 'basic', 'professional', 'enterprise'
  status: text("status").notNull(), // 'active', 'cancelled', 'past_due', 'trialing'
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  trialEnd: timestamp("trial_end"),
  cancelledAt: timestamp("cancelled_at"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
  paymentMethod: text("payment_method"), // 'credit_card', 'bank_slip', 'pix'
  externalId: varchar("external_id", { length: 255 }), // ID no sistema de pagamento
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Pagamentos
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id")
    .references(() => subscriptions.id)
    .notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
  status: text("status").notNull(), // 'pending', 'paid', 'failed', 'refunded'
  paymentMethod: text("payment_method").notNull(),
  externalId: varchar("external_id", { length: 255 }), // ID no sistema de pagamento
  paidAt: timestamp("paid_at"),
  failedAt: timestamp("failed_at"),
  refundedAt: timestamp("refunded_at"),
  metadata: json("metadata"), // Metadados do pagamento
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Logs de auditoria
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id")
    .references(() => clinics.id),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  action: varchar("action", { length: 100 }).notNull(), // 'create', 'update', 'delete', 'login', 'logout'
  resource: varchar("resource", { length: 100 }).notNull(), // 'user', 'patient', 'session', 'payment'
  resourceId: integer("resource_id"),
  oldValues: json("old_values"),
  newValues: json("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
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

// ==== RELATIONS FOR MULTI-CLINIC TABLES ====

export const clinicsRelations = relations(clinics, ({ one, many }) => ({
  owner: one(users, {
    fields: [clinics.ownerId],
    references: [users.id],
  }),
  clinicUsers: many(clinicUsers),
  subscriptions: many(subscriptions),
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

// Relações para as novas tabelas
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

// Tabela de auditoria para compliance
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(), // 'create', 'read', 'update', 'delete', 'export', 'anonymize'
  resourceType: varchar('resource_type', { length: 50 }).notNull(), // 'user', 'diary_entry', 'session', etc.
  resourceId: varchar('resource_id', { length: 50 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  metadata: text('metadata'), // JSON com dados adicionais
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  severity: varchar('severity', { length: 20 }).notNull().default('info'), // 'info', 'warning', 'critical'
  complianceRelated: boolean('compliance_related').notNull().default(false),
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

// Tabela de mensagens de chat
export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id').references(() => users.id).notNull(),
  receiverId: integer('receiver_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
  readAt: timestamp('read_at'),
  isRead: boolean('is_read').default(false),
})

// Tabela de configurações do usuário
export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  notifications: boolean('notifications').default(true),
  emailNotifications: boolean('email_notifications').default(true),
  smsNotifications: boolean('sms_notifications').default(false),
  theme: text('theme').default('light'),
  language: text('language').default('pt-BR'),
  timezone: text('timezone').default('America/Sao_Paulo'),
})

// Tabela de rastreamento de humor
export const moodTracking = pgTable('mood_tracking', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => users.id).notNull(),
  date: timestamp('date').notNull().defaultNow(),
  moodScore: integer('mood_score').notNull(), // 1-10
  energyLevel: integer('energy_level'), // 1-10
  stressLevel: integer('stress_level'), // 1-10
  sleepQuality: integer('sleep_quality'), // 1-10
  notes: text('notes'),
})

// Tabela de tarefas terapêuticas
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => users.id).notNull(),
  psychologistId: integer('psychologist_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  difficulty: text('difficulty').notNull(),
  estimatedTime: integer('estimated_time'), // em minutos
  status: text('status').default('pending'), // pending, in_progress, completed
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  feedback: text('feedback'),
})

// Tabela de uso do SOS
export const sosUsages = pgTable('sos_usages', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => users.id).notNull(),
  level: text('level').notNull(), // mild, moderate, severe, emergency
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  resolved: boolean('resolved').default(false),
  resolvedAt: timestamp('resolved_at'),
  notes: text('notes'),
})

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

// Relações para as novas tabelas
export const userConsentsRelations = relations(userConsents, ({ one }) => ({
  user: one(users, {
    fields: [userConsents.userId],
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

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],

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


export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [subscriptions.clinicId],
    references: [clinics.id],
  }),
  payments: many(payments),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
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

export const dataExportsRelations = relations(dataExports, ({ one }) => ({
  user: one(users, {
    fields: [dataExports.userId],

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

export const audioSourcesRelations = relations(audioSources, ({ one }) => ({
  addedByUser: one(users, {
    fields: [audioSources.addedBy],
    references: [users.id],
  }),
}))

// Relações adicionais
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [chatMessages.receiverId],

    references: [users.id],
  }),
}))

export const userEncryptionKeysRelations = relations(userEncryptionKeys, ({ one }) => ({
  user: one(users, {
    fields: [userEncryptionKeys.userId],


export const userPrivacySettingsRelations = relations(userPrivacySettings, ({ one }) => ({
  user: one(users, {
    fields: [userPrivacySettings.userId],

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

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}))

export const moodTrackingRelations = relations(moodTracking, ({ one }) => ({
  patient: one(users, {
    fields: [moodTracking.patientId],
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


export const financialReportsRelations = relations(financialReports, ({ one }) => ({
  clinic: one(clinics, {
    fields: [financialReports.clinicId],
    references: [clinics.id],

export const sosUsagesRelations = relations(sosUsages, ({ one }) => ({
  patient: one(users, {
    fields: [sosUsages.patientId],
    references: [users.id],

  }),
}))
