import { pool } from "../lib/db";
import type { RoomType } from "../types/domain";

export const roomTypesRepo = {
  async list(propertyId: string): Promise<RoomType[]> {
    const { rows } = await pool.query<RoomType>(
      `SELECT * FROM room_types WHERE property_id = $1 ORDER BY created_at ASC`,
      [propertyId]
    );
    return rows;
  },

  async findById(id: string): Promise<RoomType | null> {
    const { rows } = await pool.query<RoomType>(`SELECT * FROM room_types WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  // upsertFromCloud — dùng bởi job pull-sync (src/lib/sync.ts): last-write-wins
  // theo updated_at, KHÔNG ghi outbox_events (dữ liệu đi TỪ Cloud xuống, không
  // phải mutation cục bộ cần đẩy ngược lên).
  async upsertFromCloud(rt: RoomType): Promise<void> {
    await pool.query(
      `INSERT INTO room_types (id, property_id, tenant_id, name, base_price, capacity, beds_big, beds_small, area_m2, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, base_price = EXCLUDED.base_price, capacity = EXCLUDED.capacity,
         beds_big = EXCLUDED.beds_big, beds_small = EXCLUDED.beds_small, area_m2 = EXCLUDED.area_m2,
         status = EXCLUDED.status, updated_at = EXCLUDED.updated_at
       WHERE EXCLUDED.updated_at > room_types.updated_at`,
      [
        rt.id,
        rt.property_id,
        rt.tenant_id,
        rt.name,
        rt.base_price,
        rt.capacity,
        rt.beds_big,
        rt.beds_small,
        rt.area_m2,
        rt.status,
        rt.created_at,
        rt.updated_at,
      ]
    );
  },
};
