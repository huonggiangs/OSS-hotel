import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import type { PriceSyncLog } from "../types/domain";

export const priceSyncRepo = {
  async createSyncLog(input: {
    tenantId: string;
    propertyId: string;
    connectionId: string;
    roomTypeId: string;
    date: string;
    price: number;
    status: "SUCCESS" | "FAILED";
    requestPayload: unknown;
    responsePayload: unknown;
    errorMessage?: string | null;
  }): Promise<PriceSyncLog> {
    const { rows } = await pool.query<PriceSyncLog>(
      `INSERT INTO price_sync_log
        (id, tenant_id, property_id, connection_id, room_type_id, date, price, status, request_payload, response_payload, error_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        randomUUID(),
        input.tenantId,
        input.propertyId,
        input.connectionId,
        input.roomTypeId,
        input.date,
        input.price,
        input.status,
        JSON.stringify(input.requestPayload),
        JSON.stringify(input.responsePayload),
        input.errorMessage ?? null,
      ]
    );
    return rows[0];
  },

  async listSyncLogs(propertyId: string, limit = 50): Promise<PriceSyncLog[]> {
    const { rows } = await pool.query<PriceSyncLog>(
      `SELECT * FROM price_sync_log WHERE property_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [propertyId, limit]
    );
    return rows;
  },
};
