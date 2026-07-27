import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import type { RoomInventorySyncLog, RoomTypeInventoryCache } from "../types/domain";

export const inventoryRepo = {
  async upsertCache(input: {
    tenantId: string;
    propertyId: string;
    roomTypeId: string;
    date: string;
    availableRooms: number;
  }): Promise<RoomTypeInventoryCache> {
    const { rows } = await pool.query<RoomTypeInventoryCache>(
      `INSERT INTO room_type_inventory_cache (id, tenant_id, property_id, room_type_id, date, available_rooms)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (property_id, room_type_id, date)
       DO UPDATE SET available_rooms = EXCLUDED.available_rooms, updated_at = now()
       RETURNING *`,
      [randomUUID(), input.tenantId, input.propertyId, input.roomTypeId, input.date, input.availableRooms]
    );
    return rows[0];
  },

  async getCache(propertyId: string, roomTypeId: string, date: string): Promise<RoomTypeInventoryCache | null> {
    const { rows } = await pool.query<RoomTypeInventoryCache>(
      `SELECT * FROM room_type_inventory_cache WHERE property_id = $1 AND room_type_id = $2 AND date = $3`,
      [propertyId, roomTypeId, date]
    );
    return rows[0] ?? null;
  },

  /** Trừ tồn phòng cho một ngày — dùng trong transaction khi ghi nhận booking từ OTA. */
  async decrementAvailability(propertyId: string, roomTypeId: string, date: string, rooms: number) {
    await pool.query(
      `UPDATE room_type_inventory_cache
       SET available_rooms = available_rooms - $4, updated_at = now()
       WHERE property_id = $1 AND room_type_id = $2 AND date = $3`,
      [propertyId, roomTypeId, date, rooms]
    );
  },

  async createSyncLog(input: {
    tenantId: string;
    propertyId: string;
    connectionId: string;
    roomTypeId: string;
    date: string;
    availableRooms: number;
    status: "SUCCESS" | "FAILED";
    requestPayload: unknown;
    responsePayload: unknown;
    errorMessage?: string | null;
  }): Promise<RoomInventorySyncLog> {
    const { rows } = await pool.query<RoomInventorySyncLog>(
      `INSERT INTO room_inventory_sync_log
        (id, tenant_id, property_id, connection_id, room_type_id, date, available_rooms, status, request_payload, response_payload, error_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        randomUUID(),
        input.tenantId,
        input.propertyId,
        input.connectionId,
        input.roomTypeId,
        input.date,
        input.availableRooms,
        input.status,
        JSON.stringify(input.requestPayload),
        JSON.stringify(input.responsePayload),
        input.errorMessage ?? null,
      ]
    );
    return rows[0];
  },

  async listSyncLogs(propertyId: string, limit = 50): Promise<RoomInventorySyncLog[]> {
    const { rows } = await pool.query<RoomInventorySyncLog>(
      `SELECT * FROM room_inventory_sync_log WHERE property_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [propertyId, limit]
    );
    return rows;
  },
};
