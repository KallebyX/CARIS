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
