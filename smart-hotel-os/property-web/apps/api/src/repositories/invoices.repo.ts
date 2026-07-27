import { pool } from "../lib/db";
import type { Invoice, InvoiceMethod, InvoiceStatus } from "../types/domain";

export interface InvoiceInput {
  bookingId?: string | null;
  guestName: string;
  method?: InvoiceMethod;
  amount: number;
  status?: InvoiceStatus;
}

export const invoicesRepo = {
  async list(propertyId: string): Promise<Invoice[]> {
    const { rows } = await pool.query<Invoice>(`SELECT * FROM invoices WHERE property_id = $1 ORDER BY created_at DESC`, [
      propertyId,
    ]);
    return rows;
  },

  async findById(propertyId: string, id: string): Promise<Invoice | null> {
    const { rows } = await pool.query<Invoice>(`SELECT * FROM invoices WHERE property_id = $1 AND id = $2`, [
      propertyId,
      id,
    ]);
    return rows[0] ?? null;
  },

  async nextCode(propertyId: string): Promise<string> {
    const { rows } = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM invoices WHERE property_id = $1`, [
      propertyId,
    ]);
    const seq = Number(rows[0]?.count ?? 0) + 1;
    return `HD-${8890 + seq}`;
  },

  async create(propertyId: string, tenantId: string, input: InvoiceInput): Promise<Invoice> {
    const code = await this.nextCode(propertyId);
    const status = input.status ?? "PENDING";
    const { rows } = await pool.query<Invoice>(
      `INSERT INTO invoices (id, property_id, tenant_id, booking_id, code, guest_name, method, amount, status, paid_at)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        propertyId,
        tenantId,
        input.bookingId ?? null,
        code,
        input.guestName,
        input.method ?? "CASH",
        input.amount,
        status,
        status === "PAID" ? new Date() : null,
      ]
    );
    return rows[0];
  },

  async update(propertyId: string, id: string, input: Partial<InvoiceInput>): Promise<Invoice | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, unknown> = {
      guest_name: input.guestName,
      method: input.method,
      amount: input.amount,
      status: input.status,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        params.push(val);
        fields.push(`${col} = $${params.length}`);
      }
    }
    if (input.status === "PAID") {
      params.push(new Date());
      fields.push(`paid_at = $${params.length}`);
    }
    if (fields.length === 0) return this.findById(propertyId, id);
    params.push(propertyId, id);
    const { rows } = await pool.query<Invoice>(
      `UPDATE invoices SET ${fields.join(", ")}, updated_at = now()
       WHERE property_id = $${params.length - 1} AND id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  },

  async sumPaidToday(propertyId: string): Promise<number> {
    const { rows } = await pool.query<{ sum: string }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS sum FROM invoices
       WHERE property_id = $1 AND status = 'PAID' AND paid_at::date = CURRENT_DATE`,
      [propertyId]
    );
    return Number(rows[0]?.sum ?? 0);
  },
};
