import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { otaReconciliationRepo } from "../repositories/otaReconciliation.repo";

export const otaReconciliationRouter = Router();
otaReconciliationRouter.use(requireAuth);

const channel = z.enum(["BOOKING_COM", "AGODA", "AIRBNB", "TRAVELOKA", "OTHER"]);
const createSchema = z.object({
  bookingId: z.string().optional().nullable(),
  channel,
  externalReference: z.string().trim().min(1).max(120),
  grossAmount: z.number().min(0),
  commissionAmount: z.number().min(0),
  receivedAmount: z.number().min(0),
  settlementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(["PENDING", "MATCHED", "DISPUTED"]).optional(),
  note: z.string().trim().max(500).optional().nullable(),
  source: z.string().trim().max(40).optional(),
});
const updateSchema = z.object({ status: z.enum(["PENDING", "MATCHED", "DISPUTED"]), note: z.string().trim().max(500).optional().nullable() });

otaReconciliationRouter.get("/", asyncHandler(async (req, res) => {
  const items = await otaReconciliationRepo.list(req.user!.propertyId);
  res.json({ items, total: items.length });
}));

otaReconciliationRouter.post("/", requireRole("OWNER", "MANAGER", "RECEPTIONIST"), asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const item = await otaReconciliationRepo.create(req.user!.propertyId, req.user!.tenantId, parsed.data);
  await writeAuditLog({ req, action: "CREATE_OTA_RECONCILIATION", entityType: "ota_reconciliation", entityId: item.id, afterData: item });
  res.status(201).json(item);
}));

otaReconciliationRouter.patch("/:id", requireRole("OWNER", "MANAGER", "RECEPTIONIST"), asyncHandler(async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validation(parsed.error.flatten());
  const item = await otaReconciliationRepo.updateStatus(req.user!.propertyId, req.params.id, parsed.data.status, parsed.data.note);
  if (!item) throw Errors.notFound("dòng đối soát");
  await writeAuditLog({ req, action: "UPDATE_OTA_RECONCILIATION", entityType: "ota_reconciliation", entityId: item.id, afterData: item });
  res.json(item);
}));
