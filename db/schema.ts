import { pgTable, serial, text, integer, timestamp, boolean, varchar, date } from "drizzle-orm/pg-core"
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
  sessionDate: timestamp("session_date").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  type: text("type").notNull(), // 'online', 'presencial'
  status: text("status").notNull(), // 'agendada', 'confirmada', 'realizada', 'cancelada'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const patientProfilesRelations = relations(patientProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [patientProfiles.userId],
    references: [users.id],
  }),
  psychologist: one(users, {
    fields: [patientProfiles.psychologistId],
    references: [users.id],
  }),
  sessions: many(sessions),
  diaryEntries: many(diaryEntries),
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Relações para as novas tabelas
export const userConsentsRelations = relations(userConsents, ({ one }) => ({
  user: one(users, {
    fields: [userConsents.userId],
    references: [users.id],
  }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
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
