import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { roomsRepo } from "../repositories/rooms.repo";

export const roomsRouter = Router();
roomsRouter.use(requireAuth);

const createSchema = z.object({
  roomTypeId: z.string().min(1),
  number: z.string().min(1),
  floor: z.string().min(1),
  zone: z.string().min(1),
  status: z.enum(["OCCUPIED", "VACANT", "DIRTY", "MAINTENANCE"]).default("VACANT"),
  powerOn: z.boolean().default(false),
  note: z.string().optional().nullable(),
});

const statusSchema = z.object({ status: z.enum(["OCCUPIED", "VACANT", "DIRTY", "MAINTENANCE"]) });
const powerSchema = z.object({ powerOn: z.boolean() });

roomsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await roomsRepo.list(req.user!.propertyId);
    res.json({ items, total: items.length });
  })
);

roomsRouter.post(
  "/",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const room = await roomsRepo.create(req.user!.propertyId, req.user!.tenantId, parsed.data);
    res.status(201).json(room);
  })
);

roomsRouter.patch(
  "/:id",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"),
  asyncHandler(async (req, res) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const room = await roomsRepo.setStatus(req.user!.propertyId, req.params.id, parsed.data.status);
    if (!room) throw Errors.notFound("phòng");
    res.json(room);
  })
);

roomsRouter.patch(
  "/:id/power",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"),
  asyncHandler(async (req, res) => {
    const parsed = powerSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const room = await roomsRepo.setPower(req.user!.propertyId, req.params.id, parsed.data.powerOn);
    if (!room) throw Errors.notFound("phòng");
    res.json(room);
  })
);
