-- Retry bền vững cho outbox: lỗi mạng/Cloud tạm thời không được làm sự kiện
-- bị bỏ quên vĩnh viễn. FAILED sẽ được chọn lại sau next_retry_at.
ALTER TABLE "outbox_events" ADD COLUMN "next_retry_at" TIMESTAMPTZ;
CREATE INDEX "outbox_events_retry_idx" ON "outbox_events"("status", "next_retry_at");
