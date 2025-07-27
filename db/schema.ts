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
