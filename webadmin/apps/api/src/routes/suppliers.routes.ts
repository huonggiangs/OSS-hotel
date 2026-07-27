import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { suppliersRepo } from "../repositories/suppliers.repo";

export const suppliersRouter = Router();
suppliersRouter.use(requireAuth);

const upsertSchema = z.object({
  name: z.string().min(1),
  suppliesTypes: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  paymentTerms: z.string().optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

suppliersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await suppliersRepo.list(req.query.search as string | undefined);
    res.json({ items, total: items.length });
  })
);

suppliersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const supplier = await suppliersRepo.findById(req.params.id);
    if (!supplier) throw Errors.notFound("nhà cung cấp");
    const hardwareCount = await suppliersRepo.countHardwareAssets(supplier.id);
    res.json({ ...supplier, hardware_asset_count: hardwareCount });
  })
);

suppliersRouter.post(
  "/",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const supplier = await suppliersRepo.create(parsed.data);
    await writeAuditLog({ req, action: "CREATE_SUPPLIER", entityType: "supplier", entityId: supplier.id, afterData: supplier });
    res.status(201).json(supplier);
  })
);

suppliersRouter.patch(
  "/:id",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await suppliersRepo.findById(req.params.id);
    if (!existing) throw Errors.notFound("nhà cung cấp");
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const supplier = await suppliersRepo.update(req.params.id, parsed.data);
    await writeAuditLog({ req, action: "UPDATE_SUPPLIER", entityType: "supplier", entityId: req.params.id, beforeData: existing, afterData: supplier });
    res.json(supplier);
  })
);
