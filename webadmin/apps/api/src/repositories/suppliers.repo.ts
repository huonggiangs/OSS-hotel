import { pool } from "../lib/db";
import type { Supplier } from "../types/domain";

export interface SupplierInput {
  name: string;
  suppliesTypes?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  paymentTerms?: string | null;
  leadTimeDays?: number | null;
  status?: "ACTIVE" | "INACTIVE";
}

export const suppliersRepo = {
  async list(search?: string): Promise<Supplier[]> {
    const params: unknown[] = [];
    let where = "";
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE name ILIKE $1`;
    }
    const { rows } = await pool.query<Supplier>(`SELECT * FROM suppliers ${where} ORDER BY created_at DESC`, params);
    return rows;
  },

  async findById(id: string): Promise<Supplier | null> {
    const { rows } = await pool.query<Supplier>(`SELECT * FROM suppliers WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async create(input: SupplierInput): Promise<Supplier> {
    const { rows } = await pool.query<Supplier>(
      `INSERT INTO suppliers (id, name, supplies_types, contact_name, contact_email, contact_phone, payment_terms, lead_time_days, status)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        input.name,
        input.suppliesTypes ?? null,
        input.contactName ?? null,
        input.contactEmail ?? null,
        input.contactPhone ?? null,
        input.paymentTerms ?? null,
        input.leadTimeDays ?? null,
        input.status ?? "ACTIVE",
      ]
    );
    return rows[0];
  },

  async update(id: string, input: Partial<SupplierInput>): Promise<Supplier | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, unknown> = {
      name: input.name,
      supplies_types: input.suppliesTypes,
      contact_name: input.contactName,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      payment_terms: input.paymentTerms,
      lead_time_days: input.leadTimeDays,
      status: input.status,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        params.push(val);
        fields.push(`${col} = $${params.length}`);
      }
    }
    if (fields.length === 0) return this.findById(id);
    params.push(id);
    const { rows } = await pool.query<Supplier>(
      `UPDATE suppliers SET ${fields.join(", ")}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  },

  async countHardwareAssets(supplierId: string): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM hardware_assets WHERE supplier_id = $1`,
      [supplierId]
    );
    return Number(rows[0]?.count ?? 0);
  },
};
