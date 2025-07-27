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
  customFields: many(customFields),
  customFieldValues: many(customFieldValues),
  progressMetrics: many(progressMetrics),
  therapeuticGoals: many(therapeuticGoals),
  alertConfigurations: many(alertConfigurations),
  generatedAlerts: many(generatedAlerts),
  generatedReports: many(generatedReports),
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
