import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { partnersRepo } from "../repositories/partners.repo";

export const partnersRouter = Router();
partnersRouter.use(requireAuth);

const upsertSchema = z.object({
  name: z.string().min(1),
  territory: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  defaultCommissionPct: z.number().min(0).max(100).default(0),
  maxCustomers: z.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]).default("ACTIVE"),
  notes: z.string().optional(),
});

partnersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await partnersRepo.list({
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
    });
    res.json({ items, total: items.length });
  })
);

partnersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const partner = await partnersRepo.findById(req.params.id);
    if (!partner) throw Errors.notFound("đối tác");
    const customerCount = await partnersRepo.countCustomers(partner.id);
    res.json({ ...partner, customer_count: customerCount });
  })
);

partnersRouter.post(
  "/",
  requireRole("SALES_MANAGER", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const partner = await partnersRepo.create(parsed.data);
    await writeAuditLog({ req, action: "CREATE_PARTNER", entityType: "partner", entityId: partner.id, afterData: partner });
    res.status(201).json(partner);
  })
);

partnersRouter.patch(
  "/:id",
  requireRole("SALES_MANAGER", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await partnersRepo.findById(req.params.id);
    if (!existing) throw Errors.notFound("đối tác");
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const partner = await partnersRepo.update(req.params.id, parsed.data);
    await writeAuditLog({
      req,
      action: "UPDATE_PARTNER",
      entityType: "partner",
      entityId: req.params.id,
      beforeData: existing,
      afterData: partner,
    });
    res.json(partner);
  })
);
