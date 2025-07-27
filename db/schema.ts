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

// Relações para as novas tabelas
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
