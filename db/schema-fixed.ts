import { pgTable, serial, text, integer, timestamp, boolean, varchar, date, decimal, json, jsonb } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

// Tabela de usuários
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: text("password_hash").notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Perfis de pacientes
export const patientProfiles = pgTable("patient_profiles", {
  userId: integer("user_id")
    .references(() => users.id)
    .primaryKey(),
  dateOfBirth: date("date_of_birth"),
  phone: varchar("phone", { length: 20 }),
  emergencyContact: varchar("emergency_contact", { length: 255 }),
  emergencyPhone: varchar("emergency_phone", { length: 20 }),
  medicalHistory: text("medical_history"),
  currentMedications: text("current_medications"),
  allergies: text("allergies"),
  goals: text("goals"),
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("pt"),
  timezone: varchar("timezone", { length: 50 }).default("America/Sao_Paulo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Configurações do usuário
export const userSettings = pgTable("user_settings", {
  userId: integer("user_id")
    .references(() => users.id)
    .primaryKey(),
  notifications: boolean("notifications").default(true),
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  language: varchar("language", { length: 10 }).default("pt"),
  timezone: varchar("timezone", { length: 50 }).default("America/Sao_Paulo"),
  theme: varchar("theme", { length: 20 }).default("light"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Clínicas
export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  ownerId: integer("owner_id")
    .references(() => users.id)
    .notNull(),
  isActive: boolean("is_active").default(true),
  settings: json("settings"), // Configurações específicas da clínica
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Usuários da clínica (relação many-to-many entre users e clinics)
export const clinicUsers = pgTable("clinic_users", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id")
    .references(() => clinics.id)
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  role: varchar("role", { length: 50 }).notNull(), // 'admin', 'psychologist', 'patient'
  permissions: json("permissions"), // Array de permissões específicas
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
})

// Sessions/Appointments
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  psychologistId: integer("psychologist_id")
    .references(() => users.id)
    .notNull(),
  patientId: integer("patient_id")
    .references(() => users.id)
    .notNull(),
  clinicId: integer("clinic_id")
    .references(() => clinics.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(50), // minutes
  status: varchar("status", { length: 20 }).default("scheduled"), // 'scheduled', 'completed', 'cancelled', 'no_show'
  type: varchar("type", { length: 20 }).default("individual"), // 'individual', 'group', 'online'
  notes: text("notes"),
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
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  ownedClinics: many(clinics),
  clinicMemberships: many(clinicUsers),
  sessionsAsPsychologist: many(sessions, { relationName: "psychologist" }),
  sessionsAsPatient: many(sessions, { relationName: "patient" }),
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
}))

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}))

export const clinicsRelations = relations(clinics, ({ one, many }) => ({
  owner: one(users, {
    fields: [clinics.ownerId],
    references: [users.id],
  }),
  users: many(clinicUsers),
  sessions: many(sessions),
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

export const sessionsRelations = relations(sessions, ({ one }) => ({
  psychologist: one(users, {
    fields: [sessions.psychologistId],
    references: [users.id],
    relationName: "psychologist",
  }),
  patient: one(users, {
    fields: [sessions.patientId],
    references: [users.id],
    relationName: "patient",
  }),
  clinic: one(clinics, {
    fields: [sessions.clinicId],
    references: [clinics.id],
  }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}))
