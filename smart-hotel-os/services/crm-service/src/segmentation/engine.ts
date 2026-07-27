/**
 * Lõi thuật toán phân khúc khách rule-based (MODULE_CRM_MARKETING.md mục 1).
 * Hàm THUẦN — không phụ thuộc DB — để dễ test độc lập.
 *
 * Thứ tự ưu tiên (một khách chỉ có ĐÚNG 1 segment hiện hành):
 *   1. VIP — tổng số lần ở hoặc tổng chi tiêu vượt ngưỡng (ưu tiên cao nhất,
 *      vì đây là trạng thái "đẳng cấp" nên giữ dù khách tạm thời không quay lại).
 *   2. INACTIVE_90D — không quay lại > 90 ngày.
 *   3. INACTIVE_30D — không quay lại > 30 ngày (nhưng <= 90 ngày).
 *   4. RETURNING_GUEST — đã ở >= 2 lần, còn hoạt động gần đây.
 *   5. NEW_GUEST — mặc định (mới ở 1 lần, hoặc chưa đủ dữ liệu).
 */

export interface SegmentationConfig {
  vipMinStays: number;
  vipMinSpend: number;
  inactive30dDays: number;
  inactive90dDays: number;
}

export const DEFAULT_SEGMENTATION_CONFIG: SegmentationConfig = {
  vipMinStays: 5,
  vipMinSpend: 20_000_000,
  inactive30dDays: 30,
  inactive90dDays: 90,
};

export interface SegmentationInput {
  totalStays: number;
  totalSpend: number;
  lastStayCheckOut: string | null; // YYYY-MM-DD
  now?: Date;
}

export type CustomerSegmentType = "NEW_GUEST" | "RETURNING_GUEST" | "VIP" | "INACTIVE_30D" | "INACTIVE_90D";

export interface SegmentationResult {
  segment: CustomerSegmentType;
  reason: string;
  daysSinceLastStay: number | null;
}

export function computeSegment(input: SegmentationInput, config: SegmentationConfig = DEFAULT_SEGMENTATION_CONFIG): SegmentationResult {
  const now = input.now ?? new Date();
  const daysSinceLastStay = input.lastStayCheckOut
    ? Math.floor((now.getTime() - new Date(`${input.lastStayCheckOut}T00:00:00Z`).getTime()) / 86_400_000)
    : null;

  if (input.totalStays >= config.vipMinStays || input.totalSpend >= config.vipMinSpend) {
    return {
      segment: "VIP",
      reason: `total_stays=${input.totalStays} (ngưỡng ${config.vipMinStays}) hoặc total_spend=${input.totalSpend} (ngưỡng ${config.vipMinSpend}) -> VIP`,
      daysSinceLastStay,
    };
  }

  if (daysSinceLastStay !== null && daysSinceLastStay > config.inactive90dDays) {
    return {
      segment: "INACTIVE_90D",
      reason: `Không quay lại ${daysSinceLastStay} ngày (> ${config.inactive90dDays} ngày) -> INACTIVE_90D`,
      daysSinceLastStay,
    };
  }

  if (daysSinceLastStay !== null && daysSinceLastStay > config.inactive30dDays) {
    return {
      segment: "INACTIVE_30D",
      reason: `Không quay lại ${daysSinceLastStay} ngày (> ${config.inactive30dDays} ngày) -> INACTIVE_30D`,
      daysSinceLastStay,
    };
  }

  if (input.totalStays >= 2) {
    return {
      segment: "RETURNING_GUEST",
      reason: `Đã lưu trú ${input.totalStays} lần, còn hoạt động gần đây -> RETURNING_GUEST`,
      daysSinceLastStay,
    };
  }

  return {
    segment: "NEW_GUEST",
    reason: `Mới lưu trú ${input.totalStays} lần -> NEW_GUEST`,
    daysSinceLastStay,
  };
}
