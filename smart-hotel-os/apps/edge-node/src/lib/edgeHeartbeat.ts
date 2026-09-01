import { outboxRepo } from "../repositories/outbox.repo";
import { checkCloudReachable, getLastSyncAt, getLastSyncError } from "./sync";

const CLOUD_URL = (process.env.CLOUD_PROPERTY_API_URL ?? "http://localhost:4100").replace(/\/$/, "");
const EDGE_NODE_ID = process.env.EDGE_NODE_ID ?? "edge-node-local";
const PROPERTY_ID = process.env.PROPERTY_ID ?? "";
const TENANT_ID = process.env.TENANT_ID ?? "";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;
let lastHeartbeatAt: Date | null = null;

export function getLastEdgeHeartbeatAt() { return lastHeartbeatAt; }

/** Heartbeat độc lập với luồng sync: PMS thấy Edge ngay cả khi outbox đang lỗi. */
export async function sendEdgeHeartbeat() {
  if (!PROPERTY_ID || !TENANT_ID || !INTERNAL_SERVICE_KEY) return false;
  const [cloudReachable, pendingOutboxCount] = await Promise.all([checkCloudReachable(), outboxRepo.countPending()]);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(`${CLOUD_URL}/api/v1/internal/edge-heartbeats`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Service-Key": INTERNAL_SERVICE_KEY },
      signal: controller.signal,
      body: JSON.stringify({ edgeNodeId: EDGE_NODE_ID, propertyId: PROPERTY_ID, tenantId: TENANT_ID, cloudReachable, pendingOutboxCount, lastSyncAt: getLastSyncAt()?.toISOString() ?? null, lastSyncError: getLastSyncError(), details: { dbMode: process.env.DB_MODE ?? "embedded" } }),
    });
    if (!response.ok) return false;
    lastHeartbeatAt = new Date();
    return true;
  } catch { return false; } finally { clearTimeout(timeout); }
}
