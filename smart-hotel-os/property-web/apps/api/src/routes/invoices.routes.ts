import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { invoicesRepo } from "../repositories/invoices.repo";

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

const upsertSchema = z.object({
  bookingId: z.string().optional().nullable(),
  guestName: z.string().min(1),
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "OTA_WALLET", "VNPAY", "MOMO", "ZALOPAY", "STRIPE"]).default("CASH"),
  amount: z.number().min(0),
  status: z.enum(["PAID", "PENDING", "FAILED"]).default("PENDING"),
});

invoicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await invoicesRepo.list(req.user!.propertyId);
    res.json({ items, total: items.length });
  })
);

invoicesRouter.post(
  "/",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST"),
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const invoice = await invoicesRepo.create(req.user!.propertyId, req.user!.tenantId, parsed.data);
    await writeAuditLog({ req, action: "CREATE_INVOICE", entityType: "invoice", entityId: invoice.id, afterData: invoice });
    res.status(201).json(invoice);
  })
);

invoicesRouter.patch(
  "/:id",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST"),
  asyncHandler(async (req, res) => {
    const existing = await invoicesRepo.findById(req.user!.propertyId, req.params.id);
    if (!existing) throw Errors.notFound("hoá đơn");
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const invoice = await invoicesRepo.update(req.user!.propertyId, req.params.id, parsed.data);
    await writeAuditLog({
      req,
      action: "UPDATE_INVOICE",
      entityType: "invoice",
      entityId: req.params.id,
      beforeData: existing,
      afterData: invoice,
    });
    res.json(invoice);
  })
);
