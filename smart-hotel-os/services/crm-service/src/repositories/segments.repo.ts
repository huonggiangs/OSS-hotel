import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import type { CustomerSegment, CustomerSegmentType } from "../types/domain";

export const segmentsRepo = {
  async upsert(input: {
    tenantId: string;
    propertyId: string;
    customerId: string;
    segment: CustomerSegmentType;
    reason: string;
  }): Promise<CustomerSegment> {
    const { rows } = await pool.query<CustomerSegment>(
      `INSERT INTO customer_segments (id, tenant_id, property_id, customer_id, segment, reason, computed_at)
       VALUES ($1,$2,$3,$4,$5,$6, now())
       ON CONFLICT (customer_id) DO UPDATE SET
         segment = EXCLUDED.segment, reason = EXCLUDED.reason, computed_at = now()
       RETURNING *`,
      [randomUUID(), input.tenantId, input.propertyId, input.customerId, input.segment, input.reason]
    );
    return rows[0];
  },

  async listByProperty(propertyId: string): Promise<CustomerSegment[]> {
    const { rows } = await pool.query<CustomerSegment>(`SELECT * FROM customer_segments WHERE property_id = $1`, [propertyId]);
    return rows;
  },

  async findByCustomerId(customerId: string): Promise<CustomerSegment | null> {
    const { rows } = await pool.query<CustomerSegment>(`SELECT * FROM customer_segments WHERE customer_id = $1`, [customerId]);
    return rows[0] ?? null;
  },
};
