export interface PricingRule {
  id: string;
  tenant_id: string;
  property_id: string;
  room_type_id: string;
  base_price: string;
  min_price: string;
  max_price: string;
  weekend_days: number[];
  weekend_multiplier: string;
  occupancy_threshold_pct: number;
  occupancy_multiplier: string;
  holiday_dates: string[];
  holiday_multiplier: string;
  clearance_lead_time_hours: number;
  clearance_occupancy_threshold_pct: number;
  clearance_multiplier: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingSuggestion {
  id: string;
  tenant_id: string;
  property_id: string;
  room_type_id: string;
  rule_id: string;
  date: string;
  base_price: string;
  suggested_price: string;
  occupancy_pct_used: string;
  lead_time_hours_used: number;
  applied_multipliers: unknown;
  reason: string;
  created_at: string;
}
