import { pool } from "../lib/db";
import type { User, UserRole, UserStatus } from "../types/domain";

export interface UserCreateInput {
  email: string;
  fullName: string;
  role: UserRole;
  passwordHash: string;
}

export interface UserUpdateInput {
  role?: UserRole;
  status?: UserStatus;
  fullName?: string;
}

export const usersRepo = {
  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query<User>(`SELECT * FROM users WHERE email = $1`, [email]);
    return rows[0] ?? null;
  },
  async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query<User>(`SELECT * FROM users WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  // Quản lý user/role qua UI — chỉ SUPER_ADMIN gọi được (chặn ở route).
  async list(): Promise<User[]> {
    const { rows } = await pool.query<User>(`SELECT * FROM users ORDER BY created_at DESC`);
    return rows;
  },

  async create(input: UserCreateInput): Promise<User> {
    const { rows } = await pool.query<User>(
      `INSERT INTO users (id, email, password_hash, full_name, role, status)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, 'ACTIVE')
       RETURNING *`,
      [input.email, input.passwordHash, input.fullName, input.role]
    );
    return rows[0];
  },

  async update(id: string, input: UserUpdateInput): Promise<User | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, unknown> = {
      role: input.role,
      status: input.status,
      full_name: input.fullName,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        params.push(val);
        fields.push(`${col} = $${params.length}`);
      }
    }
    if (fields.length === 0) return this.findById(id);
    params.push(id);
    const { rows } = await pool.query<User>(
      `UPDATE users SET ${fields.join(", ")}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  },

  async updatePasswordHash(id: string, passwordHash: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      `UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1 RETURNING *`,
      [id, passwordHash]
    );
    return rows[0] ?? null;
  },
};
