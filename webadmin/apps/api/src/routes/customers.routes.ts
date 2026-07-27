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
  name: z.string().min(1),
  address: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  partnerId: z.string().uuid().optional().nullable(),
  usesKiosk: z.boolean().default(false),
  usesSmartHotelOs: z.boolean().default(false),
  shoTenantId: z.string().optional(),
  kioskCustomerId: z.string().optional(),
  billingStatus: z.enum(["ACTIVE", "OVERDUE", "SUSPENDED"]).default("ACTIVE"),
});

customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await customersRepo.list({
      search: req.query.search as string | undefined,
      product: req.query.product as string | undefined,
    });
    res.json({ items, total: items.length });
  })
);

customersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await customersRepo.findById(req.params.id);
    if (!customer) throw Errors.notFound("khách hàng");
    const tickets = await customersRepo.listTickets(customer.id);
    res.json({ ...customer, support_tickets: tickets });
  })
);

customersRouter.post(
  "/",
  requireRole("SALES_MANAGER", "OPS_SUPPORT", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const customer = await customersRepo.create(parsed.data);
    await writeAuditLog({ req, action: "CREATE_CUSTOMER", entityType: "customer", entityId: customer.id, afterData: customer });
    res.status(201).json(customer);
  })
);

customersRouter.patch(
  "/:id",
  requireRole("SALES_MANAGER", "OPS_SUPPORT", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await customersRepo.findById(req.params.id);
    if (!existing) throw Errors.notFound("khách hàng");
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const customer = await customersRepo.update(req.params.id, parsed.data);
    await writeAuditLog({ req, action: "UPDATE_CUSTOMER", entityType: "customer", entityId: req.params.id, beforeData: existing, afterData: customer });
    res.json(customer);
  })
);

customersRouter.post(
  "/:id/support-tickets",
  requireRole("OPS_SUPPORT", "SALES_MANAGER", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const schema = z.object({ subject: z.string().min(1), description: z.string().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());

    const customer = await customersRepo.findById(req.params.id);
    if (!customer) throw Errors.notFound("khách hàng");

    const ticket = await customersRepo.createTicket(customer.id, parsed.data.subject, parsed.data.description);
    await writeAuditLog({ req, action: "CREATE_SUPPORT_TICKET", entityType: "support_ticket", entityId: ticket.id, afterData: ticket });
    res.status(201).json(ticket);
  })
);
