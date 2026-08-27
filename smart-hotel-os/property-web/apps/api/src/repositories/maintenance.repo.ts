import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import { Errors } from "../utils/errors";
import { setRoomEnergyState } from "./roomControl.repo";

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
  issues: MaintenanceIssue[];
}

export interface MaintenanceIssue {
  id: string;
  request_id: string;
  category: string;
  description: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  created_at: Date;
  media: MaintenanceMedia[];
}

export interface MaintenanceMedia {
  id: string;
  media_key: string;
  original_name: string;
  mime_type: string;
  byte_size: number;
  created_at: Date;
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
  issues: { category: string; description: string; priority: MaintenanceRequest["priority"] }[];
}

async function hydrateRequests(propertyId: string, requests: Omit<MaintenanceRequest, "issues">[]): Promise<MaintenanceRequest[]> {
  if (!requests.length) return [];
  const requestIds = requests.map((item) => item.id);
  const { rows: issues } = await pool.query<MaintenanceIssue>(
    `SELECT * FROM maintenance_issues WHERE request_id = ANY($1::text[]) ORDER BY created_at`,
    [requestIds]
  );
  const issueIds = issues.map((issue) => issue.id);
  const { rows: media } = issueIds.length
    ? await pool.query<MaintenanceMedia & { issue_id: string }>(
        `SELECT id, issue_id, media_key, original_name, mime_type, byte_size, created_at
         FROM maintenance_media WHERE property_id = $1 AND issue_id = ANY($2::text[]) ORDER BY created_at`,
        [propertyId, issueIds]
      )
    : { rows: [] as (MaintenanceMedia & { issue_id: string })[] };
  const mediaByIssue = new Map<string, MaintenanceMedia[]>();
  media.forEach(({ issue_id, ...item }) => mediaByIssue.set(issue_id, [...(mediaByIssue.get(issue_id) ?? []), item]));
  const issuesByRequest = new Map<string, MaintenanceIssue[]>();
  issues.forEach((issue) => issuesByRequest.set(issue.request_id, [...(issuesByRequest.get(issue.request_id) ?? []), { ...issue, media: mediaByIssue.get(issue.id) ?? [] }]));
  return requests.map((request) => ({ ...request, issues: issuesByRequest.get(request.id) ?? [] }));
}

export const maintenanceRepo = {
  async list(propertyId: string, roomId?: string): Promise<MaintenanceRequest[]> {
    const params: string[] = [propertyId];
    let clause = "WHERE property_id = $1";
    if (roomId) {
      params.push(roomId);
      clause += " AND room_id = $2";
    }
    const { rows } = await pool.query<Omit<MaintenanceRequest, "issues">>(
      `SELECT * FROM maintenance_requests ${clause} ORDER BY created_at DESC`,
      params
    );
    return hydrateRequests(propertyId, rows);
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
      const { rows } = await tx.query<Omit<MaintenanceRequest, "issues">>(
        `INSERT INTO maintenance_requests
          (id, property_id, tenant_id, room_id, booking_id, category, description, priority, partner_name, partner_phone, guest_visible, reported_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          randomUUID(), propertyId, tenantId, input.roomId, input.bookingId ?? null, input.category, input.description,
          input.priority, input.partnerName ?? null, input.partnerPhone ?? null, input.guestVisible, reportedBy ?? null,
        ]
      );
      const request = rows[0];
      for (const issue of input.issues) {
        await tx.query(
          `INSERT INTO maintenance_issues (id, request_id, category, description, priority) VALUES ($1,$2,$3,$4,$5)`,
          [randomUUID(), request.id, issue.category, issue.description, issue.priority]
        );
      }
      if (input.markRoomMaintenance) {
        await tx.query(`UPDATE rooms SET status = 'MAINTENANCE', updated_at = now() WHERE property_id = $1 AND id = $2`, [propertyId, input.roomId]);
        await setRoomEnergyState(tx, { propertyId, tenantId, roomId: input.roomId, bookingId: input.bookingId, powerOn: false, requestedBy: reportedBy });
      }
      // create nằm trong transaction nên không thể dùng hydrateRequests (dùng
      // pool khác); ghép các lỗi vừa ghi để response có ID upload media ngay.
      const { rows: issues } = await tx.query<MaintenanceIssue>(`SELECT * FROM maintenance_issues WHERE request_id = $1 ORDER BY created_at`, [request.id]);
      return { ...request, issues: issues.map((issue) => ({ ...issue, media: [] })) };
    });
  },

  async updateStatus(propertyId: string, id: string, status: MaintenanceRequest["status"]): Promise<MaintenanceRequest | null> {
    const { rows } = await pool.query<Omit<MaintenanceRequest, "issues">>(
      `UPDATE maintenance_requests SET status = $3, updated_at = now() WHERE property_id = $1 AND id = $2 RETURNING *`,
      [propertyId, id, status]
    );
    const results = await hydrateRequests(propertyId, rows);
    return results[0] ?? null;
  },

  async addMedia(propertyId: string, requestId: string, issueId: string, input: Omit<MaintenanceMedia, "id" | "created_at">): Promise<MaintenanceMedia> {
    const { rows: issueRows } = await pool.query<{ id: string }>(
      `SELECT mi.id FROM maintenance_issues mi JOIN maintenance_requests mr ON mr.id = mi.request_id
       WHERE mr.property_id = $1 AND mr.id = $2 AND mi.id = $3`,
      [propertyId, requestId, issueId]
    );
    if (!issueRows[0]) throw Errors.notFound("lỗi hỏng trong phiếu bảo trì");
    const { rows } = await pool.query<MaintenanceMedia>(
      `INSERT INTO maintenance_media (id, property_id, issue_id, media_key, original_name, mime_type, byte_size)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, media_key, original_name, mime_type, byte_size, created_at`,
      [randomUUID(), propertyId, issueId, input.media_key, input.original_name, input.mime_type, input.byte_size]
    );
    return rows[0];
  },

  async findMedia(propertyId: string, id: string): Promise<MaintenanceMedia | null> {
    const { rows } = await pool.query<MaintenanceMedia>(
      `SELECT mm.id, mm.media_key, mm.original_name, mm.mime_type, mm.byte_size, mm.created_at
       FROM maintenance_media mm JOIN maintenance_issues mi ON mi.id = mm.issue_id
       JOIN maintenance_requests mr ON mr.id = mi.request_id
       WHERE mm.id = $1 AND mr.property_id = $2`,
      [id, propertyId]
    );
    return rows[0] ?? null;
  },
};
