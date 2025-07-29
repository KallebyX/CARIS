-- Migration: Add LGPD/GDPR compliance tables
-- Created: 2025-01-02

-- Tabela de consentimentos
CREATE TABLE "user_consents" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "consent_type" VARCHAR(100) NOT NULL,
  "consent_given" BOOLEAN NOT NULL,
  "consent_date" TIMESTAMP NOT NULL DEFAULT NOW(),
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "revoked_at" TIMESTAMP,
  "version" VARCHAR(10) NOT NULL DEFAULT '1.0',
  "purpose" TEXT NOT NULL,
  "legal_basis" VARCHAR(50) NOT NULL,
  "data_retention_period" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de auditoria
CREATE TABLE "audit_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER REFERENCES "users"("id"),
  "action" VARCHAR(100) NOT NULL,
  "resource_type" VARCHAR(50) NOT NULL,
  "resource_id" VARCHAR(50),
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "metadata" TEXT,
  "timestamp" TIMESTAMP NOT NULL DEFAULT NOW(),
  "severity" VARCHAR(20) NOT NULL DEFAULT 'info',
  "compliance_related" BOOLEAN NOT NULL DEFAULT FALSE
);

-- Tabela de exportações de dados
CREATE TABLE "data_exports" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "requested_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMP,
  "format" VARCHAR(10) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "file_path" TEXT,
  "file_size" INTEGER,
  "expires_at" TIMESTAMP,
  "download_count" INTEGER NOT NULL DEFAULT 0,
  "ip_address" VARCHAR(45),
  "error_message" TEXT
);

-- Tabela de configurações de privacidade
CREATE TABLE "user_privacy_settings" (
  "user_id" INTEGER PRIMARY KEY REFERENCES "users"("id"),
  "data_processing_consent" BOOLEAN NOT NULL DEFAULT FALSE,
  "marketing_consent" BOOLEAN NOT NULL DEFAULT FALSE,
  "analytics_consent" BOOLEAN NOT NULL DEFAULT FALSE,
  "share_data_with_psychologist" BOOLEAN NOT NULL DEFAULT TRUE,
  "allow_data_export" BOOLEAN NOT NULL DEFAULT TRUE,
  "anonymize_after_deletion" BOOLEAN NOT NULL DEFAULT TRUE,
  "data_retention_preference" INTEGER DEFAULT 2555,
  "notification_preferences" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX "idx_user_consents_user_id" ON "user_consents"("user_id");
CREATE INDEX "idx_user_consents_type" ON "user_consents"("consent_type");
CREATE INDEX "idx_user_consents_date" ON "user_consents"("consent_date");

CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs"("user_id");
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");
CREATE INDEX "idx_audit_logs_resource" ON "audit_logs"("resource_type");
CREATE INDEX "idx_audit_logs_timestamp" ON "audit_logs"("timestamp");
CREATE INDEX "idx_audit_logs_compliance" ON "audit_logs"("compliance_related");

CREATE INDEX "idx_data_exports_user_id" ON "data_exports"("user_id");
CREATE INDEX "idx_data_exports_status" ON "data_exports"("status");
CREATE INDEX "idx_data_exports_requested" ON "data_exports"("requested_at");

-- Comentários para documentação
COMMENT ON TABLE "user_consents" IS 'Registros de consentimento LGPD/GDPR dos usuários';
COMMENT ON TABLE "audit_logs" IS 'Logs de auditoria para compliance e rastreabilidade';
COMMENT ON TABLE "data_exports" IS 'Solicitações de exportação de dados dos usuários';
COMMENT ON TABLE "user_privacy_settings" IS 'Configurações de privacidade dos usuários';