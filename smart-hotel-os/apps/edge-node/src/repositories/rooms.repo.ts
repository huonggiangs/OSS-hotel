import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import { writeOutboxEvent } from "../utils/outbox";
import type { Room, RoomStatus } from "../types/domain";

export interface RoomInput {
  roomTypeId: string;
  number: string;
  floor: string;
  zone: string;
  status?: RoomStatus;
  powerOn?: boolean;
  note?: string | null;
}

export interface RoomWithType extends Room {
  room_type_name: string;
  room_type_price: string;
}

export const roomsRepo = {
  async list(propertyId: string): Promise<RoomWithType[]> {
    const { rows } = await pool.query<RoomWithType>(
      `SELECT r.*, rt.name AS room_type_name, rt.base_price AS room_type_price
       FROM rooms r
       JOIN room_types rt ON rt.id = r.room_type_id
       WHERE r.property_id = $1
       ORDER BY r.number ASC`,
      [propertyId]
    );
    return rows;
  },

  async findById(propertyId: string, id: string): Promise<Room | null> {
    const { rows } = await pool.query<Room>(`SELECT * FROM rooms WHERE property_id = $1 AND id = $2`, [
      propertyId,
      id,
    ]);
    return rows[0] ?? null;
  },

  // create — ghi INSERT + outbox_events TRONG CÙNG transaction (xem
  // src/lib/db.ts DbPool.transaction / src/utils/outbox.ts). Nếu tiến trình
  // crash ngay sau khi hàm này trả về, cả 2 thay đổi đã nằm an toàn trên đĩa
  // hoặc CẢ HAI đều chưa xảy ra — không có trạng thái nửa vời.
  async create(propertyId: string, tenantId: string, input: RoomInput): Promise<Room> {
    return pool.transaction(async (tx) => {
      const id = randomUUID();
      const { rows } = await tx.query<Room>(
        `INSERT INTO rooms (id, property_id, tenant_id, room_type_id, number, floor, zone, status, power_on, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [
          id,
          propertyId,
          tenantId,
          input.roomTypeId,
          input.number,
          input.floor,
          input.zone,
          input.status ?? "VACANT",
          input.powerOn ?? false,
          input.note ?? null,
        ]
      );
      const room = rows[0];
      await writeOutboxEvent(tx, { entityType: "room", entityId: room.id, eventType: "ROOM_CREATED", payload: room });
      return room;
    });
  },

  async setStatus(propertyId: string, id: string, status: RoomStatus): Promise<Room | null> {
    return pool.transaction(async (tx) => {
      const { rows } = await tx.query<Room>(
        `UPDATE rooms SET status = $1, updated_at = now() WHERE property_id = $2 AND id = $3 RETURNING *`,
        [status, propertyId, id]
      );
      const room = rows[0] ?? null;
      if (room) {
        await writeOutboxEvent(tx, { entityType: "room", entityId: room.id, eventType: "ROOM_STATUS_CHANGED", payload: room });
      }
      return room;
    });
  },

  async setPower(propertyId: string, id: string, powerOn: boolean): Promise<Room | null> {
    return pool.transaction(async (tx) => {
      const { rows } = await tx.query<Room>(
        `UPDATE rooms SET power_on = $1, updated_at = now() WHERE property_id = $2 AND id = $3 RETURNING *`,
        [powerOn, propertyId, id]
      );
      const room = rows[0] ?? null;
      if (room) {
        await writeOutboxEvent(tx, { entityType: "room", entityId: room.id, eventType: "ROOM_POWER_CHANGED", payload: room });
      }
      return room;
    });
  },

  // upsertFromCloud — pull-sync, KHÔNG ghi outbox (xem roomTypes.repo.ts).
  async upsertFromCloud(room: Room): Promise<void> {
    await pool.query(
      `INSERT INTO rooms (id, property_id, tenant_id, room_type_id, number, floor, zone, status, power_on, note, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         room_type_id = EXCLUDED.room_type_id, number = EXCLUDED.number, floor = EXCLUDED.floor,
         zone = EXCLUDED.zone, status = EXCLUDED.status, power_on = EXCLUDED.power_on, note = EXCLUDED.note,
         updated_at = EXCLUDED.updated_at
       WHERE EXCLUDED.updated_at > rooms.updated_at`,
      [
        room.id,
        room.property_id,
        room.tenant_id,
        room.room_type_id,
        room.number,
        room.floor,
        room.zone,
        room.status,
        room.power_on,
        room.note,
        room.created_at,
        room.updated_at,
      ]
    );
  },
};
