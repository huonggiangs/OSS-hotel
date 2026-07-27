import { pool } from "../lib/db";
import type { Partner } from "../types/domain";

export interface PartnerInput {
  name: string;
  territory?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  defaultCommissionPct?: number;
  maxCustomers?: number | null;
  status?: "ACTIVE" | "SUSPENDED" | "TERMINATED";
  notes?: string | null;
}

export const partnersRepo = {
  async list(opts: { search?: string; status?: string }): Promise<Partner[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (opts.search) {
      params.push(`%${opts.search}%`);
      clauses.push(`name ILIKE $${params.length}`);
    }
    if (opts.status) {
      params.push(opts.status);
      clauses.push(`status = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query<Partner>(
      `SELECT * FROM partners ${where} ORDER BY created_at DESC`,
      params
    );
    return rows;
  },

  async findById(id: string): Promise<Partner | null> {
    const { rows } = await pool.query<Partner>(`SELECT * FROM partners WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async create(input: PartnerInput): Promise<Partner> {
    const { rows } = await pool.query<Partner>(
      `INSERT INTO partners
        (id, name, territory, contact_name, contact_email, contact_phone, default_commission_pct, max_customers, status, notes)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        input.name,
        input.territory ?? null,
        input.contactName ?? null,
        input.contactEmail ?? null,
        input.contactPhone ?? null,
        input.defaultCommissionPct ?? 0,
        input.maxCustomers ?? null,
        input.status ?? "ACTIVE",
        input.notes ?? null,
      ]
    );
    return rows[0];
  },

  async update(id: string, input: Partial<PartnerInput>): Promise<Partner | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, unknown> = {
      name: input.name,
      territory: input.territory,
      contact_name: input.contactName,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      default_commission_pct: input.defaultCommissionPct,
      max_customers: input.maxCustomers,
      status: input.status,
      notes: input.notes,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        params.push(val);
        fields.push(`${col} = $${params.length}`);
      }
    }
    if (fields.length === 0) return this.findById(id);
    params.push(id);
    const { rows } = await pool.query<Partner>(
      `UPDATE partners SET ${fields.join(", ")}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  },

  async countCustomers(partnerId: string): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM customers_unified WHERE partner_id = $1`,
      [partnerId]
    );
    return Number(rows[0]?.count ?? 0);
  },
};
