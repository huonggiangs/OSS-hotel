-- ============================================================================
-- HQ Console (webadmin) — Migration 001: khởi tạo schema
--
-- Đây là SQL thuần, chạy qua database/migrate.ts (xem database/README.md).
-- Không dùng ORM code-gen (Prisma/Drizzle...) — mọi thay đổi schema là một
-- file .sql mới được thêm vào thư mục này, đọc được trực tiếp, không qua lớp
-- trừu tượng nào. gen_random_uuid() dùng hàm built-in của PostgreSQL >= 13,
-- không cần cài thêm extension.
-- ============================================================================

-- ---- Enums ----
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN','OPS_SUPPORT','SALES_MANAGER','ACCOUNTANT','SUPPLY_CHAIN','RELEASE_MANAGER');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE','DISABLED');
CREATE TYPE "PartnerStatus" AS ENUM ('ACTIVE','SUSPENDED','TERMINATED');
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE','INACTIVE');
CREATE TYPE "BillingStatus" AS ENUM ('ACTIVE','OVERDUE','SUSPENDED');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN','IN_PROGRESS','RESOLVED','CLOSED');
CREATE TYPE "HardwareAssetType" AS ENUM ('KIOSK','PASSPORT_SCANNER','QR_SCANNER','CARD_DISPENSER','CASH_ACCEPTOR','IP_CAMERA','THERMAL_PRINTER','IOT_CONTROLLER','OTHER');
CREATE TYPE "HardwareAssetStatus" AS ENUM ('IN_STOCK','DEPLOYED','UNDER_WARRANTY_CLAIM','RETIRED');
CREATE TYPE "WarrantyClaimStatus" AS ENUM ('OPEN','IN_PROGRESS','RESOLVED','REJECTED');
CREATE TYPE "ProductScope" AS ENUM ('KIOSK','SMART_HOTEL_OS','BOTH');
CREATE TYPE "CommissionStatus" AS ENUM ('CALCULATED','PENDING_APPROVAL','APPROVED','PAID','REJECTED');

-- ---- users ----
CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- partners ----
CREATE TABLE "partners" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "territory" TEXT,
  "contact_name" TEXT,
  "contact_email" TEXT,
  "contact_phone" TEXT,
  "default_commission_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "max_customers" INTEGER,
  "status" "PartnerStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- suppliers ----
CREATE TABLE "suppliers" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "supplies_types" TEXT,
  "contact_name" TEXT,
  "contact_email" TEXT,
  "contact_phone" TEXT,
  "payment_terms" TEXT,
  "lead_time_days" INTEGER,
  "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- customers_unified ----
CREATE TABLE "customers_unified" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "contact_name" TEXT,
  "contact_email" TEXT,
  "contact_phone" TEXT,
  "partner_id" TEXT REFERENCES "partners"("id"),
  "uses_kiosk" BOOLEAN NOT NULL DEFAULT false,
  "uses_smart_hotel_os" BOOLEAN NOT NULL DEFAULT false,
  "sho_tenant_id" TEXT,
  "kiosk_customer_id" TEXT,
  "billing_status" "BillingStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "customers_unified_partner_id_idx" ON "customers_unified"("partner_id");

-- ---- customer_support_tickets ----
CREATE TABLE "customer_support_tickets" (
  "id" TEXT PRIMARY KEY,
  "customer_id" TEXT NOT NULL REFERENCES "customers_unified"("id"),
  "subject" TEXT NOT NULL,
  "description" TEXT,
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "customer_support_tickets_customer_id_idx" ON "customer_support_tickets"("customer_id");

-- ---- hardware_assets ----
CREATE TABLE "hardware_assets" (
  "id" TEXT PRIMARY KEY,
  "asset_type" "HardwareAssetType" NOT NULL,
  "brand" TEXT,
  "model" TEXT,
  "serial_number" TEXT NOT NULL UNIQUE,
  "supplier_id" TEXT REFERENCES "suppliers"("id"),
  "purchase_cost" DECIMAL(14,2),
  "purchased_at" TIMESTAMPTZ,
  "warranty_until" TIMESTAMPTZ,
  "status" "HardwareAssetStatus" NOT NULL DEFAULT 'IN_STOCK',
  "customer_id" TEXT REFERENCES "customers_unified"("id"),
  "device_id_external" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "hardware_assets_supplier_id_idx" ON "hardware_assets"("supplier_id");
CREATE INDEX "hardware_assets_customer_id_idx" ON "hardware_assets"("customer_id");

-- ---- warranty_claims ----
CREATE TABLE "warranty_claims" (
  "id" TEXT PRIMARY KEY,
  "hardware_asset_id" TEXT NOT NULL REFERENCES "hardware_assets"("id"),
  "issue_description" TEXT NOT NULL,
  "status" "WarrantyClaimStatus" NOT NULL DEFAULT 'OPEN',
  "cost" DECIMAL(14,2),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "warranty_claims_hardware_asset_id_idx" ON "warranty_claims"("hardware_asset_id");

-- ---- commission_rules ----
CREATE TABLE "commission_rules" (
  "id" TEXT PRIMARY KEY,
  "partner_id" TEXT REFERENCES "partners"("id"),
  "product_scope" "ProductScope" NOT NULL DEFAULT 'BOTH',
  "rate_pct" DECIMAL(5,2) NOT NULL,
  "is_recurring" BOOLEAN NOT NULL DEFAULT false,
  "effective_from" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "effective_to" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "commission_rules_partner_id_idx" ON "commission_rules"("partner_id");

-- ---- commission_records ----
CREATE TABLE "commission_records" (
  "id" TEXT PRIMARY KEY,
  "partner_id" TEXT NOT NULL REFERENCES "partners"("id"),
  "customer_id" TEXT REFERENCES "customers_unified"("id"),
  "rule_id" TEXT REFERENCES "commission_rules"("id"),
  "period" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "status" "CommissionStatus" NOT NULL DEFAULT 'CALCULATED',
  "approved_by_id" TEXT REFERENCES "users"("id"),
  "approved_at" TIMESTAMPTZ,
  "paid_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "commission_records_partner_id_idx" ON "commission_records"("partner_id");
CREATE INDEX "commission_records_customer_id_idx" ON "commission_records"("customer_id");
CREATE INDEX "commission_records_status_idx" ON "commission_records"("status");

-- ---- audit_logs (append-only, immutable — không có UPDATE/DELETE trong nghiệp vụ) ----
CREATE TABLE "audit_logs" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT REFERENCES "users"("id"),
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "before_data" JSONB,
  "after_data" JSONB,
  "ip_address" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
