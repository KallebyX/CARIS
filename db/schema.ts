import { pgTable, serial, text, integer, timestamp, boolean, varchar, date, jsonb } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

// Tabela de usuários
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password_hash").notNull(),
  role: text("role").notNull(), // 'psychologist', 'patient', 'admin'
  avatarUrl: text("avatar_url"),
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
})

// Perfis de pacientes
export const patientProfiles = pgTable("patient_profiles", {
  userId: integer("user_id")
    .references(() => users.id)
    .primaryKey(),
  psychologistId: integer("psychologist_id")
    .references(() => users.id),
  birthDate: timestamp("birth_date"),
  currentCycle: text("current_cycle"),
})

// Sessões
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
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
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
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
=======
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


export const userPrivacySettingsRelations = relations(userPrivacySettings, ({ one }) => ({
  user: one(users, {
    fields: [userPrivacySettings.userId],
    references: [users.id],
  }),
}))

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

export const sosUsagesRelations = relations(sosUsages, ({ one }) => ({
  patient: one(users, {
    fields: [sosUsages.patientId],
    references: [users.id],
  }),
}))
