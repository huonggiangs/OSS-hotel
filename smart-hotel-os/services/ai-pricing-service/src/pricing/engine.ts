/**
 * Lõi thuật toán rule-based Phase 1 (MODULE_AI_PRICING.md mục 2). Đây là hàm
 * THUẦN (pure function) — không phụ thuộc DB/HTTP — để có thể unit test và
 * dùng lại được cả trong route lẫn script demo (scripts/demo-pricing.ts).
 *
 * Nguyên tắc kết hợp rule (quyết định kiến trúc, ghi thêm ở services/PROGRESS.md):
 * - "Ngày lễ" và "cuối tuần" là hai tín hiệu nhu cầu ĐỘC LẬP, có thể xảy ra
 *   cùng lúc (vd. lễ rơi vào thứ Bảy) -> nhân dồn (compounding).
 * - "Occupancy cao" (>ngưỡng) cũng là tín hiệu độc lập, nhân dồn tiếp.
 * - "Giải phóng tồn phòng cận ngày" (lead time thấp + occupancy THẤP) không
 *   bao giờ xảy ra đồng thời với "occupancy cao" (hai điều kiện occupancy loại
 *   trừ lẫn nhau theo ngưỡng), nên không xung đột khi nhân dồn.
 * - Sau khi nhân dồn mọi hệ số áp dụng được, giá luôn được kẹp (clamp) vào
 *   [min_price, max_price] của rule — đây là ràng buộc cứng cuối cùng.
 */

export interface PricingRuleConfig {
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  weekendDays: number[]; // 0=Chủ nhật...6=Thứ 7 (JS Date.getUTCDay())
  weekendMultiplier: number;
  occupancyThresholdPct: number;
  occupancyMultiplier: number;
  holidayDates: string[]; // YYYY-MM-DD
  holidayMultiplier: number;
  clearanceLeadTimeHours: number;
  clearanceOccupancyThresholdPct: number;
  clearanceMultiplier: number;
}

export interface ComputePriceInput {
  date: string; // YYYY-MM-DD
  occupancyPct: number; // 0-100, tỷ lệ lấp phòng dự kiến cho ngày đó
  leadTimeHours: number; // số giờ từ hiện tại tới ngày check-in
}

export interface AppliedMultiplier {
  rule: "weekend" | "occupancy_surge" | "holiday" | "lead_time_clearance";
  multiplier: number;
  reason: string;
}

export interface ComputePriceResult {
  basePrice: number;
  rawPrice: number; // trước khi clamp min/max
  suggestedPrice: number; // sau khi clamp
  clamped: boolean;
  appliedMultipliers: AppliedMultiplier[];
  reason: string;
}

export function computeSuggestedPrice(rule: PricingRuleConfig, input: ComputePriceInput): ComputePriceResult {
  const applied: AppliedMultiplier[] = [];
  let price = rule.basePrice;

  const weekday = new Date(`${input.date}T00:00:00Z`).getUTCDay();
  const isWeekend = rule.weekendDays.includes(weekday);
  const isHoliday = rule.holidayDates.includes(input.date);
  const leadTimeDays = input.leadTimeHours / 24;

  // 1. Ngày lễ — ưu tiên áp dụng trước vì là tín hiệu nhu cầu mạnh nhất.
  if (isHoliday) {
    price *= rule.holidayMultiplier;
    applied.push({
      rule: "holiday",
      multiplier: rule.holidayMultiplier,
      reason: `Ngày ${input.date} là ngày lễ đã cấu hình -> giá x${rule.holidayMultiplier}`,
    });
  }

  // 2. Cuối tuần.
  if (isWeekend) {
    price *= rule.weekendMultiplier;
    applied.push({
      rule: "weekend",
      multiplier: rule.weekendMultiplier,
      reason: `Ngày ${input.date} rơi vào cuối tuần (thứ ${weekday === 0 ? "Chủ nhật" : weekday + 1}) -> giá x${rule.weekendMultiplier}`,
    });
  }

  // 3. Occupancy dự kiến cao -> tăng giá thêm.
  const occupancySurge = input.occupancyPct > rule.occupancyThresholdPct;
  if (occupancySurge) {
    price *= rule.occupancyMultiplier;
    applied.push({
      rule: "occupancy_surge",
      multiplier: rule.occupancyMultiplier,
      reason: `Occupancy dự kiến ${input.occupancyPct}% > ngưỡng ${rule.occupancyThresholdPct}% -> giá x${rule.occupancyMultiplier}`,
    });
  }

  // 4. Giải phóng tồn phòng cận ngày: lead time thấp VÀ occupancy thấp.
  //    Về logic, occupancySurge và điều kiện này loại trừ lẫn nhau vì
  //    occupancyThresholdPct (mặc định 80) luôn >= clearanceOccupancyThresholdPct
  //    (mặc định 50) trong cấu hình hợp lệ — không thể vừa >80% vừa <50%.
  const isLeadTimeClearance =
    leadTimeDays < rule.clearanceLeadTimeHours / 24 && input.occupancyPct < rule.clearanceOccupancyThresholdPct;
  if (isLeadTimeClearance) {
    price *= rule.clearanceMultiplier;
    applied.push({
      rule: "lead_time_clearance",
      multiplier: rule.clearanceMultiplier,
      reason: `Còn ${input.leadTimeHours}h tới ngày ${input.date} (< ${rule.clearanceLeadTimeHours}h) và occupancy dự kiến ${input.occupancyPct}% < ${rule.clearanceOccupancyThresholdPct}% -> giảm giá x${rule.clearanceMultiplier} để giải phóng tồn phòng`,
    });
  }

  const rawPrice = price;
  const suggestedPrice = Math.min(Math.max(rawPrice, rule.minPrice), rule.maxPrice);
  const clamped = suggestedPrice !== rawPrice;

  let reason = applied.length > 0 ? applied.map((a) => a.reason).join("; ") : `Không rule nào kích hoạt -> giữ giá cơ bản ${rule.basePrice}`;
  if (clamped) {
    reason += `; giá tính được ${rawPrice.toFixed(0)} vượt biên [${rule.minPrice}, ${rule.maxPrice}] -> kẹp về ${suggestedPrice}`;
  }

  return {
    basePrice: rule.basePrice,
    rawPrice,
    suggestedPrice,
    clamped,
    appliedMultipliers: applied,
    reason,
  };
}
