CREATE TABLE IF NOT EXISTS "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"psychologist_id" integer NOT NULL REFERENCES "public"."users"("id"),
	"patient_id" integer NOT NULL REFERENCES "public"."users"("id"),
	"title" text NOT NULL,
	"description" text,
	"due_date" timestamp,
	"status" text DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_progresso', 'concluida')),
	"priority" text DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta')),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sos_usages" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL REFERENCES "public"."users"("id"),
	"tool_name" text NOT NULL,
	"duration_minutes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "mood_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL REFERENCES "public"."users"("id"),
	"mood" integer NOT NULL CHECK (mood >= 1 AND mood <= 5),
	"energy" integer NOT NULL CHECK (energy >= 1 AND energy <= 5),
	"anxiety" integer NOT NULL CHECK (anxiety >= 1 AND anxiety <= 5),
	"notes" text,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	UNIQUE(patient_id, date)
);

CREATE TABLE IF NOT EXISTS "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL REFERENCES "public"."users"("id"),
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"unlocked_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "public"."users"("id") UNIQUE,
	"email_notifications" boolean DEFAULT true,
	"push_notifications" boolean DEFAULT true,
	"session_reminders" boolean DEFAULT true,
	"diary_reminders" boolean DEFAULT true,
	"theme" text DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
	"language" text DEFAULT 'pt-BR',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_patient_id ON tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_sos_usages_patient_id ON sos_usages(patient_id);
CREATE INDEX IF NOT EXISTS idx_mood_tracking_patient_id ON mood_tracking(patient_id);
CREATE INDEX IF NOT EXISTS idx_mood_tracking_date ON mood_tracking(date);
CREATE INDEX IF NOT EXISTS idx_achievements_patient_id ON achievements(patient_id);
