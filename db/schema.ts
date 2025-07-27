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
