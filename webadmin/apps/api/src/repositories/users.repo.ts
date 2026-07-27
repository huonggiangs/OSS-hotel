import { pool } from "../lib/db";
import type { User } from "../types/domain";

export const usersRepo = {
  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query<User>(`SELECT * FROM users WHERE email = $1`, [email]);
    return rows[0] ?? null;
  },
  async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query<User>(`SELECT * FROM users WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },
};
