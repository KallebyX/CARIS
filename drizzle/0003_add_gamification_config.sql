-- MEDIUM-04: Add gamification_config table to store configurable gamification rewards
-- This replaces hardcoded values in code with database-driven configuration

CREATE TABLE IF NOT EXISTS "gamification_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_type" text NOT NULL UNIQUE,
	"points" integer NOT NULL,
	"xp" integer NOT NULL,
	"description" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"min_level" integer DEFAULT 1,
	"max_daily_count" integer,
	"cooldown_minutes" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Insert default gamification values (migrated from hardcoded values in code)
INSERT INTO "gamification_config" ("activity_type", "points", "xp", "description", "category", "enabled") VALUES
  ('diary_entry', 10, 15, 'Entrada no diário', 'diary', true),
  ('meditation_completed', 15, 20, 'Sessão de meditação concluída', 'meditation', true),
  ('task_completed', 20, 25, 'Tarefa terapêutica concluída', 'tasks', true),
  ('session_attended', 25, 30, 'Sessão de terapia participada', 'sessions', true),
  ('streak_maintained', 5, 10, 'Sequência mantida', 'social', true),
  ('challenge_completed', 50, 75, 'Desafio semanal concluído', 'social', true)
ON CONFLICT (activity_type) DO NOTHING;

-- Create index for faster lookups by activity_type
CREATE INDEX IF NOT EXISTS "idx_gamification_config_activity_type" ON "gamification_config" ("activity_type");

-- Create index for enabled activities
CREATE INDEX IF NOT EXISTS "idx_gamification_config_enabled" ON "gamification_config" ("enabled") WHERE "enabled" = true;
