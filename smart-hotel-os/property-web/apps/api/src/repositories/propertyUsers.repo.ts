import { pool } from "../lib/db";
import type { PropertyUser } from "../types/domain";

export const propertyUsersRepo = {
  async findByEmail(email: string): Promise<PropertyUser | null> {
    const { rows } = await pool.query<PropertyUser>(`SELECT * FROM property_users WHERE email = $1`, [email]);
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<PropertyUser | null> {
    const { rows } = await pool.query<PropertyUser>(`SELECT * FROM property_users WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async countActiveByProperty(propertyId: string): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM property_users WHERE property_id = $1 AND status = 'ACTIVE'`,
      [propertyId]
    );
    return Number(rows[0]?.count ?? 0);
  },
};
