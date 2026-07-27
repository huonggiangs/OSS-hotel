/**
 * Script demo/test cho thuật toán rule-based (src/pricing/engine.ts).
 * KHÔNG cần DB/HTTP — chứng minh logic tính giá đúng bằng assert thuần Node.
 *
 * Chạy: npm run demo:pricing
 */
import assert from "node:assert/strict";
import { computeSuggestedPrice, type PricingRuleConfig } from "../src/pricing/engine";

const rule: PricingRuleConfig = {
  basePrice: 1_000_000,
  minPrice: 600_000,
  maxPrice: 2_000_000,
  weekendDays: [5, 6], // Thứ 6, Thứ 7
  weekendMultiplier: 1.3,
  occupancyThresholdPct: 80,
  occupancyMultiplier: 1.2,
  holidayDates: ["2026-09-02"],
  holidayMultiplier: 1.6,
  clearanceLeadTimeHours: 24,
  clearanceOccupancyThresholdPct: 50,
  clearanceMultiplier: 0.85,
};

let passed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  assert.deepEqual(actual, expected, `${name}: mong đợi ${JSON.stringify(expected)} nhưng nhận ${JSON.stringify(actual)}`);
  passed++;
  console.log(`  [OK] ${name}`);
}

console.log("=== Demo/test thuật toán AI Pricing (rule-based, Phase 1) ===\n");

// 1. Ngày thường (Thứ 3), occupancy thấp, lead time dài -> giữ nguyên giá cơ bản.
{
  const r = computeSuggestedPrice(rule, { date: "2026-07-28", occupancyPct: 40, leadTimeHours: 24 * 10 });
  console.log("Test 1 — ngày thường, occupancy thấp, lead time dài:", r.suggestedPrice, r.reason);
  check("Test 1 — không rule nào kích hoạt -> giá = giá cơ bản", r.suggestedPrice, 1_000_000);
  check("Test 1 — không có multiplier nào áp dụng", r.appliedMultipliers.length, 0);
}

// 2. Thứ 7 (weekend), occupancy bình thường -> x1.3.
{
  const r = computeSuggestedPrice(rule, { date: "2026-08-01", occupancyPct: 60, leadTimeHours: 24 * 5 });
  console.log("Test 2 — cuối tuần:", r.suggestedPrice, r.reason);
  check("Test 2 — 2026-08-01 là Thứ 7 -> áp weekend x1.3", r.suggestedPrice, 1_300_000);
}

// 3. Occupancy dự kiến 85% (>80%) vào ngày thường -> x1.2.
{
  const r = computeSuggestedPrice(rule, { date: "2026-07-28", occupancyPct: 85, leadTimeHours: 24 * 5 });
  console.log("Test 3 — occupancy cao:", r.suggestedPrice, r.reason);
  check("Test 3 — occupancy 85% > 80% -> áp occupancy x1.2", r.suggestedPrice, 1_200_000);
}

// 4. Ngày lễ 2026-09-02 (Thứ 4, không phải weekend) -> chỉ x1.6.
{
  const r = computeSuggestedPrice(rule, { date: "2026-09-02", occupancyPct: 60, leadTimeHours: 24 * 30 });
  console.log("Test 4 — ngày lễ:", r.suggestedPrice, r.reason);
  check("Test 4 — ngày lễ -> áp holiday x1.6", r.suggestedPrice, 1_600_000);
}

// 5. Lead time < 24h VÀ occupancy 30% (<50%) -> giảm giá x0.85 để giải phóng tồn phòng.
{
  const r = computeSuggestedPrice(rule, { date: "2026-07-28", occupancyPct: 30, leadTimeHours: 5 });
  console.log("Test 5 — cận ngày, occupancy thấp:", r.suggestedPrice, r.reason);
  check("Test 5 — lead time thấp + occupancy thấp -> áp clearance x0.85", r.suggestedPrice, 850_000);
}

// 6. Kết hợp: cuối tuần + occupancy cao -> nhân dồn 1.3 * 1.2 = 1.56 -> 1.560.000.
{
  const r = computeSuggestedPrice(rule, { date: "2026-08-01", occupancyPct: 90, leadTimeHours: 24 * 3 });
  console.log("Test 6 — cuối tuần + occupancy cao (nhân dồn):", r.suggestedPrice, r.reason);
  check("Test 6 — nhân dồn weekend x occupancy = 1.56x", r.suggestedPrice, 1_560_000);
}

// 7. Giá vượt trần max_price (2.000.000) -> phải kẹp lại đúng max_price.
{
  const highBaseRule: PricingRuleConfig = { ...rule, basePrice: 1_800_000 };
  const r = computeSuggestedPrice(highBaseRule, { date: "2026-09-02", occupancyPct: 90, leadTimeHours: 24 * 3 });
  // 1.800.000 * holiday(1.6) * occupancy(1.2) = 3.456.000 -> vượt trần 2.000.000
  console.log("Test 7 — vượt trần max_price:", r.suggestedPrice, r.reason);
  check("Test 7 — giá vượt max_price -> kẹp về đúng max_price", r.suggestedPrice, 2_000_000);
  check("Test 7 — cờ clamped = true", r.clamped, true);
}

// 8. Giá dưới sàn min_price (600.000) -> phải kẹp lại đúng min_price.
{
  const lowBaseRule: PricingRuleConfig = { ...rule, basePrice: 650_000 };
  const r = computeSuggestedPrice(lowBaseRule, { date: "2026-07-28", occupancyPct: 20, leadTimeHours: 2 });
  // 650.000 * clearance(0.85) = 552.500 -> dưới sàn 600.000
  console.log("Test 8 — dưới sàn min_price:", r.suggestedPrice, r.reason);
  check("Test 8 — giá dưới min_price -> kẹp về đúng min_price", r.suggestedPrice, 600_000);
}

console.log(`\n=== Toàn bộ ${passed} assertion PASS — thuật toán rule-based hoạt động đúng theo MODULE_AI_PRICING.md mục 2 ===`);
