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

  async create(tenantId: string, input: { name: string; address?: string | null; phone?: string | null }): Promise<Property> {
    const { rows } = await pool.query<Property>(
      `INSERT INTO properties (id, tenant_id, name, address, phone, status)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, 'ACTIVE')
       RETURNING *`,
      [tenantId, input.name, input.address ?? null, input.phone ?? null]
    );
    return rows[0];
  },
};
