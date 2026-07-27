import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import type { OtaConnection, OtaProvider } from "../types/domain";

export const connectionsRepo = {
  async list(propertyId?: string): Promise<OtaConnection[]> {
    if (propertyId) {
      const { rows } = await pool.query<OtaConnection>(
        `SELECT * FROM ota_connections WHERE property_id = $1 ORDER BY created_at DESC`,
        [propertyId]
      );
      return rows;
    }
    const { rows } = await pool.query<OtaConnection>(`SELECT * FROM ota_connections ORDER BY created_at DESC`);
    return rows;
  },

  async findByPropertyAndProvider(propertyId: string, provider: OtaProvider): Promise<OtaConnection | null> {
    const { rows } = await pool.query<OtaConnection>(
      `SELECT * FROM ota_connections WHERE property_id = $1 AND ota_provider = $2`,
      [propertyId, provider]
    );
    return rows[0] ?? null;
  },

  async upsert(input: {
    tenantId: string;
    propertyId: string;
    provider: OtaProvider;
    credentials: Record<string, unknown>;
  }): Promise<OtaConnection> {
    const { rows } = await pool.query<OtaConnection>(
      `INSERT INTO ota_connections (id, tenant_id, property_id, ota_provider, credentials, status, last_connected_at)
       VALUES ($1,$2,$3,$4,$5,'CONNECTED', now())
       ON CONFLICT (property_id, ota_provider)
       DO UPDATE SET credentials = EXCLUDED.credentials, status = 'CONNECTED', last_connected_at = now(), updated_at = now()
       RETURNING *`,
      [randomUUID(), input.tenantId, input.propertyId, input.provider, JSON.stringify(input.credentials)]
    );
    return rows[0];
  },

  async listConnectedForProperty(propertyId: string): Promise<OtaConnection[]> {
    const { rows } = await pool.query<OtaConnection>(
      `SELECT * FROM ota_connections WHERE property_id = $1 AND status = 'CONNECTED'`,
      [propertyId]
    );
    return rows;
  },
};
