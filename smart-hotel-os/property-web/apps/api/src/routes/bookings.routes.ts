import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { bookingsRepo } from "../repositories/bookings.repo";

export const bookingsRouter = Router();
bookingsRouter.use(requireAuth);

const upsertSchema = z.object({
  customerId: z.string().optional().nullable(),
  roomId: z.string().optional().nullable(),
  channel: z.enum(["DIRECT", "BOOKING_COM", "AGODA", "AIRBNB", "TRAVELOKA", "OTHER"]).default("DIRECT"),
  status: z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"]).default("PENDING"),
  checkinDate: z.string().min(1),
  checkoutDate: z.string().min(1),
  totalPrice: z.number().min(0).default(0),
  deposit: z.number().min(0).default(0),
  notes: z.string().optional(),
});

bookingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await bookingsRepo.list(req.user!.propertyId);
    res.json({ items, total: items.length });
  })
);

bookingsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const booking = await bookingsRepo.findById(req.user!.propertyId, req.params.id);
    if (!booking) throw Errors.notFound("hợp đồng");
    res.json(booking);
  })
);

bookingsRouter.post(
  "/",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST"),
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const booking = await bookingsRepo.create(req.user!.propertyId, req.user!.tenantId, req.user!.id, parsed.data);
    await writeAuditLog({ req, action: "CREATE_BOOKING", entityType: "booking", entityId: booking.id, afterData: booking });
    res.status(201).json(booking);
  })
);

bookingsRouter.patch(
  "/:id",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST"),
  asyncHandler(async (req, res) => {
    const existing = await bookingsRepo.findById(req.user!.propertyId, req.params.id);
    if (!existing) throw Errors.notFound("hợp đồng");
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const booking = await bookingsRepo.update(req.user!.propertyId, req.params.id, parsed.data);
    await writeAuditLog({
      req,
      action: "UPDATE_BOOKING",
      entityType: "booking",
      entityId: req.params.id,
      beforeData: existing,
      afterData: booking,
    });
    res.json(booking);
  })
);
