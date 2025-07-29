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

  // Calendar integration fields
  googleCalendarEventId: text("google_calendar_event_id"),
  outlookCalendarEventId: text("outlook_calendar_event_id"),
  timezone: text("timezone"),

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
    .references(() => users.id)
    .notNull(),
  achievementId: integer("achievement_id")
    .references(() => achievements.id)
    .notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  progress: integer("progress").default(0).notNull(),
})

// Sistema de pontos por atividade
export const pointActivities = pgTable("point_activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  activityType: text("activity_type").notNull(), // 'diary_entry', 'meditation', 'task_completed', 'session_attended'
  points: integer("points").notNull(),
  xp: integer("xp").notNull(),
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON com dados adicionais da atividade
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
    .references(() => users.id)
    .notNull(),
  rewardId: integer("reward_id")
    .references(() => virtualRewards.id)
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

// Tarefas terapêuticas
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
  status: text("status").default('pendente').notNull(), // 'pendente', 'em_progresso', 'concluida'
  priority: text("priority").default('media').notNull(), // 'baixa', 'media', 'alta'
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Uso do sistema SOS
export const sosUsages = pgTable("sos_usages", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => users.id)
    .notNull(),
  type: text("type").notNull(), // 'breathing', 'grounding', 'emergency'
  durationMinutes: integer("duration_minutes"),
  completed: boolean("completed").default(false),
  rating: integer("rating"), // 1-5
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Rastreamento de humor
export const moodTracking = pgTable("mood_tracking", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => users.id)
    .notNull(),
  date: date("date").notNull(),
  mood: integer("mood").notNull(), // 1-10
  energy: integer("energy").notNull(), // 1-10
  anxiety: integer("anxiety").notNull(), // 1-10
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  diaryEntries: many(diaryEntries),
  userAchievements: many(userAchievements),

  pointActivities: many(pointActivities),
  userChallengeProgress: many(userChallengeProgress),
  userRewards: many(userRewards),
  leaderboardEntries: many(leaderboardEntries),
  meditationSessions: many(meditationSessions),
  tasksAsPatient: many(tasks, { relationName: "patient" }),
  tasksAsPsychologist: many(tasks, { relationName: "psychologist" }),
  sosUsages: many(sosUsages),
  moodTracking: many(moodTracking),

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
    references: [weeklyChallenes.id],
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
    relationName: "patient",
  }),
  psychologist: one(users, {
    fields: [tasks.psychologistId],
    references: [users.id],
    relationName: "psychologist",
  }),
}))

export const sosUsagesRelations = relations(sosUsages, ({ one }) => ({
  patient: one(users, {
    fields: [sosUsages.patientId],

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


// User Settings for Calendar and Notifications
export const userSettings = pgTable("user_settings", {
  userId: integer("user_id")
    .references(() => users.id)
    .primaryKey(),
  timezone: text("timezone").default("America/Sao_Paulo"),
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

// Relações
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

// Relations for subscription system
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
