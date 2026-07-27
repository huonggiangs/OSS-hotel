-- ============================================================================
-- HQ Console (webadmin) — Migration 003: Mua hàng / tồn kho chi tiết
--
-- Theo đặc tả `hq-console/docs/MODULE_HARDWARE_INVENTORY.md` mục 4.1:
-- "Tạo đơn mua hàng (purchase_orders) tới nhà cung cấp, nhận hàng vào kho,
-- tự động sinh bản ghi hardware_assets theo số lượng nhận." Bảng
-- `hardware_assets` đã có sẵn từ 001_init.sql — migration này chỉ thêm
-- `purchase_orders`/`purchase_order_items` và liên kết mềm sang
-- hardware_assets khi đơn chuyển trạng thái RECEIVED (xem repo).
--
-- Không sửa 001_init.sql/002_release_console.sql — chỉ thêm mới.
-- ============================================================================

CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED');

-- ---- purchase_orders ----
CREATE TABLE "purchase_orders" (
  "id" TEXT PRIMARY KEY,
  "supplier_id" TEXT NOT NULL REFERENCES "suppliers"("id"),
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "expected_at" TIMESTAMPTZ,
  "created_by" TEXT REFERENCES "users"("id"),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- ---- purchase_order_items ----
-- `asset_type` dùng lại enum HardwareAssetType (001_init.sql). Dòng hàng
-- không gắn asset_type (vd. vật tư tiêu hao) sẽ KHÔNG tự sinh hardware_assets
-- khi nhận hàng — xem quyết định trong purchaseOrders.repo.ts + PROGRESS.md.
CREATE TABLE "purchase_order_items" (
  "id" TEXT PRIMARY KEY,
  "purchase_order_id" TEXT NOT NULL REFERENCES "purchase_orders"("id"),
  "product_name" TEXT NOT NULL,
  "asset_type" "HardwareAssetType",
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "unit_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "received_quantity" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");
