import { pool } from "../lib/db";
import type { Expense } from "../types/domain";

export interface ExpenseInput {
  category: string;
  description?: string | null;
  amount: number;
  expenseDate?: string;
}

export const expensesRepo = {
  async list(propertyId: string): Promise<Expense[]> {
    const { rows } = await pool.query<Expense>(`SELECT * FROM expenses WHERE property_id = $1 ORDER BY expense_date DESC, created_at DESC`, [
      propertyId,
    ]);
    return rows;
  },

  async create(propertyId: string, tenantId: string, createdBy: string | undefined, input: ExpenseInput): Promise<Expense> {
    const { rows } = await pool.query<Expense>(
      `INSERT INTO expenses (id, property_id, tenant_id, category, description, amount, expense_date, created_by)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [propertyId, tenantId, input.category, input.description ?? null, input.amount, input.expenseDate ?? new Date().toISOString().slice(0, 10), createdBy ?? null]
    );
    return rows[0];
  },

  async sumTotal(propertyId: string): Promise<number> {
    const { rows } = await pool.query<{ sum: string }>(`SELECT COALESCE(SUM(amount), 0)::text AS sum FROM expenses WHERE property_id = $1`, [
      propertyId,
    ]);
    return Number(rows[0]?.sum ?? 0);
  },
};
