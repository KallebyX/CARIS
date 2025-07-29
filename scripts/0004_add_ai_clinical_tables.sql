-- Migration: Add AI Clinical Assistant tables
-- Date: 2024-01-01

-- Add AI Clinical Insights table
CREATE TABLE IF NOT EXISTS clinical_insights (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    psychologist_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL, -- 'session_analysis', 'pattern_detection', 'risk_assessment', 'progress_summary', 'weekly_analysis'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- JSON string with insights
    severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'reviewed', 'dismissed'
    metadata TEXT, -- JSON string with additional data
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id)
);

-- Add Clinical Alerts table
CREATE TABLE IF NOT EXISTS clinical_alerts (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    psychologist_id INTEGER NOT NULL REFERENCES users(id),
    alert_type TEXT NOT NULL, -- 'risk_escalation', 'pattern_change', 'mood_decline', 'session_concern'
    severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommendations TEXT, -- JSON string with action recommendations
    triggered_by TEXT, -- JSON string with trigger data
    is_active BOOLEAN NOT NULL DEFAULT true,
    acknowledged_at TIMESTAMP,
    acknowledged_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add Progress Reports table
CREATE TABLE IF NOT EXISTS progress_reports (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    psychologist_id INTEGER NOT NULL REFERENCES users(id),
    report_type TEXT NOT NULL, -- 'weekly', 'monthly', 'session_summary', 'treatment_milestone'
    period TEXT NOT NULL, -- e.g., '2024-01-01_2024-01-07'
    summary TEXT NOT NULL,
    key_findings TEXT, -- JSON string
    recommendations TEXT, -- JSON string
    mood_trends TEXT, -- JSON string
    risk_assessment TEXT, -- JSON string
    progress_score INTEGER, -- 0-100
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    shared_with_patient BOOLEAN NOT NULL DEFAULT false,
    shared_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clinical_insights_patient_id ON clinical_insights(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_insights_psychologist_id ON clinical_insights(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_clinical_insights_type ON clinical_insights(type);
CREATE INDEX IF NOT EXISTS idx_clinical_insights_generated_at ON clinical_insights(generated_at);

CREATE INDEX IF NOT EXISTS idx_clinical_alerts_patient_id ON clinical_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_psychologist_id ON clinical_alerts(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_is_active ON clinical_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_severity ON clinical_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_created_at ON clinical_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_progress_reports_patient_id ON progress_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_psychologist_id ON progress_reports(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_progress_reports_report_type ON progress_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_progress_reports_generated_at ON progress_reports(generated_at);

-- Add AI analysis columns to diary_entries if they don't exist
ALTER TABLE diary_entries 
ADD COLUMN IF NOT EXISTS ai_analyzed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dominant_emotion TEXT,
ADD COLUMN IF NOT EXISTS emotion_intensity INTEGER,
ADD COLUMN IF NOT EXISTS sentiment_score INTEGER, -- stored as integer (-100 to 100)
ADD COLUMN IF NOT EXISTS risk_level TEXT, -- 'low', 'medium', 'high', 'critical'
ADD COLUMN IF NOT EXISTS ai_insights TEXT, -- JSON string
ADD COLUMN IF NOT EXISTS suggested_actions TEXT, -- JSON string
ADD COLUMN IF NOT EXISTS plutchik_categories TEXT; -- JSON string

-- Create index for AI analysis lookups
CREATE INDEX IF NOT EXISTS idx_diary_entries_ai_analyzed ON diary_entries(ai_analyzed);
CREATE INDEX IF NOT EXISTS idx_diary_entries_risk_level ON diary_entries(risk_level);
CREATE INDEX IF NOT EXISTS idx_diary_entries_patient_entry_date ON diary_entries(patient_id, entry_date);