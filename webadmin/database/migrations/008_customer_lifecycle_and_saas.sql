-- Vòng đời thương mại của khách hàng HQ. Xóa là soft-delete để giữ audit,
-- hóa đơn và liên kết thiết bị; trạng thái hoạt động tách khỏi thanh toán.
ALTER TABLE customers_unified
  ADD COLUMN IF NOT EXISTS operational_status TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS saas_plan TEXT NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE customers_unified DROP CONSTRAINT IF EXISTS customers_operational_status_check;
ALTER TABLE customers_unified ADD CONSTRAINT customers_operational_status_check
  CHECK (operational_status IN ('ACTIVE', 'INACTIVE'));
ALTER TABLE customers_unified DROP CONSTRAINT IF EXISTS customers_saas_plan_check;
ALTER TABLE customers_unified ADD CONSTRAINT customers_saas_plan_check
  CHECK (saas_plan IN ('TRIAL', 'BASIC', 'PRO', 'PREMIUM', 'ENTERPRISE', 'CUSTOM'));

CREATE INDEX IF NOT EXISTS customers_operational_status_idx
  ON customers_unified(operational_status) WHERE deleted_at IS NULL;
