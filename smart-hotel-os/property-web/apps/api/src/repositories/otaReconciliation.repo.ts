import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import type { BookingChannel } from "../types/domain";

export interface OtaReconciliationInput {
  bookingId?: string | null;
  channel: BookingChannel;
  externalReference: string;
  grossAmount: number;
  commissionAmount: number;
  receivedAmount: number;
  settlementDate?: string | null;
  status?: "PENDING" | "MATCHED" | "DISPUTED";
  note?: string | null;
  source?: string;
}

export const otaReconciliationRepo = {
  async list(propertyId: string) {
    const { rows } = await pool.query(
      `SELECT r.*, b.code AS booking_code, c.full_name AS guest_name
       FROM ota_reconciliations r
       LEFT JOIN bookings b ON b.id = r.booking_id
       LEFT JOIN customers c ON c.id = b.customer_id
       WHERE r.property_id = $1
       ORDER BY r.settlement_date DESC NULLS LAST, r.created_at DESC`,
      [propertyId]
    );
    return rows;
  },

  async create(propertyId: string, tenantId: string, input: OtaReconciliationInput) {
    let bookingId = input.bookingId ?? null;
    if (bookingId) {
      const { rows: bookingRows } = await pool.query<{ id: string }>(
        `SELECT id FROM bookings WHERE property_id = $1 AND (id = $2 OR code = $2) LIMIT 1`,
        [propertyId, bookingId]
      );
      if (!bookingRows[0]) bookingId = null;
      else bookingId = bookingRows[0].id;
    }
    const net = Math.max(0, input.grossAmount - input.commissionAmount);
    const { rows } = await pool.query(
      `INSERT INTO ota_reconciliations
       (id, property_id, tenant_id, booking_id, channel, external_reference, gross_amount, commission_amount, net_amount, received_amount, settlement_date, status, note, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [randomUUID(), propertyId, tenantId, bookingId, input.channel, input.externalReference, input.grossAmount, input.commissionAmount, net, input.receivedAmount, input.settlementDate ?? null, input.status ?? (Math.abs(net - input.receivedAmount) < 1 ? "MATCHED" : "PENDING"), input.note ?? null, input.source ?? "MANUAL"]
    );
    return rows[0];
  },

  async updateStatus(propertyId: string, id: string, status: "PENDING" | "MATCHED" | "DISPUTED", note?: string | null) {
    const { rows } = await pool.query(
      `UPDATE ota_reconciliations SET status = $1, note = COALESCE($2, note), updated_at = now()
       WHERE property_id = $3 AND id = $4 RETURNING *`,
      [status, note ?? null, propertyId, id]
    );
    return rows[0] ?? null;
  },
};
