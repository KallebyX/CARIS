-- Migration: Add structured medication tracking system
-- MEDIUM-12: Replace generic text field with comprehensive medication management

-- This migration creates a complete medication tracking system with:
-- 1. medications table: Store medication details
-- 2. medication_schedules table: Dosage schedules and reminders
-- 3. medication_logs table: Track actual medication intake

BEGIN;

-- ============================================================================
-- MEDICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "medications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "generic_name" varchar(255),
  "dosage" varchar(100) NOT NULL, -- e.g., "10mg", "2.5ml", "1 tablet"
  "form" varchar(50), -- "tablet", "capsule", "liquid", "injection", "topical", "inhaler"
  "purpose" text, -- Why this medication is prescribed
  "prescribing_doctor" varchar(255),
  "prescription_number" varchar(100),
  "pharmacy" varchar(255),

  -- Instructions
  "instructions" text, -- How to take the medication
  "food_instructions" text, -- e.g., "Take with food", "On empty stomach"
  "side_effects" text, -- Known side effects to monitor
  "interactions" text, -- Drug interactions to be aware of

  -- Dates
  "start_date" date NOT NULL,
  "end_date" date, -- NULL for ongoing medications
  "refill_date" date, -- When to refill
  "refill_count" integer DEFAULT 0, -- Number of refills allowed

  -- Status
  "is_active" boolean DEFAULT true NOT NULL,
  "is_as_needed" boolean DEFAULT false NOT NULL, -- PRN (Pro Re Nata) - take as needed

  -- Tracking
  "stock_quantity" integer, -- Current stock
  "low_stock_threshold" integer, -- Alert when stock drops below this

  -- Metadata
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX "idx_medications_user_active" ON "medications" ("user_id", "is_active");
CREATE INDEX "idx_medications_refill_date" ON "medications" ("refill_date") WHERE "refill_date" IS NOT NULL;

-- ============================================================================
-- MEDICATION SCHEDULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "medication_schedules" (
  "id" serial PRIMARY KEY NOT NULL,
  "medication_id" integer NOT NULL REFERENCES "medications"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,

  -- Schedule
  "time_of_day" time NOT NULL, -- e.g., "08:00", "14:00", "21:00"
  "days_of_week" jsonb, -- [0,1,2,3,4,5,6] for Sunday-Saturday, NULL for every day
  "frequency" varchar(50) NOT NULL, -- "daily", "weekly", "monthly", "as_needed", "specific_days"

  -- Dosage
  "dosage_amount" varchar(100) NOT NULL, -- Amount to take at this time
  "dosage_unit" varchar(50), -- "tablet(s)", "ml", "mg", "puff(s)"

  -- Reminders
  "reminder_enabled" boolean DEFAULT true NOT NULL,
  "reminder_minutes_before" integer DEFAULT 15, -- Remind 15 minutes before
  "notification_channels" jsonb, -- ["push", "sms", "email"]

  -- Status
  "is_active" boolean DEFAULT true NOT NULL,

  -- Metadata
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX "idx_medication_schedules_medication" ON "medication_schedules" ("medication_id", "is_active");
CREATE INDEX "idx_medication_schedules_user_active" ON "medication_schedules" ("user_id", "is_active");
CREATE INDEX "idx_medication_schedules_time" ON "medication_schedules" ("time_of_day") WHERE "is_active" = true;

-- ============================================================================
-- MEDICATION LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "medication_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "medication_id" integer NOT NULL REFERENCES "medications"("id") ON DELETE CASCADE,
  "schedule_id" integer REFERENCES "medication_schedules"("id") ON DELETE SET NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,

  -- Timing
  "scheduled_time" timestamptz NOT NULL, -- When it was supposed to be taken
  "actual_time" timestamptz, -- When it was actually taken (NULL if skipped)

  -- Dosage
  "dosage_taken" varchar(100), -- Actual dosage taken (may differ from scheduled)

  -- Status
  "status" varchar(50) NOT NULL DEFAULT 'pending', -- "taken", "skipped", "missed", "pending"
  "skip_reason" varchar(100), -- If skipped: "forgot", "side_effects", "no_medication", "other"
  "skip_notes" text, -- Additional notes if skipped

  -- Side effects tracking
  "had_side_effects" boolean DEFAULT false,
  "side_effects_description" text,

  -- Effectiveness
  "effectiveness_rating" integer, -- 1-5 scale
  "effectiveness_notes" text,

  -- Mood/condition tracking
  "mood_before" integer, -- 1-10 scale
  "mood_after" integer, -- 1-10 scale
  "symptoms_before" text,
  "symptoms_after" text,

  -- Metadata
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX "idx_medication_logs_medication" ON "medication_logs" ("medication_id", "scheduled_time" DESC);
CREATE INDEX "idx_medication_logs_user" ON "medication_logs" ("user_id", "scheduled_time" DESC);
CREATE INDEX "idx_medication_logs_status" ON "medication_logs" ("status", "scheduled_time") WHERE "status" = 'pending';
CREATE INDEX "idx_medication_logs_actual_time" ON "medication_logs" ("actual_time" DESC) WHERE "actual_time" IS NOT NULL;

-- ============================================================================
-- MEDICATION REMINDERS QUEUE (for cron processing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "medication_reminders" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "medication_id" integer NOT NULL REFERENCES "medications"("id") ON DELETE CASCADE,
  "schedule_id" integer NOT NULL REFERENCES "medication_schedules"("id") ON DELETE CASCADE,
  "log_id" integer REFERENCES "medication_logs"("id") ON DELETE SET NULL,

  -- Timing
  "reminder_time" timestamptz NOT NULL, -- When to send the reminder
  "medication_time" timestamptz NOT NULL, -- When the medication should be taken

  -- Status
  "status" varchar(50) NOT NULL DEFAULT 'pending', -- "pending", "sent", "acknowledged", "dismissed"
  "sent_at" timestamptz,
  "acknowledged_at" timestamptz,

  -- Channels
  "notification_channels" jsonb NOT NULL, -- ["push", "sms", "email"]
  "sent_channels" jsonb, -- Which channels were successfully sent

  -- Metadata
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX "idx_medication_reminders_user" ON "medication_reminders" ("user_id", "reminder_time");
CREATE INDEX "idx_medication_reminders_pending" ON "medication_reminders" ("status", "reminder_time") WHERE "status" = 'pending';
CREATE INDEX "idx_medication_reminders_medication" ON "medication_reminders" ("medication_id");

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medication_schedules_updated_at
  BEFORE UPDATE ON medication_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medication_logs_updated_at
  BEFORE UPDATE ON medication_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medication_reminders_updated_at
  BEFORE UPDATE ON medication_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create medication log entries
CREATE OR REPLACE FUNCTION create_medication_logs_for_schedule()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is called when a schedule is created
  -- It can be extended to automatically generate future medication logs
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update medication stock when logged as taken
CREATE OR REPLACE FUNCTION update_medication_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- When a medication is logged as taken, decrease stock if tracking is enabled
  IF NEW.status = 'taken' AND OLD.status != 'taken' THEN
    UPDATE medications
    SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - 1)
    WHERE id = NEW.medication_id AND stock_quantity IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_medication_stock
  AFTER UPDATE ON medication_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_medication_stock();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Active medications with next scheduled dose
CREATE OR REPLACE VIEW active_medications_with_schedule AS
SELECT
  m.id AS medication_id,
  m.user_id,
  m.name,
  m.dosage,
  m.form,
  m.stock_quantity,
  m.low_stock_threshold,
  m.is_as_needed,
  ms.id AS schedule_id,
  ms.time_of_day,
  ms.frequency,
  ms.dosage_amount,
  ms.reminder_enabled,
  m.refill_date,
  CASE
    WHEN m.stock_quantity IS NOT NULL AND m.low_stock_threshold IS NOT NULL
      AND m.stock_quantity <= m.low_stock_threshold
    THEN true
    ELSE false
  END AS is_low_stock
FROM medications m
LEFT JOIN medication_schedules ms ON m.id = ms.medication_id AND ms.is_active = true
WHERE m.is_active = true;

-- View: Medication adherence statistics
CREATE OR REPLACE VIEW medication_adherence_stats AS
SELECT
  ml.user_id,
  ml.medication_id,
  m.name AS medication_name,
  COUNT(*) AS total_doses,
  SUM(CASE WHEN ml.status = 'taken' THEN 1 ELSE 0 END) AS taken_doses,
  SUM(CASE WHEN ml.status = 'skipped' THEN 1 ELSE 0 END) AS skipped_doses,
  SUM(CASE WHEN ml.status = 'missed' THEN 1 ELSE 0 END) AS missed_doses,
  ROUND(
    (SUM(CASE WHEN ml.status = 'taken' THEN 1 ELSE 0 END)::numeric /
    NULLIF(COUNT(*), 0)) * 100, 2
  ) AS adherence_percentage,
  MIN(ml.scheduled_time) AS first_dose_date,
  MAX(ml.scheduled_time) AS last_dose_date
FROM medication_logs ml
JOIN medications m ON ml.medication_id = m.id
WHERE ml.scheduled_time >= NOW() - INTERVAL '30 days'
GROUP BY ml.user_id, ml.medication_id, m.name;

COMMIT;

-- ============================================================================
-- SAMPLE DATA (for testing - remove in production)
-- ============================================================================

-- Uncomment to insert sample data:
-- INSERT INTO medications (user_id, name, generic_name, dosage, form, purpose, start_date, is_active)
-- VALUES
--   (1, 'Prozac', 'Fluoxetine', '20mg', 'capsule', 'Depression treatment', CURRENT_DATE, true),
--   (1, 'Zoloft', 'Sertraline', '50mg', 'tablet', 'Anxiety management', CURRENT_DATE, true);

-- INSERT INTO medication_schedules (medication_id, user_id, time_of_day, frequency, dosage_amount, dosage_unit)
-- VALUES
--   (1, 1, '08:00:00', 'daily', '1', 'capsule'),
--   (2, 1, '20:00:00', 'daily', '1', 'tablet');
