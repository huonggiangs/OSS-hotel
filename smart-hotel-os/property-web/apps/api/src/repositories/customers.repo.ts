import { pool } from "../lib/db";
import type { Customer } from "../types/domain";

export interface CustomerInput {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  segment?: string;
  note?: string | null;
}

export const customersRepo = {
  async list(propertyId: string, search?: string): Promise<Customer[]> {
    const params: unknown[] = [propertyId];
    let where = `WHERE property_id = $1`;
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (full_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }
    const { rows } = await pool.query<Customer>(`SELECT * FROM customers ${where} ORDER BY created_at DESC`, params);
    return rows;
  },

  async findById(propertyId: string, id: string): Promise<Customer | null> {
    const { rows } = await pool.query<Customer>(`SELECT * FROM customers WHERE property_id = $1 AND id = $2`, [
      propertyId,
      id,
    ]);
    return rows[0] ?? null;
  },

  async create(propertyId: string, tenantId: string, input: CustomerInput): Promise<Customer> {
    const { rows } = await pool.query<Customer>(
      `INSERT INTO customers (id, property_id, tenant_id, full_name, phone, email, segment, note)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [propertyId, tenantId, input.fullName, input.phone ?? null, input.email ?? null, input.segment ?? "Mới", input.note ?? null]
    );
    return rows[0];
  },

  async update(propertyId: string, id: string, input: Partial<CustomerInput>): Promise<Customer | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, unknown> = {
      full_name: input.fullName,
      phone: input.phone,
      email: input.email,
      segment: input.segment,
      note: input.note,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        params.push(val);
        fields.push(`${col} = $${params.length}`);
      }
    }
    if (fields.length === 0) return this.findById(propertyId, id);
    params.push(propertyId, id);
    const { rows } = await pool.query<Customer>(
      `UPDATE customers SET ${fields.join(", ")}, updated_at = now()
       WHERE property_id = $${params.length - 1} AND id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  },

  async delete(propertyId: string, id: string): Promise<Customer | null> {
    return pool.transaction(async (tx) => {
      const { rows: existing } = await tx.query<Customer>(
        `SELECT * FROM customers WHERE property_id = $1 AND id = $2 FOR UPDATE`,
        [propertyId, id]
      );
      if (!existing[0]) return null;
      // Giữ lịch sử đặt phòng nhưng bỏ liên kết tới khách đã xóa để không vi phạm FK.
      await tx.query(`UPDATE bookings SET customer_id = NULL, updated_at = now() WHERE property_id = $1 AND customer_id = $2`, [propertyId, id]);
      const { rows } = await tx.query<Customer>(`DELETE FROM customers WHERE property_id = $1 AND id = $2 RETURNING *`, [propertyId, id]);
      return rows[0] ?? existing[0];
    });
  },

  async countTotal(propertyId: string): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM customers WHERE property_id = $1`, [
      propertyId,
    ]);
    return Number(rows[0]?.count ?? 0);
  },
};
