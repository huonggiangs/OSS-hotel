import { randomUUID } from "node:crypto";
import { pool, type DbPool } from "../lib/db";

export interface RoomTypeRate {
  id: string;
  property_id: string;
  tenant_id: string;
  room_type_id: string;
  rate_key: string;
  label: string;
  amount: string;
  minimum_units: number;
  active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface RoomTypeRateInput {
  rateKey: string;
  label: string;
  amount: number;
  minimumUnits: number;
  active: boolean;
}

async function listWith(db: DbPool, propertyId: string, roomTypeId: string): Promise<RoomTypeRate[]> {
  const { rows } = await db.query<RoomTypeRate>(
    `SELECT * FROM room_type_rates
     WHERE property_id = $1 AND room_type_id = $2
     ORDER BY sort_order ASC, created_at ASC`,
    [propertyId, roomTypeId]
  );
  return rows;
}

export const roomTypeRatesRepo = {
  async list(propertyId: string, roomTypeId: string): Promise<RoomTypeRate[]> {
    return listWith(pool, propertyId, roomTypeId);
  },

  async replace(propertyId: string, tenantId: string, roomTypeId: string, rates: RoomTypeRateInput[]): Promise<RoomTypeRate[]> {
    return pool.transaction(async (tx) => {
      await tx.query(`DELETE FROM room_type_rates WHERE property_id = $1 AND room_type_id = $2`, [propertyId, roomTypeId]);
      for (const [index, rate] of rates.entries()) {
        await tx.query(
          `INSERT INTO room_type_rates
            (id, property_id, tenant_id, room_type_id, rate_key, label, amount, minimum_units, active, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [randomUUID(), propertyId, tenantId, roomTypeId, rate.rateKey, rate.label, rate.amount, rate.minimumUnits, rate.active, index]
        );
      }
      return listWith(tx, propertyId, roomTypeId);
    });
  },
};
