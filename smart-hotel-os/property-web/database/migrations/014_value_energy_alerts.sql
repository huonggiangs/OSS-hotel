-- ============================================================================
-- Property Web — Migration 014: Value Dashboard, năng lượng và Alert/SLA Center.
-- Các bảng này là sổ đo lường tối thiểu để mọi tuyên bố "giảm chi phí / tăng lợi
-- nhuận" có nguồn dữ liệu và idempotency key; không thay thế telemetry vật lý.
-- ============================================================================

CREATE TABLE "energy_readings" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "tenant_id" TEXT NOT NULL,
  "room_id" TEXT REFERENCES "rooms"("id") ON DELETE SET NULL,
  "device_id" TEXT REFERENCES "devices"("id") ON DELETE SET NULL,
  "asset_code" TEXT,
  "measured_at" TIMESTAMPTZ NOT NULL,
  "kwh" DECIMAL(14,4) NOT NULL CHECK ("kwh" >= 0),
  "cost_vnd" DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK ("cost_vnd" >= 0),
  "source" TEXT NOT NULL DEFAULT 'MANUAL' CHECK ("source" IN ('MANUAL', 'IOT', 'IMPORT')),
  "idempotency_key" TEXT NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("property_id", "idempotency_key")
);
CREATE INDEX "energy_readings_property_measured_idx"
  ON "energy_readings" ("property_id", "measured_at" DESC);
CREATE INDEX "energy_readings_room_measured_idx"
  ON "energy_readings" ("property_id", "room_id", "measured_at" DESC);

CREATE TABLE "value_ledger" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "tenant_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL CHECK ("event_type" IN ('ENERGY_SAVED', 'LABOR_SAVED', 'LOSS_PREVENTED', 'ADDITIONAL_REVENUE')),
  "amount_vnd" DECIMAL(14,2) NOT NULL CHECK ("amount_vnd" >= 0),
  "source_type" TEXT NOT NULL,
  "source_id" TEXT,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "idempotency_key" TEXT NOT NULL,
  "note" TEXT,
  "created_by" TEXT REFERENCES "property_users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("property_id", "idempotency_key")
);
CREATE INDEX "value_ledger_property_occurred_idx"
  ON "value_ledger" ("property_id", "occurred_at" DESC);

CREATE TABLE "operational_alerts" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "tenant_id" TEXT NOT NULL,
  "alert_type" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM' CHECK ("severity" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  "status" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED')),
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "source_type" TEXT NOT NULL,
  "source_id" TEXT,
  "asset_code" TEXT,
  "due_at" TIMESTAMPTZ,
  "acknowledged_at" TIMESTAMPTZ,
  "resolved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "idempotency_key" TEXT,
  UNIQUE ("property_id", "idempotency_key")
);
CREATE INDEX "operational_alerts_property_status_idx"
  ON "operational_alerts" ("property_id", "status", "due_at", "created_at" DESC);
