import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import type { PricingSuggestion } from "../types/domain";
import type { ComputePriceResult } from "../pricing/engine";

export const pricingSuggestionsRepo = {
  async create(input: {
    tenantId: string;
    propertyId: string;
    roomTypeId: string;
    ruleId: string;
    date: string;
    occupancyPctUsed: number;
    leadTimeHoursUsed: number;
    result: ComputePriceResult;
  }): Promise<PricingSuggestion> {
    const { rows } = await pool.query<PricingSuggestion>(
      `INSERT INTO pricing_suggestions
        (id, tenant_id, property_id, room_type_id, rule_id, date, base_price, suggested_price,
         occupancy_pct_used, lead_time_hours_used, applied_multipliers, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        randomUUID(),
        input.tenantId,
        input.propertyId,
        input.roomTypeId,
        input.ruleId,
        input.date,
        input.result.basePrice,
        input.result.suggestedPrice,
        input.occupancyPctUsed,
        input.leadTimeHoursUsed,
        JSON.stringify(input.result.appliedMultipliers),
        input.result.reason,
      ]
    );
    return rows[0];
  },

  async listByProperty(propertyId: string, limit = 100): Promise<PricingSuggestion[]> {
    const { rows } = await pool.query<PricingSuggestion>(
      `SELECT * FROM pricing_suggestions WHERE property_id = $1 ORDER BY date ASC LIMIT $2`,
      [propertyId, limit]
    );
    return rows;
  },
};
