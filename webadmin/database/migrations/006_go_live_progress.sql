-- Need refs: N1,N2,N3,N4,N5 — append-only Go-live evidence log for HQ.
-- The HQ API writes this table before regenerating the static progress page.

CREATE TABLE "go_live_progress_logs" (
  "id" TEXT PRIMARY KEY,
  "completed_at" TIMESTAMPTZ NOT NULL,
  "session_description" TEXT NOT NULL,
  "related_items" TEXT[] NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL CHECK ("status" IN ('DONE','IN_PROGRESS','MISSING')),
  "evidence" TEXT NOT NULL,
  "performed_by" TEXT NOT NULL,
  "notes" TEXT,
  "idempotency_key" TEXT NOT NULL UNIQUE,
  "request_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "go_live_progress_completed_at_idx" ON "go_live_progress_logs"("completed_at" DESC);
CREATE INDEX "go_live_progress_status_idx" ON "go_live_progress_logs"("status");
CREATE INDEX "go_live_progress_related_items_idx" ON "go_live_progress_logs" USING GIN("related_items");
CREATE INDEX "go_live_progress_performed_by_idx" ON "go_live_progress_logs"("performed_by");

CREATE VIEW "go_live_progress_item_summary" AS
WITH expanded AS (
  SELECT p.status, p.completed_at, upper(trim(item)) AS item
  FROM "go_live_progress_logs" p
  CROSS JOIN LATERAL unnest(p.related_items) item
), classified AS (
  SELECT status, completed_at, item,
    CASE
      WHEN item ~ '^N[1-5]$' THEN 'NEED'
      WHEN item ~ '^F-[A-Z0-9-]+$' THEN 'FEATURE'
      WHEN item ~ '^MODULE:[A-Z0-9_-]+$' THEN 'MODULE'
      ELSE 'FILE_OR_OTHER'
    END AS dimension
  FROM expanded
)
SELECT dimension, item,
  count(*)::integer AS total_entries,
  count(*) FILTER (WHERE status='DONE')::integer AS done_entries,
  round(100.0 * count(*) FILTER (WHERE status='DONE') / NULLIF(count(*),0), 2) AS done_percent,
  max(completed_at) AS last_completed_at
FROM classified
GROUP BY dimension, item;

INSERT INTO "go_live_progress_logs"
  (id,completed_at,session_description,related_items,status,evidence,performed_by,notes,idempotency_key,request_hash)
VALUES
  ('gl-20260908-review','2026-09-08T08:11:00+07:00','Rà soát tài liệu và bằng chứng hiện trạng',ARRAY['N1','N2','N3','N4','N5','FEATURE_CATALOG.md'],'DONE','smart-hotel-os/docs và các file PROGRESS.md','Codex','Phân loại bảo thủ; không coi thiết bị hoặc credential chưa có là hoàn tất.','go-live-20260908-review','migration-seed'),
  ('gl-20260908-schema','2026-09-08T08:12:00+07:00','Thiết kế schema log tiến trình tối ưu truy vấn',ARRAY['N4','N5','DATA_MODEL.md','006_go_live_progress.sql'],'DONE','webadmin/database/migrations/006_go_live_progress.sql','Codex','Có index thời gian, trạng thái, hạng mục và người thực hiện.','go-live-20260908-schema','migration-seed'),
  ('gl-20260908-api','2026-09-08T08:13:00+07:00','API ghi tiến trình và webhook CI có xác thực',ARRAY['N4','N5','F-REMOTE-001','API_SPECIFICATION.md'],'DONE','webadmin/apps/api/src/routes/goLiveProgress.routes.ts','Codex','Idempotency key bắt buộc; ghi DB trước khi sinh HTML.','go-live-20260908-api','migration-seed'),
  ('gl-20260908-ci','2026-09-08T08:14:00+07:00','Pipeline kiểm tra Go-live và sinh báo cáo',ARRAY['N4','N5','CI','GO_LIVE_PROGRESS.html'],'DONE','.github/workflows/go-live-readiness.yml','Codex','Không xóa lịch sử; artifact báo cáo được lưu theo lần chạy.','go-live-20260908-ci','migration-seed'),
  ('gl-20260908-hardware','2026-09-08T08:15:00+07:00','Nghiệm thu relay, công tơ, khóa/thẻ và Edge thật',ARRAY['N2','N3','N4','N5','F-IOT-CTRL-001'],'IN_PROGRESS','smart-hotel-os/docs/REAL_HARDWARE_ACCEPTANCE.md','BA','Phụ thuộc thiết bị thật, ACK, heartbeat và baseline 30 ngày.','go-live-20260908-hardware','migration-seed'),
  ('gl-20260908-validation','2026-09-08T08:25:00+07:00','Kiểm thử migration, API, idempotency, webhook và sinh HTML',ARRAY['N4','N5','GO_LIVE_PROGRESS.html','006_go_live_progress.sql'],'DONE','HQ API typecheck; migration 001-006; create=201; replay=200; conflict=409; webhook=201','Codex','Thực hiện trên PGlite sạch, không dùng dữ liệu khách.','go-live-20260908-validation','migration-seed');
