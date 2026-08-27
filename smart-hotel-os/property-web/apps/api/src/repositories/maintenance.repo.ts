import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import { Errors } from "../utils/errors";

export interface MaintenanceRequest {
  id: string;
  property_id: string;
  tenant_id: string;
  room_id: string;
  booking_id: string | null;
  category: string;
  description: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  partner_name: string | null;
  partner_phone: string | null;
  guest_visible: boolean;
  reported_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MaintenanceInput {
  roomId: string;
  bookingId?: string | null;
  category: string;
  description: string;
  priority: MaintenanceRequest["priority"];
  partnerName?: string | null;
  partnerPhone?: string | null;
  guestVisible: boolean;
  markRoomMaintenance: boolean;
}

export const maintenanceRepo = {
  async list(propertyId: string, roomId?: string): Promise<MaintenanceRequest[]> {
    const params: string[] = [propertyId];
    let clause = "WHERE property_id = $1";
    if (roomId) {
      params.push(roomId);
      clause += " AND room_id = $2";
    }
    const { rows } = await pool.query<MaintenanceRequest>(
      `SELECT * FROM maintenance_requests ${clause} ORDER BY created_at DESC`,
      params
    );
    return rows;
  },

  async create(propertyId: string, tenantId: string, reportedBy: string | undefined, input: MaintenanceInput): Promise<MaintenanceRequest> {
    return pool.transaction(async (tx) => {
      const { rows: roomRows } = await tx.query<{ status: string }>(
        `SELECT status FROM rooms WHERE property_id = $1 AND id = $2 FOR UPDATE`,
        [propertyId, input.roomId]
      );
      const room = roomRows[0];
      if (!room) throw Errors.notFound("phòng");
      if (input.markRoomMaintenance && room.status === "OCCUPIED") {
        throw Errors.conflict("Phòng đang có khách. Hãy chuyển khách trước rồi mới đưa phòng vào bảo trì.");
      }
      if (input.bookingId) {
        const { rows: bookingRows } = await tx.query<{ id: string }>(
          `SELECT id FROM bookings WHERE property_id = $1 AND id = $2`,
          [propertyId, input.bookingId]
        );
        if (!bookingRows[0]) throw Errors.notFound("hợp đồng lưu trú");
      }
      const { rows } = await tx.query<MaintenanceRequest>(
        `INSERT INTO maintenance_requests
          (id, property_id, tenant_id, room_id, booking_id, category, description, priority, partner_name, partner_phone, guest_visible, reported_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          randomUUID(), propertyId, tenantId, input.roomId, input.bookingId ?? null, input.category, input.description,
          input.priority, input.partnerName ?? null, input.partnerPhone ?? null, input.guestVisible, reportedBy ?? null,
        ]
      );
      if (input.markRoomMaintenance) {
        await tx.query(`UPDATE rooms SET status = 'MAINTENANCE', power_on = false, updated_at = now() WHERE property_id = $1 AND id = $2`, [propertyId, input.roomId]);
        await tx.query(`UPDATE devices SET power_on = false, updated_at = now() WHERE property_id = $1 AND room_id = $2`, [propertyId, input.roomId]);
      }
      return rows[0];
    });
  },

  async updateStatus(propertyId: string, id: string, status: MaintenanceRequest["status"]): Promise<MaintenanceRequest | null> {
    const { rows } = await pool.query<MaintenanceRequest>(
      `UPDATE maintenance_requests SET status = $3, updated_at = now() WHERE property_id = $1 AND id = $2 RETURNING *`,
      [propertyId, id, status]
    );
    return rows[0] ?? null;
  },
};
