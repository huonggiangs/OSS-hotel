import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import type { OtaProvider, OverbookingAlert } from "../types/domain";

export const overbookingRepo = {
  async create(input: {
    tenantId: string;
    propertyId: string;
    roomTypeId: string;
    date: string;
    otaProvider: OtaProvider;
    bookingIngestionLogId: string;
    message: string;
  }): Promise<OverbookingAlert> {
    const { rows } = await pool.query<OverbookingAlert>(
      `INSERT INTO overbooking_alerts
        (id, tenant_id, property_id, room_type_id, date, ota_provider, booking_ingestion_log_id, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        randomUUID(),
        input.tenantId,
        input.propertyId,
        input.roomTypeId,
        input.date,
        input.otaProvider,
        input.bookingIngestionLogId,
        input.message,
      ]
    );
    return rows[0];
  },

  async listByProperty(propertyId: string, onlyUnresolved = false): Promise<OverbookingAlert[]> {
    const where = onlyUnresolved ? `WHERE property_id = $1 AND resolved = false` : `WHERE property_id = $1`;
    const { rows } = await pool.query<OverbookingAlert>(
      `SELECT * FROM overbooking_alerts ${where} ORDER BY created_at DESC`,
      [propertyId]
    );
    return rows;
  },
};
