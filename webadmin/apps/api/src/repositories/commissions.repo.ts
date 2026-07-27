import { pool } from "../lib/db";
import type { CommissionRecord, CommissionRule } from "../types/domain";

export interface CommissionRuleInput {
  partnerId?: string | null;
  productScope?: "KIOSK" | "SMART_HOTEL_OS" | "BOTH";
  ratePct: number;
  isRecurring?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export interface CommissionRecordInput {
  partnerId: string;
  customerId?: string | null;
  ruleId?: string | null;
  period: string;
  amount: number;
}

export const commissionsRepo = {
  async listRules(): Promise<CommissionRule[]> {
    const { rows } = await pool.query<CommissionRule>(`SELECT * FROM commission_rules ORDER BY created_at DESC`);
    return rows;
  },

  // Versioning: KHÔNG update rule cũ, luôn tạo rule mới — xem MODULE_COMMISSION.md mục 4.
  async createRule(input: CommissionRuleInput): Promise<CommissionRule> {
    const { rows } = await pool.query<CommissionRule>(
      `INSERT INTO commission_rules (id, partner_id, product_scope, rate_pct, is_recurring, effective_from, effective_to)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4, COALESCE($5, now()), $6)
       RETURNING *`,
      [
        input.partnerId ?? null,
        input.productScope ?? "BOTH",
        input.ratePct,
        input.isRecurring ?? false,
        input.effectiveFrom ?? null,
        input.effectiveTo ?? null,
      ]
    );
    return rows[0];
  },

  async listRecords(opts: { partnerId?: string; status?: string }): Promise<CommissionRecord[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (opts.partnerId) {
      params.push(opts.partnerId);
      clauses.push(`partner_id = $${params.length}`);
    }
    if (opts.status) {
      params.push(opts.status);
      clauses.push(`status = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query<CommissionRecord>(
      `SELECT * FROM commission_records ${where} ORDER BY created_at DESC`,
      params
    );
    return rows;
  },

  async findRecordById(id: string): Promise<CommissionRecord | null> {
    const { rows } = await pool.query<CommissionRecord>(`SELECT * FROM commission_records WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async createRecord(input: CommissionRecordInput): Promise<CommissionRecord> {
    const { rows } = await pool.query<CommissionRecord>(
      `INSERT INTO commission_records (id, partner_id, customer_id, rule_id, period, amount, status)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,'CALCULATED')
       RETURNING *`,
      [input.partnerId, input.customerId ?? null, input.ruleId ?? null, input.period, input.amount]
    );
    return rows[0];
  },

  async approveRecord(id: string, approvedById: string): Promise<CommissionRecord | null> {
    const { rows } = await pool.query<CommissionRecord>(
      `UPDATE commission_records
       SET status = 'APPROVED', approved_by_id = $2, approved_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, approvedById]
    );
    return rows[0] ?? null;
  },

  async markPaid(id: string): Promise<CommissionRecord | null> {
    const { rows } = await pool.query<CommissionRecord>(
      `UPDATE commission_records SET status = 'PAID', paid_at = now(), updated_at = now() WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0] ?? null;
  },
};
