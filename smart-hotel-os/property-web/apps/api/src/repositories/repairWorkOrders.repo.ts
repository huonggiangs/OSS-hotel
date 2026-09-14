import { randomUUID } from "node:crypto";
import { pool, type DbPool } from "../lib/db";
import { Errors } from "../utils/errors";
import type { MaintenanceRequest } from "./maintenance.repo";

export type RepairRoute = "REPAIR_APP" | "PARTNER_CONTACT";
export type RepairStatus = "PENDING_OWNER_APPROVAL" | "DISPATCHED" | "ACCEPTED" | "DECLINED" | "IN_PROGRESS" | "QUOTED" | "HANDOVER_SUBMITTED" | "COMPLETED" | "REJECTED" | "CONTACT_REQUESTED";

export interface RepairWorkOrder {
  id: string; property_id: string; tenant_id: string; maintenance_request_id: string;
  source: "PMS" | "HOUSEKEEPING"; route: RepairRoute; status: RepairStatus;
  assigned_to: string | null; partner_name: string | null; partner_phone: string | null;
  owner_decided_by: string | null; owner_decided_at: Date | null; quote_amount: string | null;
  quote_note: string | null; decline_reason: string | null; progress_note: string | null;
  handover_note: string | null; created_at: Date; updated_at: Date;
  room_number?: string; category?: string; description?: string; priority?: string;
  events?: RepairWorkOrderEvent[]; evidence?: RepairEvidence[];
}
export interface RepairWorkOrderEvent { id: string; work_order_id: string; actor_id: string | null; event_type: string; data: Record<string, unknown>; created_at: Date; }
export interface RepairEvidence { id: string; work_order_id: string; media_key: string; original_name: string; mime_type: string; byte_size: number; created_by: string | null; created_at: Date; }

async function addEvent(db: DbPool, workOrderId: string, propertyId: string, actorId: string | undefined, eventType: string, data: Record<string, unknown> = {}) {
  await db.query(`INSERT INTO repair_work_order_events (id, work_order_id, property_id, actor_id, event_type, data) VALUES ($1,$2,$3,$4,$5,$6::jsonb)`, [randomUUID(), workOrderId, propertyId, actorId ?? null, eventType, JSON.stringify(data)]);
}

async function hydrate(propertyId: string, rows: RepairWorkOrder[], includeHistory = true): Promise<RepairWorkOrder[]> {
  if (!rows.length || !includeHistory) return rows;
  const ids = rows.map((row) => row.id);
  const [events, evidence] = await Promise.all([
    pool.query<RepairWorkOrderEvent>(`SELECT id, work_order_id, actor_id, event_type, data, created_at FROM repair_work_order_events WHERE property_id = $1 AND work_order_id = ANY($2::text[]) ORDER BY created_at`, [propertyId, ids]),
    pool.query<RepairEvidence>(`SELECT id, work_order_id, media_key, original_name, mime_type, byte_size, created_by, created_at FROM repair_work_order_evidence WHERE property_id = $1 AND work_order_id = ANY($2::text[]) ORDER BY created_at`, [propertyId, ids]),
  ]);
  const eventMap = new Map<string, RepairWorkOrderEvent[]>(); const evidenceMap = new Map<string, RepairEvidence[]>();
  events.rows.forEach((item) => eventMap.set(item.work_order_id, [...(eventMap.get(item.work_order_id) ?? []), item]));
  evidence.rows.forEach((item) => evidenceMap.set(item.work_order_id, [...(evidenceMap.get(item.work_order_id) ?? []), item]));
  return rows.map((row) => ({ ...row, events: eventMap.get(row.id) ?? [], evidence: evidenceMap.get(row.id) ?? [] }));
}

async function findForUpdate(db: DbPool, propertyId: string, id: string): Promise<RepairWorkOrder> {
  const { rows } = await db.query<RepairWorkOrder>(`SELECT * FROM repair_work_orders WHERE property_id = $1 AND id = $2 FOR UPDATE`, [propertyId, id]);
  if (!rows[0]) throw Errors.notFound("công việc sửa chữa");
  return rows[0];
}

export const repairWorkOrdersRepo = {
  async createForMaintenance(input: { propertyId: string; tenantId: string; maintenance: MaintenanceRequest; reporterRole: string; reporterId?: string }): Promise<RepairWorkOrder> {
    return pool.transaction(async (tx) => {
      const source = input.reporterRole === "HOUSEKEEPING" ? "HOUSEKEEPING" : "PMS";
      const directDispatch = ["OWNER", "MANAGER", "TECHNICIAN"].includes(input.reporterRole);
      const status: RepairStatus = directDispatch ? "DISPATCHED" : "PENDING_OWNER_APPROVAL";
      const { rows } = await tx.query<RepairWorkOrder>(
        `INSERT INTO repair_work_orders (id, property_id, tenant_id, maintenance_request_id, source, route, status, partner_name, partner_phone)
         VALUES ($1,$2,$3,$4,$5,'REPAIR_APP',$6,$7,$8)
         ON CONFLICT (maintenance_request_id) DO UPDATE SET updated_at = now() RETURNING *`,
        [randomUUID(), input.propertyId, input.tenantId, input.maintenance.id, source, status, input.maintenance.partner_name, input.maintenance.partner_phone]
      );
      const workOrder = rows[0];
      await addEvent(tx, workOrder.id, input.propertyId, input.reporterId, directDispatch ? "DISPATCHED_FROM_PMS" : "SUBMITTED_FOR_OWNER_APPROVAL", { source, maintenance_request_id: input.maintenance.id });
      return workOrder;
    });
  },

  async list(propertyId: string, viewer: { role: string; userId: string }): Promise<RepairWorkOrder[]> {
    const technicianOnly = viewer.role === "TECHNICIAN";
    const { rows } = await pool.query<RepairWorkOrder>(
      `SELECT rwo.*, r.number AS room_number, mr.category, mr.description, mr.priority
       FROM repair_work_orders rwo JOIN maintenance_requests mr ON mr.id = rwo.maintenance_request_id JOIN rooms r ON r.id = mr.room_id
       WHERE rwo.property_id = $1 ${technicianOnly ? "AND rwo.route = 'REPAIR_APP' AND (rwo.assigned_to IS NULL OR rwo.assigned_to = $2) AND rwo.status IN ('DISPATCHED','ACCEPTED','IN_PROGRESS','QUOTED','HANDOVER_SUBMITTED')" : ""}
       ORDER BY CASE rwo.status WHEN 'PENDING_OWNER_APPROVAL' THEN 0 WHEN 'QUOTED' THEN 1 ELSE 2 END, rwo.updated_at DESC`,
      technicianOnly ? [propertyId, viewer.userId] : [propertyId]
    );
    return hydrate(propertyId, rows);
  },

  async ownerDecision(input: { propertyId: string; id: string; ownerId: string; action: "DISPATCH_TO_APP" | "CONTACT_PARTNER" | "REJECT"; technicianId?: string; partnerName?: string; partnerPhone?: string; note?: string }): Promise<RepairWorkOrder> {
    return pool.transaction(async (tx) => {
      const current = await findForUpdate(tx, input.propertyId, input.id);
      if (current.status !== "PENDING_OWNER_APPROVAL" && current.status !== "DECLINED") throw Errors.conflict("Công việc không ở trạng thái chờ chủ cơ sở quyết định.");
      const status: RepairStatus = input.action === "DISPATCH_TO_APP" ? "DISPATCHED" : input.action === "CONTACT_PARTNER" ? "CONTACT_REQUESTED" : "REJECTED";
      if (input.action === "CONTACT_PARTNER" && !(input.partnerName ?? current.partner_name)) throw Errors.validation({ partnerName: "Cần chọn hoặc nhập đối tác sửa chữa." });
      if (input.action === "DISPATCH_TO_APP" && input.technicianId) {
        const technician = await tx.query<{ id: string }>(`SELECT id FROM property_users WHERE property_id = $1 AND id = $2 AND role = 'TECHNICIAN' AND status = 'ACTIVE'`, [input.propertyId, input.technicianId]);
        if (!technician.rows[0]) throw Errors.validation({ technicianId: "Kỹ thuật viên không thuộc cơ sở hoặc đang ngừng hoạt động." });
      }
      const { rows } = await tx.query<RepairWorkOrder>(
        `UPDATE repair_work_orders SET route = $3, status = $4, assigned_to = $5, partner_name = $6, partner_phone = $7, owner_decided_by = $8, owner_decided_at = now(), progress_note = $9, updated_at = now()
         WHERE property_id = $1 AND id = $2 RETURNING *`,
        [input.propertyId, input.id, input.action === "CONTACT_PARTNER" ? "PARTNER_CONTACT" : "REPAIR_APP", status, input.action === "DISPATCH_TO_APP" ? input.technicianId ?? null : null, input.partnerName ?? current.partner_name, input.partnerPhone ?? current.partner_phone, input.ownerId, input.note?.trim() || null]
      );
      await addEvent(tx, input.id, input.propertyId, input.ownerId, input.action, { technician_id: input.technicianId ?? null, partner_name: input.partnerName ?? current.partner_name, note: input.note ?? null });
      return rows[0];
    });
  },

  async approveQuote(input: { propertyId: string; id: string; ownerId: string }): Promise<RepairWorkOrder> {
    return pool.transaction(async (tx) => {
      const current = await findForUpdate(tx, input.propertyId, input.id);
      if (current.status !== "QUOTED") throw Errors.conflict("Công việc chưa ở trạng thái chờ duyệt báo giá.");
      const { rows } = await tx.query<RepairWorkOrder>(`UPDATE repair_work_orders SET status = 'IN_PROGRESS', owner_decided_by = $3, owner_decided_at = now(), updated_at = now() WHERE property_id = $1 AND id = $2 RETURNING *`, [input.propertyId, input.id, input.ownerId]);
      await addEvent(tx, input.id, input.propertyId, input.ownerId, "OWNER_APPROVED_QUOTE", { quote_amount: current.quote_amount });
      return rows[0];
    });
  },

  async technicianUpdate(input: { propertyId: string; id: string; technicianId: string; action: "ACCEPT" | "DECLINE" | "START" | "QUOTE" | "HANDOVER"; reason?: string; note?: string; quoteAmount?: number }): Promise<RepairWorkOrder> {
    return pool.transaction(async (tx) => {
      const current = await findForUpdate(tx, input.propertyId, input.id);
      if (current.route !== "REPAIR_APP") throw Errors.conflict("Công việc này được xử lý qua đối tác liên hệ, không giao cho app sửa chữa.");
      if (current.assigned_to && current.assigned_to !== input.technicianId) throw Errors.forbidden();
      const requiredReason = input.action === "DECLINE";
      if (requiredReason && !input.reason?.trim()) throw Errors.validation({ reason: "Cần nêu lý do từ chối." });
      if (input.action === "QUOTE" && (!Number.isFinite(input.quoteAmount) || (input.quoteAmount ?? 0) < 0)) throw Errors.validation({ quoteAmount: "Báo giá không hợp lệ." });
      const statuses: Record<typeof input.action, RepairStatus> = { ACCEPT: "ACCEPTED", DECLINE: "DECLINED", START: "IN_PROGRESS", QUOTE: "QUOTED", HANDOVER: "HANDOVER_SUBMITTED" };
      const acceptedStates: Record<typeof input.action, RepairStatus[]> = { ACCEPT: ["DISPATCHED", "DECLINED"], DECLINE: ["DISPATCHED", "ACCEPTED"], START: ["ACCEPTED"], QUOTE: ["ACCEPTED", "IN_PROGRESS"], HANDOVER: ["IN_PROGRESS"] };
      if (!acceptedStates[input.action].includes(current.status)) throw Errors.conflict("Trạng thái công việc không phù hợp với thao tác này.");
      const { rows } = await tx.query<RepairWorkOrder>(
        `UPDATE repair_work_orders SET assigned_to = $3, status = $4, decline_reason = $5, progress_note = $6, quote_amount = $7, quote_note = $8, handover_note = $9, updated_at = now()
         WHERE property_id = $1 AND id = $2 RETURNING *`,
        [input.propertyId, input.id, input.technicianId, statuses[input.action], input.action === "DECLINE" ? input.reason!.trim() : null, input.action === "START" ? input.note?.trim() || null : current.progress_note, input.action === "QUOTE" ? input.quoteAmount : current.quote_amount, input.action === "QUOTE" ? input.note?.trim() || null : current.quote_note, input.action === "HANDOVER" ? input.note?.trim() || null : current.handover_note]
      );
      await addEvent(tx, input.id, input.propertyId, input.technicianId, `TECHNICIAN_${input.action}`, { reason: input.reason ?? null, note: input.note ?? null, quote_amount: input.quoteAmount ?? null });
      return rows[0];
    });
  },

  async acceptHandover(input: { propertyId: string; tenantId: string; id: string; ownerId: string }): Promise<RepairWorkOrder> {
    return pool.transaction(async (tx) => {
      const current = await findForUpdate(tx, input.propertyId, input.id);
      if (current.status !== "HANDOVER_SUBMITTED") throw Errors.conflict("Cần kỹ thuật viên bàn giao trước khi xác nhận hoàn tất.");
      const { rows: requestRows } = await tx.query<{ room_id: string; booking_id: string | null }>(`SELECT room_id, booking_id FROM maintenance_requests WHERE property_id = $1 AND id = $2 FOR UPDATE`, [input.propertyId, current.maintenance_request_id]);
      const request = requestRows[0]; if (!request) throw Errors.notFound("phiếu bảo trì");
      const { rows } = await tx.query<RepairWorkOrder>(`UPDATE repair_work_orders SET status = 'COMPLETED', updated_at = now() WHERE property_id = $1 AND id = $2 RETURNING *`, [input.propertyId, input.id]);
      await tx.query(`UPDATE maintenance_requests SET status = 'COMPLETED', updated_at = now() WHERE property_id = $1 AND id = $2`, [input.propertyId, current.maintenance_request_id]);
      await tx.query(`UPDATE rooms SET status = 'DIRTY', power_on = false, updated_at = now() WHERE property_id = $1 AND id = $2`, [input.propertyId, request.room_id]);
      const existing = await tx.query<{ id: string }>(`SELECT id FROM housekeeping_tasks WHERE property_id = $1 AND room_id = $2 AND status IN ('PENDING','IN_PROGRESS')`, [input.propertyId, request.room_id]);
      if (!existing.rows[0]) await tx.query(`INSERT INTO housekeeping_tasks (id, property_id, tenant_id, room_id, booking_id, status, note) VALUES ($1,$2,$3,$4,$5,'PENDING',$6)`, [randomUUID(), input.propertyId, input.tenantId, request.room_id, request.booking_id, "Dọn phòng sau sửa chữa"]);
      await addEvent(tx, input.id, input.propertyId, input.ownerId, "OWNER_ACCEPTED_HANDOVER", { room_status: "DIRTY" });
      return rows[0];
    });
  },

  async addEvidence(input: { propertyId: string; workOrderId: string; actorId: string; mediaKey: string; originalName: string; mimeType: string; byteSize: number }): Promise<RepairEvidence> {
    const { rows } = await pool.query<RepairEvidence>(`INSERT INTO repair_work_order_evidence (id, work_order_id, property_id, media_key, original_name, mime_type, byte_size, created_by) SELECT $1,$2,$3,$4,$5,$6,$7,$8 WHERE EXISTS (SELECT 1 FROM repair_work_orders WHERE id = $2 AND property_id = $3) RETURNING *`, [randomUUID(), input.workOrderId, input.propertyId, input.mediaKey, input.originalName, input.mimeType, input.byteSize, input.actorId]);
    if (!rows[0]) throw Errors.notFound("công việc sửa chữa");
    await addEvent(pool, input.workOrderId, input.propertyId, input.actorId, "EVIDENCE_UPLOADED", { evidence_id: rows[0].id, mime_type: input.mimeType });
    return rows[0];
  },

  async findEvidence(propertyId: string, id: string): Promise<RepairEvidence | null> {
    const { rows } = await pool.query<RepairEvidence>(`SELECT id, work_order_id, media_key, original_name, mime_type, byte_size, created_by, created_at FROM repair_work_order_evidence WHERE property_id = $1 AND id = $2`, [propertyId, id]);
    return rows[0] ?? null;
  },
};
