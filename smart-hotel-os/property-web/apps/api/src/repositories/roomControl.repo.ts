import { randomUUID } from "node:crypto";
import type { DbPool } from "../lib/db";

export const ENERGY_CONTROL_KINDS = [
  "POWER_SWITCH",
  "LIGHTING_CONTROLLER",
  "AC_CONTROLLER",
  "SMART_TV",
  "ANNOUNCEMENT_SPEAKER",
] as const;

export interface DeviceControlResult {
  deviceId: string;
  deviceName: string;
  controlKind: string;
  deliveryStatus: "QUEUED" | "NOT_CONFIGURED" | "ACKNOWLEDGED" | "FAILED";
}

/**
 * Chỉ tác động các thiết bị tiêu thụ năng lượng đã được gán cho phòng. Công tơ
 * là thiết bị đọc số liệu; khóa cửa và bộ cấp thẻ có nghiệp vụ riêng, tuyệt đối
 * không bị bật/tắt cùng nguồn điện phòng.
 *
 * `QUEUED` nghĩa là PMS đã ghi lệnh bền vững cho thiết bị có asset_code và
 * iot_device_id đã ghép; bộ điều phối Edge/IoT phải ACK riêng trước khi coi
 * đó là tác động phần cứng thật. Thiết bị chưa map phần cứng được ghi rõ
 * `NOT_CONFIGURED` để tránh UI báo sai là đã điều khiển thành công.
 */
export async function setRoomEnergyState(
  db: DbPool,
  input: {
    propertyId: string;
    tenantId: string;
    roomId: string;
    bookingId?: string | null;
    powerOn: boolean;
    requestedBy?: string;
  }
): Promise<DeviceControlResult[]> {
  await db.query(`UPDATE rooms SET power_on = $3, updated_at = now() WHERE property_id = $1 AND id = $2`, [
    input.propertyId,
    input.roomId,
    input.powerOn,
  ]);
  const { rows: devices } = await db.query<{
    id: string;
    name: string;
    control_kind: string;
    asset_code: string | null;
    iot_device_id: string | null;
    status: "ONLINE" | "OFFLINE" | "ERROR";
  }>(
    `SELECT id, name, control_kind, asset_code, iot_device_id, status
     FROM devices
     WHERE property_id = $1 AND room_id = $2 AND control_kind = ANY($3::text[])`,
    [input.propertyId, input.roomId, ENERGY_CONTROL_KINDS]
  );
  if (devices.length === 0) return [];

  await db.query(
    `UPDATE devices SET power_on = $3, updated_at = now()
     WHERE property_id = $1 AND room_id = $2 AND control_kind = ANY($4::text[])`,
    [input.propertyId, input.roomId, input.powerOn, ENERGY_CONTROL_KINDS]
  );

  const action = input.powerOn ? "POWER_ON" : "POWER_OFF";
  const result: DeviceControlResult[] = [];
  for (const device of devices) {
    const deliveryStatus = device.asset_code && device.iot_device_id ? "QUEUED" : "NOT_CONFIGURED";
    await db.query(
      `INSERT INTO device_control_events
       (id, property_id, tenant_id, room_id, booking_id, device_id, action, delivery_status, payload, requested_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)`,
      [
        randomUUID(), input.propertyId, input.tenantId, input.roomId, input.bookingId ?? null, device.id, action,
        deliveryStatus, JSON.stringify({ requestedPowerOn: input.powerOn }), input.requestedBy ?? null,
      ]
    );
    result.push({ deviceId: device.id, deviceName: device.name, controlKind: device.control_kind, deliveryStatus });
  }
  return result;
}

export async function createDeviceControlEvent(
  db: DbPool,
  input: {
    propertyId: string;
    tenantId: string;
    roomId: string;
    bookingId: string;
    device: { id: string; external_id?: string | null; asset_code?: string | null; iot_device_id?: string | null; status: "ONLINE" | "OFFLINE" | "ERROR" };
    action: "ISSUE_CARD" | "RECLAIM_CARD";
    requestedBy?: string;
    payload: Record<string, unknown>;
  }
): Promise<"QUEUED" | "NOT_CONFIGURED"> {
  // Bộ cấp/thu thẻ chưa có adapter giao thức trong iot-service; giữ rõ là
  // NOT_CONFIGURED thay vì giả báo đã cấp thẻ thành công như lệnh điện.
  const deliveryStatus = "NOT_CONFIGURED";
  await db.query(
    `INSERT INTO device_control_events
     (id, property_id, tenant_id, room_id, booking_id, device_id, action, delivery_status, payload, requested_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)`,
    [
      randomUUID(), input.propertyId, input.tenantId, input.roomId, input.bookingId, input.device.id, input.action,
      deliveryStatus, JSON.stringify(input.payload), input.requestedBy ?? null,
    ]
  );
  return deliveryStatus;
}
