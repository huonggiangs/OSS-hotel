import { pool } from "../lib/db";
import type { Property } from "../types/domain";

// Repo cho bảng "properties" — dùng cho màn hình "Danh sách cơ sở" (/branches).
// Một tenant có thể có nhiều property (multi-property/multi-tenant, đúng
// RULES.md) — user hiện tại luôn thuộc 1 property nhưng có thể XEM danh sách
// toàn bộ cơ sở cùng tenant (đúng nghiệp vụ chuỗi khách sạn).
export const propertiesRepo = {
  async listByTenant(tenantId: string): Promise<Property[]> {
    const { rows } = await pool.query<Property>(`SELECT * FROM properties WHERE tenant_id = $1 ORDER BY created_at ASC`, [
      tenantId,
    ]);
    return rows;
  },

  async findByIdForTenant(propertyId: string, tenantId: string): Promise<Property | null> {
    const { rows } = await pool.query<Property>(`SELECT * FROM properties WHERE id = $1 AND tenant_id = $2 LIMIT 1`, [propertyId, tenantId]);
    return rows[0] ?? null;
  },

  // Dùng cho lời gọi NỘI BỘ từ webadmin (X-Internal-Service-Key, xem
  // middleware/internalAuth.ts) — HQ Console cần thấy TOÀN BỘ cơ sở của MỌI
  // tenant (khách hàng) để làm dropdown "gán vào cơ sở" khi khai báo thiết bị,
  // khác listByTenant() vốn chỉ phục vụ 1 property_user thuộc đúng 1 tenant.
  async listAll(): Promise<Property[]> {
    const { rows } = await pool.query<Property>(`SELECT * FROM properties ORDER BY tenant_id ASC, created_at ASC`);
    return rows;
  },

  async countRoomsByProperty(propertyId: string): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM rooms WHERE property_id = $1`, [
      propertyId,
    ]);
    return Number(rows[0]?.count ?? 0);
  },

  async create(tenantId: string, input: { name: string; address?: string | null; phone: string }): Promise<Property> {
    const loginCode = input.phone.replace(/\D/g, "").slice(-6);
    const { rows } = await pool.query<Property>(
      `INSERT INTO properties (id, tenant_id, name, address, phone, login_code, status)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'ACTIVE')
       RETURNING *`,
      [tenantId, input.name, input.address ?? null, input.phone, loginCode]
    );
    return rows[0];
  },
};
