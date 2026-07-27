import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { pricingRulesRepo } from "../repositories/pricingRules.repo";

export const rulesRouter = Router();

const upsertSchema = z.object({
  tenantId: z.string().min(1),
  propertyId: z.string().min(1),
  roomTypeId: z.string().min(1),
  basePrice: z.number().positive(),
  minPrice: z.number().positive(),
  maxPrice: z.number().positive(),
  weekendDays: z.array(z.number().int().min(0).max(6)).optional(),
  weekendMultiplier: z.number().positive().optional(),
  occupancyThresholdPct: z.number().min(0).max(100).optional(),
  occupancyMultiplier: z.number().positive().optional(),
  holidayDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  holidayMultiplier: z.number().positive().optional(),
  clearanceLeadTimeHours: z.number().int().positive().optional(),
  clearanceOccupancyThresholdPct: z.number().min(0).max(100).optional(),
  clearanceMultiplier: z.number().positive().optional(),
});

rulesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await pricingRulesRepo.list(req.query.propertyId as string | undefined);
    res.json({ items, total: items.length });
  })
);

rulesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    if (parsed.data.minPrice > parsed.data.maxPrice) {
      throw Errors.validation({ minPrice: "minPrice không được lớn hơn maxPrice" });
    }
    const rule = await pricingRulesRepo.upsert(parsed.data);
    res.status(201).json(rule);
  })
);
