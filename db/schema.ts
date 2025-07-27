import { pgTable, serial, text, integer, timestamp, boolean, varchar, date, decimal, json } from "drizzle-orm/pg-core"
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
  sessionDate: timestamp("session_date").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  type: text("type").notNull(), // 'online', 'presencial'
  status: text("status").notNull(), // 'agendada', 'confirmada', 'realizada', 'cancelada'
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
    references: [users.id],
  }),
}))

export const financialReportsRelations = relations(financialReports, ({ one }) => ({
  clinic: one(clinics, {
    fields: [financialReports.clinicId],
    references: [clinics.id],
  }),
}))
