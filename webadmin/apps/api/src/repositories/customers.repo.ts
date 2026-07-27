import { pool } from "../lib/db";
import type { CustomerUnified, SupportTicket } from "../types/domain";

export interface CustomerInput {
  name: string;
  address?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  partnerId?: string | null;
  usesKiosk?: boolean;
  usesSmartHotelOs?: boolean;
  shoTenantId?: string | null;
  kioskCustomerId?: string | null;
  billingStatus?: "ACTIVE" | "OVERDUE" | "SUSPENDED";
}

export const customersRepo = {
  async list(opts: { search?: string; product?: string }): Promise<CustomerUnified[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (opts.search) {
      params.push(`%${opts.search}%`);
      clauses.push(`name ILIKE $${params.length}`);
    }
    if (opts.product === "KIOSK") clauses.push(`uses_kiosk = true`);
    if (opts.product === "SMART_HOTEL_OS") clauses.push(`uses_smart_hotel_os = true`);
    if (opts.product === "BOTH") clauses.push(`uses_kiosk = true AND uses_smart_hotel_os = true`);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query<CustomerUnified>(
      `SELECT * FROM customers_unified ${where} ORDER BY created_at DESC`,
      params
    );
    return rows;
  },

  async findById(id: string): Promise<CustomerUnified | null> {
    const { rows } = await pool.query<CustomerUnified>(`SELECT * FROM customers_unified WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async create(input: CustomerInput): Promise<CustomerUnified> {
    const { rows } = await pool.query<CustomerUnified>(
      `INSERT INTO customers_unified
        (id, name, address, contact_name, contact_email, contact_phone, partner_id, uses_kiosk, uses_smart_hotel_os, sho_tenant_id, kiosk_customer_id, billing_status)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        input.name,
        input.address ?? null,
        input.contactName ?? null,
        input.contactEmail ?? null,
        input.contactPhone ?? null,
        input.partnerId ?? null,
        input.usesKiosk ?? false,
        input.usesSmartHotelOs ?? false,
        input.shoTenantId ?? null,
        input.kioskCustomerId ?? null,
        input.billingStatus ?? "ACTIVE",
      ]
    );
    return rows[0];
  },

  async update(id: string, input: Partial<CustomerInput>): Promise<CustomerUnified | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, unknown> = {
      name: input.name,
      address: input.address,
      contact_name: input.contactName,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      partner_id: input.partnerId,
      uses_kiosk: input.usesKiosk,
      uses_smart_hotel_os: input.usesSmartHotelOs,
      sho_tenant_id: input.shoTenantId,
      kiosk_customer_id: input.kioskCustomerId,
      billing_status: input.billingStatus,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        params.push(val);
        fields.push(`${col} = $${params.length}`);
      }
    }
    if (fields.length === 0) return this.findById(id);
    params.push(id);
    const { rows } = await pool.query<CustomerUnified>(
      `UPDATE customers_unified SET ${fields.join(", ")}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  },

  async listTickets(customerId: string): Promise<SupportTicket[]> {
    const { rows } = await pool.query<SupportTicket>(
      `SELECT * FROM customer_support_tickets WHERE customer_id = $1 ORDER BY created_at DESC`,
      [customerId]
    );
    return rows;
  },

  async createTicket(customerId: string, subject: string, description?: string): Promise<SupportTicket> {
    const { rows } = await pool.query<SupportTicket>(
      `INSERT INTO customer_support_tickets (id, customer_id, subject, description)
       VALUES (gen_random_uuid()::text, $1, $2, $3)
       RETURNING *`,
      [customerId, subject, description ?? null]
    );
    return rows[0];
  },
};
