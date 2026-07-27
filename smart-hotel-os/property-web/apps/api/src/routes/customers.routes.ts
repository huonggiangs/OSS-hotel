import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { customersRepo } from "../repositories/customers.repo";

export const customersRouter = Router();
customersRouter.use(requireAuth);

const upsertSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  segment: z.string().default("Mới"),
  note: z.string().optional(),
});

customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await customersRepo.list(req.user!.propertyId, req.query.search as string | undefined);
    res.json({ items, total: items.length });
  })
);

customersRouter.post(
  "/",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST"),
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const customer = await customersRepo.create(req.user!.propertyId, req.user!.tenantId, parsed.data);
    await writeAuditLog({ req, action: "CREATE_CUSTOMER", entityType: "customer", entityId: customer.id, afterData: customer });
    res.status(201).json(customer);
  })
);

customersRouter.patch(
  "/:id",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST"),
  asyncHandler(async (req, res) => {
    const existing = await customersRepo.findById(req.user!.propertyId, req.params.id);
    if (!existing) throw Errors.notFound("khách hàng");
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const customer = await customersRepo.update(req.user!.propertyId, req.params.id, parsed.data);
    await writeAuditLog({
      req,
      action: "UPDATE_CUSTOMER",
      entityType: "customer",
      entityId: req.params.id,
      beforeData: existing,
      afterData: customer,
    });
    res.json(customer);
  })
);
