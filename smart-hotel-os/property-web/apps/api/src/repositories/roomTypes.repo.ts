import { pool } from "../lib/db";
import type { RoomType } from "../types/domain";

export interface RoomTypeInput {
  name: string;
  basePrice?: number;
  capacity?: number;
  bedsBig?: number;
  bedsSmall?: number;
  areaM2?: number | null;
  status?: "ACTIVE" | "INACTIVE";
}

export const roomTypesRepo = {
  async list(propertyId: string): Promise<RoomType[]> {
    const { rows } = await pool.query<RoomType>(
      `SELECT * FROM room_types WHERE property_id = $1 ORDER BY created_at ASC`,
      [propertyId]
    );
    return rows;
  },

  async findById(propertyId: string, id: string): Promise<RoomType | null> {
    const { rows } = await pool.query<RoomType>(`SELECT * FROM room_types WHERE property_id = $1 AND id = $2`, [
      propertyId,
      id,
    ]);
    return rows[0] ?? null;
  },

  async create(propertyId: string, tenantId: string, input: RoomTypeInput): Promise<RoomType> {
    const { rows } = await pool.query<RoomType>(
      `INSERT INTO room_types
        (id, property_id, tenant_id, name, base_price, capacity, beds_big, beds_small, area_m2, status)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        propertyId,
        tenantId,
        input.name,
        input.basePrice ?? 0,
        input.capacity ?? 2,
        input.bedsBig ?? 1,
        input.bedsSmall ?? 0,
        input.areaM2 ?? null,
        input.status ?? "ACTIVE",
      ]
    );
    return rows[0];
  },

  async update(propertyId: string, id: string, input: Partial<RoomTypeInput>): Promise<RoomType | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, unknown> = {
      name: input.name,
      base_price: input.basePrice,
      capacity: input.capacity,
      beds_big: input.bedsBig,
      beds_small: input.bedsSmall,
      area_m2: input.areaM2,
      status: input.status,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        params.push(val);
        fields.push(`${col} = $${params.length}`);
      }
    }
    if (fields.length === 0) return this.findById(propertyId, id);
    params.push(propertyId, id);
    const { rows } = await pool.query<RoomType>(
      `UPDATE room_types SET ${fields.join(", ")}, updated_at = now()
       WHERE property_id = $${params.length - 1} AND id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  },
};
