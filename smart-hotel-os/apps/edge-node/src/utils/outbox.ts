import { randomUUID } from "node:crypto";
import type { DbPool } from "../lib/db";

// ============================================================================
// Helper ghi 1 dòng outbox_events — LUÔN được gọi TRONG CÙNG transaction với
// thao tác nghiệp vụ (booking/checkin/checkout/lệnh thiết bị...) bởi các hàm
// repository dưới đây, KHÔNG BAO GIỜ gọi rời (nếu ghi rời, Edge Node có thể
// crash giữa 2 lệnh và mất sự kiện đồng bộ — đúng yêu cầu outbox pattern).
//
// entity_type/event_type dùng để src/lib/sync.ts biết cách map payload sang
// đúng endpoint Cloud property-web khi push (xem hàm pushOutboxEvent ở đó).
// ============================================================================
export async function writeOutboxEvent(
  db: DbPool,
  params: { entityType: string; entityId: string; eventType: string; payload: unknown }
): Promise<void> {
  await db.query(
    `INSERT INTO outbox_events (id, entity_type, entity_id, event_type, payload, status, attempts)
     VALUES ($1,$2,$3,$4,$5,'PENDING',0)`,
    [randomUUID(), params.entityType, params.entityId, params.eventType, JSON.stringify(params.payload ?? {})]
  );
}
