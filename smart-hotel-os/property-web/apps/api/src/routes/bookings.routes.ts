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

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD.");
const dateTimeSchema = z.string().datetime({ offset: true });
const paymentMethodSchema = z.enum(["CASH", "BANK_TRANSFER", "CARD", "OTA_WALLET", "VNPAY", "MOMO", "ZALOPAY", "STRIPE"]);
const guestDetailsSchema = z.object({
  dateOfBirth: dateSchema.optional().nullable(),
  gender: z.string().trim().max(40).optional().nullable(),
  nationality: z.string().trim().max(100).optional().nullable(),
  identityType: z.string().trim().max(100).optional().nullable(),
  identityNumber: z.string().trim().max(100).optional().nullable(),
  identityIssuedDate: dateSchema.optional().nullable(),
  identityIssuedPlace: z.string().trim().max(255).optional().nullable(),
  permanentAddress: z.string().trim().max(500).optional().nullable(),
  occupation: z.string().trim().max(120).optional().nullable(),
  stayPurpose: z.string().trim().max(255).optional().nullable(),
  expectedCheckoutAt: dateTimeSchema.optional().nullable(),
});

const createSchema = z
  .object({
  customerId: z.string().optional().nullable(),
  roomId: z.string().optional().nullable(),
  channel: z.enum(["DIRECT", "BOOKING_COM", "AGODA", "AIRBNB", "TRAVELOKA", "OTHER"]).default("DIRECT"),
  status: z.enum(["PENDING", "CONFIRMED"]).default("PENDING"),
  checkinDate: dateSchema,
  checkoutDate: dateSchema,
  checkinAt: dateTimeSchema.optional(),
  checkoutAt: dateTimeSchema.optional(),
  stayType: z.enum(["HOURLY", "OVERNIGHT", "DAILY"]).default("DAILY"),
  totalPrice: z.number().min(0).default(0),
  deposit: z.number().min(0).default(0),
  notes: z.string().optional(),
  guestDetails: guestDetailsSchema.optional(),
  })
  .superRefine((input, ctx) => {
    if (!input.checkinAt && !input.checkoutAt && input.checkoutDate <= input.checkinDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["checkoutDate"], message: "Ngày trả phòng phải sau ngày nhận phòng." });
    }
    if (input.checkinAt && input.checkoutAt && new Date(input.checkoutAt).getTime() <= new Date(input.checkinAt).getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["checkoutAt"], message: "Thời điểm trả phòng phải sau thời điểm nhận phòng." });
    }
  });

const updateSchema = z
  .object({
    customerId: z.string().optional().nullable(),
    roomId: z.string().optional().nullable(),
    channel: z.enum(["DIRECT", "BOOKING_COM", "AGODA", "AIRBNB", "TRAVELOKA", "OTHER"]).optional(),
    checkinDate: dateSchema.optional(),
    checkoutDate: dateSchema.optional(),
    checkinAt: dateTimeSchema.optional(),
    checkoutAt: dateTimeSchema.optional(),
    stayType: z.enum(["HOURLY", "OVERNIGHT", "DAILY"]).optional(),
    totalPrice: z.number().min(0).optional(),
    deposit: z.number().min(0).optional(),
    notes: z.string().optional(),
    guestDetails: guestDetailsSchema.optional(),
  })
  .strict();

bookingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await bookingsRepo.list(req.user!.propertyId);
    res.json({ items, total: items.length });
  })
);

const extendSchema = z.object({
  checkoutDate: dateSchema,
  checkoutAt: dateTimeSchema,
  additionalAmount: z.number().min(0),
  additionalDeposit: z.number().min(0).default(0),
  paymentTiming: z.enum(["PREPAID", "POSTPAID"]),
  note: z.string().trim().max(500).optional(),
});
const transferSchema = z.object({
  targetRoomId: z.string().min(1),
  adjustmentAmount: z.number().min(-100_000_000).max(100_000_000).default(0),
  reason: z.string().trim().min(3).max(500),
});
const settleSchema = z.object({
  serviceAmount: z.number().min(0).default(0),
  serviceNote: z.string().trim().max(500).optional(),
  paymentMethod: paymentMethodSchema.default("CASH"),
});

bookingsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const booking = await bookingsRepo.findById(req.user!.propertyId, req.params.id);
    if (!booking) throw Errors.notFound("hợp đồng");
    res.json(booking);
  })
);

bookingsRouter.get(
  "/:id/operations",
  asyncHandler(async (req, res) => {
    res.json(await bookingsRepo.operationSummary(req.user!.propertyId, req.params.id));
  })
);

bookingsRouter.post(
  "/",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
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
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const checkinDate = parsed.data.checkinDate ?? existing.checkin_date;
    const checkoutDate = parsed.data.checkoutDate ?? existing.checkout_date;
    if (checkoutDate <= checkinDate) throw Errors.validation({ checkoutDate: "Ngày trả phòng phải sau ngày nhận phòng." });
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

bookingsRouter.post(
  "/:id/checkin",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST"),
  asyncHandler(async (req, res) => {
    const booking = await bookingsRepo.checkin(req.user!.propertyId, req.params.id);
    await writeAuditLog({ req, action: "CHECKIN_BOOKING", entityType: "booking", entityId: booking.id, afterData: { status: booking.status } });
    res.json(booking);
  })
);

bookingsRouter.post(
  "/:id/guest-out",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST"),
  asyncHandler(async (req, res) => {
    const booking = await bookingsRepo.setGuestPresence(req.user!.propertyId, req.params.id, false);
    await writeAuditLog({ req, action: "GUEST_LEFT_ROOM", entityType: "booking", entityId: booking.id, afterData: { room_id: booking.room_id, power_on: false } });
    res.json(booking);
  })
);

bookingsRouter.post(
  "/:id/guest-return",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST"),
  asyncHandler(async (req, res) => {
    const booking = await bookingsRepo.setGuestPresence(req.user!.propertyId, req.params.id, true);
    await writeAuditLog({ req, action: "GUEST_RETURNED_ROOM", entityType: "booking", entityId: booking.id, afterData: { room_id: booking.room_id, power_on: true } });
    res.json(booking);
  })
);

bookingsRouter.post(
  "/:id/extend",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST"),
  asyncHandler(async (req, res) => {
    const parsed = extendSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const booking = await bookingsRepo.extend(req.user!.propertyId, req.user!.tenantId, req.user!.id, req.params.id, parsed.data);
    await writeAuditLog({ req, action: "EXTEND_BOOKING", entityType: "booking", entityId: booking.id, afterData: { checkout_at: booking.checkout_at, total_price: booking.total_price, deposit: booking.deposit } });
    res.json(booking);
  })
);

bookingsRouter.post(
  "/:id/transfer",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST"),
  asyncHandler(async (req, res) => {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const booking = await bookingsRepo.transfer(req.user!.propertyId, req.user!.tenantId, req.user!.id, req.params.id, parsed.data);
    await writeAuditLog({ req, action: "TRANSFER_BOOKING_ROOM", entityType: "booking", entityId: booking.id, afterData: { room_id: booking.room_id, total_price: booking.total_price, reason: parsed.data.reason } });
    res.json(booking);
  })
);

bookingsRouter.post(
  "/:id/settle-checkout",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST"),
  asyncHandler(async (req, res) => {
    const parsed = settleSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const result = await bookingsRepo.settleAndCheckout(req.user!.propertyId, req.user!.tenantId, req.user!.id, req.params.id, parsed.data);
    await writeAuditLog({ req, action: "SETTLE_AND_CHECKOUT_BOOKING", entityType: "booking", entityId: result.booking.id, afterData: { status: result.booking.status, paid_amount: result.paidAmount } });
    res.json(result);
  })
);

bookingsRouter.post(
  "/:id/checkout",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST"),
  asyncHandler(async (req, res) => {
    const booking = await bookingsRepo.checkout(req.user!.propertyId, req.params.id);
    await writeAuditLog({ req, action: "CHECKOUT_BOOKING", entityType: "booking", entityId: booking.id, afterData: { status: booking.status } });
    res.json(booking);
  })
);
