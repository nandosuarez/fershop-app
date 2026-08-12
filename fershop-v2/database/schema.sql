CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS fershop_v2;

CREATE OR REPLACE FUNCTION fershop_v2.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS fershop_v2.app_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  username VARCHAR(80) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'OPERACION',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT app_user_role_check
    CHECK (role IN ('SUPERADMIN', 'ADMIN', 'OPERACION', 'VENTAS'))
);

CREATE UNIQUE INDEX IF NOT EXISTS app_user_email_unique
  ON fershop_v2.app_user (LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS app_user_username_unique
  ON fershop_v2.app_user (LOWER(username));

DROP TRIGGER IF EXISTS trg_app_user_updated_at ON fershop_v2.app_user;

CREATE TRIGGER trg_app_user_updated_at
BEFORE UPDATE ON fershop_v2.app_user
FOR EACH ROW
EXECUTE FUNCTION fershop_v2.set_updated_at();

CREATE TABLE IF NOT EXISTS fershop_v2.app_document (
  document_key VARCHAR(80) PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_app_document_updated_at ON fershop_v2.app_document;

CREATE TRIGGER trg_app_document_updated_at
BEFORE UPDATE ON fershop_v2.app_document
FOR EACH ROW
EXECUTE FUNCTION fershop_v2.set_updated_at();

CREATE TABLE IF NOT EXISTS fershop_v2.app_asset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type VARCHAR(40) NOT NULL,
  file_name VARCHAR(240) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  byte_length INTEGER NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT app_asset_type_check CHECK (asset_type IN ('PRODUCT_IMAGE')),
  CONSTRAINT app_asset_size_check CHECK (byte_length > 0)
);

CREATE INDEX IF NOT EXISTS app_asset_created_idx
  ON fershop_v2.app_asset (created_at DESC);

CREATE TABLE IF NOT EXISTS fershop_v2.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NULL REFERENCES fershop_v2.app_user(id),
  actor_name VARCHAR(160) NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(160) NULL,
  summary TEXT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_created_idx
  ON fershop_v2.audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_entity_idx
  ON fershop_v2.audit_log (entity_type, entity_id, created_at DESC);
