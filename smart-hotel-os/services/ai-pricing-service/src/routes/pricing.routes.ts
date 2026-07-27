import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { pricingRulesRepo, toRuleConfig } from "../repositories/pricingRules.repo";
import { pricingSuggestionsRepo } from "../repositories/pricingSuggestions.repo";
import { computeSuggestedPrice } from "../pricing/engine";

export const pricingRouter = Router();

// POST /pricing/suggest
// Input: property_id, room_type_id, khoảng ngày, occupancy giả lập theo từng
// ngày (occupancyByDate) hoặc một giá trị mặc định áp cho mọi ngày
// (defaultOccupancyPct) khi PMS Core chưa có số liệu occupancy thật —
// MODULE_AI_PRICING.md mục 5.3: "nếu thiếu dữ liệu đầu vào, hệ thống phải
// giảm cấp về rule-based, không được trả lỗi hoặc giá rỗng".
const suggestSchema = z
  .object({
    tenantId: z.string().min(1),
    propertyId: z.string().min(1),
    roomTypeId: z.string().min(1),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    occupancyByDate: z.record(z.number().min(0).max(100)).optional(),
    defaultOccupancyPct: z.number().min(0).max(100).default(50),
    // "now" cho phép script demo/test cố định thời điểm tính lead-time, mặc định là hiện tại.
    now: z.string().datetime().optional(),
    persist: z.boolean().default(true),
  })
  .refine((v) => v.dateFrom <= v.dateTo, { message: "dateFrom phải <= dateTo", path: ["dateFrom"] });

function listDates(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

pricingRouter.post(
  "/suggest",
  asyncHandler(async (req, res) => {
    const parsed = suggestSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const input = parsed.data;

    const rule = await pricingRulesRepo.findActiveByPropertyAndRoomType(input.propertyId, input.roomTypeId);
    if (!rule) {
      throw Errors.notFound(
        `pricing_rule đang active cho property '${input.propertyId}' / room_type '${input.roomTypeId}' — hãy tạo qua POST /pricing/rules trước`
      );
    }
    const ruleConfig = toRuleConfig(rule);
    const now = input.now ? new Date(input.now) : new Date();

    const dates = listDates(input.dateFrom, input.dateTo);
    const suggestions = [];
    for (const date of dates) {
      const occupancyPct = input.occupancyByDate?.[date] ?? input.defaultOccupancyPct;
      const checkInMoment = new Date(`${date}T14:00:00Z`); // giờ nhận phòng mặc định 14:00
      const leadTimeHours = Math.max(0, Math.round((checkInMoment.getTime() - now.getTime()) / 3_600_000));

      const result = computeSuggestedPrice(ruleConfig, { date, occupancyPct, leadTimeHours });

      let persistedId: string | null = null;
      if (input.persist) {
        const saved = await pricingSuggestionsRepo.create({
          tenantId: input.tenantId,
          propertyId: input.propertyId,
          roomTypeId: input.roomTypeId,
          ruleId: rule.id,
          date,
          occupancyPctUsed: occupancyPct,
          leadTimeHoursUsed: leadTimeHours,
          result,
        });
        persistedId = saved.id;
      }

      suggestions.push({
        date,
        occupancyPct,
        leadTimeHours,
        basePrice: result.basePrice,
        suggestedPrice: result.suggestedPrice,
        clamped: result.clamped,
        appliedMultipliers: result.appliedMultipliers,
        reason: result.reason,
        suggestionId: persistedId,
      });
    }

    res.status(200).json({ propertyId: input.propertyId, roomTypeId: input.roomTypeId, ruleId: rule.id, suggestions });
  })
);

pricingRouter.get(
  "/suggestions",
  asyncHandler(async (req, res) => {
    const propertyId = req.query.propertyId as string | undefined;
    if (!propertyId) throw Errors.validation({ propertyId: "Bắt buộc truyền query propertyId" });
    const items = await pricingSuggestionsRepo.listByProperty(propertyId);
    res.json({ items, total: items.length });
  })
);
