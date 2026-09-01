import { pool } from "../lib/db";

const EDGE_NODE_URL = process.env.EDGE_NODE_URL ?? "http://localhost:4200";
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY;
const REQUEST_TIMEOUT_MS = Number(process.env.DEVICE_COMMAND_REQUEST_TIMEOUT_MS) || 5_000;

type PendingEvent = {
  id: string;
  property_id: string;
  tenant_id: string;
  room_id: string | null;
  booking_id: string | null;
  device_id: string;
  action: "POWER_ON" | "POWER_OFF";
  payload: Record<string, unknown>;
  asset_code: string;
  iot_device_id: string;
};

type EdgeCommand = {
  id: string;
  status: "PENDING" | "ACKED" | "TIMEOUT" | "FAILED";
  ack_result?: { success?: boolean; message?: string } | null;
};

function bridgeHeaders() {
  return {
    "Content-Type": "application/json",
    ...(INTERNAL_SERVICE_KEY ? { "X-Internal-Service-Key": INTERNAL_SERVICE_KEY } : {}),
  };
}

async function bridgeFetch(path: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${EDGE_NODE_URL}${path}`, { ...init, headers: { ...bridgeHeaders(), ...(init.headers ?? {}) }, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readError(response: Response) {
  const text = await response.text().catch(() => "");
  return text.replace(/\s+/g, " ").slice(0, 500) || `Edge trả HTTP ${response.status}`;
}

/**
 * Đẩy các lệnh còn hàng đợi sang Edge. Idempotency key chính là event id nên
 * retry sau lỗi mạng không bao giờ tạo một command vật lý thứ hai tại IoT.
 */
export async function dispatchPendingDeviceCommands(limit = 30) {
  if (!INTERNAL_SERVICE_KEY) return { dispatched: 0, failed: 0, skipped: 0, error: "Thiếu INTERNAL_SERVICE_KEY." };
  const { rows } = await pool.query<PendingEvent>(
    `SELECT e.id, e.property_id, e.tenant_id, e.room_id, e.booking_id, e.device_id, e.action, e.payload,
            d.asset_code, d.iot_device_id
       FROM device_control_events e
       JOIN devices d ON d.id = e.device_id AND d.property_id = e.property_id
      WHERE e.delivery_status = 'QUEUED'
        AND e.iot_command_id IS NULL
        AND e.action IN ('POWER_ON', 'POWER_OFF')
        AND d.asset_code IS NOT NULL
        AND d.iot_device_id IS NOT NULL
        AND (e.last_attempt_at IS NULL OR e.last_attempt_at < now() - interval '10 seconds')
      ORDER BY e.created_at ASC
      LIMIT $1`,
    [limit]
  );

  let dispatched = 0;
  let failed = 0;
  for (const event of rows) {
    try {
      const response = await bridgeFetch("/api/v1/internal/device-events", {
        method: "POST",
        body: JSON.stringify({
          eventId: event.id,
          propertyId: event.property_id,
          tenantId: event.tenant_id,
          roomId: event.room_id,
          bookingId: event.booking_id,
          pmsDeviceId: event.device_id,
          iotDeviceId: event.iot_device_id,
          assetCode: event.asset_code,
          action: event.action,
          payload: event.payload,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const body = (await response.json()) as { command?: EdgeCommand; device?: { id: string } };
      if (!body.command?.id || !body.device?.id) throw new Error("Edge không trả mã lệnh IoT hợp lệ.");
      await pool.query(
        `UPDATE device_control_events
            SET iot_device_id = $2, iot_command_id = $3, dispatched_at = now(), last_attempt_at = now(),
                dispatch_attempts = dispatch_attempts + 1, last_error = NULL
          WHERE id = $1 AND delivery_status = 'QUEUED'`,
        [event.id, body.device.id, body.command.id]
      );
      dispatched += 1;
    } catch (error) {
      await pool.query(
        `UPDATE device_control_events
            SET last_attempt_at = now(), dispatch_attempts = dispatch_attempts + 1, last_error = $2
          WHERE id = $1 AND delivery_status = 'QUEUED'`,
        [event.id, (error as Error).message.slice(0, 1000)]
      );
      failed += 1;
    }
  }
  return { dispatched, failed, skipped: 0 };
}

/** Đồng bộ ACK/TIMEOUT thật từ IoT qua Edge về bản ghi nghiệp vụ PMS. */
export async function refreshDeviceCommandAcknowledgements(limit = 50) {
  if (!INTERNAL_SERVICE_KEY) return { acknowledged: 0, failed: 0, pending: 0, error: "Thiếu INTERNAL_SERVICE_KEY." };
  const { rows } = await pool.query<{ id: string; iot_device_id: string; iot_command_id: string }>(
    `SELECT id, iot_device_id, iot_command_id
       FROM device_control_events
      WHERE delivery_status = 'QUEUED' AND iot_device_id IS NOT NULL AND iot_command_id IS NOT NULL
      ORDER BY dispatched_at ASC NULLS LAST
      LIMIT $1`,
    [limit]
  );
  let acknowledged = 0;
  let failed = 0;
  let pending = 0;
  for (const event of rows) {
    try {
      const response = await bridgeFetch(`/api/v1/internal/device-commands/${encodeURIComponent(event.iot_device_id)}/${encodeURIComponent(event.iot_command_id)}`, { method: "GET" });
      if (!response.ok) throw new Error(await readError(response));
      const command = (await response.json()) as EdgeCommand;
      if (command.status === "PENDING") { pending += 1; continue; }
      if (command.status === "ACKED" && command.ack_result?.success !== false) {
        await pool.query(
          `UPDATE device_control_events SET delivery_status = 'ACKNOWLEDGED', acknowledged_at = now(), last_error = NULL WHERE id = $1 AND delivery_status = 'QUEUED'`,
          [event.id]
        );
        acknowledged += 1;
      } else {
        const reason = command.status === "ACKED" ? command.ack_result?.message || "Thiết bị từ chối lệnh." : `Lệnh IoT ${command.status}.`;
        await pool.query(`UPDATE device_control_events SET delivery_status = 'FAILED', last_error = $2 WHERE id = $1 AND delivery_status = 'QUEUED'`, [event.id, reason]);
        failed += 1;
      }
    } catch (error) {
      // Không đánh dấu FAILED khi chỉ mất kết nối với Edge; chu kỳ sau sẽ thử lại.
      await pool.query(`UPDATE device_control_events SET last_error = $2 WHERE id = $1 AND delivery_status = 'QUEUED'`, [event.id, (error as Error).message.slice(0, 1000)]);
    }
  }
  return { acknowledged, failed, pending };
}

export async function runDeviceCommandBridge() {
  const dispatch = await dispatchPendingDeviceCommands();
  const acknowledgement = await refreshDeviceCommandAcknowledgements();
  return { dispatch, acknowledgement };
}
