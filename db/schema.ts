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
  // Gamification fields
  totalXP: integer("total_xp").default(0).notNull(),
  currentLevel: integer("current_level").default(1).notNull(),
  weeklyPoints: integer("weekly_points").default(0).notNull(),
  monthlyPoints: integer("monthly_points").default(0).notNull(),
  streak: integer("streak").default(0).notNull(), // consecutive days with activity
  lastActivityDate: date("last_activity_date"),
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
    references: [users.id],
  }),
}))

export const moodTrackingRelations = relations(moodTracking, ({ one }) => ({
  patient: one(users, {
    fields: [moodTracking.patientId],
    references: [users.id],
  }),
}))
