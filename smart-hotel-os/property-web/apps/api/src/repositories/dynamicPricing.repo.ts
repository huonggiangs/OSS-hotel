import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";

export interface DynamicPricingRule {
  id: string;
  property_id: string;
  tenant_id: string;
  room_type_id: string;
  enabled: boolean;
  vacancy_days: number;
  vacancy_discount_percent: string;
  low_occupancy_percent: number;
  low_occupancy_adjustment_percent: string;
  high_occupancy_percent: number;
  high_occupancy_adjustment_percent: string;
  minimum_price: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DynamicPricingRuleInput {
  enabled: boolean;
  vacancyDays: number;
  vacancyDiscountPercent: number;
  lowOccupancyPercent: number;
  lowOccupancyAdjustmentPercent: number;
  highOccupancyPercent: number;
  highOccupancyAdjustmentPercent: number;
  minimumPrice: number | null;
}

// Rule storage is deliberately separate from fixed rates: it can be disabled
// without deleting the rate card that staff already configured.
export const dynamicPricingRepo = {
  async findByRoomType(propertyId: string, roomTypeId: string): Promise<DynamicPricingRule | null> {
    const { rows } = await pool.query<DynamicPricingRule>(
      `SELECT * FROM room_type_dynamic_pricing WHERE property_id = $1 AND room_type_id = $2`,
      [propertyId, roomTypeId]
    );
    return rows[0] ?? null;
  },

  async upsert(
    propertyId: string,
    tenantId: string,
    roomTypeId: string,
    input: DynamicPricingRuleInput
  ): Promise<DynamicPricingRule> {
    const { rows } = await pool.query<DynamicPricingRule>(
      `INSERT INTO room_type_dynamic_pricing
        (id, property_id, tenant_id, room_type_id, enabled, vacancy_days, vacancy_discount_percent,
         low_occupancy_percent, low_occupancy_adjustment_percent, high_occupancy_percent,
         high_occupancy_adjustment_percent, minimum_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (room_type_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         vacancy_days = EXCLUDED.vacancy_days,
         vacancy_discount_percent = EXCLUDED.vacancy_discount_percent,
         low_occupancy_percent = EXCLUDED.low_occupancy_percent,
         low_occupancy_adjustment_percent = EXCLUDED.low_occupancy_adjustment_percent,
         high_occupancy_percent = EXCLUDED.high_occupancy_percent,
         high_occupancy_adjustment_percent = EXCLUDED.high_occupancy_adjustment_percent,
         minimum_price = EXCLUDED.minimum_price,
         updated_at = now()
       RETURNING *`,
      [
        randomUUID(),
        propertyId,
        tenantId,
        roomTypeId,
        input.enabled,
        input.vacancyDays,
        input.vacancyDiscountPercent,
        input.lowOccupancyPercent,
        input.lowOccupancyAdjustmentPercent,
        input.highOccupancyPercent,
        input.highOccupancyAdjustmentPercent,
        input.minimumPrice,
      ]
    );
    return rows[0];
  },
};
