import { pgTable, serial, text, integer, timestamp, boolean, varchar, date } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Tabela de usuários
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'psychologist', 'patient', 'admin'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Perfis de psicólogos
export const psychologistProfiles = pgTable("psychologist_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  crp: varchar("crp", { length: 20 }).notNull(),
  specialties: text("specialties"),
  bio: text("bio"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Perfis de pacientes
export const patientProfiles = pgTable("patient_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  psychologistId: integer("psychologist_id")
    .references(() => users.id)
    .notNull(),
  birthDate: date("birth_date"),
  phone: varchar("phone", { length: 20 }),
  emergencyContact: varchar("emergency_contact", { length: 20 }),
  currentCycle: text("current_cycle").default("Criar"), // Criar, Cuidar, Crescer, Curar
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  durationMinutes: integer("duration_minutes").notNull().default(50),
  type: text("type").notNull(), // 'online', 'presencial'
  status: text("status").notNull().default("agendada"), // 'agendada', 'confirmada', 'realizada', 'cancelada'
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
  title: text("title").notNull(),
  content: text("content").notNull(),
  mood: integer("mood").notNull(), // 1-5
  tags: text("tags"), // JSON array as string
  isPrivate: boolean("is_private").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Mensagens do chat
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id")
    .references(() => users.id)
    .notNull(),
  receiverId: integer("receiver_id")
    .references(() => users.id)
    .notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Tarefas terapêuticas
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  psychologistId: integer("psychologist_id")
    .references(() => users.id)
    .notNull(),
  patientId: integer("patient_id")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  status: text("status").default("pendente"), // 'pendente', 'em_progresso', 'concluida'
  priority: text("priority").default("media"), // 'baixa', 'media', 'alta'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Uso das ferramentas SOS
export const sosUsages = pgTable("sos_usages", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => users.id)
    .notNull(),
  toolName: text("tool_name").notNull(), // 'breathing', 'meditation', 'grounding'
  durationMinutes: integer("duration_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Acompanhamento de humor
export const moodTracking = pgTable("mood_tracking", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => users.id)
    .notNull(),
  mood: integer("mood").notNull(), // 1-5
  energy: integer("energy").notNull(), // 1-5
  anxiety: integer("anxiety").notNull(), // 1-5
  notes: text("notes"),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Conquistas
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => users.id)
    .notNull(),
  type: text("type").notNull(), // 'first_entry', 'week_streak', 'sos_usage', etc.
  title: text("title").notNull(),
  description: text("description"),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
})

// Configurações do usuário
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  sessionReminders: boolean("session_reminders").default(true),
  diaryReminders: boolean("diary_reminders").default(true),
  theme: text("theme").default("light"), // 'light', 'dark'
  language: text("language").default("pt-BR"),
  pushSubscription: text("push_subscription"), // JSON da subscription do push
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  sentMessages: many(chatMessages, { relationName: "sender" }),
  receivedMessages: many(chatMessages, { relationName: "receiver" }),
  diaryEntries: many(diaryEntries),
  settings: one(userSettings),
}))

export const psychologistProfilesRelations = relations(psychologistProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [psychologistProfiles.userId],
    references: [users.id],
  }),
  patients: many(patientProfiles),
  sessions: many(sessions, { relationName: "psychologistSessions" }),
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
  sessions: many(sessions, { relationName: "patientSessions" }),
  diaryEntries: many(diaryEntries),
  tasks: many(tasks),
  sosUsages: many(sosUsages),
  moodTracking: many(moodTracking),
  achievements: many(achievements),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  psychologist: one(users, {
    fields: [sessions.psychologistId],
    references: [users.id],
    relationName: "psychologistSessions",
  }),
  patient: one(users, {
    fields: [sessions.patientId],
    references: [users.id],
    relationName: "patientSessions",
  }),
}))

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [chatMessages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}))

export const diaryEntriesRelations = relations(diaryEntries, ({ one }) => ({
  patient: one(users, {
    fields: [diaryEntries.patientId],
    references: [users.id],
  }),
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
  psychologist: one(users, {
    fields: [tasks.psychologistId],
    references: [users.id],
  }),
  patient: one(users, {
    fields: [tasks.patientId],
    references: [users.id],
  }),
}))
