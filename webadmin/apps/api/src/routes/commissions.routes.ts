import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { commissionsRepo } from "../repositories/commissions.repo";

export const commissionsRouter = Router();
commissionsRouter.use(requireAuth);

const ruleSchema = z.object({
  partnerId: z.string().uuid().optional().nullable(),
  productScope: z.enum(["KIOSK", "SMART_HOTEL_OS", "BOTH"]).default("BOTH"),
  ratePct: z.number().min(0).max(100),
  isRecurring: z.boolean().default(false),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional().nullable(),
});

commissionsRouter.get(
  "/rules",
  asyncHandler(async (_req, res) => {
    const items = await commissionsRepo.listRules();
    res.json({ items, total: items.length });
  })
);

commissionsRouter.post(
  "/rules",
  requireRole("ACCOUNTANT", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = ruleSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const rule = await commissionsRepo.createRule(parsed.data);
    await writeAuditLog({ req, action: "CREATE_COMMISSION_RULE", entityType: "commission_rule", entityId: rule.id, afterData: rule });
    res.status(201).json(rule);
  })
);

const recordSchema = z.object({
  partnerId: z.string().uuid(),
  customerId: z.string().uuid().optional().nullable(),
  ruleId: z.string().uuid().optional().nullable(),
  period: z.string().min(1),
  amount: z.number().nonnegative(),
});

commissionsRouter.get(
  "/records",
  asyncHandler(async (req, res) => {
    const items = await commissionsRepo.listRecords({
      partnerId: req.query.partnerId as string | undefined,
      status: req.query.status as string | undefined,
    });
    res.json({ items, total: items.length });
  })
);

commissionsRouter.post(
  "/records",
  requireRole("SALES_MANAGER", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = recordSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const record = await commissionsRepo.createRecord(parsed.data);
    await writeAuditLog({ req, action: "CREATE_COMMISSION_RECORD", entityType: "commission_record", entityId: record.id, afterData: record });
    res.status(201).json(record);
  })
);

commissionsRouter.post(
  "/records/:id/approve",
  requireRole("ACCOUNTANT", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await commissionsRepo.findRecordById(req.params.id);
    if (!existing) throw Errors.notFound("bản ghi hoa hồng");
    if (existing.status === "PAID") throw Errors.conflict("Bản ghi đã thanh toán, không thể duyệt lại.");

    const record = await commissionsRepo.approveRecord(req.params.id, req.user!.id);
    await writeAuditLog({ req, action: "APPROVE_COMMISSION_RECORD", entityType: "commission_record", entityId: req.params.id, beforeData: existing, afterData: record });
    res.json(record);
  })
);

commissionsRouter.post(
  "/records/:id/mark-paid",
  requireRole("ACCOUNTANT", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await commissionsRepo.findRecordById(req.params.id);
    if (!existing) throw Errors.notFound("bản ghi hoa hồng");
    if (existing.status !== "APPROVED") throw Errors.conflict("Chỉ thanh toán được bản ghi đã APPROVED.");

    const record = await commissionsRepo.markPaid(req.params.id);
    await writeAuditLog({ req, action: "PAY_COMMISSION_RECORD", entityType: "commission_record", entityId: req.params.id, beforeData: existing, afterData: record });
    res.json(record);
  })
);
