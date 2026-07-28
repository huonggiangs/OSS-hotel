import { pool } from "../lib/db";
import type { PropertyUser, PropertyUserRole } from "../types/domain";

export const propertyUsersRepo = {
  // Tra cứu theo username HOẶC email (tương thích ngược cho tài khoản cũ dùng
  // đăng nhập bằng email) — xem ghi chú migration 002_add_username.sql.
  async findByUsernameOrEmail(identifier: string): Promise<PropertyUser | null> {
    const { rows } = await pool.query<PropertyUser>(
      `SELECT * FROM property_users WHERE username = $1 OR email = $1`,
      [identifier]
    );
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

  // ---- Bổ sung cho màn hình "Người dùng & phân quyền" (/users) ----

  async listByProperty(propertyId: string): Promise<PropertyUser[]> {
    const { rows } = await pool.query<PropertyUser>(
      `SELECT * FROM property_users WHERE property_id = $1 ORDER BY created_at ASC`,
      [propertyId]
    );
    return rows;
  },

  async countByRole(propertyId: string): Promise<{ role: PropertyUserRole; count: number }[]> {
    const { rows } = await pool.query<{ role: PropertyUserRole; count: string }>(
      `SELECT role, COUNT(*)::text AS count FROM property_users WHERE property_id = $1 GROUP BY role`,
      [propertyId]
    );
    return rows.map((r) => ({ role: r.role, count: Number(r.count) }));
  },

  async create(
    propertyId: string,
    tenantId: string,
    input: { username: string; email: string; fullName: string; role: PropertyUserRole; passwordHash: string }
  ): Promise<PropertyUser> {
    const { rows } = await pool.query<PropertyUser>(
      `INSERT INTO property_users (id, property_id, tenant_id, username, email, password_hash, full_name, role)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [propertyId, tenantId, input.username, input.email, input.passwordHash, input.fullName, input.role]
    );
    return rows[0];
  },

  // Đổi vai trò / khoá-mở tài khoản — dùng chung 1 hàm update tối giản (chỉ 2
  // trường này được phép sửa qua UI quản lý người dùng, đổi mật khẩu/tên là
  // việc của chính chủ tài khoản, ngoài phạm vi màn hình này).
  async updateRoleStatus(
    propertyId: string,
    id: string,
    input: { role?: PropertyUserRole; status?: "ACTIVE" | "DISABLED" }
  ): Promise<PropertyUser | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    if (input.role !== undefined) {
      params.push(input.role);
      fields.push(`role = $${params.length}`);
    }
    if (input.status !== undefined) {
      params.push(input.status);
      fields.push(`status = $${params.length}`);
    }
    if (fields.length === 0) return this.findById(id);
    params.push(propertyId, id);
    const { rows } = await pool.query<PropertyUser>(
      `UPDATE property_users SET ${fields.join(", ")}, updated_at = now()
       WHERE property_id = $${params.length - 1} AND id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  },
};
