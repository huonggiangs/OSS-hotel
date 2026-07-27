import { pool } from "../lib/db";
import type { Customer } from "../types/domain";

export const customersRepo = {
  async list(propertyId?: string): Promise<Customer[]> {
    if (propertyId) {
      const { rows } = await pool.query<Customer>(`SELECT * FROM customers WHERE property_id = $1 ORDER BY created_at DESC`, [
        propertyId,
      ]);
      return rows;
    }
    const { rows } = await pool.query<Customer>(`SELECT * FROM customers ORDER BY created_at DESC`);
    return rows;
  },

  async findById(id: string): Promise<Customer | null> {
    const { rows } = await pool.query<Customer>(`SELECT * FROM customers WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async create(input: {
    id: string;
    tenantId: string;
    propertyId: string;
    fullName: string;
    phone?: string | null;
    email?: string | null;
    birthday?: string | null;
  }): Promise<Customer> {
    const { rows } = await pool.query<Customer>(
      `INSERT INTO customers (id, tenant_id, property_id, full_name, phone, email, birthday)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = now()
       RETURNING *`,
      [input.id, input.tenantId, input.propertyId, input.fullName, input.phone ?? null, input.email ?? null, input.birthday ?? null]
    );
    return rows[0];
  },

  /** Danh sách khách theo segment hiện hành, loại trừ opt_out — dùng khi gửi campaign. */
  async listBySegment(propertyId: string, segment: string): Promise<Customer[]> {
    const { rows } = await pool.query<Customer>(
      `SELECT c.* FROM customers c
       JOIN customer_segments cs ON cs.customer_id = c.id
       WHERE c.property_id = $1 AND cs.segment = $2 AND c.opt_out = false`,
      [propertyId, segment]
    );
    return rows;
  },

  async listAllActive(propertyId: string): Promise<Customer[]> {
    const { rows } = await pool.query<Customer>(`SELECT * FROM customers WHERE property_id = $1 AND opt_out = false`, [propertyId]);
    return rows;
  },
};
