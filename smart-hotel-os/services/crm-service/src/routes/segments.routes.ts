import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { customersRepo } from "../repositories/customers.repo";
import { segmentsRepo } from "../repositories/segments.repo";
import { computeSegment, DEFAULT_SEGMENTATION_CONFIG, type SegmentationConfig } from "../segmentation/engine";

export const segmentsRouter = Router();

function configFromEnv(): SegmentationConfig {
  return {
    vipMinStays: Number(process.env.CRM_VIP_MIN_STAYS) || DEFAULT_SEGMENTATION_CONFIG.vipMinStays,
    vipMinSpend: Number(process.env.CRM_VIP_MIN_SPEND) || DEFAULT_SEGMENTATION_CONFIG.vipMinSpend,
    inactive30dDays: Number(process.env.CRM_INACTIVE_30D_DAYS) || DEFAULT_SEGMENTATION_CONFIG.inactive30dDays,
    inactive90dDays: Number(process.env.CRM_INACTIVE_90D_DAYS) || DEFAULT_SEGMENTATION_CONFIG.inactive90dDays,
  };
}

const recomputeSchema = z.object({
  tenantId: z.string().min(1),
  propertyId: z.string().min(1),
});

// POST /segments/recompute — tính lại phân khúc cho TOÀN BỘ khách của 1
// property từ dữ liệu booking mẫu (customers.total_stays/total_spend/
// last_stay_check_out) — mô phỏng batch job hàng ngày (MODULE_CRM_MARKETING.md
// mục 1). Ở production thật, dữ liệu nguồn (`total_stays`...) được đồng bộ
// liên tục từ PMS Core qua sự kiện booking.checked_out, không tự tính trong
// service này (xem PROGRESS.md).
segmentsRouter.post(
  "/recompute",
  asyncHandler(async (req, res) => {
    const parsed = recomputeSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const { tenantId, propertyId } = parsed.data;

    const customers = await customersRepo.list(propertyId);
    const config = configFromEnv();
    const breakdown: Record<string, number> = {};
    const results = [];

    for (const customer of customers) {
      const computed = computeSegment(
        {
          totalStays: customer.total_stays,
          totalSpend: Number(customer.total_spend),
          lastStayCheckOut: customer.last_stay_check_out,
        },
        config
      );
      const saved = await segmentsRepo.upsert({
        tenantId,
        propertyId,
        customerId: customer.id,
        segment: computed.segment,
        reason: computed.reason,
      });
      breakdown[computed.segment] = (breakdown[computed.segment] ?? 0) + 1;
      results.push({ customerId: customer.id, fullName: customer.full_name, segment: saved.segment, reason: saved.reason });
    }

    res.status(200).json({ propertyId, totalCustomers: customers.length, breakdown, results });
  })
);

segmentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const propertyId = req.query.propertyId as string | undefined;
    if (!propertyId) throw Errors.validation({ propertyId: "Bắt buộc truyền query propertyId" });
    const items = await segmentsRepo.listByProperty(propertyId);
    res.json({ items, total: items.length });
  })
);
