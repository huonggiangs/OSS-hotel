import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import type { PricingRule } from "../types/domain";
import type { PricingRuleConfig } from "../pricing/engine";

export const pricingRulesRepo = {
  async findActiveByPropertyAndRoomType(propertyId: string, roomTypeId: string): Promise<PricingRule | null> {
    const { rows } = await pool.query<PricingRule>(
      `SELECT * FROM pricing_rules WHERE property_id = $1 AND room_type_id = $2 AND is_active = true`,
      [propertyId, roomTypeId]
    );
    return rows[0] ?? null;
  },

  async list(propertyId?: string): Promise<PricingRule[]> {
    if (propertyId) {
      const { rows } = await pool.query<PricingRule>(
        `SELECT * FROM pricing_rules WHERE property_id = $1 ORDER BY created_at DESC`,
        [propertyId]
      );
      return rows;
    }
    const { rows } = await pool.query<PricingRule>(`SELECT * FROM pricing_rules ORDER BY created_at DESC`);
    return rows;
  },

  async upsert(input: {
    tenantId: string;
    propertyId: string;
    roomTypeId: string;
    basePrice: number;
    minPrice: number;
    maxPrice: number;
    weekendDays?: number[];
    weekendMultiplier?: number;
    occupancyThresholdPct?: number;
    occupancyMultiplier?: number;
    holidayDates?: string[];
    holidayMultiplier?: number;
    clearanceLeadTimeHours?: number;
    clearanceOccupancyThresholdPct?: number;
    clearanceMultiplier?: number;
  }): Promise<PricingRule> {
    const { rows } = await pool.query<PricingRule>(
      `INSERT INTO pricing_rules
        (id, tenant_id, property_id, room_type_id, base_price, min_price, max_price,
         weekend_days, weekend_multiplier, occupancy_threshold_pct, occupancy_multiplier,
         holiday_dates, holiday_multiplier,
         clearance_lead_time_hours, clearance_occupancy_threshold_pct, clearance_multiplier)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (property_id, room_type_id) DO UPDATE SET
         base_price = EXCLUDED.base_price,
         min_price = EXCLUDED.min_price,
         max_price = EXCLUDED.max_price,
         weekend_days = EXCLUDED.weekend_days,
         weekend_multiplier = EXCLUDED.weekend_multiplier,
         occupancy_threshold_pct = EXCLUDED.occupancy_threshold_pct,
         occupancy_multiplier = EXCLUDED.occupancy_multiplier,
         holiday_dates = EXCLUDED.holiday_dates,
         holiday_multiplier = EXCLUDED.holiday_multiplier,
         clearance_lead_time_hours = EXCLUDED.clearance_lead_time_hours,
         clearance_occupancy_threshold_pct = EXCLUDED.clearance_occupancy_threshold_pct,
         clearance_multiplier = EXCLUDED.clearance_multiplier,
         updated_at = now()
       RETURNING *`,
      [
        randomUUID(),
        input.tenantId,
        input.propertyId,
        input.roomTypeId,
        input.basePrice,
        input.minPrice,
        input.maxPrice,
        JSON.stringify(input.weekendDays ?? [5, 6]),
        input.weekendMultiplier ?? 1.3,
        input.occupancyThresholdPct ?? 80,
        input.occupancyMultiplier ?? 1.2,
        JSON.stringify(input.holidayDates ?? []),
        input.holidayMultiplier ?? 1.6,
        input.clearanceLeadTimeHours ?? 24,
        input.clearanceOccupancyThresholdPct ?? 50,
        input.clearanceMultiplier ?? 0.85,
      ]
    );
    return rows[0];
  },
};

export function toRuleConfig(rule: PricingRule): PricingRuleConfig {
  return {
    basePrice: Number(rule.base_price),
    minPrice: Number(rule.min_price),
    maxPrice: Number(rule.max_price),
    weekendDays: rule.weekend_days,
    weekendMultiplier: Number(rule.weekend_multiplier),
    occupancyThresholdPct: rule.occupancy_threshold_pct,
    occupancyMultiplier: Number(rule.occupancy_multiplier),
    holidayDates: rule.holiday_dates,
    holidayMultiplier: Number(rule.holiday_multiplier),
    clearanceLeadTimeHours: rule.clearance_lead_time_hours,
    clearanceOccupancyThresholdPct: rule.clearance_occupancy_threshold_pct,
    clearanceMultiplier: Number(rule.clearance_multiplier),
  };
}
