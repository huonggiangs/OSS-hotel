-- Cổng công việc sửa chữa: tách luồng phê duyệt/thi công khỏi phiếu báo hỏng
-- để PMS, Buồng phòng và ứng dụng Kỹ thuật viên dùng chung một API có lịch sử.
CREATE TABLE "repair_work_orders" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "tenant_id" TEXT NOT NULL,
  "maintenance_request_id" TEXT NOT NULL UNIQUE REFERENCES "maintenance_requests"("id") ON DELETE CASCADE,
  "source" TEXT NOT NULL CHECK ("source" IN ('PMS', 'HOUSEKEEPING')),
  "route" TEXT NOT NULL DEFAULT 'REPAIR_APP' CHECK ("route" IN ('REPAIR_APP', 'PARTNER_CONTACT')),
  "status" TEXT NOT NULL DEFAULT 'PENDING_OWNER_APPROVAL' CHECK ("status" IN ('PENDING_OWNER_APPROVAL', 'DISPATCHED', 'ACCEPTED', 'DECLINED', 'IN_PROGRESS', 'QUOTED', 'HANDOVER_SUBMITTED', 'COMPLETED', 'REJECTED', 'CONTACT_REQUESTED')),
  "assigned_to" TEXT REFERENCES "property_users"("id") ON DELETE SET NULL,
  "partner_name" TEXT,
  "partner_phone" TEXT,
  "owner_decided_by" TEXT REFERENCES "property_users"("id") ON DELETE SET NULL,
  "owner_decided_at" TIMESTAMPTZ,
  "quote_amount" DECIMAL(14,2),
  "quote_note" TEXT,
  "decline_reason" TEXT,
  "progress_note" TEXT,
  "handover_note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "repair_work_orders_property_status_idx" ON "repair_work_orders" ("property_id", "status", "updated_at" DESC);
CREATE INDEX "repair_work_orders_assignee_idx" ON "repair_work_orders" ("property_id", "assigned_to", "status");

CREATE TABLE "repair_work_order_events" (
  "id" TEXT PRIMARY KEY,
  "work_order_id" TEXT NOT NULL REFERENCES "repair_work_orders"("id") ON DELETE CASCADE,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "actor_id" TEXT REFERENCES "property_users"("id") ON DELETE SET NULL,
  "event_type" TEXT NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "repair_work_order_events_work_order_idx" ON "repair_work_order_events" ("work_order_id", "created_at");

CREATE TABLE "repair_work_order_evidence" (
  "id" TEXT PRIMARY KEY,
  "work_order_id" TEXT NOT NULL REFERENCES "repair_work_orders"("id") ON DELETE CASCADE,
  "property_id" TEXT NOT NULL REFERENCES "properties"("id"),
  "media_key" TEXT NOT NULL UNIQUE,
  "original_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "byte_size" INTEGER NOT NULL CHECK ("byte_size" > 0),
  "created_by" TEXT REFERENCES "property_users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "repair_work_order_evidence_order_idx" ON "repair_work_order_evidence" ("work_order_id", "created_at");
